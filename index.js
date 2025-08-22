require("dotenv").config();
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
} = require("baileys");
const qrcode = require("qrcode-terminal");
const CommandHandler = require("./commandHandler");
const ContentFilter = require("./lib/ContentFilter"); // Import ContentFilter
const { getState } = require("./lib/groupState");
const fs = require("fs");
const path = require("path");

/**
 * Membongkar pesan untuk mendapatkan konten sebenarnya
 * Menangani berbagai jenis pesan seperti ephemeral, viewOnce, dll.
 * @param {Object} msg - Objek pesan
 * @returns {Object} - Objek pesan yang telah dibongkar
 */
function unwrapMessage(msg) {
  let m = msg.message;
  if (m?.ephemeralMessage) m = m.ephemeralMessage.message;
  if (m?.viewOnceMessage) m = m.viewOnceMessage.message;
  if (m?.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
  if (m?.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message;
  return m || msg.message;
}

/**
 * Mengekstrak teks dari berbagai jenis pesan
 * @param {Object} msg - Objek pesan
 * @returns {string} - Teks yang diekstrak dari pesan
 */
function extractTextFromAny(msg) {
  const m = unwrapMessage(msg) || {};
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    ""
  );
}

/**
 * Kelas utama untuk bot WhatsApp
 * Mengelola koneksi, penanganan pesan, dan eksekusi perintah
 */
class WhatsAppBot {
  constructor() {
    this.commandHandler = new CommandHandler();
    this.prefix = process.env.PREFIX || "!";
    this.botName = process.env.BOT_NAME || "WhatsApp Bot";
    this.sock = null;
    this.prefixes = this._resolvePrefixes();

    // Inisialisasi ContentFilter
    this.contentFilter = new ContentFilter(
      path.join(__dirname, "data", "forbiddenWords.json"),
    );
  }

  /**
   * Build daftar prefix dari env (comma-separated) + legacy this.prefix
   */
  _resolvePrefixes() {
    const raw = String(process.env.PREFIX || this.prefix || "!").split(",");
    const arr = raw.map((p) => p.trim()).filter(Boolean);
    if (!arr.includes(this.prefix)) arr.unshift(this.prefix);
    return [...new Set(arr)];
  }

  /**
   * Inisialisasi bot
   * Menampilkan informasi awal dan memulai koneksi
   */
  async initialize() {
    console.log(`🤖 Starting ${this.botName}...`);
    console.log(`🔧 Using prefix: ${this.prefixes.join(" ")}`);
    await this.createConnection();
  }

  /**
   * Membuat koneksi ke WhatsApp
   * Mengatur event listener untuk koneksi, kredensial, pesan, dan panggilan
   */
  async createConnection() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: require("pino")({ level: "silent" }),
    });

    this.sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        console.log("📱 Scan QR code below:");
        qrcode.generate(qr, { small: true });
      }
      if (connection === "close") {
        const shouldReconnect =
          lastDisconnect?.error?.output?.statusCode !==
          DisconnectReason.loggedOut;
        console.log("❌ Connection closed due to:", lastDisconnect.error);
        if (shouldReconnect) {
          console.log("🔄 Reconnecting...");
          await this.createConnection();
        }
      } else if (connection === "open") {
        console.log("✅ Connected to WhatsApp!");
        console.log(`📞 Bot Number: ${this.sock.user.id}`);
      }
    });

    this.sock.ev.on("creds.update", saveCreds);
    this.sock.ev.on("messages.upsert", async (messageUpdate) => {
      await this.handleMessage(messageUpdate);
    });
    this.sock.ev.on("call", async (callData) => {
      await this.handleCall(callData);
    });
    this.sock.ev.on(
      "group-participants.update",
      async (groupUpdate) => {
        await this.handleGroupParticipantsUpdate(groupUpdate);
      },
    );
  }

  /**
   * Menangani panggilan masuk
   * Memblokir nomor yang menelepon dan mengirim pesan peringatan
   * @param {Array} callData - Data panggilan
   */
  async handleCall(callData) {
    try {
      for (const call of callData) {
        const callerJid = call.from;
        const callerNumber = callerJid.split("@")[0];

        console.log(`📞 Incoming call from: ${callerNumber}`);

        const blockedNumbersPath = path.join(
          __dirname,
          "data",
          "blockedNumbers.json",
        );
        let blockedNumbers = {};
        if (fs.existsSync(blockedNumbersPath)) {
          blockedNumbers = JSON.parse(
            fs.readFileSync(blockedNumbersPath, "utf8"),
          );
        }

        if (blockedNumbers[callerNumber]) {
          console.log(`🚫 Caller ${callerNumber} is already blocked`);
          return;
        }

        const warningMessage = `⚠️ *PERINGATAN* ⚠️
        
Anda telah menelepon bot. Mohon tidak menelepon bot karena akan mengganggu kinerja bot.

Jika Anda memerlukan bantuan, silakan kirim pesan teks ke bot.

Nomor Anda akan diblokir secara otomatis jika Anda menelepon bot kembali.

Jika Anda merasa ini adalah kesalahan, silakan hubungi owner bot:
${process.env.BOT_SUPPORT || "Owner belum mengatur kontak support"}

Terima kasih atas pengertian Anda.`;

        await this.sendMessage(callerJid, { text: warningMessage });

        await this.sock.updateBlockStatus(callerJid, "block");

        blockedNumbers[callerNumber] = {
          blockedAt: new Date().toISOString(),
          reason: "Automatic block due to incoming call",
        };

        fs.writeFileSync(
          blockedNumbersPath,
          JSON.stringify(blockedNumbers, null, 2),
        );

        console.log(`🚫 Blocked caller: ${callerNumber}`);
      }
    } catch (error) {
      console.error("Error handling call:", error);
    }
  }

  /**
   * Menangani pembaruan partisipan grup (welcome/leave)
   * @param {Object} groupUpdate - Data pembaruan grup
   */
  async handleGroupParticipantsUpdate(groupUpdate) {
    const { id, participants, action } = groupUpdate;
    const groupJid = id;

    try {
      const groupSettingsPath = path.join(
        __dirname,
        "data",
        "groupSettings.json",
      );
      let groupSettings = {};
      if (fs.existsSync(groupSettingsPath)) {
        groupSettings = JSON.parse(
          fs.readFileSync(groupSettingsPath, "utf8"),
        );
      }

      const settings = groupSettings[groupJid] || {};
      const welcomeMessage =
        settings.welcome || "Selamat datang @user di grup {groupName}!";
      const leaveMessage = settings.leave || "Selamat tinggal @user!";
      const welcomeEnabled = settings.welcomeEnabled !== false; // default to true
      const leaveEnabled = settings.leaveEnabled !== false; // default to true

      const metadata = await this.sock.groupMetadata(groupJid);
      const groupName = metadata.subject;

      for (const userJid of participants) {
        const userMention = `@${userJid.split("@")[0]}`;
        let messageText = "";

        if (action === "add" && welcomeEnabled) {
          messageText = welcomeMessage
            .replace(/@user/g, userMention)
            .replace(/{groupName}/g, groupName);
        } else if (action === "remove" && leaveEnabled) {
          messageText = leaveMessage
            .replace(/@user/g, userMention)
            .replace(/{groupName}/g, groupName);
        }

        if (messageText) {
          await this.sock.sendMessage(groupJid, {
            text: messageText,
            mentions: [userJid],
          });
        }
      }
    } catch (error) {
      console.error("Error in handleGroupParticipantsUpdate:", error);
    }
  }

  /**
   * Menangani pesan masuk
   * Memfilter konten, mengeksekusi perintah, dan memberikan saran jika perintah tidak ditemukan
   * @param {Object} messageUpdate - Update pesan
   */
  async handleMessage(messageUpdate) {
    const { messages } = messageUpdate;

    for (const message of messages) {
      try {
        const jid = message.key.remoteJid;
        if (!jid || jid === "status@broadcast") continue;
        if (message.key.fromMe) continue;

        const text = extractTextFromAny(message);
        if (!text) continue;

        const isGroup = jid.endsWith("@g.us");
        const sender = jidNormalizedUser(
          message.key.participant || message.key.remoteJid,
        );

        // --- START: Content Filtering Logic ---
        const forbiddenWord = this.contentFilter.getForbiddenWord(text);
        if (forbiddenWord) {
          console.log(
            `🚫 Forbidden word "${forbiddenWord}" detected from ${sender} in ${jid}`,
          );

          if (isGroup) {
            try {
              const metadata = await this.sock.groupMetadata(jid);
              const botId = this.sock.user.lid;
              const botIdTrim = botId.replace(/:\d+/, "");
              const botIsAdmin = metadata.participants
                .find((p) => p.id === botIdTrim)
                ?.admin?.includes("admin");

              if (botIsAdmin) {
                await this.sock.sendMessage(jid, { delete: message.key });
                await this.sock.sendMessage(jid, {
                  text: `⚠️ Mohon jangan gunakan kata-kata yang tidak pantas.`,
                });
                console.log(`🗑️ Message deleted in group ${jid}`);
                await this.sock.sendMessage(sender, {
                  text: `⚠️ Pesan Anda di grup *${metadata.subject}* telah dihapus karena mengandung kata yang dilarang: "${forbiddenWord}"`,
                });
              } else {
                await this.sock.sendMessage(jid, {
                  text: `⚠️ Tolong jadikan admin bot terlebih dahulu untuk menghapus pesan ini.`,
                });
                console.log(
                  `⚠️ Bot is not admin in ${jid}, cannot delete message.`,
                );
              }
            } catch (err) {
              console.error("Error in content filtering (group):", err);
            }
          } else {
            await this.sock.sendMessage(jid, {
              text: `⚠️ Mohon jangan gunakan kata-kata yang tidak pantas. Kata terdeteksi: "${forbiddenWord}"`,
            });
          }
          continue; // Hentikan pemrosesan pesan ini lebih lanjut
        }
        // --- END: Content Filtering Logic ---

        const handled = await this.commandHandler.tryQuickReply(
          message,
          this.sock,
        );
        if (handled) continue;

        const usedPrefix = this.prefixes.find((p) => text.startsWith(p));
        if (!usedPrefix) continue;

        const withoutPrefix = text.slice(usedPrefix.length).trim();
        if (!withoutPrefix) continue;

        const parts = withoutPrefix.split(/\s+/);
        const commandName = (parts.shift() || "").toLowerCase();
        const args = parts;

        console.log(
          `📝 Command used: ${commandName} | User: ${sender} | Group: ${isGroup ? "Yes" : "No"}`,
        );

        const executed = await this.commandHandler.executeCommand(
          commandName,
          message,
          this.sock,
          args,
        );

        if (!executed) {
          const groupState = isGroup ? getState(jid) : "on";
          if (groupState === "on") {
            const suggestion = this.commandHandler.getSuggestion(commandName);
            if (suggestion) {
              await this.sendMessage(jid, {
                text:
                  `❌ Command "${commandName}" gak ketemu.\n` +
                  `👉 Maksud kamu *${usedPrefix || this.prefix}${suggestion}* ?`,
              });
            } else {
              await this.sendMessage(jid, {
                text: `❌ Command "${commandName}" not found!`,
              });
            }
            console.log(
              `❓ Unknown command: ${commandName} ${suggestion ? `(suggest: ${suggestion})` : ""}`,
            );
          } else {
            console.log(
              `[index] Bot is OFF in group ${jid}. Suppressing suggestion for '${commandName}'.`,
            );
          }
        }
      } catch (err) {
        console.error("handleMessage error:", err);
      }
    }
  }

  /**
   * Mengirim pesan ke pengguna atau grup
   * @param {string} jid - ID tujuan (JID)
   * @param {Object} content - Konten pesan
   * @returns {Promise<Object>} - Hasil pengiriman pesan
   */
  async sendMessage(jid, content) {
    try {
      return await this.sock.sendMessage(jid, content);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  /**
   * Memuat ulang daftar perintah (berguna saat development)
   */
  reloadCommands() {
    this.commandHandler.reloadCommands();
    console.log("🔄 Commands reloaded!");
  }

  /**
   * Mendapatkan status bot
   * @returns {Object} - Status bot
   */
  getStatus() {
    return {
      connected: this.sock?.user ? true : false,
      commands: this.commandHandler.getCommands().length,
      prefix: this.prefix,
      botName: this.botName,
    };
  }
}

// Start the bot
const bot = new WhatsAppBot();
bot.initialize().catch(console.error);

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n👋 Bot shutting down...");
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

module.exports = WhatsAppBot;

require("dotenv").config();
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
} = require("baileys");
const qrcode = require("qrcode-terminal");
const CommandHandler = require("./commandHandler");
const { getState } = require("./lib/groupState");
const fs = require("fs");
const path = require("path");

// Helper buat unwrap & ambil teks/caption dari semua jenis pesan
function unwrapMessage(msg) {
  let m = msg.message;
  if (m?.ephemeralMessage) m = m.ephemeralMessage.message;
  if (m?.viewOnceMessage) m = m.viewOnceMessage.message;
  if (m?.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
  if (m?.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message;
  return m || msg.message;
}

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

class WhatsAppBot {
  constructor() {
    this.commandHandler = new CommandHandler();
    this.prefix = process.env.PREFIX || "!";
    this.botName = process.env.BOT_NAME || "WhatsApp Bot";
    this.sock = null;

    // ⬇️ NEW: daftar prefix (multi / legacy)
    this.prefixes = this._resolvePrefixes();
  }

  /**
   * Build daftar prefix dari env (comma-separated) + legacy this.prefix
   * - .env: PREFIX="/,.,&,*"
   * - Legacy: kalau cuma 1 nilai (mis. "/"), tetap dimasukkan.
   */
  _resolvePrefixes() {
    const raw = String(process.env.PREFIX || this.prefix || "!").split(",");
    const arr = raw.map((p) => p.trim()).filter(Boolean);
    // Pastikan legacy this.prefix ikut masuk (kalau belum ada)
    if (!arr.includes(this.prefix)) arr.unshift(this.prefix);
    // Uniq
    return [...new Set(arr)];
  }

  /**
   * Initialize the bot
   */
  async initialize() {
    console.log(`🤖 Starting ${this.botName}...`);
    console.log(`🔧 Using prefix: ${this.prefixes.join(" ")}`); // was: this.prefix

    await this.createConnection();
  }

  /**
   * Create WhatsApp connection
   */
  async createConnection() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: require("pino")({ level: "silent" }),
    });

    // Handle QR code
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

    // Save credentials
    this.sock.ev.on("creds.update", saveCreds);

    // Handle incoming messages
    this.sock.ev.on("messages.upsert", async (messageUpdate) => {
      await this.handleMessage(messageUpdate);
    });

    // Handle incoming calls
    this.sock.ev.on("call", async (callData) => {
      await this.handleCall(callData);
    });
  }

  /**
   * Handle incoming calls
   */
  async handleCall(callData) {
    try {
      for (const call of callData) {
        const callerJid = call.from;
        const callerNumber = callerJid.split('@')[0];
        
        console.log(`📞 Incoming call from: ${callerNumber}`);
        
        // Read blocked numbers
        const blockedNumbersPath = path.join(__dirname, "data", "blockedNumbers.json");
        let blockedNumbers = {};
        if (fs.existsSync(blockedNumbersPath)) {
          blockedNumbers = JSON.parse(fs.readFileSync(blockedNumbersPath, "utf8"));
        }
        
        // Check if caller is already blocked
        if (blockedNumbers[callerNumber]) {
          console.log(`🚫 Caller ${callerNumber} is already blocked`);
          return;
        }
        
        // Send warning message before blocking
        const warningMessage = `⚠️ *PERINGATAN* ⚠️
        
Anda telah menelepon bot. Mohon tidak menelepon bot karena akan mengganggu kinerja bot.

Jika Anda memerlukan bantuan, silakan kirim pesan teks ke bot.

Nomor Anda akan diblokir secara otomatis jika Anda menelepon bot kembali.

Jika Anda merasa ini adalah kesalahan, silakan hubungi owner bot:
${process.env.BOT_SUPPORT || "Owner belum mengatur kontak support"}

Terima kasih atas pengertian Anda.`;
        
        await this.sendMessage(callerJid, { text: warningMessage });
        
        // Block the caller
        await this.sock.updateBlockStatus(callerJid, "block");
        
        // Add to blocked numbers database with consistent structure
        blockedNumbers[callerNumber] = {
          blockedAt: new Date().toISOString(),
          reason: "Automatic block due to incoming call"
        };
        
        fs.writeFileSync(blockedNumbersPath, JSON.stringify(blockedNumbers, null, 2));
        
        console.log(`🚫 Blocked caller: ${callerNumber}`);
      }
    } catch (error) {
      console.error("Error handling call:", error);
    }
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(messageUpdate) {
    const { messages } = messageUpdate;

    for (const message of messages) {
      try {
        const jid = message.key.remoteJid;
        if (!jid || jid === "status@broadcast") continue;
        if (message.key.fromMe) continue;

        // Ambil teks dari conversation / extended / caption media
        const text = extractTextFromAny(message);
        if (!text) continue;

        // 1) Quick reply tanpa prefix (mis. "selamat pagi")
        //    pastikan CommandHandler kamu sudah ada method tryQuickReply()
        const handled = await this.commandHandler.tryQuickReply(
          message,
          this.sock,
        );
        if (handled) continue; // sudah dibalas → skip command parsing

        // 2) Command parsing (multi-prefix)
        const usedPrefix = this.prefixes.find((p) => text.startsWith(p));
        if (!usedPrefix) continue;

        const withoutPrefix = text.slice(usedPrefix.length).trim();
        if (!withoutPrefix) continue;

        const parts = withoutPrefix.split(/\s+/);
        const commandName = (parts.shift() || "").toLowerCase();
        const args = parts;

        const isGroup = jid.endsWith("@g.us");
        const sender = jidNormalizedUser(
          message.key.participant || message.key.remoteJid,
        );

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
          const groupState = isGroup ? getState(jid) : 'on';
          if (groupState === 'on') {
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
            console.log(`[index] Bot is OFF in group ${jid}. Suppressing suggestion for '${commandName}'.`);
          }
        }
      } catch (err) {
        console.error("handleMessage error:", err);
      }
    }
  }

  /**
   * Send a message
   */
  async sendMessage(jid, content) {
    try {
      return await this.sock.sendMessage(jid, content);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  /**
   * Reload commands (useful for development)
   */
  reloadCommands() {
    this.commandHandler.reloadCommands();
    console.log("🔄 Commands reloaded!");
  }

  /**
   * Get bot status
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

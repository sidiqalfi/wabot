const fs = require("fs");
const path = require("path");
const { record } = require("./lib/statsStore"); // pencatat statistik

// ===== Helpers untuk quick reply tanpa prefix =====
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
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    m?.documentMessage?.caption ||
    ""
  );
}
function norm(s = "") {
  return String(s).toLowerCase().trim().replace(/\s+/g, " ");
}

// ===== Fuzzy helpers (Levenshtein) =====
function levenshtein(a = "", b = "") {
  a = String(a);
  b = String(b);
  const m = a.length,
    n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost, // substitution
      );
    }
  }
  return dp[m][n];
}

function similarityDistance(input, candidate) {
  // kombinasi heuristik: exact prefix bonus + Levenshtein
  const dist = levenshtein(input, candidate);
  const prefixBonus = candidate.startsWith(input) ? -1 : 0; // makin kecil = makin mirip
  return dist + prefixBonus;
}

// Threshold dinamis biar fleksibel di nama panjang/pendek
function maxAllowedDistance(input) {
  const len = Math.max(1, input.length);
  if (len <= 4) return 1; // typo pendek harus ketat
  if (len <= 8) return 2;
  return Math.floor(len * 0.3); // 30% dari panjang
}

class CommandHandler {
  constructor() {
    // Map key = nama/alias (lowercase), value = command object
    this.commands = new Map();
    // Simpan set unik command objects buat listing help (biar alias gak dobel)
    this._uniqueCommands = new Set();

    // ====== Quick Replies config ======
    // Bisa override lewat file: ./data/quickReplies.json (array of {match, reply})
    const dataPath = path.join(__dirname, "data", "quickReplies.json");
    this.quickReplies = [
      { match: "selamat pagi", reply: "Selamat pagi juga! 🌅" },
      { match: "selamat siang", reply: "Selamat siang juga! 🌞" },
      { match: "selamat sore", reply: "Selamat sore! 🌤️" },
      { match: "selamat malam", reply: "Selamat malam juga! 🌙" },
    ];
    try {
      if (fs.existsSync(dataPath)) {
        const arr = JSON.parse(fs.readFileSync(dataPath, "utf8"));
        if (Array.isArray(arr) && arr.length) this.quickReplies = arr;
      }
    } catch {}

    this.qrCooldownMs = parseInt(process.env.QR_COOLDOWN_MS || "3000", 10);
    this._qrCooldown = new Map(); // key: chatJid -> lastTs

    this.loadCommands();
  }

  /**
   * Cari saran command paling mirip saat user typo
   * @param {string} name - input command dari user (tanpa prefix)
   * @returns {string|null} - nama kandidat (key) terbaik atau null
   */
  getSuggestion(name) {
    const input = String(name || "")
      .toLowerCase()
      .trim();
    if (!input) return null;

    let best = null;
    let bestScore = Infinity;

    for (const key of this.commands.keys()) {
      const score = similarityDistance(input, String(key));
      if (score < bestScore) {
        bestScore = score;
        best = key;
      }
    }

    // Validasi dengan threshold dinamis
    if (best && bestScore <= maxAllowedDistance(input)) {
      return best;
    }

    // fallback ringan: contain match (kalau user ketik sebagian)
    const partial = Array.from(this.commands.keys()).find((k) =>
      k.includes(input),
    );
    if (partial) return partial;

    return null;
  }

  /**
   * Quick reply tanpa prefix (panggil ini sebelum cek prefix di handler kamu)
   * Return true kalau sudah menangani (biar handler kamu bisa `continue`)
   */
  async tryQuickReply(message, sock) {
    try {
      const jid = message.key.remoteJid;
      if (!jid || jid === "status@broadcast") return false;

      const textRaw = extractTextFromAny(message);
      if (!textRaw) return false;

      const text = norm(textRaw);

      // Cooldown per chat
      const last = this._qrCooldown.get(jid) || 0;
      if (Date.now() - last < this.qrCooldownMs) return false;

      for (const item of this.quickReplies) {
        const key = norm(item.match || "");
        if (!key) continue;

        // Cocokkan di awal kalimat (biar gak kebablasan)
        if (text.startsWith(key)) {
          await sock.sendMessage(jid, { text: item.reply || '' });
          this._qrCooldown.set(jid, Date.now());
          return true;
        }

        // Kalau mau mode contains, ganti ke:
        // if (text.includes(key)) {
        //   await sock.sendMessage(jid, { text: item.reply || "" });
        //   this._qrCooldown.set(jid, Date.now());
        //   return true;
        // }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Load all commands from the commands directory
   */
  loadCommands() {
    const commandsDir = path.join(__dirname, "commands");

    if (!fs.existsSync(commandsDir)) {
      console.log("Commands directory not found");
      return;
    }

    const commandFiles = fs
      .readdirSync(commandsDir)
      .filter((f) => f.endsWith(".js"));
    let loadedKeys = 0;

    for (const file of commandFiles) {
      const full = path.join(commandsDir, file);
      try {
        const command = require(full);

        if (
          !command ||
          typeof command.execute !== "function" ||
          !command.name
        ) {
          console.log(`❌ Invalid command structure in ${file}`);
          continue;
        }

        const name = String(command.name).toLowerCase();

        // Daftar nama utama
        this._registerKey(name, command, file);

        // Daftar aliases (opsional)
        if (Array.isArray(command.aliases)) {
          for (const al of command.aliases) {
            if (!al) continue;
            const alias = String(al).toLowerCase();
            this._registerKey(alias, command, file, true);
          }
        }

        // Track unik command object (buat getCommands)
        this._uniqueCommands.add(command);
        loadedKeys++;
      } catch (err) {
        console.log(`❌ Error loading command ${file}:`, err.message);
      }
    }

    console.log(`📦 Total keys loaded (names+aliases): ${this.commands.size}`);
    console.log(`✅ Unique commands: ${this._uniqueCommands.size}`);
  }

  _registerKey(key, command, file, isAlias = false) {
    if (this.commands.has(key)) {
      const tag = isAlias ? "alias" : "name";
      console.warn(`⚠️ Duplicate ${tag} "${key}" in ${file}. Key skipped.`);
      return;
    }
    this.commands.set(key, command);
    console.log(`✅ Loaded ${isAlias ? "alias" : "command"}: ${key}`);
  }

  /**
   * Reload all commands (useful for development)
   */
  reloadCommands() {
    const commandsDir = path.join(__dirname, "commands") + path.sep;

    // Clear module cache for anything under /commands/
    for (const k of Object.keys(require.cache)) {
      if (k.startsWith(commandsDir)) {
        delete require.cache[k];
      }
    }

    this.commands.clear();
    this._uniqueCommands.clear();
    this.loadCommands();
  }

  /**
   * Execute a command (name OR alias, any case)
   * @param {string} commandName
   * @param {Object} message - Baileys message
   * @param {Object} sock - WASocket
   * @param {Array} args
   */
  async executeCommand(commandName, message, sock, args) {
    const key = String(commandName || "").toLowerCase();
    const command = this.commands.get(key);

    if (!command) {
      return false; // unknown command
    }

    // Info dasar buat statistik
    const jid = message.key.remoteJid;
    const isGroup = jid?.endsWith("@g.us");
    const userJid = message.key.participant || message.key.remoteJid;
    const groupJid = isGroup ? jid : null;

    const t0 = Date.now();
    try {
      await command.execute(message, sock, args);

      const durationMs = Date.now() - t0;
      // catat sukses
      record({
        command: command.name, // simpan dengan nama asli (bukan alias)
        userJid,
        groupJid,
        success: true,
        durationMs,
      });

      return true;
    } catch (error) {
      console.error(`Error executing ${command.name}:`, error);

      const durationMs = Date.now() - t0;
      // catat error
      record({
        command: command.name,
        userJid,
        groupJid,
        success: false,
        durationMs,
      });

      // Kirim error ke user
      try {
        await sock.sendMessage(message.key.remoteJid, {
          text: `❌ Terjadi kesalahan saat menjalankan command: ${command.name}`,
        });
      } catch (_) {}

      return false;
    }
  }

  /**
   * Get all available commands (unique, tanpa duplikasi alias)
   */
  getCommands() {
    return Array.from(this._uniqueCommands.values());
  }

  /**
   * Get command by exact key (name/alias, any case)
   */
  getCommand(name) {
    const key = String(name || "").toLowerCase();
    return this.commands.get(key);
  }
}

module.exports = CommandHandler;

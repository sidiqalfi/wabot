const fs = require('fs');
const path = require('path');
const { record } = require('./lib/statsStore'); // ⬅️ tambah: pencatat statistik

class CommandHandler {
  constructor() {
    // Map key = nama/alias (lowercase), value = command object
    this.commands = new Map();
    // Simpan set unik command objects buat listing help (biar alias gak dobel)
    this._uniqueCommands = new Set();
    this.loadCommands();
  }

  /**
   * Load all commands from the commands directory
   */
  loadCommands() {
    const commandsDir = path.join(__dirname, 'commands');

    if (!fs.existsSync(commandsDir)) {
      console.log('Commands directory not found');
      return;
    }

    const commandFiles = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
    let loadedKeys = 0;

    for (const file of commandFiles) {
      const full = path.join(commandsDir, file);
      try {
        const command = require(full);

        if (!command || typeof command.execute !== 'function' || !command.name) {
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
      const tag = isAlias ? 'alias' : 'name';
      console.warn(`⚠️ Duplicate ${tag} "${key}" in ${file}. Key skipped.`);
      return;
    }
    this.commands.set(key, command);
    console.log(`✅ Loaded ${isAlias ? 'alias' : 'command'}: ${key}`);
  }

  /**
   * Reload all commands (useful for development)
   */
  reloadCommands() {
    const commandsDir = path.join(__dirname, 'commands') + path.sep;

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
    const key = String(commandName || '').toLowerCase();
    const command = this.commands.get(key);

    if (!command) {
      return false; // unknown command (biar handler luar bisa kirim "unknown command" sendiri)
    }

    // Info dasar buat statistik
    const jid = message.key.remoteJid;
    const isGroup = jid?.endsWith('@g.us');
    const userJid = message.key.participant || message.key.remoteJid;
    const groupJid = isGroup ? jid : null;

    const t0 = Date.now();
    try {
      await command.execute(message, sock, args);

      const durationMs = Date.now() - t0;
      // catat sukses
      record({
        command: command.name,   // simpan dengan nama asli (bukan alias)
        userJid,
        groupJid,
        success: true,
        durationMs
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
        durationMs
      });

      // Kirim error ke user
      try {
        await sock.sendMessage(message.key.remoteJid, {
          text: `❌ Terjadi kesalahan saat menjalankan command: ${command.name}`
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
    const key = String(name || '').toLowerCase();
    return this.commands.get(key);
  }
}

module.exports = CommandHandler;

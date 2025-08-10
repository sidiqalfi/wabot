module.exports = {
  name: 'help',
  aliases: ['menu'],
  description: 'Menampilkan daftar command yang tersedia',
  usage: 'help [command]',
  category: 'utility',

  async execute(message, sock, args) {
    const CommandHandler = require('../commandHandler');
    const commandHandler = new CommandHandler();
    const commands = commandHandler.getCommands();

    // ---- helpers ambil teks asli dari message (biar bisa deteksi prefix yang dipakai user)
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
        ''
      );
    }

    // ---- resolve prefixes dari .env (comma-separated) dan ambil yang dipakai user
    const raw = process.env.PREFIX || '!';
    const prefixes = raw.split(',').map(p => p.trim()).filter(Boolean);
    const primaryPrefix = prefixes[0] || '!';

    const originalText = (extractTextFromAny(message) || '').trim();
    const usedPrefix = prefixes.find(p => originalText.startsWith(p)) || primaryPrefix;

    // dipakai untuk render contoh & daftar command
    const prefix = usedPrefix;

    if (args.length > 0) {
      // Detail satu command
      const commandName = args[0].toLowerCase();
      const command = commandHandler.getCommand(commandName);

      if (!command) {
        await sock.sendMessage(message.key.remoteJid, {
          text: `❌ Command "${commandName}" tidak ditemukan!`
        });
        return;
      }

      const helpText =
`📚 *Help - ${command.name}*

📝 *Deskripsi:* ${command.description}
💡 *Penggunaan:* ${prefix}${command.usage}
📂 *Kategori:* ${command.category || 'general'}`;

      await sock.sendMessage(message.key.remoteJid, { text: helpText });
    } else {
      // Semua command, per kategori
      const categories = {};
      commands.forEach(cmd => {
        const cat = cmd.category || 'general';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(cmd);
      });

      let helpText =
`📚 *${process.env.BOT_NAME || 'WhatsApp Bot'} - Commands*

🔧 *Prefix:* ${prefix}
📊 *Total Commands:* ${commands.length}

`;

      for (const [cat, cmds] of Object.entries(categories)) {
        helpText += `📂 *${cat.toUpperCase()}*\n`;
        cmds.forEach(cmd => {
          helpText += `  ${prefix}${cmd.name} - ${cmd.description}\n`;
        });
        helpText += `\n`;
      }

      helpText += `💡 *Tip:* Ketik ${prefix}help <command> untuk info detail command`;

      await sock.sendMessage(message.key.remoteJid, { text: helpText });
    }
  }
};

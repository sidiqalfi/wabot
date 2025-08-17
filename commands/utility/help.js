module.exports = {
  name: 'help',
  aliases: ['menu'],
  description: 'Menampilkan daftar command yang tersedia',
  usage: 'help [category|command]',
  category: 'utility',

  async execute(message, sock, args) {
    const CommandHandler = require('../../commandHandler');
    const commandHandler = new CommandHandler();

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
      const query = args[0].toLowerCase();
      
      // Check if it's a category
      const categories = commandHandler.getCategories();
      const categoryInfo = commandHandler.getCategoryInfo();
      
      if (categories.includes(query)) {
        // Show commands in specific category with clean format
        const commands = commandHandler.getCommandsByCategory(query);
        const emoji = getCategoryEmoji(query);
        
        let helpText = `📚 *${process.env.BOT_NAME || 'WhatsApp Bot'} - ${query.toUpperCase()}*\n\n`;
        
        if (commands.length === 0) {
          helpText += `❌ Tidak ada command dalam kategori ini.`;
        } else {
          helpText += `📊 *Total Commands:* ${commands.length}\n\n`;
          helpText += `${emoji} *${query.toUpperCase()} Commands:*\n\n`;
          
          // Sort commands by name
          const sortedCommands = commands.sort((a, b) => a.name.localeCompare(b.name));
          
          sortedCommands.forEach((cmd) => {
            helpText += `• *${prefix}${cmd.name}*`;
            if (cmd.aliases && cmd.aliases.length > 0) {
              helpText += ` (${cmd.aliases.map(alias => prefix + alias).join(', ')})`;
            }
            helpText += `\n  ${cmd.description}\n\n`;
          });
        }
        
        helpText += `💡 *Tip:* Ketik ${prefix}help untuk melihat semua commands`;
        
        await sock.sendMessage(message.key.remoteJid, { text: helpText });
        return;
      }
      
      // Check if it's a command
      const command = commandHandler.getCommand(query);
      if (command) {
        let helpText = `📚 *Help - ${command.name}*

📝 *Deskripsi:* ${command.description}
💡 *Penggunaan:* ${prefix}${command.usage || command.name}
📂 *Kategori:* ${command.category || 'uncategorized'}`;

        // Add aliases if any
        if (command.aliases && command.aliases.length > 0) {
          helpText += `\n🔗 *Aliases:* ${command.aliases.map(alias => prefix + alias).join(', ')}`;
        }

        await sock.sendMessage(message.key.remoteJid, { text: helpText });
        return;
      }
      
      // Not found
      await sock.sendMessage(message.key.remoteJid, {
        text: `❌ Command atau kategori "${query}" tidak ditemukan!\n\n💡 *Tip:* Ketik ${prefix}help untuk melihat semua kategori`
      });
    } else {
      // Show all categories with clean tree format
      const categoryInfo = commandHandler.getCategoryInfo();
      const totalCommands = commandHandler.getCommands().length;
      
      let helpText = `📚 *${process.env.BOT_NAME || 'WhatsApp Bot'} - Command List*

🔧 *Prefix:* ${prefix}
📊 *Total Commands:* ${totalCommands}\n\n`

      // Sort categories by name for consistent display
      const sortedCategories = categoryInfo.sort((a, b) => a.name.localeCompare(b.name));
      
      sortedCategories.forEach((cat, index) => {
        const emoji = getCategoryEmoji(cat.name);
        
        // Category header
        helpText += `${emoji} *${cat.name.toUpperCase()}* (${cat.count} commands)\n`;
        
        // Get commands for this category
        const commands = commandHandler.getCommandsByCategory(cat.name);
        
        if (commands.length > 0) {
          // Sort commands by name
          const sortedCommands = commands.sort((a, b) => a.name.localeCompare(b.name));
          
          sortedCommands.forEach((cmd) => {
            helpText += ` *${prefix}${cmd.name}* - ${cmd.description}\n`;
            
            // Add aliases if any
            // if (cmd.aliases && cmd.aliases.length > 0) {
            //   helpText += ` (${cmd.aliases.map(alias => prefix + alias).join(', ')})`;
            // }
            
            // helpText += `\n    ${cmd.description}\n`;
          });
        }
        
        helpText += `\n`;
      });

      helpText += `💡 *Usage:*\n`;
      helpText += ` ${prefix}help - Tampilkan semua commands\n`;
      helpText += ` ${prefix}help [category] - Tampilkan commands dalam kategori\n`;
      helpText += ` ${prefix}help [command] - Info detail command`;

      await sock.sendMessage(message.key.remoteJid, { text: helpText });
    }
  }
};

// Helper function untuk emoji kategori
function getCategoryEmoji(category) {
  const emojiMap = {
    'utility': '🔧',
    'islamic': '🕌',
    'information': '📊',
    'media': '📱',
    'entertainment': '🎮',
    'games': '🎲',
    'tools': '🛠️',
    'weather': '🌤️',
    'group': '👥',
    'owner': '👑'
  };
  return emojiMap[category] || '📁';
}

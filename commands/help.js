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
        const prefix = process.env.PREFIX || '!';

        if (args.length > 0) {
            // Show specific command help
            const commandName = args[0].toLowerCase();
            const command = commandHandler.getCommand(commandName);
            
            if (!command) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Command "${commandName}" tidak ditemukan!`
                });
                return;
            }

            const helpText = `📚 *Help - ${command.name}*

📝 *Deskripsi:* ${command.description}
💡 *Penggunaan:* ${prefix}${command.usage}
📂 *Kategori:* ${command.category || 'general'}`;

            await sock.sendMessage(message.key.remoteJid, {
                text: helpText
            });
        } else {
            // Show all commands
            const categories = {};
            
            // Group commands by category
            commands.forEach(cmd => {
                const category = cmd.category || 'general';
                if (!categories[category]) {
                    categories[category] = [];
                }
                categories[category].push(cmd);
            });

            let helpText = `📚 *${process.env.BOT_NAME || 'WhatsApp Bot'} - Commands*\n\n`;
            helpText += `🔧 *Prefix:* ${prefix}\n`;
            helpText += `📊 *Total Commands:* ${commands.length}\n\n`;

            for (const [category, cmds] of Object.entries(categories)) {
                helpText += `📂 *${category.toUpperCase()}*\n`;
                cmds.forEach(cmd => {
                    helpText += `  ${prefix}${cmd.name} - ${cmd.description}\n`;
                });
                helpText += '\n';
            }

            helpText += `💡 *Tip:* Ketik ${prefix}help <command> untuk info detail command`;

            await sock.sendMessage(message.key.remoteJid, {
                text: helpText
            });
        }
    }
};

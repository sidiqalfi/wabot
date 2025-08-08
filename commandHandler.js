const fs = require('fs');
const path = require('path');

class CommandHandler {
    constructor() {
        this.commands = new Map();
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

        const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            try {
                const command = require(path.join(commandsDir, file));
                
                if (command.name && command.execute) {
                    this.commands.set(command.name, command);
                    console.log(`✅ Loaded command: ${command.name}`);
                } else {
                    console.log(`❌ Invalid command structure in ${file}`);
                }
            } catch (error) {
                console.log(`❌ Error loading command ${file}:`, error.message);
            }
        }

        console.log(`📦 Total commands loaded: ${this.commands.size}`);
    }

    /**
     * Reload all commands (useful for development)
     */
    reloadCommands() {
        // Clear module cache for commands
        const commandsDir = path.join(__dirname, 'commands');
        Object.keys(require.cache).forEach(key => {
            if (key.startsWith(commandsDir)) {
                delete require.cache[key];
            }
        });

        this.commands.clear();
        this.loadCommands();
    }

    /**
     * Execute a command
     * @param {string} commandName - The command name
     * @param {Object} message - The WhatsApp message object
     * @param {Object} sock - The Baileys socket instance
     * @param {Array} args - Command arguments
     */
    async executeCommand(commandName, message, sock, args) {
        const command = this.commands.get(commandName);
        
        if (!command) {
            return false; // Command not found
        }

        try {
            await command.execute(message, sock, args);
            return true;
        } catch (error) {
            console.error(`Error executing command ${commandName}:`, error);
            
            // Send error message to user
            await sock.sendMessage(message.key.remoteJid, {
                text: `❌ Terjadi kesalahan saat menjalankan command: ${commandName}`
            });
            
            return false;
        }
    }

    /**
     * Get all available commands
     */
    getCommands() {
        return Array.from(this.commands.values());
    }

    /**
     * Get command by name
     */
    getCommand(name) {
        return this.commands.get(name);
    }
}

module.exports = CommandHandler;
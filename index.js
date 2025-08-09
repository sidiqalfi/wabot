require('dotenv').config();
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    jidNormalizedUser 
} = require('baileys');
const qrcode = require('qrcode-terminal');
const CommandHandler = require('./commandHandler');

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
        ''
    );
}

class WhatsAppBot {
    constructor() {
        this.commandHandler = new CommandHandler();
        this.prefix = process.env.PREFIX || '!';
        this.botName = process.env.BOT_NAME || 'WhatsApp Bot';
        this.sock = null;
    }

    /**
     * Initialize the bot
     */
    async initialize() {
        console.log(`🤖 Starting ${this.botName}...`);
        console.log(`🔧 Using prefix: ${this.prefix}`);
        
        await this.createConnection();
    }

    /**
     * Create WhatsApp connection
     */
    async createConnection() {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        
        this.sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: require('pino')({ level: 'silent' })
        });

        // Handle QR code
        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('📱 Scan QR code below:');
                qrcode.generate(qr, { small: true });
            }
            
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('❌ Connection closed due to:', lastDisconnect.error);
                
                if (shouldReconnect) {
                    console.log('🔄 Reconnecting...');
                    await this.createConnection();
                }
            } else if (connection === 'open') {
                console.log('✅ Connected to WhatsApp!');
                console.log(`📞 Bot Number: ${this.sock.user.id}`);
            }
        });

        // Save credentials
        this.sock.ev.on('creds.update', saveCreds);

        // Handle incoming messages
        this.sock.ev.on('messages.upsert', async (messageUpdate) => {
            await this.handleMessage(messageUpdate);
        });
    }

    /**
     * Handle incoming messages
     */
    async handleMessage(messageUpdate) {
        const { messages } = messageUpdate;

        for (const message of messages) {
            try {
                const jid = message.key.remoteJid;
                if (!jid || jid === 'status@broadcast') continue;
                if (message.key.fromMe) continue;

                const text = extractTextFromAny(message);
                if (!text) continue;

                if (!text.startsWith(this.prefix)) continue;

                const withoutPrefix = text.slice(this.prefix.length).trim();
                if (!withoutPrefix) continue;

                const parts = withoutPrefix.split(/\s+/);
                const commandName = (parts.shift() || '').toLowerCase();
                const args = parts;

                const isGroup = jid.endsWith('@g.us');
                const sender = jidNormalizedUser(message.key.participant || message.key.remoteJid);

                console.log(`📝 Command used: ${commandName} | User: ${sender} | Group: ${isGroup ? 'Yes' : 'No'}`);

                const executed = await this.commandHandler.executeCommand(commandName, message, this.sock, args);

                if (!executed) {
                    await this.sendMessage(jid, {
                        text: `❌ Command "${commandName}" not found!`
                    });
                    console.log(`❓ Unknown command: ${commandName}`);
                }
            } catch (err) {
                console.error('handleMessage error:', err);
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
            console.error('Error sending message:', error);
        }
    }

    /**
     * Reload commands (useful for development)
     */
    reloadCommands() {
        this.commandHandler.reloadCommands();
        console.log('🔄 Commands reloaded!');
    }

    /**
     * Get bot status
     */
    getStatus() {
        return {
            connected: this.sock?.user ? true : false,
            commands: this.commandHandler.getCommands().length,
            prefix: this.prefix,
            botName: this.botName
        };
    }
}

// Start the bot
const bot = new WhatsAppBot();
bot.initialize().catch(console.error);

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n👋 Bot shutting down...');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = WhatsAppBot;

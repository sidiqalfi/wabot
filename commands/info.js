require('dotenv').config();

const os = require('os');
const process = require('process');

function formatUptime(seconds) {
    const pad = (s) => (s < 10 ? '0' + s : s);
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

module.exports = {
    name: 'info',
    description: 'Menampilkan info user, grup, bot & server',
    usage: 'info',
    category: 'utility',

    async execute(message, sock, args) {
        try {
            const senderJid = message.key.participant || message.key.remoteJid;
            const senderNumber = senderJid.replace(/[@:\-]/g, '').replace('g.us', '').replace('s.whatsapp.net', '');
            const senderName = message.pushName || 'User';
            const isGroup = message.key.remoteJid.endsWith('@g.us');
            const groupId = isGroup ? message.key.remoteJid : null;

            const now = new Date();
            const waktu = now.toLocaleString('id-ID', {
                timeZone: 'Asia/Jakarta',
                weekday: 'long', year: 'numeric', month: 'long',
                day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
            });

            const developer = process.env.BOT_DEVELOPER || 'Unknown Developer';
            const support = process.env.BOT_SUPPORT || '-';
            const botName = process.env.BOT_NAME || 'WhatsBot';
            const botPrefix = process.env.PREFIX || '!';
            const uptime = formatUptime(process.uptime());

            const platform = os.platform(); // win32, linux, darwin
            const arch = os.arch();
            const totalMem = (os.totalmem() / 1024 / 1024).toFixed(0);
            const usedMem = (process.memoryUsage().rss / 1024 / 1024).toFixed(0);
            const nodeVer = process.version;

            // GRUP METADATA
            let groupName = '-';
            let groupSize = '-';
            let isSenderAdmin = false;
            let isBotAdmin = false;
            let adminCount = 0;

            if (isGroup && sock.groupMetadata) {
                try {
                    const metadata = await sock.groupMetadata(groupId);
                    groupName = metadata.subject;
                    groupSize = metadata.participants.length;

                    const admins = metadata.participants.filter(p => p.admin);
                    adminCount = admins.length;
                    isSenderAdmin = admins.some(p => p.id === senderJid && p.admin);
                    isBotAdmin = admins.some(p => p.id === sock.user.id && p.admin);
                } catch (err) {
                    console.warn('Gagal ambil metadata grup:', err);
                }
            }

            const groupInfoText = isGroup ? 
                `👥 *Group Info: ${groupName}*\n` +
                `├ ID: ${groupId}\n` +
                `├ Total Member: ${groupSize}\n` +
                `├ Jumlah Admin: ${adminCount}\n` +
                `├ Status Kamu: ${isSenderAdmin ? '🛡️ Admin' : '👤 Member'}\n` +
                `└ Status Bot: ${isBotAdmin ? '✅ Admin' : '⛔ Bukan Admin'}\n\n`
                : '';

            const result =
                `${isGroup ? '📢 *INFO DARI GRUP*\n\n' : '💬 *INFO DARI PRIVATE CHAT*\n\n'}` +
                `👤 *User Info*\n` +
                `├ Nama: ${senderName}\n` +
                `├ Nomor: wa.me/${senderNumber}\n` +
                `└ Akses: ${waktu}\n\n` +

                groupInfoText +

                `🤖 *Bot Info*\n` +
                `├ Nama Bot: ${botName}\n` +
                `├ Prefix: ${botPrefix}\n` +
                `├ Developer: ${developer}\n` +
                `├ Support: ${support}\n` +
                `└ Uptime: ${uptime}\n\n` +

                `🖥️ *Server Stats*\n` +
                `├ Platform: ${platform} (${arch})\n` +
                `├ Node.js: ${nodeVer}\n` +
                `├ RAM: ${usedMem}MB / ${totalMem}MB\n` +
                `└ CPU Core: ${os.cpus().length}`;

            await sock.sendMessage(message.key.remoteJid, {
                text: result
            });

        } catch (err) {
            console.error(`Error in ${this.name} command:`, err);
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Gagal mengambil info.'
            });
        }
    }
};


const axios = require('axios');

module.exports = {
    name: 'meme',
    description: 'Kirim meme random bahasa Indonesia',
    usage: 'meme',
    category: 'fun',

    async execute(message, sock, args) {
        const jid = message.key.remoteJid;
        try {
            // Ambil meme dari API candaan
            const res = await axios.get('https://candaan-api.vercel.app/api/image/random');
            if (!res.data || !res.data.data || !res.data.data.url) {
                await sock.sendMessage(jid, { text: '❌ Gagal mengambil meme.' });
                return;
            }

            const memeUrl = res.data.data.url;

            // Kirim meme ke user/grup
            await sock.sendMessage(jid, {
                image: { url: memeUrl },
                caption: '😂 *Meme Random Bahasa Indonesia*'
            });

        } catch (err) {
            console.error(`Error in ${this.name} command:`, err.message);
            await sock.sendMessage(jid, { text: '❌ Gagal mengambil meme. Coba lagi nanti.' });
        }
    }
};


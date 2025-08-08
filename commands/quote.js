const axios = require('axios');

module.exports = {
    name: 'quote',
    description: 'Mengirim quote motivasi/random',
    usage: 'quote',
    category: 'fun',

    async execute(message, sock, args) {
        try {
            // Panggil API dari zenquotes.io
            const response = await axios.get('https://zenquotes.io/api/random');
            const data = response.data[0]; // hasilnya array berisi 1 object

            const quoteText = data.q;
            const quoteAuthor = data.a;

            const result = `💬 *Quote Hari Ini:*\n\n"${quoteText}"\n\n— *${quoteAuthor}*`;

            await sock.sendMessage(message.key.remoteJid, {
                text: result
            });

        } catch (error) {
            console.error(`Error in ${this.name} command:`, error);

            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Gagal mengambil quote. Coba lagi nanti ya.'
            });
        }
    }
}

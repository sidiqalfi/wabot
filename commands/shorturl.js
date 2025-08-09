const axios = require('axios');
const { getLinkPreview } = require('link-preview-js');

module.exports = {
    name: 'shorturl',
    description: 'Memendekkan link menggunakan TinyURL + preview',
    usage: 'shorturl <link> [alias opsional]',
    category: 'utility',

    async execute(message, sock, args) {
        try {
            const remoteJid = message.key.remoteJid;

            // Ambil argumen atau dari reply
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
            const directText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
            let url = args.length ? args[0].trim() : (quotedText || directText).trim();

            if (!url) {
                await sock.sendMessage(remoteJid, {
                    text: '❌ Masukkan link atau reply ke pesan yang berisi link.\n\nContoh:\n!shorturl https://example.com'
                });
                return;
            }

            const alias = args[1] ? args[1].trim() : null;

            // Validasi link
            if (!/^https?:\/\//i.test(url)) {
                await sock.sendMessage(remoteJid, { text: '❌ Link harus diawali dengan http:// atau https://' });
                return;
            }

            // API TinyURL (alias opsional, tapi kadang harus pro account)
            let apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`;
            if (alias) {
                apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}&alias=${encodeURIComponent(alias)}`;
            }

            const res = await axios.get(apiUrl, { timeout: 8000 });
            const shortLink = res.data;

            if (!shortLink.startsWith('http')) {
                await sock.sendMessage(remoteJid, { text: `❌ Gagal memendekkan link: ${shortLink}` });
                return;
            }

            // Ambil preview link
            let previewData = null;
            try {
                previewData = await getLinkPreview(url, { timeout: 5000 });
            } catch (e) {
                console.warn('Gagal ambil preview:', e.message);
            }

            if (previewData?.images?.length) {
                await sock.sendMessage(remoteJid, {
                    image: { url: previewData.images[0] },
                    caption:
                        `✅ *Link berhasil dipendekkan!*\n\n` +
                        `🔗 Original: ${url}\n` +
                        `✂️ Short: ${shortLink}\n\n` +
                        `${previewData.title ? `📌 ${previewData.title}\n` : ''}` +
                        `${previewData.description ? `📝 ${previewData.description}\n` : ''}`
                });
            } else {
                await sock.sendMessage(remoteJid, {
                    text:
                        `✅ *Link berhasil dipendekkan!*\n\n` +
                        `🔗 Original: ${url}\n` +
                        `✂️ Short: ${shortLink}`
                });
            }

        } catch (err) {
            console.error(`Error in ${this.name} command:`, err);
            await sock.sendMessage(remoteJid, {
                text: '❌ Gagal memendekkan link. Coba lagi nanti.'
            });
        }
    }
};


const translate = require('google-translate-api-x');

module.exports = {
    name: 'translate',
    description: 'Menerjemahkan teks ke bahasa tertentu',
    usage: 'translate <kode_bahasa> <teks>',
    category: 'utility',

    async execute(message, sock, args) {
        try {
            const remoteJid = message.key.remoteJid;

            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
            const directText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';

            if (args.length < 2 && !quotedText) {
                await sock.sendMessage(remoteJid, {
                    text: '❌ Format salah.\n\nContoh:\n!translate en Selamat pagi'
                });
                return;
            }

            const targetLang = args[0];
            const textToTranslate = quotedText || args.slice(1).join(' ') || directText;

            if (!/^[a-z]{2}$/i.test(targetLang)) {
                await sock.sendMessage(remoteJid, { text: '❌ Kode bahasa harus 2 huruf. Contoh: en, id, ja' });
                return;
            }

            const res = await translate(textToTranslate, { to: targetLang });
            const detectedLang = res.from.language.iso;

            await sock.sendMessage(remoteJid, {
                text:
                    `🌐 *Translate Result*\n` +
                    `📥 Dari (${detectedLang}): ${textToTranslate}\n\n` +
                    `📤 Ke (${targetLang}): ${res.text}`
            });

        } catch (err) {
            console.error(`Error in ${this.name} command:`, err);
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Gagal menerjemahkan teks.'
            });
        }
    }
};


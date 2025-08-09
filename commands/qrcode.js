const QRCode = require('qrcode');

module.exports = {
    name: 'qrcode',
    description: 'Generate QR code dari teks atau link',
    usage: 'qrcode [teks/link] (bisa juga reply ke pesan teks)',
    category: 'utility',

    async execute(message, sock, args) {
        try {
            const remoteJid = message.key.remoteJid;

            // Ambil teks dari argumen / caption / reply
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedText = quoted?.conversation
                || quoted?.extendedTextMessage?.text
                || quoted?.imageMessage?.caption
                || quoted?.videoMessage?.caption
                || '';

            const directText =
                message.message?.conversation
                || message.message?.extendedTextMessage?.text
                || '';

            // Args menang kalau ada, else quoted, else direct
            let input = args.length ? args.join(' ').trim() : (quotedText || '').trim();
            if (!input) input = directText.trim();

            if (!input) {
                await sock.sendMessage(remoteJid, {
                    text: '❌ Masukkan teks/link atau reply ke pesan teks.\n\nContoh:\n!qrcode https://example.com\natau reply -> !qrcode'
                });
                return;
            }

            // Parsing opsi ringan (opsional):
            // Format: !qrcode --size=512 --eclevel=H <teks>
            // Default: size=512, eclevel=M
            const sizeMatch = input.match(/--size=(\d{2,4})/i);
            const ecMatch = input.match(/--eclevel=(L|M|Q|H)/i);
            const size = sizeMatch ? Math.min(2048, Math.max(128, parseInt(sizeMatch[1], 10))) : 512;
            const errorCorrectionLevel = ecMatch ? ecMatch[1] : 'M';

            // Bersihkan flag dari input
            input = input
                .replace(/--size=\d{2,4}/i, '')
                .replace(/--eclevel=(L|M|Q|H)/i, '')
                .trim();

            if (!input) {
                await sock.sendMessage(remoteJid, { text: '❌ Teks kosong setelah parsing opsi. Coba lagi.' });
                return;
            }

            // Generate QR ke buffer PNG
            const pngBuffer = await QRCode.toBuffer(input, {
                errorCorrectionLevel,
                width: size,
                margin: 2,
                type: 'png',
                color: { dark: '#000000', light: '#FFFFFF' }
            });

            const caption =
                `✅ *QR Code Berhasil Dibuat*\n` +
                `📝 Konten: ${input.length > 200 ? input.slice(0, 200) + '…' : input}\n` +
                `📐 Size: ${size}px | 🔧 EC: ${errorCorrectionLevel}`;

            await sock.sendMessage(remoteJid, {
                image: pngBuffer,
                caption
            });

        } catch (err) {
            console.error(`Error in ${this.name} command:`, err);
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Gagal generate QR. Coba lagi, atau pastikan teks tidak terlalu panjang.'
            });
        }
    }
};

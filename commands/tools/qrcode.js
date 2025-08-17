const QRCode = require('qrcode');

module.exports = {
  name: 'qrcode',
  description: 'Generate QR code dari teks atau link',
  usage: 'qrcode [teks/link] (atau reply ke pesan teks)\nContoh: qrcode https://example.com\nContoh reply: (reply ke teks) -> qrcode --size=512',
  category: 'utility',

  async execute(message, sock, args) {
    try {
      const remoteJid = message.key.remoteJid;

      // Ambil dari reply saja (kalau ada)
      const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const quotedText = quoted?.conversation
        || quoted?.extendedTextMessage?.text
        || quoted?.imageMessage?.caption
        || quoted?.videoMessage?.caption
        || '';

      // 1) Susun candidate input dari args (lebih prioritas)
      let input = (args && args.length) ? args.join(' ').trim() : '';

      // 2) Jika args kosong, gunakan quotedText
      if (!input && quotedText) input = quotedText.trim();

      // 3) Kalau tetap kosong, tolak. Jangan fallback ke directText (command-nya sendiri)
      if (!input) {
        await sock.sendMessage(remoteJid, {
          text:
            '❌ Perlu argumen atau reply ke pesan teks.\n\n' +
            'Contoh:\n' +
            '• qrcode https://example.com\n' +
            '• (reply ke teks) -> qrcode --size=512 --eclevel=H'
        });
        return;
      }

      // Parsing opsi: --size dan --eclevel
      const sizeMatch = input.match(/--size=(\d{2,4})/i);
      const ecMatch = input.match(/--eclevel=(L|M|Q|H)/i);
      const size = sizeMatch ? Math.min(2048, Math.max(128, parseInt(sizeMatch[1], 10))) : 512;
      const errorCorrectionLevel = ecMatch ? ecMatch[1] : 'M';

      // Bersihkan flag dari input
      input = input
        .replace(/--size=\d{2,4}/i, '')
        .replace(/--eclevel=(L|M|Q|H)/i, '')
        .trim();

      // 4) Setelah bersihin flag, payload wajib ada
      if (!input) {
        await sock.sendMessage(remoteJid, {
          text: '❌ Teks kosong setelah parsing opsi. Tambahkan konten setelah flag. Contoh: qrcode --size=512 Halo dunia'
        });
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
      console.error(`Error in qrcode command:`, err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Gagal generate QR. Coba lagi, atau pastikan teks tidak terlalu panjang.'
      });
    }
  }
};

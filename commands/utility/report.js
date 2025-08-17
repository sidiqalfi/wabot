require('dotenv').config();

module.exports = {
  name: 'report',
  aliases: ['bug', 'lapor'],
  description: 'Melaporkan bug atau mengirimkan pesan ke owner bot.',
  usage: 'report <pesan>',
  category: 'utility',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;
    const senderJid = message.key.participant || message.key.remoteJid;
    const senderName = message.pushName || 'Tidak Dikenal';

    try {
      const ownerNumber = process.env.BOT_SUPPORT;
      if (!ownerNumber) {
        return sock.sendMessage(jid, { text: 'Fitur report tidak aktif karena nomor owner belum diatur.' });
      }

      const reportMessage = args.join(' ');
      if (!reportMessage) {
        return sock.sendMessage(jid, { text: `Silakan masukkan pesan laporan Anda.\n\n*Contoh:* /report command /sticker tidak berfungsi` });
      }

      // Format JID owner dengan membersihkan nomor dan menambahkan sufix
      const ownerJid = `${ownerNumber.replace(/\D/g, '')}@s.whatsapp.net`;

      // Format pesan yang akan diteruskan ke owner
      const forwardMessage = `
*-- ❗ LAPORAN BARU ❗ --*

*👤 Dari:*
- *Nama:* ${senderName}
- *JID:* ${senderJid}

*💬 Pesan:*
${reportMessage}
      `.trim();

      // 1. Kirim laporan ke owner
      await sock.sendMessage(ownerJid, { text: forwardMessage });

      // 2. Kirim konfirmasi ke user yang melapor
      await sock.sendMessage(jid, { text: '✅ Laporan Anda telah berhasil diteruskan ke owner. Terima kasih atas masukan Anda!' });

    } catch (err) {
      console.error('[REPORT] Error:', err);
      await sock.sendMessage(jid, { text: 'Gagal mengirim laporan. Mohon coba lagi nanti.' });
    }
  },
};

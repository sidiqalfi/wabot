require('dotenv').config();

module.exports = {
  name: 'rules',
  aliases: ['peraturan', 'rule'],
  description: 'Menampilkan peraturan penggunaan bot.',
  usage: 'rules',
  category: 'utility',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;
    const botName = process.env.BOT_NAME || 'WhatsApp Bot';

    try {
      const rulesText = `
📜 *Peraturan Penggunaan ${botName}* 📜

Untuk menjaga kenyamanan bersama, mohon patuhi beberapa aturan sederhana berikut saat menggunakan bot ini:

1️⃣ *Jangan Spam*
   - Jangan mengirimkan perintah secara berulang-ulang dalam waktu singkat (spamming/flooding). Beri jeda beberapa detik antar perintah.

2️⃣ *Dilarang Menelpon*
   - Jangan menelpon atau video call nomor bot ini. Panggilan akan otomatis diblokir oleh sistem.

3️⃣ *Gunakan dengan Bijak*
   - Gunakan fitur-fitur bot untuk tujuan yang semestinya. Dilarang keras menyalahgunakan bot untuk aktivitas yang melanggar hukum atau merugikan orang lain.

4️⃣ *Pencatatan & Privasi*
   - Bot mungkin mencatat riwayat penggunaan perintah (tanpa membaca isi pesan pribadi Anda) untuk tujuan statistik dan perbaikan layanan.

5️⃣ *Sanksi*
   - Pelanggaran terhadap aturan di atas, terutama spam dan penyalahgunaan, dapat mengakibatkan pemblokiran sementara atau permanen dari bot.

Terima kasih atas kerja samanya! 🙏
      `.trim();

      const buttons = [
        { buttonId: '/help', buttonText: { displayText: '📜 Menu Utama' }, type: 1 },
        { buttonId: '/owner', buttonText: { displayText: '👤 Kontak Owner' }, type: 1 }
      ];

      const buttonMessage = {
        text: rulesText,
        footer: botName,
        buttons: buttons,
        headerType: 1
      };

      await sock.sendMessage(jid, buttonMessage);

    } catch (err) {
      console.error('[RULES] Error:', err);
      await sock.sendMessage(jid, { text: 'Gagal menampilkan peraturan.' });
    }
  },
};

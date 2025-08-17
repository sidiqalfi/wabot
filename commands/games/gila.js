module.exports = {
  name: 'gila',
  description: 'Cek seberapa gila seseorang 🤪',
  usage: 'gila [@user]',
  category: 'fun',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;
    try {
      const isGroup = jid.endsWith('@g.us');
      const sender = message.key.participant || message.key.remoteJid;
      const ctx = message.message?.extendedTextMessage?.contextInfo;
      const mentioned = ctx?.mentionedJid || [];

      // Format mention jadi @username
      const at = j => '@' + (j.split('@')[0].replace(/[^0-9]/g, '') || 'user');

      let target;
      if (mentioned.length > 0) {
        target = mentioned[0];
      } else {
        target = sender;
      }

      // Persentase random
      const percent = Math.floor(Math.random() * 101); // 0-100
      const comment = pickComment(percent);

      let caption;
      let mentions = [];

      if (isGroup) {
        caption =
          `🌀 *Tes Kegilaan*\n` +
          `Target: ${at(target)}\n` +
          `📊 Level: *${percent}%*\n` +
          `💬 Komentar: ${comment}`;
        mentions = [target];
      } else {
        caption =
          `🌀 *Tes Kegilaan*\n` +
          `📊 Level: *${percent}%*\n` +
          `💬 Komentar: ${comment}`;
      }

      await sock.sendMessage(jid, { text: caption, mentions });

    } catch (err) {
      console.error(`Error in ${this.name} command:`, err);
      await sock.sendMessage(jid, {
        text: '❌ Gagal menghitung kegilaan. Coba lagi nanti.'
      });
    }
  }
};

// Komentar lucu berdasarkan persentase
function pickComment(p) {
  if (p >= 100) return '👑 Udah gak bisa diukur, ini gila versi DLC!';
  if (p >= 95) return '🚀 Meledak! Level kegilaan udah nembus stratosfer.';
  if (p >= 90) return '⚡ Mode Ultra Instinct, semua kaget liat tingkah lo.';
  if (p >= 85) return '🔥 Udah kebakar sama ide-ide absurd tiap hari.';
  if (p >= 80) return '💥 Satu kata: Tidak ada rem.';
  if (p >= 75) return '🔥 Nyala abangku, gila tapi produktif!';
  if (p >= 70) return '😈 Gila elegan, ada class-nya.';
  if (p >= 65) return '🤯 Otak udah kayak jalur tol, lurus ke arah kegilaan.';
  if (p >= 60) return '🤪 Gak ada obatnya, minum panadol pun percuma.';
  if (p >= 55) return '💫 Jalan pikiran muter kayak kipas angin rusak.';
  if (p >= 50) return '🌀 Udah setengah masuk dimensi lain.';
  if (p >= 45) return '😜 Masih waras dikit, tapi bahaya kalau tengah malam.';
  if (p >= 40) return '🧐 Warasnya cuma formalitas.';
  if (p >= 35) return '🙃 Kadang normal, kadang bikin orang geleng kepala.';
  if (p >= 30) return '🙂 Masih normal... kayaknya.';
  if (p >= 25) return '🛋️ Santai aja, belum masuk kategori gila berat.';
  if (p >= 20) return '🚶 Masih bisa diajak ngobrol serius, walau rawan nyeleneh.';
  if (p >= 15) return '🍵 Cuma sedikit nyeleneh, aman buat nongkrong bareng.';
  if (p >= 10) return '📚 Lebih banyak mikir logis, tapi ada sisi absurdnya.';
  if (p >= 5)  return '🍼 Baru belajar gila, masih kaku.';
  return '🪹 Polos banget, belum ngerti gila.';
}

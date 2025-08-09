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
  if (p >= 90) return '🚀 Udah level dewa, gila tapi bikin kagum!';
  if (p >= 75) return '🔥 Nyala abangku, gila tapi produktif!';
  if (p >= 60) return '🤪 Gak ada obatnya, minum panadol pun percuma.';
  if (p >= 45) return '😜 Masih waras dikit, tapi bahaya kalau tengah malam.';
  if (p >= 30) return '🙂 Masih normal... kayaknya.';
  if (p >= 15) return '🛋️ Santai aja, belum masuk kategori gila.';
  return '🍼 Bayi banget, belum ngerti gila.';
}

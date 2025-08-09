module.exports = {
  name: 'roast',
  description: 'Ngasih roast pedes ke target 🔥',
  usage: 'roast [@user] | reply pesan',
  category: 'fun',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;
    try {
      const isGroup = jid.endsWith('@g.us');
      const sender = message.key.participant || message.key.remoteJid;
      const ctx = message.message?.extendedTextMessage?.contextInfo;
      const mentioned = ctx?.mentionedJid || [];
      const quotedSender = ctx?.participant;

      // Helper mention
      const at = j => '@' + (j.split('@')[0].replace(/[^0-9]/g, '') || 'user');

      let target;
      if (mentioned.length > 0) {
        target = mentioned[0];
      } else if (quotedSender) {
        target = quotedSender;
      } else {
        target = sender;
      }

      // List roast aman tapi pedes
      const roasts = [
        'Kalau IQ kamu harga diskon, tetep gak ada yang mau beli.',
        'Muka kamu kayak template meme yang belum di-edit.',
        'Kamu tuh kayak update Windows… berat, lama, dan sering bikin error.',
        'Kalau jadi aplikasi, kamu udah di-uninstall dari lama.',
        'Bukan aku yang bilang, tapi vibes kamu tuh “loading terus 99%”.',
        'Kamu itu kayak sandi Wi-Fi tetangga… gak pernah nyambung.',
        'Kamu cocok ikut lomba tidur, juara 1 pasti.',
        'Kadang aku mikir, kamu lah alasan kenapa manual book dibuat.',
        'Kamu tuh kayak iklan YouTube… nyebelin tapi harus ditunggu.',
        'Kalau jadi sinetron, kamu udah tamat di episode 2.'
      ];

      const roast = roasts[Math.floor(Math.random() * roasts.length)];

      let caption;
      let mentions = [];

      if (isGroup) {
        caption = `🔥 *Roast Time!*\n${at(target)}, ${roast}`;
        mentions = [target];
      } else {
        caption = `🔥 *Roast Time!*\n${roast}`;
      }

      await sock.sendMessage(jid, { text: caption, mentions });

    } catch (err) {
      console.error(`Error in ${this.name} command:`, err);
      await sock.sendMessage(jid, {
        text: '❌ Gagal roasting. Coba lagi nanti.'
      });
    }
  }
};

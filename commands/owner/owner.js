// owner.js
require('dotenv').config();

module.exports = {
  name: 'owner',
  aliases: ['creator', 'developer'],
  description: 'Mengirimkan kontak owner/developer bot.',
  usage: 'owner',
  category: 'utility',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;

    try {
      const ownerNumber = process.env.BOT_SUPPORT;
      const displayName = process.env.BOT_DEVELOPER || 'Owner Bot';
      const botName = process.env.BOT_NAME || 'WhatsApp Bot';

      if (!ownerNumber) {
        return sock.sendMessage(jid, { text: 'Nomor owner belum diatur di file .env (BOT_SUPPORT).' });
      }

      // Bersihkan nomor dari karakter selain angka untuk wa.me link
      const sanitizedNumber = ownerNumber.replace(/\D/g, '');
      if (!sanitizedNumber) {
        return sock.sendMessage(jid, { text: 'Format nomor owner di .env (BOT_SUPPORT) tidak valid.' });
      }
      
      const waMeLink = `https://wa.me/${sanitizedNumber}`;

      const text = `Ini adalah kontak owner bot:\n\n*Nama:* ${displayName}\n*Nomor:* ${ownerNumber}\n\nAnda bisa langsung menyapanya melalui link berikut: ${waMeLink}`;

      const buttons = [
        { buttonId: '/help', buttonText: { displayText: '📜 Menu Utama' }, type: 1 },
        { buttonId: '/ping', buttonText: { displayText: '📡 Tes Kecepatan' }, type: 1 }
      ];

      const buttonMessage = {
        text: text,
        footer: botName,
        buttons: buttons,
        headerType: 1
      };

      await sock.sendMessage(jid, buttonMessage);

    } catch (err) {
      console.error('[OWNER] Error:', err);
      await sock.sendMessage(jid, { text: 'Gagal mengirim info owner.' });
    }
  },
};

// slot.js
// Command: /slot
// Main slot machine with random emojis
// Aliases: 'slots', 'spin'

module.exports = {
  name: 'slot',
  aliases: ['slots', 'spin'],
  description: 'Main mesin slot, tes keberuntungan!',
  usage: 'slot',
  category: 'fun',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;

    try {
      // Simbol slot
      const symbols = ['🍒', '🍋', '🍉', '🍇', '🍎', '🍌', '⭐', '💎', '7️⃣', '🍀'];
      const roll = () => symbols[Math.floor(Math.random() * symbols.length)];

      // Hasil
      const s1 = roll();
      const s2 = roll();
      const s3 = roll();

      let resultText;
      if (s1 === s2 && s2 === s3) {
        resultText = `🎉 JACKPOT! Tiga ${s1} berderet!`;
      } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        resultText = `✨ Lumayan! Dapet dua ${s1 === s2 ? s1 : s2 === s3 ? s2 : s1}`;
      } else {
        resultText = `💀 Zonk! Coba lagi, keberuntungan belum nyampe.`;
      }

      const caption = [
        '🎰 *SLOT MACHINE* 🎰',
        `│ ${s1} │ ${s2} │ ${s3} │`,
        '──────────────',
        resultText
      ].join('\n');

      await sock.sendMessage(jid, { text: caption });

    } catch (err) {
      console.error(`[slot] error:`, err);
      await sock.sendMessage(jid, { text: '❌ Gagal memutar slot. Coba lagi nanti.' });
    }
  }
};

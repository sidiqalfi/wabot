const axios = require('axios');

module.exports = {
  name: 'fact',
  description: 'Kasih fakta random yang unik atau lucu',
  usage: 'fact',
  category: 'fun',

  async execute(message, sock) {
    const jid = message.key.remoteJid;
    try {
      let fact;

      // Coba ambil dari API
      try {
        const res = await axios.get('https://asli-fun-fact-api.vercel.app/api/facts');
        if (res.data && res.data.data && res.data.data.fact) {
          fact = res.data.data.fact;
        }
      } catch (apiErr) {
        console.warn('API randomfact gagal, pake fallback lokal.');
      }

      // Fallback list lokal
      if (!fact) {
        const localFacts = [
          'Semut tidak bisa tidur.',
          'Pisang adalah berry, tapi strawberry bukan.',
          'Koala sidik jarinya mirip manusia.',
          'Otak manusia 60% terdiri dari lemak.',
          'Kupu-kupu bisa merasakan rasa dengan kakinya.',
          'Air panas bisa membeku lebih cepat daripada air dingin (Efek Mpemba).',
          'Hiu sudah ada sebelum pohon tumbuh di bumi.',
          'Gajah adalah satu-satunya hewan yang tidak bisa lompat.',
          'Madu tidak pernah basi.',
          'Kanguru tidak bisa berjalan mundur.'
        ];
        fact = localFacts[Math.floor(Math.random() * localFacts.length)];
      }

      await sock.sendMessage(jid, {
        text: `📚 *Random Fact*\n\n${fact}`
      });

    } catch (err) {
      console.error(`Error in ${this.name} command:`, err);
      await sock.sendMessage(jid, {
        text: '❌ Gagal mengambil fakta. Coba lagi nanti.'
      });
    }
  }
};

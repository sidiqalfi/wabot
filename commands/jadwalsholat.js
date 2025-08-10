const axios = require('axios');

module.exports = {
  name: 'jadwalsholat',
  aliases: ['sholat', 'praytime'],
  description: 'Cek jadwal sholat (myQuran v2)',
  usage: 'jadwalsholat <kota> [YYYY-MM-DD]',
  category: 'info',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;
    try {
      if (args.length === 0) {
        await sock.sendMessage(jid, { text: '❌ Contoh: `!jadwalsholat jakarta` atau `!jadwalsholat bandung 2025-08-12`' });
        return;
      }

      const qKota = args[0].toLowerCase();
      const tanggal = (args[1] && /^\d{4}-\d{2}-\d{2}$/.test(args[1])) 
        ? args[1] 
        : new Date().toISOString().slice(0,10);

      // 1) Coba endpoint cari kota v2
      let kota;
      try {
        const r = await axios.get(`https://api.myquran.com/v2/sholat/kota/cari/${encodeURIComponent(qKota)}`, { timeout: 12000 });
        const data = r.data?.data || [];
        kota = data[0]; // ambil match pertama
      } catch {
        kota = null;
      }

      // 2) Fallback: ambil semua lalu filter lokal
      if (!kota) {
        const rAll = await axios.get('https://api.myquran.com/v2/sholat/kota/semua', { timeout: 15000 });
        const list = rAll.data?.data || [];
        const cand = list.filter(x => x.lokasi?.toLowerCase().includes(qKota));
        kota = cand[0];
      }

      if (!kota) {
        await sock.sendMessage(jid, { text: `❌ Kota "${qKota}" tidak ditemukan di basis data.` });
        return;
      }

      // 3) Ambil jadwal harian v2
      const jad = await axios.get(`https://api.myquran.com/v2/sholat/jadwal/${kota.id}/${tanggal}`, { timeout: 12000 });
      const j = jad.data?.data?.jadwal;
      if (!j) {
        await sock.sendMessage(jid, { text: '❌ Gagal ambil jadwal. Coba tanggal lain.' });
        return;
      }

      const teks =
`🕌 *Jadwal Sholat* — ${kota.lokasi}
📅 ${j.tanggal}

🌅 Subuh   : ${j.subuh}
🌞 Terbit  : ${j.terbit}
🌤️ Dhuha   : ${j.dhuha}
🏙️ Dzuhur  : ${j.dzuhur}
🌇 Ashar   : ${j.ashar}
🌆 Maghrib : ${j.maghrib}
🌙 Isya    : ${j.isya}`;

      await sock.sendMessage(jid, { text: teks });

    } catch (err) {
      console.error(`Error in ${this.name} command:`, err?.response?.data || err.message);
      await sock.sendMessage(jid, { text: '❌ Layanan jadwal sholat lagi bermasalah. Coba beberapa saat lagi.' });
    }
  }
};

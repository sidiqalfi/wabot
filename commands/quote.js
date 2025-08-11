// quote.js (ZenQuotes-only + fallback lokal 20 kutipan)
// Dependensi: axios (npm i axios)
// Opsional: set .env MYMEMORY_EMAIL=youremail@domain.com buat nambah kuota terjemahan

const axios = require('axios');

module.exports = {
  name: 'quote',
  description: 'Kutipan motivasi harian secara acak',
  usage: 'quote',
  category: 'fun',

  async execute(message, sock) {
    const jid = message.key.remoteJid;

    const http = axios.create({
      timeout: 12000,
      headers: { 'User-Agent': 'WhatsAppBot/1.0 (+nodejs)' }
    });

    const localFallback = [
      { content: 'Kemajuan itu nyebelin di awal, nagih di akhir.', author: 'Anonim' },
      { content: 'Sedikit tiap hari lebih kuat daripada banyak tapi cuma sekali.', author: 'Anonim' },
      { content: 'Mulai dulu, rapihin sambil jalan. Kesempurnaan datang belakangan.', author: 'Anonim' },
      { content: 'Disiplin itu milih yang kamu mau paling nanti, bukan paling sekarang.', author: 'Anonim' },
      { content: 'Kalau nunggu mood, targetmu bakal tetap jadi cerita tidur.', author: 'Anonim' },
      { content: 'Keberanian itu bukan tanpa takut, tapi jalan bareng takutnya.', author: 'Anonim' },
      { content: 'Fokus pada langkah berikutnya, bukan tangga penuh drama.', author: 'Anonim' },
      { content: 'Konsisten itu skill super yang kelihatan biasa.', author: 'Anonim' },
      { content: 'Hasil hebat lahir dari kebiasaan kecil yang diulang.', author: 'Anonim' },
      { content: 'Yang cepat bukan selalu menang. Yang tahan lama seringnya juara.', author: 'Anonim' },
      { content: 'Kamu nggak telat. Kamu cuma baru mulai sekarang.', author: 'Anonim' },
      { content: 'Jangan bandingkan prosesmu dengan highlight orang lain.', author: 'Anonim' },
      { content: 'Ragu boleh, berhenti jangan.', author: 'Anonim' },
      { content: 'Kalau capek, istirahat. Habis itu lanjut.', author: 'Anonim' },
      { content: 'Tujuan jelas bikin “tidak mood” nggak relevan.', author: 'Anonim' },
      { content: 'Satu halaman sehari tetap bikin buku selesai.', author: 'Anonim' },
      { content: 'Yang penting gerak. Yang lain nyusul.', author: 'Anonim' },
      { content: 'Jika tidak menanam, jangan kaget kalau tidak panen.', author: 'Anonim' },
      { content: 'Kebiasaanmu hari ini adalah hidupmu besok.', author: 'Anonim' },
      { content: 'Lebih baik canggung memulai daripada elegan menunda.', author: 'Anonim' }
    ];

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    async function withRetry(fn, { tries = 2, delay = 600 } = {}) {
      let lastErr;
      for (let i = 0; i < tries; i++) {
        try {
          return await fn();
        } catch (e) {
          lastErr = e;
          if (i < tries - 1) await new Promise(r => setTimeout(r, delay * (i + 1)));
        }
      }
      throw lastErr;
    }

    async function translateToID(text) {
      try {
        if (!text || text.length < 3) return text;
        const q = text.slice(0, 450);
        const params = new URLSearchParams({ q, langpair: 'en|id' });
        if (process.env.MYMEMORY_EMAIL) params.append('de', process.env.MYMEMORY_EMAIL);
        const url = `https://api.mymemory.translated.net/get?${params.toString()}`;
        const { data } = await http.get(url);
        const out = data?.responseData?.translatedText;
        return typeof out === 'string' && out.trim() ? out.trim() : text;
      } catch {
        return text;
      }
    }

    async function fetchFromZenQuotes() {
      // https://zenquotes.io/api/random
      const { data } = await http.get('https://zenquotes.io/api/random');
      const q = Array.isArray(data) ? data[0] : data;
      if (!q?.q) throw new Error('Invalid response from ZenQuotes');
      return { contentEN: q.q, author: q.a || 'Unknown' };
    }

    try {
      // 1) Ambil dari ZenQuotes (retry)
      let quote;
      try {
        quote = await withRetry(fetchFromZenQuotes, { tries: 2, delay: 700 });
      } catch {
        // 2) Fallback lokal
        const lf = pick(localFallback);
        await sock.sendMessage(jid, {
          text: `✨ *Quote Hari Ini*\n“${lf.content}”\n— ${lf.author}`
        });
        return;
      }

      // 3) Terjemahkan ke Indonesia
      const idText = await translateToID(quote.contentEN);

      // 4) Kirim
      const lines = [
        '✨ *Quote Hari Ini*',
        '',
        `“${idText}”`,
        '',
        `— ${quote.author}`
      ];
      await sock.sendMessage(jid, { text: lines.join('\n') });

    } catch (err) {
      // Fallback terakhir: lokal random
      const lf = pick(localFallback);
      await sock.sendMessage(jid, {
        text: `✨ *Quote Hari Ini*\n“${lf.content}”\n— ${lf.author}`
      });
      console.error('Error /quote final:', err?.response?.data || err.message || err);
    }
  }
};

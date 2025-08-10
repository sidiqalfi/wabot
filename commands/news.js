const axios = require('axios');

const CATEGORIES = new Set(['general','business','entertainment','health','science','sports','technology']);

module.exports = {
  name: 'news',
  aliases: ['berita'],
  description: 'Berita Indonesia: top headlines, kategori, atau pencarian',
  usage: 'news [kategori]|cari <keyword> [--n=5]\nKategori: general, business, entertainment, health, science, sports, technology',
  category: 'info',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;
    try {
      if (!args.length) args = ['general'];

      // parse --n
      const nMatch = args.join(' ').match(/--n=(\d{1,2})/i);
      let limit = Math.min(Math.max(parseInt(nMatch?.[1] || '5', 10), 1), 10);
      // bersihkan flag dari args
      args = args.filter(a => !/^--n=\d+$/i.test(a));

      let mode = 'top';     // 'top' | 'category' | 'search'
      let category = 'general';
      let query = '';

      if (args[0]?.toLowerCase() === 'cari') {
        mode = 'search';
        query = args.slice(1).join(' ').trim();
        if (!query) {
          await sock.sendMessage(jid, { text: '❌ Tulis kata kuncinya. Contoh: `!news cari pilpres`' });
          return;
        }
      } else if (CATEGORIES.has(args[0]?.toLowerCase())) {
        mode = 'category';
        category = args[0].toLowerCase();
      } else {
        // fallback: kalau bukan 'cari' dan bukan kategori valid → anggap sebagai kategori/umum
        category = 'general';
      }

      // Ambil berita (provider chain: NewsAPI -> GNews)
      const articles = await getNews({ mode, category, query, limit });

      if (!articles.length) {
        await sock.sendMessage(jid, { text: 'ℹ️ Tidak ada berita yang ditemukan saat ini.' });
        return;
      }

      // Kirim 1st artikel dengan gambar (kalau ada), sisanya teks list
      const [first, ...rest] = articles;

      const header =
        mode === 'search'
          ? `🗞️ *Berita Indonesia — Pencarian:* _${query}_`
          : `🗞️ *Berita Indonesia — ${category.charAt(0).toUpperCase() + category.slice(1)}*`;

      // First item
      const firstCaption =
`${header}

*${first.title}*
🗂️ ${first.source || '-'} · 🕒 ${timeAgo(first.publishedAt)}
🔗 ${first.url}`;

      if (first.image) {
        await sock.sendMessage(jid, {
          image: { url: first.image },
          caption: firstCaption
        });
      } else {
        await sock.sendMessage(jid, { text: firstCaption });
      }

      if (rest.length) {
        const lines = rest.map((a, i) =>
          `${i + 2}. *${a.title}*\n   ${a.source || '-'} · ${timeAgo(a.publishedAt)}\n   ${a.url}`
        ).join('\n\n');

        await sock.sendMessage(jid, { text: lines });
      }

    } catch (err) {
      console.error(`Error in ${this.name} command:`, err?.response?.data || err);
      await sock.sendMessage(jid, { text: '❌ Gagal mengambil berita. Coba lagi nanti.' });
    }
  }
};

/* ================= Helpers ================= */

async function getNews({ mode, category, query, limit }) {
  // 1) NewsAPI
  if (process.env.NEWSAPI_KEY) {
    try {
      const res = await fetchNewsAPI({ mode, category, query, limit });
      if (res.length) return res;
    } catch (_) {}
  }
  // 2) GNews fallback
  if (process.env.GNEWS_API_KEY) {
    try {
      const res = await fetchGNews({ mode, category, query, limit });
      if (res.length) return res;
    } catch (_) {}
  }
  return [];
}

async function fetchNewsAPI({ mode, category, query, limit }) {
  const key = process.env.NEWSAPI_KEY;
  const base = 'https://newsapi.org/v2';
  const params = new URLSearchParams();
  let url = '';

  if (mode === 'search') {
    url = `${base}/everything`;
    params.set('q', query);
    params.set('language', 'id'); // Indonesia language articles
    params.set('sortBy', 'publishedAt');
    params.set('pageSize', String(limit));
  } else {
    url = `${base}/top-headlines`;
    params.set('country', 'id');
    if (category && category !== 'general') params.set('category', category);
    params.set('pageSize', String(limit));
  }

  const { data } = await axios.get(`${url}?${params.toString()}`, {
    headers: { 'X-Api-Key': key },
    timeout: 12000
  });

  const items = data?.articles || [];
  return items.map(n => ({
    title: n.title,
    url: n.url,
    source: n.source?.name,
    publishedAt: n.publishedAt || n.published_at,
    image: n.urlToImage || null
  }));
}

async function fetchGNews({ mode, category, query, limit }) {
  const key = process.env.GNEWS_API_KEY;
  const base = 'https://gnews.io/api/v4';
  const params = new URLSearchParams();
  params.set('lang', 'id');
  params.set('country', 'id');
  params.set('max', String(limit));
  params.set('apikey', key);

  let url = '';

  if (mode === 'search') {
    url = `${base}/search`;
    params.set('q', query);
  } else {
    url = `${base}/top-headlines`;
    if (category && category !== 'general') params.set('topic', mapGNewsTopic(category));
  }

  const { data } = await axios.get(`${url}?${params.toString()}`, { timeout: 12000 });
  const items = data?.articles || [];
  return items.map(n => ({
    title: n.title,
    url: n.url,
    source: n.source?.name,
    publishedAt: n.publishedAt || n.published_at,
    image: n.image || null
  }));
}

function mapGNewsTopic(cat) {
  // GNews topics: world, nation, business, technology, entertainment, sports, science, health
  const map = {
    general: 'nation',
    business: 'business',
    entertainment: 'entertainment',
    health: 'health',
    science: 'science',
    sports: 'sports',
    technology: 'technology'
  };
  return map[cat] || 'nation';
}

function timeAgo(iso) {
  if (!iso) return '-';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '-';
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari lalu`;
}

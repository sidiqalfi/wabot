// wiki.js
// Command: /wiki
// Fitur:
// - /wiki                 → artikel acak dari Wikipedia (ID → fallback EN)
// - /wiki <pencarian>     → ringkasan artikel sesuai kata kunci (ID → fallback EN)
// Aliases: wikipedia, wikisearch, wikiid
//
// Dependencies: axios

const axios = require('axios');

const WIKI_ID = axios.create({
  baseURL: 'https://id.wikipedia.org/api/rest_v1',
  timeout: 15000,
  validateStatus: s => s >= 200 && s < 300
});

const WIKI_EN = axios.create({
  baseURL: 'https://en.wikipedia.org/api/rest_v1',
  timeout: 15000,
  validateStatus: s => s >= 200 && s < 300
});

module.exports = {
  name: 'wiki',
  aliases: ['wikipedia', 'wikisearch', 'wikiid'],
  description: 'Cari ringkasan artikel Wikipedia atau dapatkan artikel acak.',
  usage: 'wiki | wiki <pencarian>',
  category: 'utility',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;

    try {
      const query = (args || []).join(' ').trim();

      let data;
      if (!query) {
        // Random summary (ID → EN)
        data = await getRandomSummary();
      } else {
        data = await getSummaryByQuery(query);
      }

      if (!data) {
        await sock.sendMessage(jid, { text: '❌ Maaf, artikel tidak ditemukan.' });
        return;
      }

      const caption = renderCaption(data);
      const img = data?.thumbnail?.source || data?.originalimage?.source || null;

      if (img) {
        await sock.sendMessage(jid, {
          image: { url: img },
          caption
        });
      } else {
        await sock.sendMessage(jid, { text: caption });
      }
    } catch (err) {
      console.error('[wiki] error:', err?.response?.data || err.message || err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Gagal mengambil data Wikipedia. Coba lagi sebentar.'
      });
    }
  }
};

// ---------------- Helpers ----------------

async function getRandomSummary() {
  // Coba ID dulu
  try {
    const { data } = await WIKI_ID.get('/page/random/summary');
    return data;
  } catch {}
  // Fallback EN
  try {
    const { data } = await WIKI_EN.get('/page/random/summary');
    return data;
  } catch {}
  return null;
}

async function getSummaryByQuery(q) {
  const title = encodeURIComponent(q);

  // 1) Coba langsung summary di ID (summary endpoint auto-handle redirect/normalize)
  try {
    const { data } = await WIKI_ID.get(`/page/summary/${title}`);
    if (isValidSummary(data)) return data;
  } catch {}

  // 2) Coba cari judul paling relevan via search di ID
  try {
    const { data } = await WIKI_ID.get(`/search/title`, { params: { q, limit: 1 } });
    const top = data?.pages?.[0]?.title;
    if (top) {
      const { data: s2 } = await WIKI_ID.get(`/page/summary/${encodeURIComponent(top)}`);
      if (isValidSummary(s2)) return s2;
    }
  } catch {}

  // 3) Fallback ke EN
  try {
    const { data } = await WIKI_EN.get(`/page/summary/${title}`);
    if (isValidSummary(data)) return data;
  } catch {}
  try {
    const { data } = await WIKI_EN.get(`/search/title`, { params: { q, limit: 1 } });
    const top = data?.pages?.[0]?.title;
    if (top) {
      const { data: s2 } = await WIKI_EN.get(`/page/summary/${encodeURIComponent(top)}`);
      if (isValidSummary(s2)) return s2;
    }
  } catch {}

  return null;
}

function isValidSummary(s) {
  // Hindari halaman disambiguasi, minimal punya title & extract
  if (!s || !s.title) return false;
  if (s.type === 'disambiguation') return false;
  const extract = (s.extract || s.description || '').trim();
  return extract.length > 0;
}

function renderCaption(s) {
  const lang = s?.lang || (s?.titles?.canonical?.includes('.wikipedia.org') ? '' : '');
  const title = s.title || 'Wikipedia';
  const desc = (s.description || '').trim();
  const extract = cleanText(s.extract || '');
  const url = s.content_urls?.desktop?.page || s.content_urls?.mobile?.page || s?.uri || '';

  const lines = [
    `📚 ${title}`,
    desc ? `_${desc}_` : null,
    extract ? `\n${truncate(extract, 900)}` : null,
    url ? `\n🔗 ${url}` : null
  ].filter(Boolean);

  return lines.join('\n');
}

function cleanText(t) {
  return String(t).replace(/\s+/g, ' ').replace(/\(.*?disambiguation.*?\)/i, '').trim();
}

function truncate(s, n) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

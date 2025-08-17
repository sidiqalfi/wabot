// fact.js
// Command: /fact
// Fitur: Ambil random fact (uselessfacts) -> translate otomatis ke Indonesia (MyMemory)
// Fallback: pakai fakta lokal (ID) kalau API error
// Dependencies: axios

const axios = require('axios');

module.exports = {
  name: 'fact',
  aliases: ['fakta', 'randomfact'],
  description: 'Kirim fakta singkat secara acak',
  usage: 'fact',
  category: 'fun',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;

    try {
      const factId = await getIndonesianFact();
      await sock.sendMessage(jid, { text: `🧠 *Fakta Random*\n${factId}` });
    } catch (err) {
      console.error(`[fact] fatal error:`, err);
      // Fallback terakhir: lokal
      const fallback = pickLocalFact();
      await sock.sendMessage(jid, {
        text: `🧠 *Fakta Random*\n${fallback}\n\n⚠️ Catatan: API lagi rewel, jadi ini dari data lokal.`
      });
    }
  }
};

// --------------------- helpers ---------------------

const http = axios.create({
  timeout: 12000, // 12s biar gak nungguin drama
  validateStatus: s => s >= 200 && s < 300
});

async function getIndonesianFact() {
  // 1) ambil fact EN
  const en = await fetchUselessFactEN();
  // 2) translate ke ID
  try {
    const id = await translateENtoID(en);
    const clean = sanitizeText(id);
    if (clean && clean.length >= 5) return ensureEndsWithPeriod(clean);
    // kalau translasi jelek, fallback lokal
    return pickLocalFact();
  } catch {
    return pickLocalFact();
  }
}

async function fetchUselessFactEN() {
  // Docs: https://uselessfacts.jsph.pl/api/v2/facts/random?language=en
  const url = 'https://uselessfacts.jsph.pl/api/v2/facts/random?language=en';
  const { data } = await http.get(url);
  // shape: { id, text, source, source_url, language, permalink }
  if (!data || !data.text) throw new Error('invalid uselessfacts payload');
  const text = String(data.text).trim();
  if (!text) throw new Error('empty uselessfacts text');
  return text;
}

async function translateENtoID(text) {
  // Docs: https://api.mymemory.translated.net/get?q=...&langpair=en|id
  const url = 'https://api.mymemory.translated.net/get';
  const { data } = await http.get(url, {
    params: {
      q: text,
      langpair: 'en|id'
    }
  });

  // Struktur umum:
  // { responseData: { translatedText }, matches: [...] }
  const direct = data?.responseData?.translatedText;
  let candidate = direct ? String(direct).trim() : '';

  // Coba pilih match yang kualitasnya paling oke
  if (Array.isArray(data?.matches) && data.matches.length) {
    const ranked = [...data.matches]
      .filter(m => typeof m.translation === 'string')
      .sort((a, b) => (Number(b.quality || 0) - Number(a.quality || 0)));
    const best = ranked[0];
    if (best && best.translation) {
      const t = String(best.translation).trim();
      if (t.length > candidate.length - 5) candidate = t; // ambil yang lebih panjang/utuh
    }
  }

  if (!candidate) throw new Error('translation empty');
  return candidate;
}

function sanitizeText(s) {
  // Hilangkan rujukan web aneh atau entitas HTML yang sering nongol
  return String(s)
    .replace(/\s+/g, ' ')
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;|&#38;/g, '&')
    .replace(/\s*\(source:.*?\)\s*$/i, '')
    .trim();
}

function ensureEndsWithPeriod(s) {
  // Biar rapi: tambahkan titik di akhir kalau belum ada tanda baca akhir
  return /[.!?…]$/.test(s) ? s : `${s}.`;
}

function pickLocalFact() {
  const facts = LOCAL_FACTS_ID;
  return facts[Math.floor(Math.random() * facts.length)];
}

// --------------------- local data ---------------------
// 100% bahasa Indonesia. Boleh kamu tambah sendiri sewaktu-waktu.
const LOCAL_FACTS_ID = [
  'Lebah punya lima mata: dua mata majemuk besar dan tiga mata kecil di atas kepala.',
  'Jerapah tidur hanya sekitar 30 menit sampai 2 jam per hari, biasanya dalam porsi singkat.',
  'Pisang secara botani adalah berry, sementara stroberi bukan berry sejati.',
  'Gurun Sahara dulunya punya danau besar yang disebut Mega Chad, lebih luas dari Laut Kaspia.',
  'Otak manusia mengonsumsi sekitar 20% energi tubuh meski beratnya hanya kira-kira 2% dari total berat badan.',
  'Cokelat pernah digunakan sebagai alat tukar oleh suku Aztec dan Maya.',
  'Kupu-kupu mencicipi rasa dengan kakinya, bukan dengan mulut.',
  'Garis pantai Norwegia termasuk yang paling berlekuk-lekuk di dunia karena fjord yang dalam.',
  'Tulang paha manusia lebih kuat daripada beton dengan berat yang sebanding.',
  'Burung hantu tidak bisa menggerakkan bola matanya, jadi mereka memutar leher sampai 270 derajat.',
  'Gunung berapi bisa membentuk petir vulkanik karena muatan listrik dari abu yang bergesekan.',
  'Madu murni dapat bertahan nyaris tanpa kedaluwarsa karena kadar air rendah dan sifat antibakteri.',
  'Kucing punya “sidik hidung” unik seperti sidik jari manusia.',
  'Tomat baru dianggap sayur dalam urusan pajak di AS pada abad ke-19 meski secara botani buah.',
  'Karang adalah hewan, bukan tumbuhan, dan membentuk ekosistem terbesar bernama terumbu karang.',
  'Langit berwarna biru karena hamburan Rayleigh pada molekul udara yang menyebarkan cahaya biru lebih kuat.',
  'Belalang jantan mengeluarkan bunyi dengan menggesekkan sayap, bukan “berteriak.”',
  'Di ruang angkasa, tanpa gravitasi, api cenderung berbentuk bola bukan lidah menyala panjang.',
  'Koala punya sidik jari yang mirip manusia sampai bisa membingungkan analisis forensik.',
  'Air panas bisa membeku lebih cepat daripada air dingin pada kondisi tertentu, fenomena ini disebut efek Mpemba.'
];

// asmaulhusna.js
// Command: /asmaulhusna
// Fitur: random | by number | all (pakai API myquran)
// Dependencies: axios

const axios = require('axios');

const http = axios.create({
  baseURL: 'https://api.myquran.com/v2',
  timeout: 12000,
  validateStatus: s => s >= 200 && s < 300
});

module.exports = {
  name: 'asmaulhusna',
  aliases: ['asmaul-husna', 'asma', 'husna', 'namesofallah'],
  description: 'Menampilkan Asmaul Husna secara acak, sesuai nomor, atau semua',
  usage: 'asmaulhusna [--all | <1-99>]',
  category: 'religion',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;
    try {
      // Arg parsing
      const flagAll = args.includes('--all');
      const numArg = args.find(a => /^\d+$/.test(a));
      const isNumberQuery = !!numArg;

      if (flagAll) {
        // 1) Tampilkan semua
        const list = await fetchAll();
        if (!Array.isArray(list) || list.length === 0) {
          throw new Error('Empty list from API');
        }
        const chunks = chunk(list, 20); // kirim bertahap biar aman
        for (const group of chunks) {
          const txt = group.map(formatAllLine).join('\n');
          // sedikit header tiap batch biar user gak hilang arah
          const head = `🕋 *Asmaul Husna (Total ${list.length})*\n${txt}`;
          await sock.sendMessage(jid, { text: head });
        }
        return;
      }

      if (isNumberQuery) {
        // 2) By nomor
        const n = Number(numArg);
        if (!Number.isInteger(n) || n < 1 || n > 99) {
          await sock.sendMessage(jid, { text: '⚠️ Nomor harus 1 sampai 99.' });
          return;
        }
        const item = await fetchByNumber(n);
        if (!item) {
          await sock.sendMessage(jid, { text: `❌ Data nomor ${n} tidak ditemukan.` });
          return;
        }
        const caption = formatSingle(item); // format emot-title-#no, arab, latin - arti
        await sock.sendMessage(jid, { text: caption });
        return;
      }

      // 3) Default: acak
      const random = await fetchRandom();
      const caption = formatSingle(random);
      await sock.sendMessage(jid, { text: caption });
    } catch (err) {
      console.error(`[asmaulhusna] error:`, err);
      await sock.sendMessage(jid, {
        text: '❌ Gagal mengambil data Asmaul Husna. Coba lagi sebentar.'
      });
    }
  }
};

// ---------------- helpers ----------------

async function fetchAll() {
  const { data } = await http.get('/husna/semua');
  // expected: { status, info:{min,max}, data:[{arab,id,indo,latin}, ...] }
  if (!data?.status || !Array.isArray(data?.data)) return [];
  return data.data;
}

async function fetchRandom() {
  const { data } = await http.get('/husna/acak');
  // expected: { status, data:{ arab,id,indo,latin } }
  if (!data?.status || !data?.data) throw new Error('random not found');
  return data.data;
}

async function fetchByNumber(n) {
  // Catatan: dokumennya tulis /husna//:nomor tapi endpoint normalnya /husna/:nomor
  const { data } = await http.get(`/husna/${n}`).catch(() => ({ data: null }));
  // Beberapa respon gagal pakai {status:false}, jadi cek aman:
  if (!data?.status || !data?.data) return null;
  return data.data;
}

function formatSingle(item) {
  const { id, arab, latin, indo } = item;
  // (emot) title #nomor -> title = arti (indo)
  return `🕋 ${indo} #${id}\n${arab}\n${latin} - ${indo}`;
}

function formatAllLine(item) {
  const { id, arab, latin, indo } = item;
  // Tampilkan ringkas per baris, plus arab di baris baru biar rapi
  return `#${id} ${latin} — ${indo}\n${arab}`;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

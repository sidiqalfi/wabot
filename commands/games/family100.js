// family100.js (patched)
module.exports = {
  name: 'family100',
  aliases: ['f100', 'fam100', 'family', 'survey', 'fam'],
  description: 'Main kuis Family 100: tebak jawaban survei, kumpulkan poin!',
  usage: 'family100 | family100 next | family100 stop | family100 board',
  category: 'fun',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;
    const isGroup = jid.endsWith('@g.us');
    const senderJid = message.key.participant || message.key.remoteJid;
    const senderName = message.pushName || maskJid(senderJid);
    const A0 = (args[0] || '').toLowerCase();

    try {
      if (A0 === 'stop') return endGame(jid, sock, '⏹️ Game dihentikan manual.');
      if (A0 === 'board') {
        const s = sessions.get(jid);
        if (!s) return sock.sendMessage(jid, { text: 'ℹ️ Belum ada game. Ketik /family100 untuk mulai.' });
        return sock.sendMessage(jid, { text: renderBoard(s) });
      }
      if (A0 === 'next') {
        const s = sessions.get(jid);
        if (!s) return sock.sendMessage(jid, { text: 'ℹ️ Belum ada game. Ketik /family100 untuk mulai.' });
        await nextRound(s, sock, '⏭️ Lanjut ke soal berikutnya.');
        return;
      }

      if (sessions.has(jid)) {
        return sock.sendMessage(jid, { text: '⚠️ Lagi ada game *Family100* di chat ini.\n• /family100 board — lihat papan\n• /family100 stop — akhiri' });
      }

      const session = createSession(jid, isGroup);
      sessions.set(jid, session);

      await sock.sendMessage(jid, {
        text:
`🎉 *Family 100 dimulai!*
Mode: ${isGroup ? 'Grup' : 'Personal'}
Cara main: jawab di chat ini. Poin sesuai popularitas jawaban.
Ketik *family100 stop* untuk mengakhiri.`
      });

      await nextRound(session, sock);

      session.listener = async (m) => {
        try {
          const msg = m.messages?.[0];
          if (!msg?.message) return;
          if (msg.key.remoteJid !== jid) return;

          const textRaw = extractText(msg);
          if (!textRaw) return;
          const text = textRaw.trim();
          if (!text) return;
          if (/^[/!.#]/.test(text)) return; // abaikan command lain

          const who = msg.key.participant || msg.key.remoteJid;
          const whoName = msg.pushName || maskJid(who);

          const s = sessions.get(jid);
          if (!s || !s.roundActive || !s.current) return;

          const match = checkGuess(s, text);
          if (!match) return;
          if (s.revealed.has(match.index)) return;

          s.revealed.add(match.index);
          addScore(s, who, whoName, match.points);

          await sock.sendMessage(jid, {
            text:
`🔔 *Survey membuktikan!* Jawaban terungkap:
• ${match.label}) ${match.text.toUpperCase()} — ${match.points} poin
Pemenang: *${whoName}* (+${match.points})

${renderBoard(s)}`
          });

          if (s.revealed.size >= s.current.answers.length) {
            await finishRound(s, sock, '✅ Semua jawaban terbuka.');
          }
        } catch {
          /* no-op */
        }
      };

      // daftarkan listener
      sock.ev.on('messages.upsert', session.listener);

    } catch (err) {
      console.error('[family100] error:', err);
      await sock.sendMessage(jid, { text: '❌ Gagal memulai/menjalankan Family100.' });
    }
  }
};

// ================== State & Data ==================
const sessions = new Map();

function createSession(jid, isGroup) {
  return {
    jid,
    isGroup,
    scores: new Map(),
    order: shuffle(QUESTIONS.slice()), // copy aman
    roundIndex: -1,
    current: null,
    revealed: new Set(),
    roundActive: false,
    timer: null,
    listener: null
  };
}

// ===== Soal contoh =====
const QUESTIONS = [
  Q('Sebutkan kegiatan yang biasa dilakukan saat pagi hari', [
    A('sarapan', 28, ['makan pagi', 'breakfast']),
    A('mandi', 20),
    A('olahraga', 16, ['jogging', 'lari', 'senam']),
    A('minum kopi', 14, ['ngopi', 'kopi']),
    A('sholat', 12, ['salat', 'ibadah', 'subuh']),
    A('membersihkan rumah', 10, ['bersih-bersih', 'menyapu', 'ngepel'])
  ]),
  Q('Benda yang selalu dibawa saat bepergian', [
    A('dompet', 26, ['wallet']),
    A('handphone', 24, ['hp', 'telepon', 'ponsel']),
    A('kunci', 18),
    A('minyak wangi', 10, ['parfum']),
    A('power bank', 12, ['powerbank', 'power-bank']),
    A('air minum', 10, ['botol minum', 'minum'])
  ]),
  Q('Makanan khas Indonesia yang terkenal', [
    A('rendang', 30),
    A('nasi goreng', 24, ['nasgor']),
    A('sate', 18),
    A('soto', 12),
    A('gudeg', 8),
    A('gado-gado', 8, ['gado gado'])
  ]),
  Q('Hal yang membuat orang telat bangun', [
    A('begadang', 32, ['tidur larut', 'tidak tidur']),
    A('alarm tidak bunyi', 22, ['alarm rusak', 'lupa set alarm']),
    A('mati listrik', 14),
    A('hujan', 12),
    A('sakit', 10),
    A('ketiduran lagi', 10, ['tidur lagi'])
  ]),
  Q('Hewan yang sering dipelihara di rumah', [
    A('kucing', 34),
    A('anjing', 28, ['dog']),
    A('ikan', 14),
    A('burung', 12),
    A('kura-kura', 6, ['kura']),
    A('hamster', 6)
  ]),
  Q('Transportasi umum di kota besar', [
    A('bus', 26),
    A('kereta', 24, ['commuter', 'krl']),
    A('ojek online', 18, ['ojol', 'gojek', 'grab']),
    A('angkot', 12),
    A('mrt', 10),
    A('transjakarta', 10, ['tj', 'busway'])
  ])
];

// ================== Round Flow ==================
const ROUND_MIN_MS = 45000;
const ROUND_MAX_MS = 75000;

async function nextRound(s, sock, prefixText = '') {
  if (!s) return;

  if (s.roundActive) await finishRound(s, sock, '⏭️ Otomatis lanjut ronde berikut.');

  s.roundIndex += 1;
  if (s.roundIndex >= s.order.length) {
    return endGame(s.jid, sock, '🏁 Soal habis. Game selesai.');
    }

  s.current = s.order[s.roundIndex];
  if (!s.current || !Array.isArray(s.current.answers) || s.current.answers.length === 0) {
    return endGame(s.jid, sock, '⚠️ Soal tidak valid. Game dihentikan.');
  }

  s.revealed = new Set();
  s.roundActive = true;

  const ms = randomBetween(ROUND_MIN_MS, ROUND_MAX_MS);
  const intro =
[
  prefixText,
  `🛎️ *Ronde ${s.roundIndex + 1}*`,
  `Pertanyaan: ${s.current.question}`,
  `Jawaban tersedia: ${s.current.answers.length}`,
  `⏳ Waktu: ${Math.round(ms / 1000)} detik`,
  '',
  renderBoard(s)
].filter(Boolean).join('\n');

  await sock.sendMessage(s.jid, { text: intro });

  clearTimeoutSafe(s.timer);
  s.timer = setTimeout(async () => {
    if (!s.roundActive) return;
    await finishRound(s, sock, '⏰ Waktu habis.');
  }, ms);
}

async function finishRound(s, sock, reason) {
  if (!s) return;
  s.roundActive = false;
  clearTimeoutSafe(s.timer);

  const unopened = s.current.answers
    .map((a, i) => ({ ...a, i }))
    .filter(x => !s.revealed.has(x.i));

  const revealLines = unopened.length
    ? ['🔎 Jawaban yang belum terbuka:', ...unopened.map(x => `• ${labelFor(x.i)}) ${x.text.toUpperCase()} — ${x.points} poin`)]
    : ['✅ Semua jawaban sudah terbuka.'];

  const scoreText = renderScores(s);

  await sock.sendMessage(s.jid, {
    text: `${reason}\n\n${revealLines.join('\n')}\n\n${scoreText}\n\n🏁 *Ronde selesai. Game berakhir.*`
  });

  // AUTO SELESAI: langsung tutup sesi, biar bisa /fam100 lagi
  await endGame(s.jid, sock, ''); // reason kosong, sudah dikirim di atas
}

async function endGame(jid, sock, reason) {
  const s = sessions.get(jid);
  if (!s) return sock.sendMessage(jid, { text: `${reason}\n\n📊 Tidak ada skor.` });

  clearTimeoutSafe(s.timer);
  try { if (s.listener) sock.ev.off('messages.upsert', s.listener); } catch {}
  sessions.delete(jid);

  const finalScore = renderScores(s, true);
  await sock.sendMessage(jid, { text: `${reason}\n\n${finalScore}` });
}

// ================== Matching & Board ==================
function checkGuess(s, raw) {
  const guess = normalize(raw);
  if (!guess) return null;

  // Kumpulkan kandidat yang belum terbuka
  const pool = s.current.answers
    .map((ans, i) => ({ ans, i }))
    .filter(x => !s.revealed.has(x.i));

  // 1) Exact match ke salah satu alias
  for (const { ans, i } of pool) {
    const cand = [ans.text, ...(ans.alts || [])].map(normalize).filter(Boolean);
    if (cand.includes(guess)) {
      return { index: i, text: ans.text, points: ans.points, label: labelFor(i) };
    }
  }

  // 2) Fuzzy: bigram similarity; pilih skor tertinggi di atas threshold
  let best = { score: 0, idx: -1, text: '', points: 0 };
  for (const { ans, i } of pool) {
    const cand = [ans.text, ...(ans.alts || [])].map(normalize).filter(Boolean);
    for (const c of cand) {
      const score = bigramSim(guess, c);
      if (score > best.score) best = { score, idx: i, text: ans.text, points: ans.points };
    }
  }
  // Threshold lumayan ketat biar “kucing” gak nyamber “ikan”
  if (best.idx !== -1 && best.score >= 0.78) {
    return { index: best.idx, text: best.text, points: best.points, label: labelFor(best.idx) };
  }

  return null;
}

// Bigram Jaccard similarity
function bigramSim(a, b) {
  const A = bigrams(a), B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}
function bigrams(s) {
  const out = new Set();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

function renderBoard(s) {
  const lines = s.current.answers.map((a, i) => {
    const label = labelFor(i);
    const opened = s.revealed.has(i);
    const mask = '▮▮▮▮▮▮▮▮▮'; // fixed, no repeat, no dynamic length
    return opened
      ? `${label}) ${a.text.toUpperCase()} — ${a.points} poin`
      : `${label}) ${mask} (?? poin)`;
  });
  return `📋 *Papan Jawaban*\n${lines.join('\n')}`;
}

function renderScores(s, final = false) {
  const arr = [...s.scores.values()].sort((a, b) => b.points - a.points);
  if (!arr.length) return (final ? '🏆 *Skor Akhir*\n-' : '📊 *Skor Sementara*\n-');
  const lines = arr.map((u, i) => `${i + 1}. ${u.name} — *${u.points}*`);
  return `${final ? '🏆 *Skor Akhir*' : '📊 *Skor Sementara*'}\n${lines.join('\n')}`;
}

function addScore(s, whoJid, name, pts) {
  const cur = s.scores.get(whoJid) || { name, points: 0 };
  cur.name = name;
  cur.points += Number(pts) || 0;
  s.scores.set(whoJid, cur);
}

function labelFor(i) { return String.fromCharCode(65 + i); } // A, B, C ...

// ================== Utils ==================
function Q(question, answers) { return { question, answers }; }
function A(text, points, alts = []) { return { text, points, alts }; }

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function maskJid(jid) {
  const num = String(jid).replace(/[@:\-]/g, '').replace('g.us', '').replace('s.whatsapp.net', '');
  if (num.length <= 6) return `wa.me/${num}`;
  return `wa.me/${num.slice(0, 4)}***${num.slice(-2)}`;
}

function extractText(msg) {
  const m = msg.message || {};
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    ''
  );
}

function clearTimeoutSafe(t) { try { if (t) clearTimeout(t); } catch {} }

function randomBetween(minMs, maxMs) {
  const a = Number(minMs); const b = Number(maxMs);
  const low = Math.min(a, b); const high = Math.max(a, b);
  const span = Math.max(0, high - low + 1);
  return low + Math.floor(Math.random() * span);
}

function shuffle(arr) {
  const a = Array.isArray(arr) ? arr.slice() : [];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

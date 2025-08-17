// tebakkata.js
// Command: /tebakkata
// Level: easy (15s, kata pendek), medium (30s, kata sedang), hard (60s, kata panjang),
// dewa (5 menit, tebak 2–3 kata pendek sekaligus)
// Aliases: tebak, tebak-kata, scramble

module.exports = {
  name: 'tebakkata',
  aliases: ['tebak', 'tebak-kata', 'scramble'],
  description: 'Tebak kata dari huruf yang diacak dengan beberapa level kesulitan.',
  usage: 'tebakkata [easy|medium|hard|dewa]',
  category: 'fun',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;

    try {
      // Cegah sesi ganda di chat yang sama
      if (sessions.has(jid)) {
        await sock.sendMessage(jid, { text: '⚠️ Lagi ada sesi *tebakkata* berjalan di chat ini. Selesaikan dulu atau tunggu timeout.' });
        return;
      }

      // Level parsing
      const level = String((args[0] || 'easy')).toLowerCase();
      const cfg = pickLevelConfig(level);

      // Ambil kata sesuai level
      let targetWords = [];
      if (cfg.mode === 'single') {
        targetWords = [ pickRandom(cfg.words) ];
      } else {
        // dewa: 2–3 kata dari daftar pendek
        const count = Math.floor(Math.random() * 2) + 2; // 2 atau 3
        targetWords = sampleDistinct(cfg.words, count);
      }

      // Buat scrambled list
      const scrambledList = targetWords.map(w => shuffleWord(w));

      // Kirim instruksi
      const intro = renderIntro(level, cfg, scrambledList, targetWords.length);
      await sock.sendMessage(jid, { text: intro });

      // Setup session
      const session = createSession(jid, targetWords, cfg, sock);
      sessions.set(jid, session);

      // Listener jawaban
      session.listener = sock.ev.on('messages.upsert', async (m) => {
        try {
          const msg = m.messages?.[0];
          if (!msg?.message) return;
          if (msg.key.remoteJid !== jid) return;

          const text = (extractText(msg) || '').trim().toLowerCase();
          if (!text) return;

          if (session.cfg.mode === 'single') {
            const answer = session.targets[0];
            if (normalize(text) === normalize(answer)) {
              await sock.sendMessage(jid, { text: `✅ Benar! Kata itu adalah *${answer}* 🎉` });
              endSession(jid);
            }
          } else {
            // dewa: bisa menjawab satu per satu
            let solvedSomething = false;
            for (const t of [...session.remaining]) {
              if (normalize(text) === normalize(t)) {
                session.remaining.delete(t);
                solvedSomething = true;
                await sock.sendMessage(jid, { text: `✅ Betul: *${t}* (${session.targets.length - session.remaining.size}/${session.targets.length})` });
              }
            }
            if (solvedSomething && session.remaining.size === 0) {
              await sock.sendMessage(jid, { text: `🏆 Sempurna! Semua kata tertebak: *${session.targets.join(', ')}*` });
              endSession(jid);
            }
          }
        } catch {
          /* noop */
        }
      });

      // Timeout
      session.timeout = setTimeout(async () => {
        if (!sessions.has(jid)) return;
        if (session.cfg.mode === 'single') {
          await sock.sendMessage(jid, { text: `⏰ Waktu habis! Jawabannya: *${session.targets[0]}*` });
        } else {
          const remain = [...session.remaining];
          const solved = session.targets.filter(t => !session.remaining.has(t));
          const lines = [];
          if (solved.length) lines.push(`✔️ Benar: *${solved.join(', ')}*`);
          if (remain.length) lines.push(`❌ Belum tertebak: *${remain.join(', ')}*`);
          await sock.sendMessage(jid, { text: `⏰ Waktu habis!\n${lines.join('\n')}` });
        }
        endSession(jid);
      }, cfg.ms);

    } catch (err) {
      console.error('[tebakkata] error:', err);
      await sock.sendMessage(jid, { text: '❌ Gagal memulai game tebak kata.' });
    }
  }
};

// ================== Session & Helpers ==================

const sessions = new Map(); // jid -> { targets, remaining(Set), cfg, listener, timeout, sock }

function createSession(jid, targets, cfg, sock) {
  return {
    jid,
    targets,
    remaining: cfg.mode === 'multi' ? new Set(targets) : null,
    cfg,
    listener: null,
    timeout: null,
    sock
  };
}

function endSession(jid) {
  const s = sessions.get(jid);
  if (!s) return;
  try { if (s.listener) s.sock.ev.off('messages.upsert', s.listener); } catch {}
  try { if (s.timeout) clearTimeout(s.timeout); } catch {}
  sessions.delete(jid);
}

function pickLevelConfig(level) {
  switch (level) {
    case 'medium':
      return { name: 'Medium', ms: 30_000, mode: 'single', words: WORDS_MEDIUM };
    case 'hard':
      return { name: 'Hard', ms: 60_000, mode: 'single', words: WORDS_HARD };
    case 'dewa':
      return { name: 'Dewa', ms: 300_000, mode: 'multi', words: WORDS_EASY }; // 5 menit, 2–3 kata pendek
    case 'easy':
    default:
      return { name: 'Easy', ms: 15_000, mode: 'single', words: WORDS_EASY };
  }
}

function renderIntro(level, cfg, scrambledList, totalWords) {
  const title = `🧩 *Tebak Kata — ${cfg.name}*`;
  const timeInfo = `⏳ Batas waktu: *${formatMs(cfg.ms)}*`;
  if (cfg.mode === 'single') {
    return [
      title,
      timeInfo,
      '',
      'Susun huruf berikut menjadi kata yang benar:',
      `🔤 ${scrambledList[0]}`
    ].join('\n');
  }
  // dewa
  const bullets = scrambledList.map((s, i) => ` ${i + 1}. ${s}`).join('\n');
  return [
    title,
    timeInfo,
    '',
    `Tebak *${totalWords} kata* sekaligus. Jawab satu-satu juga boleh.`,
    bullets
  ].join('\n');
}

// Kata pendek (4–6 huruf)
const WORDS_EASY = [
  'kopi','roti','pisang','mobil','sepeda','kamera','puter','lapar','kelas','tehbot','santai','galau','laptop','layar','baterai','jaket','tiket','motor','kabel','router'
].filter(w => w.length >= 4 && w.length <= 6);

// Kata sedang (6–8 huruf)
const WORDS_MEDIUM = [
  'komputer','kamera','bandara','pelajar','tropika','kentang','gelasnya','kualitas','sederha','majalah','penguin','saluran','koneksi','raflesi','mandiri','arsenal'
].filter(w => w.length >= 6 && w.length <= 8);

// Kata panjang (9–12 huruf)
const WORDS_HARD = [
  'pendidikan','perdagangan','kesempatan','pengetahuan','pembangunan','persahabatan','kemerdekaan','kesejahteraan','pengendalian','kemasyarakatan','keberuntungan','perjalanan','penelitian'
].filter(w => w.length >= 9 && w.length <= 12);

function shuffleWord(word) {
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const out = arr.join('');
  // jangan kembalikan sama persis dengan aslinya
  return out === word ? shuffleWord(word) : out;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sampleDistinct(arr, n) {
  const pool = [...arr];
  const out = [];
  while (out.length < n && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function extractText(msg) {
  const m = msg.message || {};
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ''
  );
}

function normalize(s) {
  return String(s).toLowerCase().replace(/\s+/g, '');
}

function formatMs(ms) {
  // human readable singkat
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec} detik`;
  if (sec < 3600) return `${Math.floor(sec/60)} menit`;
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h} jam ${mm ? mm + ' menit' : ''}`.trim();
}

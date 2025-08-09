module.exports = {
  name: 'jodoh',
  description: 'Cocok-cocokan jodoh dengan rating % + alasan lucu',
  usage: 'jodoh [@user] [@user2]',
  category: 'fun',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;
    try {
      const isGroup = jid.endsWith('@g.us');
      const senderJid = message.key.participant || message.key.remoteJid;
      const botJid = sock.user?.id;

      // Ambil mention dari pesan (kalau ada)
      const contextInfo = message.message?.extendedTextMessage?.contextInfo;
      const mentioned = contextInfo?.mentionedJid || [];

      // Helper format @mention text
      const at = j => '@' + (j.split('@')[0].replace(/[^0-9]/g, '') || 'user');

      // Dapetin pasangan A & B
      let A, B;

      if (isGroup) {
        const meta = await sock.groupMetadata(jid);
        const all = (meta.participants || []).map(p => p.id);

        // Set yang di-exclude dari random
        const exclude = new Set([botJid, 'status@broadcast', senderJid].filter(Boolean));

        if (mentioned.length >= 2) {
          // Mode: tag dua orang
          [A, B] = [mentioned[0], mentioned[1]];
        } else if (mentioned.length === 1) {
          // Mode: sender + 1 tag
          A = senderJid;
          B = mentioned[0];
        } else {
          // Mode: sender + random member
          A = senderJid;
          const candidates = all.filter(j => !exclude.has(j));
          if (candidates.length === 0) {
            await sock.sendMessage(jid, { text: '❌ Gagal cari pasangan. Grupnya sepi banget 😅' });
            return;
          }
          B = candidates[Math.floor(Math.random() * candidates.length)];
        }
      } else {
        // Private chat: pairing dengan “NPC” lucu
        A = senderJid;
        const npcs = [
          'Ayam Geprek Sambal Matah', 'Es Teh Manis', 'Nasi Padang Rendang',
          'Laptop Gaming 64GB RAM', 'Gaji ke-13', 'Libur Panjang',
          'Wifi Stabil', 'Cuan Crypto', 'Dukungan Orang Tua', 'Tidur 8 Jam'
        ];
        B = npcs[Math.floor(Math.random() * npcs.length)];
      }

      // Validasi
      if (!A || !B) {
        await sock.sendMessage(jid, { text: '❌ Format salah. Coba `!jodoh`, `!jodoh @user`, atau `!jodoh @user1 @user2`' });
        return;
      }

      // Hitung “compatibility” (pseudo-random tapi seru)
      const percent = compatibilityScore(A, B);
      const verdict = pickVerdict(percent);
      const reason = pickReason(percent);

      let caption;
      let mentions = [];

      if (isGroup) {
        // Output untuk grup dengan @mention
        caption =
          `💞 *Tes Kecocokan Jodoh* 💞\n\n` +
          `Pasangan: ${at(A)}  ×  ${at(B)}\n` +
          `❤️ Skor: *${percent}%*\n` +
          `🧠 Analisa: ${reason}\n` +
          `📜 Vonis: *${verdict}*`;
        mentions = [A, B].filter(j => j.includes('@'));
      } else {
        // Output private chat (B bisa string NPC)
        const nameA = at(A);
        const nameB = typeof B === 'string' ? B : at(B);
        caption =
          `💞 *Tes Kecocokan Jodoh* 💞\n\n` +
          `Pasangan: ${nameA}  ×  ${nameB}\n` +
          `❤️ Skor: *${percent}%*\n` +
          `🧠 Analisa: ${reason}\n` +
          `📜 Vonis: *${verdict}*`;
        mentions = [A].filter(j => j.includes('@'));
      }

      await sock.sendMessage(jid, { text: caption, mentions });

    } catch (err) {
      console.error(`Error in ${this.name} command:`, err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Gagal menghitung jodoh. Coba lagi ya.'
      });
    }
  }
};

/* ===== Helpers ===== */

// Skor “deterministik ringan”: hash sederhana dari string JID/nama → 0..100
function compatibilityScore(a, b) {
  const sA = typeof a === 'string' ? a : String(a);
  const sB = typeof b === 'string' ? b : String(b);
  const seed = (sA + '::' + sB).split('').reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) >>> 0, 5381);
  return Math.floor((seed % 101)); // 0..100
}

function pickVerdict(p) {
  if (p >= 90) return '🕊️ Jodoh dunia akhirat. KUA tinggal tanda tangan.';
  if (p >= 75) return '💍 Tinggal lamaran, restu ortu aman.';
  if (p >= 60) return '💖 Potensi kuat, tinggal jaga komunikasi.';
  if (p >= 45) return '🫶 Temenan dulu, lama-lama juga sayang.';
  if (p >= 30) return '🧩 Butuh effort ekstra dan kompromi.';
  if (p >= 15) return '⚠️ Sering beda frekuensi. Hati-hati baper sendiri.';
  return '🧊 Mending fokus karier dulu, bestie.';
}

function pickReason(p) {
  const high = [
    'Algoritma semesta sinkron; chat dibales <5 menit.',
    'Vibes, humor, dan love language cocok banget.',
    'Hobi nyambung, drama minim, dompet & doa seirama.'
  ];
  const mid = [
    'Chemistry ada, tapi timezone & jadwal agak tabrakan.',
    'Satu suka pedes, satu suka manis — asal saling ngerti.',
    'Butuh kejelasan, jangan cuma chat “udah makan belum?”.'
  ];
  const low = [
    'Sticker doang yang dibales, chat panjang di-read doang.',
    'Goal hidup beda jalur tol, takutnya macet di tengah.',
    'Sinyal doang yang kuat, hubungan masih buffering.'
  ];
  if (p >= 70) return sample(high);
  if (p >= 40) return sample(mid);
  return sample(low);
}

function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

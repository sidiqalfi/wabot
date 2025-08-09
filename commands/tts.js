const axios = require('axios');
const gTTS = require('google-tts-api');

module.exports = {
  name: 'tts',
  description: 'Text to Speech (Google TTS, tanpa API key)',
  usage: 'tts [kode_bahasa] [--slow] [--ptt] <teks> | atau reply teks: !tts [kode_bahasa] [--slow] [--ptt]',
  category: 'utility',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;

    try {
      // Ambil teks dari reply / args
      const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const quotedText =
        quoted?.conversation ||
        quoted?.extendedTextMessage?.text ||
        '';

      // Parse flags
      const raw = (args.join(' ') || '').trim();
      const langMatch = raw.match(/^\s*([a-z]{2}(?:-[A-Z]{2})?)\b/); // contoh: id, en, en-US
      const hasSlow = /--slow\b/i.test(raw);
      const asPTT = /--ptt\b/i.test(raw);

      // Bahasa default
      let lang = 'id';

      // Ambil teks final
      let text = '';
      if (quotedText) {
        // Jika reply, baca bahasa dari args (opsional)
        if (langMatch) lang = langMatch[1];
        text = quotedText.trim();
      } else {
        // Non-reply: ex. "!tts en Halo semua"
        if (langMatch) {
          lang = langMatch[1];
          text = raw.replace(langMatch[0], '').replace(/--slow/gi, '').replace(/--ptt/gi, '').trim();
        } else {
          // Tanpa kode bahasa di awal → default lang=id
          text = raw.replace(/--slow/gi, '').replace(/--ptt/gi, '').trim();
        }
      }

      if (!text) {
        await sock.sendMessage(jid, {
          text:
            '❌ Teks kosong.\n' +
            'Contoh:\n' +
            '!tts Halo semuanya\n' +
            '!tts en Hello guys\n' +
            '!tts id --slow ini dibaca pelan\n' +
            'Atau reply ke teks: !tts en --ptt'
        });
        return;
      }

      // Google TTS limit ~200 chars → split aman
      const chunks = splitTTS(text, 200);
      const captionHead = `🗣️ *TTS*\n🌐 Lang: ${lang.toUpperCase()}${hasSlow ? ' · Slow' : ''}${asPTT ? ' · PTT' : ''}`;

      // Kirim tiap chunk berurutan (Part 1/2/3 ...)
      for (let i = 0; i < chunks.length; i++) {
        const partText = chunks[i];

        // Dapatkan URL audio dari google-tts-api
        const url = gTTS.getAudioUrl(partText, { lang, slow: hasSlow });

        // Download audio jadi buffer
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
        const buffer = Buffer.from(res.data);

        const partLabel = chunks.length > 1 ? ` (Part ${i + 1}/${chunks.length})` : '';
        const caption = `${captionHead}${partLabel}`;

        await sock.sendMessage(jid, {
          audio: buffer,
          mimetype: 'audio/mpeg',
          ptt: !!asPTT, // true = voice note
          caption
        });

        // jeda kecil biar gak kebaca spam oleh WA
        await sleep(400);
      }

    } catch (err) {
      console.error(`Error in ${this.name} command:`, err);
      await sock.sendMessage(jid, {
        text: '❌ Gagal membuat TTS. Coba lagi nanti atau pendekkan teksnya.'
      });
    }
  }
};

// ===== Helpers =====
function splitTTS(text, maxLen = 200) {
  const parts = [];
  let remaining = text.trim();

  while (remaining.length > maxLen) {
    // pecah di spasi/punctuation terdekat agar natural
    let idx = findSplitIndex(remaining, maxLen);
    parts.push(remaining.slice(0, idx).trim());
    remaining = remaining.slice(idx).trim();
  }
  if (remaining) parts.push(remaining);

  return parts;
}

function findSplitIndex(str, maxLen) {
  // cari spasi terakhir sebelum maxLen
  const candidates = [
    str.lastIndexOf('. ', maxLen),
    str.lastIndexOf('! ', maxLen),
    str.lastIndexOf('? ', maxLen),
    str.lastIndexOf('; ', maxLen),
    str.lastIndexOf(', ', maxLen),
    str.lastIndexOf(' ', maxLen)
  ].filter(i => i > 0);

  if (candidates.length) return Math.max(...candidates) + 1; // potong setelah delimiter
  return maxLen; // fallback: potong keras
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// bot.js
// Command: /bot
// Fitur:
// - Info server & proses (detail)
// - Stats dari ./data/stats.json (dengan rentang jelas)
// - Uptime format: "X detik Y menit Z jam W hari" (unit yang non-zero)
// - Tampilkan PREFIX dari .env dan deteksi prefix yang dipakai user saat memanggil
// - Kirim caption bersama foto profil bot

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const { setState } = require('../../lib/groupState');

module.exports = {
  name: 'bot',
  aliases: ['binfo', 'botinfo', 'status', 'uptime'],
  description: 'Menampilkan info bot atau mengaktifkan/menonaktifkan bot di grup (khusus admin).',
  usage: 'bot [on|off]',
  category: 'utility',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;
    const isGroup = jid.endsWith('@g.us');
    const sender = message.key.participant || message.key.remoteJid;

    const subCommand = args[0]?.toLowerCase();

    if (subCommand === 'on' || subCommand === 'off') {
        if (!isGroup) {
            return sock.sendMessage(jid, { text: 'Perintah ini hanya bisa digunakan di dalam grup.' });
        }

        try {
            const groupMetadata = await sock.groupMetadata(jid);
            const participants = groupMetadata.participants;
            const user = participants.find(p => p.id === sender);

            if (user.admin !== 'admin' && user.admin !== 'superadmin') {
                return sock.sendMessage(jid, { text: 'Hanya admin yang dapat menggunakan perintah ini.' });
            }

            setState(jid, subCommand);
            const status = subCommand === 'on' ? 'diaktifkan' : 'dinonaktifkan';
            await sock.sendMessage(jid, { text: `✅ Bot telah berhasil ${status} di grup ini.` });
            return;

        } catch (e) {
            console.error('[bot on/off] Error:', e);
            await sock.sendMessage(jid, { text: 'Terjadi kesalahan saat mencoba mengatur status bot.' });
            return;
        }
    }

    try {
      // ------------------ ENV & PREFIX ------------------
      const BOT_NAME = process.env.BOT_NAME || 'WhatsBot';
      const BOT_DEVELOPER = process.env.BOT_DEVELOPER || '-';
      const BOT_SUPPORT = process.env.BOT_SUPPORT || '-';
      const PREFIX_RAW = process.env.PREFIX || '!';
      const PREFIXES = PREFIX_RAW.split(',').map(s => s.trim()).filter(Boolean);

      const usedPrefix = detectUsedPrefix(message, PREFIXES);

      // ------------------ UPTIME ------------------
      const procUptime = process.uptime(); // detik
      const osUptime = os.uptime();       // detik
      const uptimeStr = formatUptimeWords(procUptime);
      const osUptimeStr = formatUptimeWords(osUptime);

      // ------------------ SERVER INFO ------------------
      const platform = `${os.platform()} ${os.release()}`;
      const arch = os.arch();
      const cpus = os.cpus() || [];
      const cpuModel = cpus[0]?.model || '-';
      const cpuCores = cpus.length;

      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      const rss = process.memoryUsage().rss;
      const heapUsed = process.memoryUsage().heapUsed;
      const heapTotal = process.memoryUsage().heapTotal;
      const ext = process.memoryUsage().external;

      const load = os.loadavg ? os.loadavg() : [0, 0, 0];

      // ------------------ STATS.JSON ------------------
      const stats = readStatsSafe('./data/stats.json');
      const now = new Date();

      const startedAt = stats?.startedAt ? new Date(stats.startedAt) : null;
      const lastUpdated = stats?.lastUpdated ? new Date(stats.lastUpdated) : null;

      const totalExec = num(stats?.total);
      const perUser = obj(stats?.perUser);
      const perCommand = obj(stats?.perCommand);
      const perDay = obj(stats?.perDay);

      const todayKey = fmtDateID(now);
      const today = num(perDay[todayKey]);

      const last7d = sumRange(perDay, 7, now);
      const last30d = sumRange(perDay, 30, now);

      const uniqueUsers = Object.keys(perUser).length;
      const topUsers = topEntries(perUser, 5).map((x, i) => `   • ${i + 1}. ${maskJid(x[0])} — ${x[1]}x`);
      const topCmds = topEntries(perCommand, 10).map((x, i) => `   • ${i + 1}. ${x[0]} — ${x[1]}x`);

      // ------------------ CAPTION ------------------
      const lines = [
        `🤖 *${BOT_NAME}*`,
        usedPrefix ? `Prefix dipakai: ${mono(usedPrefix)}` : `Prefix dipakai: (tidak terdeteksi)`,
        `Semua prefix (.env): ${PREFIXES.length ? PREFIXES.map(mono).join(' ') : '-'}`,

        ``,
        `👤 Developer: ${BOT_DEVELOPER}`,
        `🛠️ Support: ${BOT_SUPPORT}`,
        ``,
        `⏱️ *Uptime Proses*: ${uptimeStr}`,
        `🖥️ *Uptime OS*: ${osUptimeStr}`,
        ``,
        `🧰 *Server Info*`,
        `├ Platform: ${platform} (${arch})`,
        `├ Node.js: ${process.version}`,
        `├ PID: ${process.pid}`,
        `├ CPU: ${cpuModel} (${cpuCores} core)`,
        `├ Load avg: ${load.map(n => n.toFixed(2)).join(', ')}`,
        `├ RAM Total: ${toMB(totalMem)} MB`,
        `├ RAM Terpakai: ${toMB(usedMem)} MB`,
        `├ RAM Bebas: ${toMB(freeMem)} MB`,
        `├ Proses RSS: ${toMB(rss)} MB`,
        `├ Heap: ${toMB(heapUsed)} / ${toMB(heapTotal)} MB`,
        `└ External: ${toMB(ext)} MB`,
        ``,
        `📊 *Statistik Penggunaan*`,
        `├ Total eksekusi (global): ${totalExec}`,
        startedAt || lastUpdated ? `├ Rentang data: ${startedAt ? formatDateID(startedAt) : '-'} s.d. ${lastUpdated ? formatDateID(lastUpdated) : '-'}` : `├ Rentang data: -`,
        `├ Hari ini: ${today}`,
        `├ 7 hari terakhir: ${last7d}`,
        `└ 30 hari terakhir: ${last30d}`,
        ``,
        `👥 *Pengguna*`,
        `├ Total unik: ${uniqueUsers}`,
        ...(topUsers.length ? ['└ Top 5 pengguna:', ...topUsers] : ['└ Top 5 pengguna: -']),
        ``,
        `🧾 *Top Perintah*`,
        ...(topCmds.length ? topCmds : ['   • -'])
      ];

      const caption = lines.join('\n');

      // ------------------ FOTO PROFIL BOT ------------------
      let pfpUrl = null;
      try {
        const botJid = sock.user?.id || sock.user?.jid || '';
        pfpUrl = await sock.profilePictureUrl(botJid, 'image');
      } catch {
        // ignore
      }

      if (pfpUrl) {
        await sock.sendMessage(jid, {
          image: { url: pfpUrl },
          caption
        });
      } else {
        await sock.sendMessage(jid, { text: caption });
      }
    } catch (err) {
      console.error(`[bot] error:`, err);
      await sock.sendMessage(message.key.remoteJid, { text: '❌ Gagal mengambil info bot.' });
    }
  }
};

// ------------------ Helpers ------------------

function detectUsedPrefix(message, prefixes) {
  try {
    const txt = extractText(message) || '';
    if (!txt) return null;
    const trimmed = txt.trim();
    // Ambil prefix pertama yang cocok di awal string
    for (const p of prefixes) {
      if (!p) continue;
      if (trimmed.startsWith(p)) return p;
    }
    return null;
  } catch {
    return null;
  }
}

function extractText(msg) {
  const m = msg.message || {};
  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
  if (m.imageMessage?.caption) return m.imageMessage.caption;
  if (m.videoMessage?.caption) return m.videoMessage.caption;
  if (m.documentMessage?.caption) return m.documentMessage.caption;
  if (m.buttonsResponseMessage?.selectedButtonId) return m.buttonsResponseMessage.selectedButtonId;
  if (m.listResponseMessage?.singleSelectReply?.selectedRowId) return m.listResponseMessage.singleSelectReply.selectedRowId;
  // quoted
  const q = m.extendedTextMessage?.contextInfo?.quotedMessage;
  if (q?.extendedTextMessage?.text) return q.extendedTextMessage.text;
  if (q?.conversation) return q.conversation;
  return '';
}

function formatUptimeWords(secondsFloat) {
  const s = Math.floor(secondsFloat);
  const day = Math.floor(s / 86400);
  const hour = Math.floor((s % 86400) / 3600);
  const min = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  // Sesuai contoh: urutan detik → menit → jam → hari
  const parts = [];
  if (sec) parts.push(`${sec} detik`);
  if (min) parts.push(`${min} menit`);
  if (hour) parts.push(`${hour} jam`);
  if (day) parts.push(`${day} hari`);
  if (!parts.length) return '0 detik';
  return parts.join(' ');
}

function readStatsSafe(filePath) {
  try {
    const p = path.resolve(process.cwd(), filePath);
    const raw = fs.readFileSync(p, 'utf8');
    const json = JSON.parse(raw);
    return json || {};
  } catch {
    return {};
  }
}

function fmtDateID(d) {
  // yyyy-mm-dd (zona server)
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const da = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function sumRange(perDayObj, days, refDate) {
  if (!perDayObj || typeof perDayObj !== 'object') return 0;
  let sum = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i);
    const key = fmtDateID(d);
    sum += num(perDayObj[key]);
  }
  return sum;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function obj(v) {
  return v && typeof v === 'object' ? v : {};
}

function maskJid(jid) {
  // 628xx@s.whatsapp.net -> wa.me/628xx (dipendekkan)
  const numOnly = String(jid).replace(/[@:\-]/g, '').replace('g.us', '').replace('s.whatsapp.net', '');
  if (numOnly.length <= 6) return `wa.me/${numOnly}`;
  return `wa.me/${numOnly.slice(0, 4)}***${numOnly.slice(-2)}`;
}

function toMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(1);
}

function topEntries(obj, n = 5) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

function mono(s) {
  // tampilkan s sebagai monospace inline di WhatsApp biar * & . / gak bikin format rusak
  const safe = String(s).replace(/`/g, '\\`'); // jaga-jaga kalau ada backtick
  return '`' + safe + '`';
}

function formatDateID(date) {
  try {
    return new Date(date).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return String(date);
  }
}

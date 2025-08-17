// commands/reminder.js
// Reminder sederhana: dukung durasi relatif & waktu absolut, list & cancel.
// Format:
//   !reminder 10m minum air
//   !reminder 1h30m meeting
//   !reminder at 2025-08-12 14:30 presentasi
//   !reminder list
//   !reminder cancel <id>

const TZ_DISPLAY = 'Asia/Jakarta'; // hanya untuk tampilan jam
let NEXT_ID = 1;

// Global store di memory (per-proses). Bisa dipindah ke DB/JSON kalau perlu persist.
global.__REMINDERS__ = global.__REMINDERS__ || []; // { id, jid, when:Date, text, timeout }

module.exports = {
  name: 'reminder',
  description: 'Bikin pengingat (relative/absolute), list & cancel',
  usage: 'reminder <durasi> <pesan> | reminder at <YYYY-MM-DD HH:MM> <pesan> | reminder list | reminder cancel <id>',
  category: 'utility',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;
    try {
      if (!args.length) {
        await sock.sendMessage(jid, { text: helpText() });
        return;
      }

      const sub = args[0].toLowerCase();

      if (sub === 'list') {
        return await handleList(jid, sock);
      }

      if (sub === 'cancel') {
        const id = parseInt(args[1], 10);
        if (!id) {
          await sock.sendMessage(jid, { text: '❌ Format: *!reminder cancel <id>*' });
          return;
        }
        return await handleCancel(jid, sock, id);
      }

      // Absolute: "at YYYY-MM-DD HH:MM pesan..."
      if (sub === 'at') {
        if (args.length < 3) {
          await sock.sendMessage(jid, { text: '❌ Format: *!reminder at 2025-08-12 14:30 <pesan>*' });
          return;
        }
        const dateStr = `${args[1]} ${args[2]}`; // "YYYY-MM-DD HH:MM"
        const msg = args.slice(3).join(' ').trim();
        if (!msg) {
          await sock.sendMessage(jid, { text: '❌ Pesan pengingat tidak boleh kosong.' });
          return;
        }
        const when = parseAbsolute(dateStr);
        if (!when) {
          await sock.sendMessage(jid, { text: '❌ Tanggal/waktu tidak valid. Contoh: 2025-08-12 14:30' });
          return;
        }
        const delay = when.getTime() - Date.now();
        if (delay <= 0) {
          await sock.sendMessage(jid, { text: '❌ Waktu sudah lewat. Pilih waktu di masa depan.' });
          return;
        }
        return scheduleReminder(jid, sock, msg, when);
      }

      // Relative: "10m pesan..." / "1h30m pesan..."
      const durToken = args[0];
      const msg = args.slice(1).join(' ').trim();
      if (!msg) {
        await sock.sendMessage(jid, { text: '❌ Tulis pesannya juga ya. Contoh: *!reminder 10m minum air*' });
        return;
      }
      const ms = parseDuration(durToken);
      if (!ms) {
        await sock.sendMessage(jid, { text: '❌ Durasi tidak valid. Contoh: 45s, 10m, 2h, 1d, 1h30m' });
        return;
      }
      const when = new Date(Date.now() + ms);
      return scheduleReminder(jid, sock, msg, when);

    } catch (err) {
      console.error(`Error in ${this.name} command:`, err);
      await sock.sendMessage(jid, { text: '❌ Gagal membuat reminder. Coba lagi.' });
    }
  }
};

/* ================== Helpers ================== */

function helpText() {
  return (
    '⏰ *Reminder Help*\n' +
    '• `!reminder 10m minum air`\n' +
    '• `!reminder 1h30m meeting standup`\n' +
    '• `!reminder at 2025-08-12 14:30 presentasi`\n' +
    '• `!reminder list`\n' +
    '• `!reminder cancel <id>`'
  );
}

function parseDuration(token) {
  // contoh: 45s, 10m, 2h, 1d, 1h30m, 2h15m30s
  if (!/^\d+(s|m|h|d)(\d+(s|m|h|d))*$/i.test(token)) {
    // allow like "1h30m" or "90m"
    // fallback: split with regex global
  }
  const re = /(\d+)([smhd])/gi;
  let match, total = 0;
  while ((match = re.exec(token)) !== null) {
    const val = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    if (unit === 's') total += val * 1000;
    else if (unit === 'm') total += val * 60 * 1000;
    else if (unit === 'h') total += val * 60 * 60 * 1000;
    else if (unit === 'd') total += val * 24 * 60 * 60 * 1000;
  }
  return total > 0 ? total : null;
}

function parseAbsolute(str) {
  // Expect "YYYY-MM-DD HH:MM" (server timezone!)
  // Kalau VPS bukan WIB, jadwal yang dipakai adalah timezone server.
  // Display nanti selalu WIB (Asia/Jakarta) biar konsisten.
  const m = str.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [_, datePart, hh, mm] = m;
  const d = new Date(`${datePart}T${hh}:${mm}:00`);
  if (isNaN(d.getTime())) return null;
  return d;
}

async function scheduleReminder(jid, sock, text, when) {
  const id = NEXT_ID++;
  const timeout = setTimeout(async () => {
    try {
      await sock.sendMessage(jid, {
        text: `⏰ *Reminder*\n${text}\n\n🗓️ ${formatWIB(new Date())}`
      });
    } catch (e) {
      console.error('Send reminder error:', e);
    } finally {
      // remove from store
      const idx = global.__REMINDERS__.findIndex(r => r.id === id);
      if (idx >= 0) global.__REMINDERS__.splice(idx, 1);
    }
  }, Math.max(when.getTime() - Date.now(), 0));

  global.__REMINDERS__.push({ id, jid, when, text, timeout });

  await sock.sendMessage(jid, {
    text:
      `✅ Reminder dibuat!\n` +
      `🆔 ID: ${id}\n` +
      `📝 Pesan: ${text}\n` +
      `🕒 Jadwal: ${formatWIB(when)}`
  });
}

async function handleList(jid, sock) {
  const list = global.__REMINDERS__.filter(r => r.jid === jid);
  if (!list.length) {
    await sock.sendMessage(jid, { text: 'ℹ️ Tidak ada reminder aktif untuk chat ini.' });
    return;
  }
  const lines = list
    .sort((a, b) => a.when - b.when)
    .map(r => `• [${r.id}] ${formatWIB(r.when)} — ${r.text}`);
  await sock.sendMessage(jid, {
    text: `🗒️ *Reminder Aktif (${list.length})*\n\n` + lines.join('\n')
  });
}

async function handleCancel(jid, sock, id) {
  const i = global.__REMINDERS__.findIndex(r => r.jid === jid && r.id === id);
  if (i < 0) {
    await sock.sendMessage(jid, { text: `❌ Reminder dengan ID ${id} tidak ditemukan di chat ini.` });
    return;
  }
  const r = global.__REMINDERS__[i];
  clearTimeout(r.timeout);
  global.__REMINDERS__.splice(i, 1);
  await sock.sendMessage(jid, { text: `✅ Reminder [${id}] dibatalkan.` });
}

function formatWIB(date) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: TZ_DISPLAY,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return date.toLocaleString('id-ID');
  }
}

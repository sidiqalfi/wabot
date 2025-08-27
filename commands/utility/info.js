// info.js
// Command: /info
// Mode:
// - Private chat: hanya info user + statistik dari ./data/stats.json
// - Group chat: hanya info grup (tanpa info user/bot/server)

require('dotenv').config();
const os = require('os'); // dipakai untuk cpus length kalau mau, tapi di sini gak ditampilkan
const fs = require('fs');
const path = require('path');

function formatTimeID(date = new Date()) {
  return date.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function readStats() {
  try {
    const p = path.resolve(process.cwd(), './data/stats.json');
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function topCommands(perCommand, n = 5) {
  if (!perCommand) return [];
  return Object.entries(perCommand)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([cmd, cnt], i) => `${i + 1}. ${cmd} — ${cnt}x`);
}

module.exports = {
  name: 'info',
  aliases: ['i', 'me', 'profil', 'groupinfo'],
  description: 'Info user (private) atau info grup (group).',
  usage: 'info',
  category: 'utility',

  async execute(message, sock, args) {
    try {
      const jid = message.key.remoteJid;
      const isGroup = jid.endsWith('@g.us');

      // Basic sender
      const senderJid = message.key.participant || jid;
      const senderName = message.pushName || 'User';
      const senderNumber = senderJid
        .replace(/[@:\-]/g, '')
        .replace('g.us', '')
        .replace('s.whatsapp.net', '');

      if (!isGroup) {
        // ================= PRIVATE CHAT: USER INFO + STATS =================
        const stats = readStats();
        const usageTotal = stats?.total ?? 0;
        const usageByUser = stats?.perUser?.[senderJid] ?? 0;
        const startedAt = stats?.startedAt ? new Date(stats.startedAt) : null;
        const lastUpdated = stats?.lastUpdated ? new Date(stats.lastUpdated) : null;
        const tops = topCommands(stats?.perCommand, 5);

        const lines = [
          '💬 *INFO USER (PRIVATE)*',
          '',
          '👤 *User*',
          `├ Nama: ${senderName}`,
          `└ Nomor: wa.me/${senderNumber}`,
          '',
          '🗓️ *Waktu Akses*',
          `└ ${formatTimeID(new Date())}`,
        ];

        if (stats) {
          lines.push(
            '',
            '📊 *Statistik Penggunaan*',
            `├ Total perintah dieksekusi (global): ${usageTotal}`,
            `├ Aktivitas kamu: ${usageByUser}x`,
            `└ Top 5 perintah:`,
            ...(tops.length ? tops.map(t => `   • ${t}`) : ['   • -'])
          );
          if (startedAt || lastUpdated) {
            lines.push(
              '',
              '⏱️ *Rentang Pencatatan*',
              `├ Mulai: ${startedAt ? formatTimeID(startedAt) : '-'}`,
              `└ Update terakhir: ${lastUpdated ? formatTimeID(lastUpdated) : '-'}`
            );
          }
        } else {
          lines.push('', '📊 *Statistik*', '└ Data tidak tersedia.');
        }

        await sock.sendMessage(jid, { text: lines.join('\n') });
        return;
      }

      // ================= GROUP CHAT: GROUP INFO SAJA =================
      let groupName = '-';
      let groupSize = '-';
      let groupId = jid;
      let adminCount = 0;
      let isBotAdmin = false;

      if (sock.groupMetadata) {
        try {
          const meta = await sock.groupMetadata(jid);
          groupName = meta.subject;
          groupSize = meta.participants?.length || 0;
          const admins = (meta.participants || []).filter(p => p.admin);
          adminCount = admins.length;
          const botId = sock.user.lid;
          const botIdTrim = botId.replace(/:\d+/, "");
          isBotAdmin = meta.participants
            .find((p) => p.id === botIdTrim)
            ?.admin?.includes("admin");
        } catch (e) {
          // ya sudah, tampilkan yang ada
        }
      }

      const out = [
        `👥 *INFO GRUP: ${groupName}*`,
        `├ ID: ${groupId}`,
        `├ Total Member: ${groupSize}`,
        `├ Jumlah Admin: ${adminCount}`,
        `└ Status Bot: ${isBotAdmin ? '✅ Admin' : '⛔ Bukan Admin'}`,
      ].join('\n');

      await sock.sendMessage(jid, { text: out });
    } catch (err) {
      console.error(`Error in ${this.name} command:`, err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Gagal mengambil info.'
      });
    }
  }
};

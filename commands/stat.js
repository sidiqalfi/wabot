const os = require('os');
const { getSummary } = require('../lib/statsStore');

module.exports = {
  name: 'stats',
  aliases: ['botstats', 'status'],
  description: 'Statistik bot: total command, top command/user/grup, error rate',
  usage: 'stats',
  category: 'admin',

  async execute(message, sock) {
    const jid = message.key.remoteJid;
    const isGroup = jid.endsWith('@g.us');

    const s = getSummary();
    const uptimeSec = process.uptime();
    const mem = process.memoryUsage();

    const fmt = (n) => n.toLocaleString('id-ID');
    const human = (sec) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      return `${h}j ${m}m ${s}d`;
    };

    const list = (arr, mapKey) => {
      if (!arr.length) return '-';
      return arr.map((x, i) => `${i+1}. ${mapKey(x.key)} — ${fmt(x.count)}`).join('\n');
    };

    const mapUser = (k) => k.includes('@') ? `@${k.split('@')[0]}` : k;
    const mapGroup = (k) => k.includes('@') ? `${k.split('@')[0]}` : k;

    const text =
`📊 *Bot Stats*
• Started: ${new Date(s.startedAt).toLocaleString('id-ID')}
• Updated: ${new Date(s.lastUpdated || Date.now()).toLocaleString('id-ID')}
• Total Commands: *${fmt(s.total)}*
• Errors: *${fmt(s.errors)}*
• Avg Exec: *${s.avgMs} ms*

🧠 *Top Commands*
${list(s.topCommands, (k)=>k)}

👤 *Top Users*
${list(s.topUsers, mapUser)}

👥 *Top Groups*
${list(s.topGroups, mapGroup)}

🖥️ *Server*
• Host: ${os.hostname()}
• Platform: ${os.platform()} ${os.arch()}
• Uptime: ${human(uptimeSec)}
• RAM: ${(mem.rss/1024/1024).toFixed(1)} MB`;

    // Bedakan output untuk grup: mention top users biar rame
    const mentions = s.topUsers
      .map(u => u.key)
      .filter(k => k.includes('@'))
      .slice(0, 5);

    await sock.sendMessage(jid, { text, mentions });
  }
};

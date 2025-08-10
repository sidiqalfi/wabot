const { getSummary } = require('../lib/statsStore');

module.exports = {
  name: 'top',
  description: 'Top 10 command/user/group',
  usage: 'top [commands|users|groups]',
  category: 'admin',
  async execute(message, sock, args) {
    const jid = message.key.remoteJid;
    const s = getSummary();
    const what = (args[0] || 'commands').toLowerCase();

    const fmt = (arr) => arr.map((x,i)=>`${i+1}. ${x.key} — ${x.count}`).join('\n') || '-';

    let text;
    if (what.startsWith('user')) text = `👤 *Top Users (10)*\n${fmt(s.topUsers)}`;
    else if (what.startsWith('group')) text = `👥 *Top Groups (10)*\n${fmt(s.topGroups)}`;
    else text = `🧠 *Top Commands (10)*\n${fmt(s.topCommands)}`;

    await sock.sendMessage(jid, { text });
  }
};

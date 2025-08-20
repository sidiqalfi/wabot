module.exports = {
  name: 'setgroupname',
  description: 'Mengganti nama grup (hanya untuk admin grup)',
  usage: '!setgroupname [nama baru]',
  category: 'group',
  aliases: ['setgroup', 'setname'],
  async execute(message, sock, args) {
    const { key, pushName } = message;
    const jid = key.remoteJid;
    const isGroup = jid.endsWith('@g.us');
    
    if (!isGroup) {
      await sock.sendMessage(jid, { text: '❌ Command ini hanya bisa digunakan di grup!' });
      return;
    }
    
    // Periksa apakah bot adalah admin
    const metadata = await sock.groupMetadata(jid);
    const botId = sock.user.lid;
    const botIdTrim = botId.replace(/:\d+/, "");
    const botIsAdmin = metadata.participants
      .find((p) => p.id === botIdTrim)
      ?.admin?.includes("admin");
      
    if (!botIsAdmin) {
      await sock.sendMessage(jid, { text: '❌ Bot bukan admin, tidak bisa mengganti nama grup!' });
      return;
    }
    
    // Periksa apakah pengirim adalah admin
    const sender = key.participant || key.remoteJid;
    const senderIsAdmin = metadata.participants
      .find((p) => p.id === sender)
      ?.admin?.includes("admin");
      
    if (!senderIsAdmin) {
      await sock.sendMessage(jid, { text: '❌ Hanya admin grup yang bisa menggunakan command ini!' });
      return;
    }
    
    // Periksa apakah ada argumen
    if (args.length === 0) {
      await sock.sendMessage(jid, { text: '❌ Mohon masukkan nama grup baru!' });
      return;
    }
    
    const newGroupName = args.join(' ');
    
    try {
      await sock.groupUpdateSubject(jid, newGroupName);
      await sock.sendMessage(jid, { text: `✅ Berhasil mengganti nama grup menjadi: ${newGroupName}` });
    } catch (error) {
      console.error('Error updating group name:', error);
      await sock.sendMessage(jid, { text: '❌ Gagal mengganti nama grup. Silakan coba lagi.' });
    }
  }
};
module.exports = {
  name: 'setgroupdesc',
  description: 'Mengganti deskripsi grup (hanya untuk admin grup)',
  usage: '!setgroupdesc [deskripsi baru]',
  category: 'group',
  aliases: ['setdesc'],
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
      await sock.sendMessage(jid, { text: '❌ Bot bukan admin, tidak bisa mengganti deskripsi grup!' });
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
      await sock.sendMessage(jid, { text: '❌ Mohon masukkan deskripsi grup baru!' });
      return;
    }
    
    const newGroupDesc = args.join(' ');
    
    try {
      await sock.groupUpdateDescription(jid, newGroupDesc);
      await sock.sendMessage(jid, { text: `✅ Berhasil mengganti deskripsi grup menjadi: ${newGroupDesc}` });
    } catch (error) {
      console.error('Error updating group description:', error);
      await sock.sendMessage(jid, { text: '❌ Gagal mengganti deskripsi grup. Silakan coba lagi.' });
    }
  }
};
module.exports = {
  name: 'out',
  description: 'Membuat bot keluar dari grup (hanya untuk admin grup)',
  usage: '!out',
  category: 'group',
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
      
    // Periksa apakah pengirim adalah admin
    const sender = key.participant || key.remoteJid;
    const senderIsAdmin = metadata.participants
      .find((p) => p.id === sender)
      ?.admin?.includes("admin");
      
    if (!senderIsAdmin) {
      await sock.sendMessage(jid, { text: '❌ Hanya admin grup yang bisa menggunakan command ini!' });
      return;
    }
    
    try {
      if (botIsAdmin) {
        await sock.sendMessage(jid, { text: '⚠️ Bot adalah admin grup. Silakan demote bot terlebih dahulu sebelum keluar.' });
        return;
      }
      
      await sock.sendMessage(jid, { text: '👋 Bot akan keluar dari grup. Terima kasih!' });
      await sock.groupLeave(jid);
    } catch (error) {
      console.error('Error leaving group:', error);
      await sock.sendMessage(jid, { text: '❌ Gagal keluar dari grup. Silakan coba lagi.' });
    }
  }
};
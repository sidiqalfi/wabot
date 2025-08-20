module.exports = {
  name: 'opengroup',
  description: 'Membuka grup (memungkinkan semua member mengirim pesan) (hanya untuk admin grup)',
  usage: '!opengroup',
  category: 'group',
  aliases: ['open'],
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
      await sock.sendMessage(jid, { text: '❌ Bot bukan admin, tidak bisa membuka grup!' });
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
    
    // Pesan opsional setelah command
    const customMsg = args.length ? args.join(' ') : '';
    
    try {
      await sock.groupSettingUpdate(jid, 'not_announcement');
      let responseText = '✅ Grup telah dibuka! Semua member bisa mengirim pesan.';
      if (customMsg) {
        responseText += `\n\nPesan dari admin: ${customMsg}`;
      }
      await sock.sendMessage(jid, { text: responseText });
    } catch (error) {
      console.error('Error opening group:', error);
      await sock.sendMessage(jid, { text: '❌ Gagal membuka grup. Silakan coba lagi.' });
    }
  }
};
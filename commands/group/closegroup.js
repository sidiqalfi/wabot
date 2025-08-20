module.exports = {
  name: 'closegroup',
  description: 'Menutup grup (hanya admin yang bisa mengirim pesan) (hanya untuk admin grup)',
  usage: '!closegroup',
  category: 'group',
  aliases: ['close'],
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
      await sock.sendMessage(jid, { text: '❌ Bot bukan admin, tidak bisa menutup grup!' });
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
      await sock.groupSettingUpdate(jid, 'announcement');
      let responseText = '✅ Grup telah ditutup! Hanya admin yang bisa mengirim pesan.';
      if (customMsg) {
        responseText += `\n\nPesan dari admin: ${customMsg}`;
      }
      await sock.sendMessage(jid, { text: responseText });
    } catch (error) {
      console.error('Error closing group:', error);
      await sock.sendMessage(jid, { text: '❌ Gagal menutup grup. Silakan coba lagi.' });
    }
  }
};
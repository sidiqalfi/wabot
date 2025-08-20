module.exports = {
  name: 'kick',
  description: 'Mengeluarkan member dari grup (hanya untuk admin grup)',
  usage: '!kick @user',
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
      
    if (!botIsAdmin) {
      await sock.sendMessage(jid, { text: '❌ Bot bukan admin, tidak bisa mengeluarkan member!' });
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
    
    // Periksa apakah ada mention
    const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!mentionedJid || mentionedJid.length === 0) {
      await sock.sendMessage(jid, { text: '❌ Mohon mention user yang akan dikeluarkan dari grup!' });
      return;
    }
    
    const userToKick = mentionedJid[0];
    
    // Periksa apakah user yang akan dikeluarkan adalah admin
    const userToKickIsAdmin = metadata.participants
      .find((p) => p.id === userToKick)
      ?.admin?.includes("admin");
      
    if (userToKickIsAdmin) {
      await sock.sendMessage(jid, { text: '❌ Tidak bisa mengeluarkan admin grup!' });
      return;
    }
    
    try {
      await sock.groupParticipantsUpdate(jid, [userToKick], 'remove');
      await sock.sendMessage(jid, { text: `✅ Berhasil mengeluarkan @${userToKick.split('@')[0]} dari grup`, mentions: [userToKick] });
    } catch (error) {
      console.error('Error kicking user:', error);
      await sock.sendMessage(jid, { text: '❌ Gagal mengeluarkan user dari grup. Silakan coba lagi.' });
    }
  }
};
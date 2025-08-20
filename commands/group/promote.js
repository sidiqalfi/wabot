module.exports = {
  name: 'promote',
  description: 'Mengangkat member menjadi admin (hanya untuk admin grup)',
  usage: '!promote @user',
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
      await sock.sendMessage(jid, { text: '❌ Bot bukan admin, tidak bisa mengangkat admin!' });
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
      await sock.sendMessage(jid, { text: '❌ Mohon mention user yang akan diangkat menjadi admin!' });
      return;
    }
    
    const userToPromote = mentionedJid[0];
    
    try {
      await sock.groupParticipantsUpdate(jid, [userToPromote], 'promote');
      await sock.sendMessage(jid, { text: `✅ Berhasil mengangkat @${userToPromote.split('@')[0]} menjadi admin`, mentions: [userToPromote] });
    } catch (error) {
      console.error('Error promoting user:', error);
      await sock.sendMessage(jid, { text: '❌ Gagal mengangkat user menjadi admin. Silakan coba lagi.' });
    }
  }
};

module.exports = {
  name: 'demote',
  description: 'Menurunkan jabatan admin menjadi member (hanya untuk admin grup)',
  usage: '!demote @user',
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
      await sock.sendMessage(jid, { text: '❌ Bot bukan admin, tidak bisa menurunkan jabatan!' });
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
      await sock.sendMessage(jid, { text: '❌ Mohon mention user yang akan diturunkan jabatannya!' });
      return;
    }
    
    const userToDemote = mentionedJid[0];
    
    try {
      await sock.groupParticipantsUpdate(jid, [userToDemote], 'demote');
      await sock.sendMessage(jid, { text: `✅ Berhasil menurunkan @${userToDemote.split('@')[0]} menjadi member`, mentions: [userToDemote] });
    } catch (error) {
      console.error('Error demoting user:', error);
      await sock.sendMessage(jid, { text: '❌ Gagal menurunkan jabatan user. Silakan coba lagi.' });
    }
  }
};
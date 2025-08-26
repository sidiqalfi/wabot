module.exports = {
  name: 'link',
  description: 'Mendapatkan link invite grup',
  usage: '!link',
  category: 'group',
  async execute(message, sock, args) {
    const { key, pushName } = message;
    const jid = key.remoteJid;
    const isGroup = jid.endsWith('@g.us');
    
    if (!isGroup) {
      await sock.sendMessage(jid, { text: '❌ Command ini hanya bisa digunakan di grup!' });
      return;
    }
    
    try {
      // Periksa apakah bot adalah admin
      const metadata = await sock.groupMetadata(jid);
      const botId = sock.user.lid;
      const botIdTrim = botId.replace(/:\d+/, "");
      const botIsAdmin = metadata.participants
        .find((p) => p.id === botIdTrim)
        ?.admin?.includes("admin");
        
      if (!botIsAdmin) {
        await sock.sendMessage(jid, { text: '❌ Bot bukan admin, tidak bisa mendapatkan link grup!' });
        return;
      }
      
      // Cek apakah link sudah diset atau belum
      let inviteCode;
      try {
        inviteCode = await sock.groupGetInviteCode(jid);
      } catch (error) {
        // Jika link belum diset, buat link baru
        try {
          inviteCode = await sock.groupRevokeInvite(jid);
        } catch (revokeError) {
          console.error('Error creating invite link:', revokeError);
          await sock.sendMessage(jid, { text: '❌ Gagal membuat link invite grup. Silakan coba lagi.' });
          return;
        }
      }
      
      // Buat link invite lengkap
      const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
      
      // Buat pesan sederhana - hanya judul dan link
      let linkMessage = `🔗 *LINK INVITE GRUP*\n\n`;
      linkMessage += `\`\`\`${inviteLink}\`\`\``;
      
      await sock.sendMessage(jid, { text: linkMessage });
      
    } catch (error) {
      console.error('Error getting group link:', error);
      
      // Pesan error yang lebih spesifik
      if (error.message && error.message.includes('not-authorized')) {
        await sock.sendMessage(jid, { text: '❌ Bot tidak memiliki izin untuk membuat link invite grup!' });
      } else if (error.message && error.message.includes('group-not-found')) {
        await sock.sendMessage(jid, { text: '❌ Grup tidak ditemukan!' });
      } else {
        await sock.sendMessage(jid, { text: '❌ Gagal mendapatkan link grup. Silakan coba lagi.' });
      }
    }
  }
};

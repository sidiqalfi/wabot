const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'unwarn',
  description: 'Menghapus peringatan dari member grup (hanya untuk admin grup)',
  usage: '!unwarn @user [jumlah]',
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
      await sock.sendMessage(jid, { text: '❌ Bot bukan admin, tidak bisa menghapus peringatan!' });
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
      await sock.sendMessage(jid, { text: '❌ Mohon mention user yang akan dihapus peringatannya!' });
      return;
    }
    
    const userToUnwarn = mentionedJid[0];
    
    // Ambil jumlah warning yang akan dihapus dari args
    const removeCount = parseInt(args[1]) || 1;
    
    if (removeCount <= 0) {
      await sock.sendMessage(jid, { text: '❌ Jumlah warning yang dihapus harus lebih dari 0!' });
      return;
    }
    
    try {
      // Load group settings
      const settingsPath = path.join(__dirname, '../../data/groupSettings.json');
      let groupSettings = {};
      
      if (fs.existsSync(settingsPath)) {
        groupSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      }
      
      // Check if group and user warnings exist
      if (!groupSettings[jid] || !groupSettings[jid].warnings || !groupSettings[jid].warnings[userToUnwarn]) {
        await sock.sendMessage(jid, { text: '❌ User ini tidak memiliki peringatan!' });
        return;
      }
      
      const userWarnings = groupSettings[jid].warnings[userToUnwarn];
      const currentWarnings = userWarnings.count;
      
      if (currentWarnings === 0) {
        await sock.sendMessage(jid, { text: '❌ User ini tidak memiliki peringatan!' });
        return;
      }
      
      // Calculate how many warnings to remove
      const actualRemoveCount = Math.min(removeCount, currentWarnings);
      
      // Remove warnings from history (remove the most recent ones)
      const removedWarnings = userWarnings.history.splice(-actualRemoveCount);
      userWarnings.count -= actualRemoveCount;
      
      // Save to file
      fs.writeFileSync(settingsPath, JSON.stringify(groupSettings, null, 2));
      
      // Send unwarn notification
      let unwarnMessage = `✅ *PERINGATAN DIHAPUS* ✅\n\n`;
      unwarnMessage += `👤 *User:* @${userToUnwarn.split('@')[0]}\n`;
      unwarnMessage += `📊 *Warning sebelumnya:* ${currentWarnings}\n`;
      unwarnMessage += `📊 *Warning dihapus:* ${actualRemoveCount}\n`;
      unwarnMessage += `📊 *Warning sekarang:* ${userWarnings.count}\n`;
      unwarnMessage += `👮 *Dihapus oleh:* ${pushName || 'Unknown'}\n`;
      unwarnMessage += `⏰ *Waktu:* ${new Date().toLocaleString('id-ID')}\n\n`;
      
      if (userWarnings.count === 0) {
        unwarnMessage += `🎉 *Semua peringatan telah dihapus!* User bersih dari peringatan.`;
      } else {
        unwarnMessage += `⚠️ *Sisa peringatan:* ${userWarnings.count} kali lagi sebelum dikeluarkan dari grup.`;
      }
      
      await sock.sendMessage(jid, { 
        text: unwarnMessage, 
        mentions: [userToUnwarn] 
      });
      
    } catch (error) {
      console.error('Error unwarning user:', error);
      await sock.sendMessage(jid, { text: '❌ Gagal menghapus peringatan. Silakan coba lagi.' });
    }
  }
};

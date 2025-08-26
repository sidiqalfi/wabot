const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'warn',
  description: 'Memberikan peringatan kepada member grup (hanya untuk admin grup)',
  usage: '!warn @user [alasan]',
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
      await sock.sendMessage(jid, { text: '❌ Bot bukan admin, tidak bisa memberikan peringatan!' });
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
      await sock.sendMessage(jid, { text: '❌ Mohon mention user yang akan diberi peringatan!' });
      return;
    }
    
    const userToWarn = mentionedJid[0];
    
    // Periksa apakah user yang akan diwarn adalah admin
    const userToWarnIsAdmin = metadata.participants
      .find((p) => p.id === userToWarn)
      ?.admin?.includes("admin");
      
    if (userToWarnIsAdmin) {
      await sock.sendMessage(jid, { text: '❌ Tidak bisa memberikan peringatan kepada admin grup!' });
      return;
    }
    
    // Ambil alasan dari args
    const reason = args.slice(1).join(' ') || 'Tidak ada alasan yang diberikan';
    
    try {
      // Load group settings
      const settingsPath = path.join(__dirname, '../../data/groupSettings.json');
      let groupSettings = {};
      
      if (fs.existsSync(settingsPath)) {
        groupSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      }
      
      // Initialize group settings if not exists
      if (!groupSettings[jid]) {
        groupSettings[jid] = {};
      }
      
      // Initialize warnings if not exists
      if (!groupSettings[jid].warnings) {
        groupSettings[jid].warnings = {};
      }
      
      // Get user info
      const userInfo = await sock.onWhatsApp(userToWarn);
      const userName = userInfo[0]?.exists ? userInfo[0].wamid : userToWarn.split('@')[0];
      
      // Initialize user warnings if not exists
      if (!groupSettings[jid].warnings[userToWarn]) {
        groupSettings[jid].warnings[userToWarn] = {
          count: 0,
          history: [],
          userName: userName
        };
      }
      
      // Add warning
      const warningData = {
        timestamp: new Date().toISOString(),
        reason: reason,
        warnedBy: sender,
        warnedByName: pushName || 'Unknown'
      };
      
      groupSettings[jid].warnings[userToWarn].history.push(warningData);
      groupSettings[jid].warnings[userToWarn].count += 1;
      groupSettings[jid].warnings[userToWarn].userName = userName;
      
      // Save to file
      fs.writeFileSync(settingsPath, JSON.stringify(groupSettings, null, 2));
      
      const warningCount = groupSettings[jid].warnings[userToWarn].count;
      
      // Send warning notification
      let warningMessage = `⚠️ *PERINGATAN* ⚠️\n\n`;
      warningMessage += `👤 *User:* @${userToWarn.split('@')[0]}\n`;
      warningMessage += `📊 *Warning ke:* ${warningCount}/3\n`;
      warningMessage += `📝 *Alasan:* ${reason}\n`;
      warningMessage += `👮 *Diberikan oleh:* ${pushName || 'Unknown'}\n`;
      warningMessage += `⏰ *Waktu:* ${new Date().toLocaleString('id-ID')}\n\n`;
      
      if (warningCount >= 3) {
        warningMessage += `🚨 *PERINGATAN TERAKHIR!* User akan dikeluarkan dari grup!\n\n`;
        
        // Auto kick user
        try {
          await sock.groupParticipantsUpdate(jid, [userToWarn], 'remove');
          warningMessage += `✅ *User telah dikeluarkan dari grup karena mencapai 3 peringatan!*`;
        } catch (kickError) {
          console.error('Error auto-kicking user:', kickError);
          warningMessage += `❌ *Gagal mengeluarkan user secara otomatis. Silakan kick manual.*`;
        }
      } else {
        warningMessage += `⚠️ *Sisa peringatan:* ${3 - warningCount} kali lagi sebelum dikeluarkan dari grup.`;
      }
      
      await sock.sendMessage(jid, { 
        text: warningMessage, 
        mentions: [userToWarn] 
      });
      
    } catch (error) {
      console.error('Error warning user:', error);
      await sock.sendMessage(jid, { text: '❌ Gagal memberikan peringatan. Silakan coba lagi.' });
    }
  }
};

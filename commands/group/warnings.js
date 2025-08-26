const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'warnings',
  description: 'Melihat status peringatan member grup',
  usage: '!warnings [@user]',
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
      // Load group settings
      const settingsPath = path.join(__dirname, '../../data/groupSettings.json');
      let groupSettings = {};
      
      if (fs.existsSync(settingsPath)) {
        groupSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      }
      
      // Check if group warnings exist
      if (!groupSettings[jid] || !groupSettings[jid].warnings) {
        await sock.sendMessage(jid, { text: '📊 **Status Peringatan Grup**\n\nTidak ada peringatan yang tercatat di grup ini.' });
        return;
      }
      
      const warnings = groupSettings[jid].warnings;
      const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid;
      
      // If user is mentioned, show specific user warnings
      if (mentionedJid && mentionedJid.length > 0) {
        const userJid = mentionedJid[0];
        
        if (!warnings[userJid]) {
          await sock.sendMessage(jid, { 
            text: `📊 *Status Peringatan User*\n\n@${userJid.split('@')[0]} tidak memiliki peringatan.`, 
            mentions: [userJid] 
          });
          return;
        }
        
        const userWarnings = warnings[userJid];
        let warningMessage = `📊 *Status Peringatan User*\n\n`;
        warningMessage += `👤 *User:* @${userJid.split('@')[0]}\n`;
        warningMessage += `📊 *Total Warning:* ${userWarnings.count}/3\n`;
        warningMessage += `📊 *Status:* ${userWarnings.count >= 3 ? '🚨 MAX WARNING' : '⚠️ Aktif'}\n\n`;
        
        if (userWarnings.history && userWarnings.history.length > 0) {
          warningMessage += `📝 *Riwayat Peringatan:*\n`;
          userWarnings.history.forEach((warning, index) => {
            const date = new Date(warning.timestamp).toLocaleString('id-ID');
            warningMessage += `${index + 1}. *${date}* - ${warning.reason}\n`;
            warningMessage += `   👮 Oleh: ${warning.warnedByName}\n\n`;
          });
        }
        
        if (userWarnings.count >= 3) {
          warningMessage += `🚨 *User telah mencapai batas maksimal peringatan!*`;
        } else {
          warningMessage += `⚠️ *Sisa peringatan:* ${3 - userWarnings.count} kali lagi sebelum dikeluarkan dari grup.`;
        }
        
        await sock.sendMessage(jid, { 
          text: warningMessage, 
          mentions: [userJid] 
        });
        
      } else {
        // Show all warnings in group
        const usersWithWarnings = Object.keys(warnings).filter(userJid => warnings[userJid].count > 0);
        
        if (usersWithWarnings.length === 0) {
          await sock.sendMessage(jid, { text: '📊 *Status Peringatan Grup*\n\nTidak ada peringatan yang tercatat di grup ini.' });
          return;
        }
        
        let warningMessage = `📊 *Status Peringatan Grup*\n\n`;
        warningMessage += `👥 *Total User dengan Peringatan:* ${usersWithWarnings.length}\n\n`;
        
        // Sort by warning count (highest first)
        const sortedUsers = usersWithWarnings.sort((a, b) => warnings[b].count - warnings[a].count);
        
        sortedUsers.forEach((userJid, index) => {
          const userWarnings = warnings[userJid];
          const userName = userWarnings.userName || userJid.split('@')[0];
          const status = userWarnings.count >= 3 ? '🚨 MAX' : '⚠️';
          
          warningMessage += `${index + 1}. @${userJid.split('@')[0]} - ${userWarnings.count}/3 ${status}\n`;
        });
        
        warningMessage += `\n💡 *Gunakan:* !warnings @user *untuk melihat detail peringatan user tertentu*`;
        
        await sock.sendMessage(jid, { 
          text: warningMessage, 
          mentions: usersWithWarnings 
        });
      }
      
    } catch (error) {
      console.error('Error checking warnings:', error);
      await sock.sendMessage(jid, { text: '❌ Gagal memeriksa status peringatan. Silakan coba lagi.' });
    }
  }
};

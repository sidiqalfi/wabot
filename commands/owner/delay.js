const commandDelay = require('../../lib/commandDelay');

module.exports = {
  name: 'delay',
  description: 'Mengatur delay command untuk pengguna bot (owner-only)',
  aliases: ['setdelay', 'delayconfig'],
  usage: 'delay [on|off|seconds] [value]',
  category: 'owner',
  ownerOnly: true,
  
  async execute(message, sock, args) {
    const jid = message.key.remoteJid;
    
    if (args.length === 0) {
      // Show current delay settings
      const settings = commandDelay.getSettings();
      const status = settings.enabled ? '✅ Aktif' : '❌ Nonaktif';
      const mode = settings.ownerOnly ? 'Hanya untuk non-owner' : 'Untuk semua user';
      
      await sock.sendMessage(jid, {
        text: `⚙️ *Pengaturan Delay Command*\n\n` +
              `Status: ${status}\n` +
              `Delay: ${settings.delaySeconds} detik\n` +
              `Mode: ${mode}\n\n` +
              `Penggunaan:\n` +
              `• !delay on - Aktifkan delay\n` +
              `• !delay off - Nonaktifkan delay\n` +
              `• !delay seconds [angka] - Atur durasi delay\n` +
              `• !delay mode [owner|all] - Atur mode delay\n` +
              `• !delay test - Test sistem delay\n\n` +
              `Contoh:\n` +
              `• !delay on\n` +
              `• !delay seconds 10\n` +
              `• !delay mode all`
      });
      return;
    }
    
    const action = args[0].toLowerCase();
    
    try {
      switch (action) {
        case 'on':
          commandDelay.enable();
          await sock.sendMessage(jid, {
            text: '✅ Delay command telah diaktifkan'
          });
          break;
          
        case 'off':
          commandDelay.disable();
          await sock.sendMessage(jid, {
            text: '✅ Delay command telah dinonaktifkan'
          });
          break;
          
        case 'seconds':
          if (args.length < 2) {
            await sock.sendMessage(jid, {
              text: '❌ Penggunaan: !delay seconds [angka]\nContoh: !delay seconds 10'
            });
            return;
          }
          
          const seconds = parseInt(args[1]);
          if (isNaN(seconds) || seconds < 0) {
            await sock.sendMessage(jid, {
              text: '❌ Angka delay tidak valid. Gunakan angka positif.'
            });
            return;
          }
          
          commandDelay.setDelay(seconds);
          await sock.sendMessage(jid, {
            text: `✅ Delay command telah diatur menjadi ${seconds} detik`
          });
          break;
          
        case 'mode':
          if (args.length < 2) {
            await sock.sendMessage(jid, {
              text: '❌ Penggunaan: !delay mode [owner|all]\nContoh: !delay mode all'
            });
            return;
          }
          
          const mode = args[1].toLowerCase();
          if (mode === 'owner') {
            commandDelay.setOwnerOnly(true);
            await sock.sendMessage(jid, {
              text: '✅ Mode delay diatur untuk non-owner saja'
            });
          } else if (mode === 'all') {
            commandDelay.setOwnerOnly(false);
            await sock.sendMessage(jid, {
              text: '✅ Mode delay diatur untuk semua user'
            });
          } else {
            await sock.sendMessage(jid, {
              text: '❌ Mode tidak valid. Gunakan "owner" atau "all"'
            });
          }
          break;
          
        case 'test':
          // Test the delay system
          const testMessage = '✅ Sistem delay berfungsi dengan baik! Command ini dijalankan tanpa delay karena Anda adalah owner.';
          await sock.sendMessage(jid, {
            text: testMessage
          });
          break;
          
        default:
          await sock.sendMessage(jid, {
            text: '❌ Perintah tidak dikenali.\n\nGunakan !delay untuk melihat bantuan.'
          });
      }
    } catch (error) {
      console.error('Delay command error:', error);
      await sock.sendMessage(jid, {
        text: '❌ Terjadi kesalahan saat mengatur delay'
      });
    }
  }
};
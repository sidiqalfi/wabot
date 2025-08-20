// blacklist.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { jidNormalizedUser } = require('baileys');

module.exports = {
  name: 'blacklist',
  aliases: ['block', 'unblock'],
  description: 'Mengelola daftar kontak yang diblokir (owner only)',
  usage: 'blacklist [add/remove/list] [nomor]',
  category: 'owner',
  
  async execute(message, sock, args) {
    const jid = message.key.remoteJid;
    const sender = message.key.participant || message.key.remoteJid;
    const senderNumber = sender.split('@')[0];
    
    // Cek apakah pengirim adalah owner
    const ownerNumber = process.env.BOT_SUPPORT;
    if (!ownerNumber) {
      return sock.sendMessage(jid, { text: 'Nomor owner belum diatur di file .env (BOT_SUPPORT).' });
    }
    
    // Extract phone number from BOT_SUPPORT (which might be a URL)
    const sanitizedOwnerNumber = ownerNumber.replace(/\D/g, '');
    
    // Normalize sender number (handle Indonesian format)
    let normalizedSenderNumber = senderNumber;
    if (normalizedSenderNumber.startsWith('0')) {
      normalizedSenderNumber = '62' + normalizedSenderNumber.substring(1);
    }
    
    // Debug logging
    console.log(`[BLACKLIST] Owner validation - Sender: ${senderNumber} (${normalizedSenderNumber}), Owner: ${ownerNumber} (${sanitizedOwnerNumber})`);
    
    if (normalizedSenderNumber !== sanitizedOwnerNumber) {
      return sock.sendMessage(jid, { 
        text: `❌ Perintah ini hanya bisa digunakan oleh owner bot.` 
      });
    }
    
    // Baca file blockedNumbers.json
    const blockedNumbersPath = path.join(__dirname, '../../data/blockedNumbers.json');
    let blockedNumbers = {};
    if (fs.existsSync(blockedNumbersPath)) {
      blockedNumbers = JSON.parse(fs.readFileSync(blockedNumbersPath, 'utf8'));
    }
    
    const action = args[0]?.toLowerCase();
    const targetNumber = args[1]?.replace(/\D/g, '');
    
    try {
      switch(action) {
        case 'add':
        case 'block':
          if (!targetNumber) {
            return sock.sendMessage(jid, { text: '❌ Penggunaan: /blacklist add [nomor]\nContoh: /blacklist add 6281234567890' });
          }
          
          // Cek apakah nomor sudah diblokir
          if (blockedNumbers[targetNumber]) {
            return sock.sendMessage(jid, { text: `❌ Nomor ${targetNumber} sudah ada dalam daftar blacklist.` });
          }
          
          // Tambahkan ke blacklist
          blockedNumbers[targetNumber] = {
            blockedAt: new Date().toISOString(),
            blockedBy: sanitizedOwnerNumber,
            reason: 'Manually blocked by owner'
          };
          
          // Simpan ke file
          fs.writeFileSync(blockedNumbersPath, JSON.stringify(blockedNumbers, null, 2));
          
          // Blokir kontak di WhatsApp
          const targetJid = `${targetNumber}@s.whatsapp.net`;
          await sock.updateBlockStatus(targetJid, 'block');
          
          return sock.sendMessage(jid, { text: `✅ Berhasil menambahkan ${targetNumber} ke daftar blacklist.` });
          
        case 'remove':
        case 'unblock':
          if (!targetNumber) {
            return sock.sendMessage(jid, { text: '❌ Penggunaan: /blacklist remove [nomor]\nContoh: /blacklist remove 6281234567890' });
          }
          
          // Cek apakah nomor ada dalam blacklist
          if (!blockedNumbers[targetNumber]) {
            return sock.sendMessage(jid, { text: `❌ Nomor ${targetNumber} tidak ada dalam daftar blacklist.` });
          }
          
          // Hapus dari blacklist
          delete blockedNumbers[targetNumber];
          
          // Simpan ke file
          fs.writeFileSync(blockedNumbersPath, JSON.stringify(blockedNumbers, null, 2));
          
          // Buka blokir kontak di WhatsApp
          const unblockJid = `${targetNumber}@s.whatsapp.net`;
          await sock.updateBlockStatus(unblockJid, 'unblock');
          
          return sock.sendMessage(jid, { text: `✅ Berhasil menghapus ${targetNumber} dari daftar blacklist.` });
          
        case 'list':
          if (Object.keys(blockedNumbers).length === 0) {
            return sock.sendMessage(jid, { text: '📋 Daftar blacklist kosong.' });
          }
          
          let listText = '📋 *Daftar Kontak yang Diblokir:*\n\n';
          let index = 1;
          
          for (const [number, data] of Object.entries(blockedNumbers)) {
            const date = new Date(data.blockedAt).toLocaleString('id-ID');
            const reason = data.reason || 'Tidak disebutkan';
            const blockedBy = data.blockedBy ? ` oleh ${data.blockedBy}` : '';
            
            listText += `${index}. ${number}\n   Diblokir pada: ${date}${blockedBy}\n   Alasan: ${reason}\n\n`;
            index++;
          }
          
          return sock.sendMessage(jid, { text: listText });
          
        default:
          return sock.sendMessage(jid, { 
            text: `🔧 *Blacklist Manager*\n\nPenggunaan:\n/blacklist add [nomor] - Memblokir kontak\n/blacklist remove [nomor] - Membuka blokir kontak\n/blacklist list - Melihat daftar blacklist\n\nContoh:\n/blacklist add 6281234567890\n/blacklist remove 6281234567890\n/blacklist list` 
          });
      }
    } catch (err) {
      console.error('[BLACKLIST] Error:', err);
      return sock.sendMessage(jid, { text: '❌ Terjadi kesalahan saat mengelola blacklist.' });
    }
  },
};
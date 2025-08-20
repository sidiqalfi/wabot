module.exports = {
  name: 'add',
  description: 'Menambahkan member ke grup (hanya untuk admin grup)',
  usage: '!add 6281234567890',
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
      await sock.sendMessage(jid, { text: '❌ Bot bukan admin, tidak bisa menambahkan member!' });
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
    
    // Periksa apakah ada argumen
    if (args.length === 0) {
      await sock.sendMessage(jid, { text: '❌ Mohon masukkan nomor yang akan ditambahkan ke grup!' });
      return;
    }
    
    // Format nomor
    let number = args[0];
    if (number.startsWith('08')) {
      number = '62' + number.substring(1);
    } else if (number.startsWith('+62')) {
      number = '62' + number.substring(3);
    } else if (number.startsWith('62')) {
      // Nomor sudah dalam format yang benar
    } else {
      await sock.sendMessage(jid, { text: '❌ Format nomor tidak valid! Gunakan format 6281234567890' });
      return;
    }
    
    const userToAdd = number + '@s.whatsapp.net';
    
    try {
      const response = await sock.groupParticipantsUpdate(jid, [userToAdd], 'add');
      if (response[0].status === '200') {
        await sock.sendMessage(jid, { text: `✅ Berhasil menambahkan ${number} ke grup` });
      } else if (response[0].status === '403') {
        await sock.sendMessage(jid, { text: `❌ Gagal menambahkan ${number} ke grup. Nomor tersebut mungkin telah memblokir bot atau tidak menggunakan WhatsApp.` });
      } else {
        await sock.sendMessage(jid, { text: `❌ Gagal menambahkan ${number} ke grup. Status: ${response[0].status}` });
      }
    } catch (error) {
      console.error('Error adding user:', error);
      await sock.sendMessage(jid, { text: '❌ Gagal menambahkan user ke grup. Silakan coba lagi.' });
    }
  }
};

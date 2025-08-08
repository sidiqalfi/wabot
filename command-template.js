// Template untuk membuat command baru
// Copy file ini dan rename sesuai nama command
// Hapus komentar ini setelah selesai

module.exports = {
    name: 'namacommand', // WAJIB: Nama command (harus unik)
    description: 'Deskripsi command', // WAJIB: Deskripsi singkat command
    usage: 'namacommand [parameter]', // OPSIONAL: Cara penggunaan
    category: 'general', // OPSIONAL: Kategori command (general, utility, fun, admin, etc.)
    
    // WAJIB: Function yang akan dijalankan ketika command dipanggil
    async execute(message, sock, args) {
        // message: Object pesan dari WhatsApp (berisi info pengirim, grup, dll)
        // sock: Instance Baileys untuk mengirim pesan
        // args: Array parameter yang dikirim user (tanpa nama command)
        
        try {
            // Contoh: Cek apakah ada parameter
            if (args.length === 0) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Parameter diperlukan!\n\nContoh: !namacommand parameter'
                });
                return;
            }
            
            // Contoh: Gabungkan semua parameter menjadi satu string
            const parameter = args.join(' ');
            
            // Contoh: Ambil nama pengirim
            const senderName = message.pushName || 'User';
            
            // Contoh: Cek apakah pesan dari grup
            const isGroup = message.key.remoteJid.endsWith('@g.us');
            
            // Logic command di sini
            const response = `✅ Command berhasil dijalankan!\n\n` +
                           `👤 Pengirim: ${senderName}\n` +
                           `📝 Parameter: ${parameter}\n` +
                           `📍 Dari: ${isGroup ? 'Grup' : 'Private Chat'}`;
            
            // Kirim respons
            await sock.sendMessage(message.key.remoteJid, {
                text: response
            });
            
        } catch (error) {
            console.error(`Error in ${this.name} command:`, error);
            
            // Kirim pesan error ke user
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Terjadi kesalahan saat menjalankan command!'
            });
        }
    }
};
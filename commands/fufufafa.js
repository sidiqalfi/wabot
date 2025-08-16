// Import library axios untuk melakukan HTTP requests
const axios = require("axios");

// Definisikan properti dan fungsi command
module.exports = {
  name: "fufufafa", // Nama command
  description: "Mengirimkan komentar random dari Fufufafa", // Deskripsi command
  usage: "!fufufafa", // Cara penggunaan command
  category: "fun", // Kategori command
  aliases: ["fufu", "fafa", "fufa", "ffa", "ffu", "ff"], // Alias untuk command ini

  // Fungsi utama yang dijalankan ketika command dipanggil
  async execute(message, sock, args) {
    try {
      // Menghasilkan ID acak antara 1 dan 1314 (inklusif)
      const randomId = Math.floor(Math.random() * 1314) + 1;
      // Melakukan GET request ke Fufufafa API dengan ID acak
      const response = await axios.get(
        `https://fufufafapi.vanirvan.my.id/api/${randomId}`,
      );
      // Mendapatkan data yang relevan dari response API
      const { image_url, content, doksli } = response.data;

      let caption = "";
      // Menambahkan 'content' ke caption jika ada
      if (content) {
        caption += content + "\n";
      }
      // Menambahkan 'doksli' ke caption jika ada
      if (doksli) {
        caption += doksli;
      }

      // Mengirim pesan berdasarkan data yang diterima
      if (image_url) {
        // Jika ada image_url, kirim gambar dengan caption
        await sock.sendMessage(message.key.remoteJid, {
          image: { url: image_url }, // Objek gambar dengan URL
          caption: caption || "Konten dari Fufufafa API", // Caption atau teks yang menyertai gambar
        });
      } else if (caption) {
        // Jika tidak ada image_url tapi ada caption, kirim teks saja
        await sock.sendMessage(message.key.remoteJid, {
          text: caption,
        });
      } else {
        // Jika tidak ada image_url maupun caption, kirim pesan default
        await sock.sendMessage(message.key.remoteJid, {
          text: "Tidak ada konten yang tersedia dari Fufufafa API.",
        });
      }
    } catch (error) {
      // Menangani error jika terjadi masalah saat mengambil atau mengirim konten
      console.error(`Error in ${this.name} command:`, error); // Log error ke konsol
      // Memberi tahu pengguna bahwa terjadi kesalahan
      await sock.sendMessage(message.key.remoteJid, {
        text: "❌ Terjadi kesalahan saat mengambil konten dari Fufufafa API!",
      });
    }
  },
};

// Import library axios untuk melakukan HTTP requests
const axios = require("axios");

// Definisikan properti dan fungsi command
module.exports = {
  name: "cat", // Nama command
  description: "Mengirim gambar kucing random.", // Deskripsi command
  usage: "!cat", // Cara penggunaan command
  category: "fun", // Kategori command
  aliases: ["kucing"], // Alias untuk command ini, bisa dipanggil dengan !kucing juga

  // Fungsi utama yang dijalankan ketika command dipanggil
  async execute(message, sock, args) {
    try {
      // Melakukan GET request ke TheCatAPI untuk mendapatkan gambar kucing random
      const response = await axios.get(
        "https://api.thecatapi.com/v1/images/search",
      );
      // Mengambil URL gambar kucing dari response API
      const imageUrl = response.data[0].url;

      // Mengirim gambar kucing ke chat pengirim
      await sock.sendMessage(message.key.remoteJid, {
        image: { url: imageUrl }, // Objek gambar dengan URL
        caption: "Meow! 🐾", // Caption atau teks yang menyertai gambar
      });
    } catch (error) {
      // Menangani error jika terjadi masalah saat mengambil atau mengirim gambar
      console.error(`Error in ${this.name} command:`, error); // Log error ke konsol
      // Memberi tahu pengguna bahwa terjadi kesalahan
      await sock.sendMessage(message.key.remoteJid, {
        text: "❌ Terjadi kesalahan saat mengambil gambar kucing!",
      });
    }
  },
};

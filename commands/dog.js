const axios = require("axios");

module.exports = {
  name: "dog",
  description: "Mengirim gambar anjing random.",
  usage: "!dog",
  category: "fun",
  aliases: ["anjing", "doggo"],

  async execute(message, sock, args) {
    try {
      // Melakukan GET request ke Dog API untuk mendapatkan gambar anjing random
      const response = await axios.get(
        "https://dog.ceo/api/breeds/image/random",
      );
      // Mengambil URL gambar anjing dari response API
      const imageUrl = response.data.message;

      // Mengirim gambar anjing ke chat pengirim
      await sock.sendMessage(message.key.remoteJid, {
        image: { url: imageUrl },
        caption: "Woof woof! 🐶",
      });
    } catch (error) {
      // Menangani error jika terjadi masalah saat mengambil atau mengirim gambar
      console.error(`Error in ${this.name} command:`, error);
      // Memberi tahu pengguna bahwa terjadi kesalahan
      await sock.sendMessage(message.key.remoteJid, {
        text: "❌ Terjadi kesalahan saat mengambil gambar anjing!",
      });
    }
  },
};


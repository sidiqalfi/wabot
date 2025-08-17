const axios = require("axios");

module.exports = {
  name: "waifu",
  description: "Mengirim gambar waifu random.",
  usage: "!waifu",
  category: "fun",
  aliases: ["animegirl", "wifu"],

  async execute(message, sock, args) {
    try {
      // Melakukan GET request ke waifu.pics API untuk mendapatkan gambar waifu random
      const response = await axios.get("https://api.waifu.pics/sfw/waifu");
      // Mengambil URL gambar waifu dari response API
      const imageUrl = response.data.url;

      // Mengirim gambar waifu ke chat pengirim
      await sock.sendMessage(message.key.remoteJid, {
        image: { url: imageUrl },
        caption: "Here is your waifu! ❤️",
      });
    } catch (error) {
      // Menangani error jika terjadi masalah saat mengambil atau mengirim gambar
      console.error(`Error in ${this.name} command:`, error);
      // Memberi tahu pengguna bahwa terjadi kesalahan
      await sock.sendMessage(message.key.remoteJid, {
        text: "❌ Terjadi kesalahan saat mengambil gambar waifu!",
      });
    }
  },
};


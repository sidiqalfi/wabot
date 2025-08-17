const axios = require("axios");

module.exports = {
  name: "doa",
  aliases: ["doadoa", "doa-harian", "doa-islam"],
  description: "Menampilkan doa harian Islami",
  usage:
    "/doa [id|keyword|--list]\n\nContoh:\n/doa\n/doa 3\n/doa tidur\n/doa --list",
  category: "religion",

  async execute(message, sock, args) {
    const baseUrl = "https://doa-doa-api-ahmadramadhan.fly.dev/api";
    const doaListUrl = `${baseUrl}`;
    const randomUrl = `${baseUrl}/doa/v1/random`;

    try {
      // ----- Jika user /doa --list -----
      if (args[0] === "--list") {
        const { data } = await axios.get(doaListUrl);

        const listText =
          "*📚 Daftar Doa Harian:*\n\n" +
          data.map((item) => `• (${item.id}) ${item.doa}`).join("\n") +
          "\n\n📝 Gunakan: /doa [id] atau /doa [keyword]";

        return await sock.sendMessage(message.key.remoteJid, {
          text: listText,
        });
      }

      // ----- Jika user tidak kirim apapun (random doa) -----
      if (!args[0]) {
        const { data } = await axios.get(randomUrl);
        const doa = data[0];

        const text =
          `📿 *${doa.doa}*\n\n` +
          `\n${doa.ayat}\n\n` +
          `🔊 Latin:\n_${doa.latin}_\n\n` +
          `📝 Arti:\n_${doa.artinya}_`;

        return await sock.sendMessage(message.key.remoteJid, {
          text,
        });
      }

      // ----- Jika user pakai angka (id) -----
      const isNumber = !isNaN(args[0]);
      if (isNumber) {
        const { data } = await axios.get(`${baseUrl}/${args[0]}`);
        const doa = data[0];

        const text =
          `📿 *${doa.doa}*\n\n` +
          `🕋 Arab:\n${doa.ayat}\n\n` +
          `🔊 Latin:\n_${doa.latin}_\n\n` +
          `📝 Arti:\n_${doa.artinya}_`;

        return await sock.sendMessage(message.key.remoteJid, {
          text,
        });
      }

      // ----- Jika user pakai keyword (string) -----
      const keyword = args.join(" ");
      const { data } = await axios.get(
        `${baseUrl}/doa/${encodeURIComponent(keyword)}`,
      );

      const doa = data;

      const text =
        `📿 *${doa.doa}*\n\n` +
        `🕋 Arab:\n${doa.ayat}\n\n` +
        `🔊 Latin:\n_${doa.latin}_\n\n` +
        `📝 Arti:\n_${doa.artinya}_`;

      return await sock.sendMessage(message.key.remoteJid, {
        text,
      });
    } catch (error) {
      console.error("❌ ERROR /doa command:", error.message);
      return await sock.sendMessage(message.key.remoteJid, {
        text: "❌ Maaf, doa tidak ditemukan atau terjadi kesalahan.",
      });
    }
  },
};

const fs = require("fs").promises;
const path = require("path");

module.exports = {
  name: "changelogs",
  aliases: ["cl", "history"],
  description: "Menampilkan seluruh riwayat perubahan (commit history).",
  usage: "changelogs",
  category: "utility",

  async execute(message, sock, args) {
    try {
      // Lokasi file changelogs (disimpan di folder ./data/)
      const changelogPath = path.join(
        __dirname,
        "..",
        "..",
        "data",
        "changelogs.txt",
      );
      const repoUrl = "https://github.com/sidiqalfi/wabot.git";

      // Coba baca file changelogs
      let rawChangelogs;
      try {
        rawChangelogs = await fs.readFile(changelogPath, "utf-8");
      } catch (error) {
        // Kalau file belum ada
        if (error.code === "ENOENT") {
          await sock.sendMessage(message.key.remoteJid, {
            text: "❌ *File changelogs belum tersedia.*\n\nSilakan lakukan commit terlebih dahulu agar changelog otomatis dibuat.",
          });
          return;
        }
        throw error; // Error lain
      }

      // Pisah baris dan buang baris kosong
      const commits = rawChangelogs
        .split("\n")
        .filter((line) => line.trim() !== "");

      if (commits.length === 0) {
        await sock.sendMessage(message.key.remoteJid, {
          text: "ℹ️ Belum ada changelog untuk ditampilkan.",
        });
        return;
      }

      // Format setiap commit: `hash` - subject (gunakan \`\` untuk menghindari konflik format WA)
      const formattedChangelogs = commits
        .map((line) => {
          const [hash, subject] = line.split("|");
          return `• *${hash.trim()}* - ${subject.trim()}`;
        })
        .join("\n");

      // Bangun isi pesan
      const response =
        `📌 *Changelogs ${process.env.BOT_NAME}*\n` +
        `📅 *Total:* ${commits.length} commit\n\n` +
        `${formattedChangelogs}\n\n` +
        `🌐 *Repository:*\n${repoUrl}`;

      // Kirim changelogs ke user
      await sock.sendMessage(message.key.remoteJid, {
        text: response,
      });
    } catch (error) {
      console.error(`Error in ${this.name} command:`, error);
      await sock.sendMessage(message.key.remoteJid, {
        text: "❌ Terjadi kesalahan saat mengambil changelogs.",
      });
    }
  },
};


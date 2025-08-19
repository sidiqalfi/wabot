const {
  fetchMetadata,
  buildYtDlpArgs,
  buildOutputPath,
  cleanup,
  formatDuration,
  isLikelyUrl,
  resolveMaxSizeMB,
  parseArgs,
  truncate,
  guessPlatformFromUrl,
  sendMedia
} = require("../../lib/mediaHelper");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "ytmp3",
  aliases: ["ytaudio"],
  description: "Download YouTube audio in MP3 format",
  usage: "ytmp3 <url> [--size <NNMB>] [--start HH:MM:SS] [--end HH:MM:SS]",
  category: "downloader",

  async execute(message, sock, args) {
    try {
      const chatId = message.key.remoteJid;

      // ====== 1) Validasi argumen dasar ======
      if (!args || args.length === 0) {
        await sock.sendMessage(chatId, {
          text: `❌ URL diperlukan.\n\nContoh:\n• ytmp3 https://youtu.be/XXXX\n• ytmp3 https://youtube.com/watch?v=XXXX --size 10MB`,
        });
        return;
      }

      // ====== 2) Parsing argumen dan flags ======
      const parsed = parseArgs(args);
      const url = parsed.url;
      if (!isLikelyUrl(url)) {
        await sock.sendMessage(chatId, { text: "❌ URL tidak valid." });
        return;
      }

      // Cek apakah URL adalah YouTube
      const platform = guessPlatformFromUrl(url);
      if (platform !== "YouTube") {
        await sock.sendMessage(chatId, { 
          text: "❌ Command ini hanya untuk YouTube. Gunakan command yang sesuai untuk platform lain." 
        });
        return;
      }

      // Ekstrak flags
      const startAt = parsed.flags.start || null;
      const endAt = parsed.flags.end || null;
      const maxSizeMB = resolveMaxSizeMB(parsed.flags.size);

      // ====== 3) Ambil metadata audio ======
      const meta = await fetchMetadata(url);
      const title = meta.title || "";
      const uploader = meta.uploader || meta.channel || "";
      const durationText = meta.duration ? formatDuration(meta.duration) : null;

      // ====== 4) Kirim notifikasi awal ======
      await sock.sendMessage(chatId, {
        text: `⏳ Memproses YouTube audio...\n\n*${title || "Tanpa Judul"}*\n> Channel: ${uploader || "N/A"}\n> Durasi: ${durationText || "N/A"}\n> Format: MP3${startAt || endAt ? `\n> Potong: ${startAt || "awal"} → ${endAt || "akhir"}` : ""}`,
      });

      // ====== 5) Siapkan direktori dan file temporary ======
      const { tmpDir, base, outTemplate } = buildOutputPath();

      // ====== 6) Cek file cookies ======
      const cookiesFilePath = path.join(__dirname, "../../data/cookies.txt");
      const cookiesFile = fs.existsSync(cookiesFilePath) ? cookiesFilePath : null;

      // ====== 7) Susun argumen untuk command yt-dlp ======
      const ytdlpArgs = buildYtDlpArgs({
        url,
        modeAudio: true,
        wantMp3: true,
        want720p: false,
        startAt,
        endAt,
        maxSizeMB,
        outTemplate,
        cookiesFile,
      });

      // ====== 7) Eksekusi yt-dlp untuk download ======
      const runResult = await require("../../lib/mediaHelper").runYtDlp(ytdlpArgs, tmpDir);

      // Cari file hasil download di direktori temporary
      const files = require("fs")
        .readdirSync(tmpDir)
        .filter((f) => f.startsWith(base + "."))
        .map((f) => require("path").join(tmpDir, f));

      if (files.length === 0) {
        const msg = runResult.stderr || runResult.stdout || "Unknown error";
        await sock.sendMessage(chatId, {
          text: `❌ Gagal download.\n\n${truncate(msg, 500)}`,
        });
        cleanup(tmpDir);
        return;
      }

      // Ambil file terbesar
      files.sort((a, b) => require("fs").statSync(b).size - require("fs").statSync(a).size);
      const outputFile = files[0];
      const sizeMB = (require("fs").statSync(outputFile).size / (1024 * 1024)).toFixed(2);

      // Validasi ukuran file
      if (require("fs").statSync(outputFile).size > maxSizeMB * 1024 * 1024) {
        await sock.sendMessage(chatId, {
          text: `⚠️ File hasil (${sizeMB}MB) melebihi batas ${maxSizeMB}MB. Coba kecilkan --size.`,
        });
        cleanup(tmpDir);
        return;
      }

      // ====== 8) Buat caption ======
      const caption = `*${title || "YouTube Audio"}*\n\n👤 *Channel:* ${uploader || "-"}\n⚖️ *Ukuran:* ${sizeMB} MB`;

      // ====== 9) Kirim file ke pengguna ======
      await sendMedia(sock, chatId, outputFile, { 
        isAudio: true, 
        wantMp3: true, 
        caption 
      });

      // ====== 10) Bersihkan file temporary ======
      cleanup(tmpDir);
    } catch (error) {
      console.error("ytmp3 command error:", error);
      try {
        await sock.sendMessage(message.key.remoteJid, {
          text: "❌ Terjadi kesalahan internal saat menjalankan YouTube audio downloader.",
        });
      } catch {} 
    }
  },
};
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
  name: "twitter",
  aliases: ["x", "tweet"],
  description: "Download Twitter/X videos",
  usage: "twitter <url> [--size <NNMB>]",
  category: "downloader",

  async execute(message, sock, args) {
    try {
      const chatId = message.key.remoteJid;

      // ====== 1) Validasi argumen dasar ======
      if (!args || args.length === 0) {
        await sock.sendMessage(chatId, {
          text: `❌ URL diperlukan.\n\nContoh:\n• twitter https://twitter.com/user/status/XXXX\n• x https://x.com/user/status/XXXX`,
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

      // Cek apakah URL adalah Twitter/X
      const platform = guessPlatformFromUrl(url);
      if (platform !== "X/Twitter") {
        await sock.sendMessage(chatId, { 
          text: "❌ Command ini hanya untuk Twitter/X. Gunakan command yang sesuai untuk platform lain." 
        });
        return;
      }

      // Ekstrak flags
      const maxSizeMB = resolveMaxSizeMB(parsed.flags.size);

      // ====== 3) Ambil metadata ======
      const meta = await fetchMetadata(url);
      const title = meta.title || "";
      const uploader = meta.uploader || meta.channel || "";
      const durationText = meta.duration ? formatDuration(meta.duration) : null;

      // ====== 4) Kirim notifikasi awal ======
      await sock.sendMessage(chatId, {
        text: `⏳ Memproses Twitter video...\n\n*${title || "Twitter Video"}*\n> User: ${uploader || "N/A"}\n> Durasi: ${durationText || "N/A"}`,
      });

      // ====== 5) Siapkan direktori dan file temporary ======
      const { tmpDir, base, outTemplate } = buildOutputPath();

      // ====== 6) Cek file cookies ======
      const cookiesFilePath = path.join(__dirname, "../../data/cookies.txt");
      const cookiesFile = fs.existsSync(cookiesFilePath) ? cookiesFilePath : null;

      // ====== 7) Susun argumen untuk command yt-dlp ======
      // Untuk Twitter, kita download video terbaik
      const ytdlpArgs = buildYtDlpArgs({
        url,
        modeAudio: false,
        wantMp3: false,
        want720p: false, // Tidak perlu limit resolusi untuk Twitter
        startAt: null,
        endAt: null,
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
      const caption = `*${title || "Twitter Video"}*\n\n👤 *User:* ${uploader || "-"}\n⚖️ *Ukuran:* ${sizeMB} MB`;

      // ====== 9) Kirim file ke pengguna ======
      await sendMedia(sock, chatId, outputFile, { 
        isAudio: false, 
        caption 
      });

      // ====== 10) Bersihkan file temporary ======
      cleanup(tmpDir);
    } catch (error) {
      console.error("twitter command error:", error);
      try {
        await sock.sendMessage(message.key.remoteJid, {
          text: "❌ Terjadi kesalahan internal saat menjalankan Twitter downloader.",
        });
      } catch {} 
    }
  },
};
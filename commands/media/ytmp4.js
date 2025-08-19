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
  sendMedia,
  getVideoResolution,
  getFormatInfo,
  parseAndFormatFormatInfo
} = require("../../lib/mediaHelper");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "ytmp4",
  aliases: ["ytvideo"],
  description: "Download YouTube videos in MP4 format",
  usage: "ytmp4 <url> [--720p] [--size <NNMB>] [--start HH:MM:SS] [--end HH:MM:SS] [--format]",
  category: "downloader",

  async execute(message, sock, args) {
    try {
      const chatId = message.key.remoteJid;

      // ====== 1) Validasi argumen dasar ======
      if (!args || args.length === 0) {
        await sock.sendMessage(chatId, {
          text: `❌ URL diperlukan.\n\nContoh:\n• ytmp4 https://youtu.be/XXXX\n• ytmp4 https://youtube.com/watch?v=XXXX --720p\n• ytmp4 https://youtube.com/watch?v=XXXX --size 50MB\n• ytmp4 https://youtube.com/watch?v=XXXX --format`,
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
      const want720p = !!parsed.flags["720p"];
      const startAt = parsed.flags.start || null;
      const endAt = parsed.flags.end || null;
      const maxSizeMB = resolveMaxSizeMB(parsed.flags.size);
      const showFormat = !!parsed.flags.format;

      // Jika flag --format digunakan, tampilkan format yang tersedia
      if (showFormat) {
        await sock.sendMessage(chatId, {
          text: `⏳ Mendapatkan informasi format untuk:\n${url}`
        });

        // Cek file cookies untuk format info
        const cookiesFilePath = path.join(__dirname, "../../data/cookies.txt");
        const cookiesFile = fs.existsSync(cookiesFilePath) ? cookiesFilePath : null;
        
        // Menggunakan flag -F untuk mendapatkan informasi format
        const formatArgs = ["-F", "--no-warnings", url];
        if (cookiesFile) {
          formatArgs.splice(1, 0, "--cookies", cookiesFile);
        }
        
        const formatInfo = await require("../../lib/mediaHelper").runYtDlp(formatArgs, process.cwd());
        const formatOutput = formatInfo.stdout || formatInfo.stderr || "Tidak ada informasi format tersedia";
        
        // Parse and format the output
        const formattedOutput = parseAndFormatFormatInfo(formatOutput);

        // Batasi panjang output agar tidak terlalu panjang
        const truncatedOutput = formattedOutput.length > 3000
          ? formattedOutput.substring(0, 3000) + "\n\n... (output dipotong)"
          : formattedOutput;

        await sock.sendMessage(chatId, {
          text: truncatedOutput
        });

        return;
      }

      // ====== 3) Ambil metadata video ======
      const meta = await fetchMetadata(url);
      const title = meta.title || "";
      const uploader = meta.uploader || meta.channel || "";
      const durationText = meta.duration ? formatDuration(meta.duration) : null;

      // ====== 4) Kirim notifikasi awal ======
      await sock.sendMessage(chatId, {
        text: `⏳ Memproses YouTube video...\n\n*${title || "Tanpa Judul"}*\n> Channel: ${uploader || "N/A"}\n> Durasi: ${durationText || "N/A"}\n> Resolusi: ${want720p ? "≤720p" : "Terbaik"}${startAt || endAt ? `\n> Potong: ${startAt || "awal"} → ${endAt || "akhir"}` : ""}`,
      });

      // ====== 5) Siapkan direktori dan file temporary ======
      const { tmpDir, base, outTemplate } = buildOutputPath();

      // ====== 6) Cek file cookies ======
      const cookiesFilePath = path.join(__dirname, "../../data/cookies.txt");
      const cookiesFile = fs.existsSync(cookiesFilePath) ? cookiesFilePath : null;

      // ====== 7) Susun argumen untuk command yt-dlp ======
      const ytdlpArgs = buildYtDlpArgs({
        url,
        modeAudio: false,
        wantMp3: false,
        want720p,
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
          text: `⚠️ File hasil (${sizeMB}MB) melebihi batas ${maxSizeMB}MB. Coba turunkan kualitas atau kecilkan --size.`,
        });
        cleanup(tmpDir);
        return;
      }

      // ====== 8) Dapatkan informasi resolusi video ======
      const resolution = await getVideoResolution(outputFile);
      const resolutionText = resolution.width && resolution.height
        ? `${resolution.width}x${resolution.height}`
        : "Tidak diketahui";

      // ====== 10) Buat caption ======
      const caption = `*${title || "YouTube Video"}*\n\n👤 *Channel:* ${uploader || "-"}\n⚖️ *Ukuran:* ${sizeMB} MB\n📐 *Resolusi:* ${resolutionText}`;

      // ====== 11) Kirim file ke pengguna ======
      await sendMedia(sock, chatId, outputFile, {
        isAudio: false,
        caption
      });

      // ====== 12) Bersihkan file temporary ======
      cleanup(tmpDir);
    } catch (error) {
      console.error("ytmp4 command error:", error);
      try {
        await sock.sendMessage(message.key.remoteJid, {
          text: "❌ Terjadi kesalahan internal saat menjalankan YouTube video downloader.",
        });
      } catch {} 
    }
  },
};
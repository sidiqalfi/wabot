// Downloader serbaguna via yt-dlp + ffmpeg
// Contoh:
//   /dl <url>              (download video resolusi terbaik)
//   /dl <url> --audio --mp3  (download audio format mp3)
//   /dl <url> --720p         (download video resolusi 720p)
//   /dl <url> --size 60MB    (download dengan batas ukuran file)
//   /dl <url> --start 00:00:30 --end 00:01:00 (trim video)
//
// ENV opsional: YT_COOKIES_FILE=/absolute/path/cookies.txt  (dipakai diam-diam)

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

module.exports = {
  name: "dl",
  aliases: ["download", "down"],
  description:
    "Download video/audio dari berbagai platform.",
  usage:
    "dl <url> [--audio] [--mp3] [--720p] [--size <NNMB>] [--start HH:MM:SS] [--end HH:MM:SS",
  category: "downloader",

  async execute(message, sock, args) {
    try {
      const chatId = message.key.remoteJid;

      // ====== 1) Validasi argumen dasar ======
      if (!args || args.length === 0) {
        await sock.sendMessage(chatId, {
          text: `❌ URL diperlukan.\n\nContoh:\n• dl https://youtu.be/XXXX\n• dl https://tiktok.com/... --audio --mp3\n• dl https://instagram.com/... --720p`,
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

      // Ekstrak flags untuk menentukan mode download
      const modeAudio = !!parsed.flags.audio;
      const wantMp3 = !!parsed.flags.mp3;
      const want720p = !!parsed.flags["720p"];
      const startAt = parsed.flags.start || null;
      const endAt = parsed.flags.end || null;
      const maxSizeMB = resolveMaxSizeMB(parsed.flags.size);

      // ====== 2b) Gunakan file cookies jika ada (untuk situs yang butuh login) ======
      let cookiesFile = null;
      if (process.env.YT_COOKIES_FILE) {
        cookiesFile = String(process.env.YT_COOKIES_FILE).trim();
        if (!path.isAbsolute(cookiesFile))
          cookiesFile = path.resolve(process.cwd(), cookiesFile);
        if (!fs.existsSync(cookiesFile)) cookiesFile = null;
      }

      // ====== 3) Ambil metadata video/audio ======
      // Ini dilakukan agar bisa menampilkan info judul, uploader, dll. sebelum download dimulai.
      const meta = await fetchMetadata(url, { cookiesFile });
      const platform = meta.platform || guessPlatformFromUrl(url);
      const title = meta.title || "";
      const uploader = meta.uploader || meta.channel || "";
      const durationText = meta.duration ? formatDuration(meta.duration) : null;

      // ====== 4) Kirim notifikasi awal yang informatif ======
      let modeText = "Video (Resolusi Terbaik)";
      if (modeAudio) {
        modeText = `Audio (${wantMp3 ? "MP3" : "M4A"})`;
      } else if (want720p) {
        modeText = "Video (≤720p)";
      }

      await sock.sendMessage(chatId, {
        text: `⏳ Memproses tautan...\n\n*${title || "Tanpa Judul"}*\n> Platform: ${platform}\n> Durasi: ${durationText || "N/A"}\n> Mode: ${modeText}${startAt || endAt ? `\n> Potong: ${startAt || "awal"} → ${endAt || "akhir"}` : ""}`,
      });

      // ====== 5) Siapkan direktori dan file temporary ======
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dl-"));
      const base = Date.now().toString(36);
      const outTemplate = path.join(tmpDir, `${base}.%(ext)s`);

      // ====== 6) Susun argumen untuk command yt-dlp ======
      const ytdlpArgs = buildYtDlpArgs({
        url,
        modeAudio,
        wantMp3,
        want720p, // Perhatikan, wantBest tidak perlu lagi
        startAt,
        endAt,
        maxSizeMB,
        outTemplate,
        cookiesFile,
      });

      // ====== 7) Eksekusi yt-dlp untuk download ======
      const runResult = await runCmd("yt-dlp", ytdlpArgs, tmpDir);

      // Cari file hasil download di direktori temporary
      const files = fs
        .readdirSync(tmpDir)
        .filter((f) => f.startsWith(base + "."))
        .map((f) => path.join(tmpDir, f));

      if (files.length === 0) {
        const msg = runResult.stderr || runResult.stdout || "Unknown error";
        await sock.sendMessage(chatId, {
          text: `❌ Gagal download.\n\n${truncate(msg, 500)}`,
        });
        cleanup(tmpDir);
        return;
      }

      // Ambil file terbesar (kadang yt-dlp menghasilkan thumbnail atau file kecil lainnya)
      files.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
      const outputFile = files[0];
      const sizeMB = (fs.statSync(outputFile).size / (1024 * 1024)).toFixed(2);

      // Validasi ukuran file sekali lagi untuk memastikan tidak melebihi batas
      if (fs.statSync(outputFile).size > maxSizeMB * 1024 * 1024) {
        await sock.sendMessage(chatId, {
          text: `⚠️ File hasil (${sizeMB}MB) melebihi batas ${maxSizeMB}MB. Coba turunkan kualitas atau kecilkan --size.`,
        });
        cleanup(tmpDir);
        return;
      }

      // ====== 8) Buat caption yang minimalis dan informatif ======
      const caption = `*${title || "Download Selesai"}*\n\n👤 *Uploader:* ${uploader || "-"}\n💿 *Platform:* ${platform}\n⚖️ *Ukuran:* ${sizeMB} MB`;

      // ====== 9) Kirim file ke pengguna ======
      if (modeAudio) {
        await sock.sendMessage(chatId, {
          audio: { url: outputFile },
          mimetype: wantMp3 ? "audio/mpeg" : "audio/m4a",
          ptt: false,
          caption,
        });
      } else {
        // Coba kirim sebagai video, jika gagal, kirim sebagai dokumen
        try {
          await sock.sendMessage(chatId, {
            video: { url: outputFile },
            caption,
          });
        } catch (err) {
          console.error("Gagal kirim sebagai video, mencoba sebagai dokumen:", err);
          await sock.sendMessage(chatId, {
            document: { url: outputFile },
            mimetype: "video/mp4",
            fileName: (title || base) + ".mp4",
            caption,
          });
        }
      }

      // ====== 10) Bersihkan file temporary ======
      cleanup(tmpDir);
    } catch (error) {
      console.error("dl command error:", error);
      try {
        await sock.sendMessage(message.key.remoteJid, {
          text: "❌ Terjadi kesalahan internal saat menjalankan downloader.",
        });
      } catch {} 
    }
  },
};

/* ===================== Helpers ===================== */

/**
 * Mem-parsing argumen dari command.
 * @param {string[]} args - Array argumen.
 * @returns {{url: string|null, flags: object, rest: string[]}}
 */
function parseArgs(args) {
  // Token pertama yang terlihat seperti URL akan dianggap sebagai URL.
  // Sisanya akan dianggap sebagai flag (jika dimulai dengan --) atau diabaikan.
  let url = null;
  const flags = {};
  const rest = [];

  for (let i = 0; i < args.length; i++) {
    const t = args[i];
    if (!url && isLikelyUrl(t)) {
      url = t;
      continue;
    }
    if (t.startsWith("--")) {
      const key = t.replace(/^--/, "");
      const next = args[i + 1];
      // Cek apakah flag memiliki value (misal: --size 100) atau tidak (misal: --audio)
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      rest.push(t);
    }
  }
  // Alias singkat untuk flag umum
  if (flags.a) flags.audio = true;

  return { url, flags, rest };
}

/**
 * Mengecek apakah sebuah string kemungkinan adalah URL.
 * @param {string} s
 * @returns {boolean}
 */
function isLikelyUrl(s) {
  if (!s) return false;
  try {
    const u = new URL(s);
    return /^https?:$/.test(u.protocol);
  } catch {
    return false;
  }
}

/**
 * Menentukan batas maksimal ukuran file download dalam MB.
 * Prioritas: --size flag > environment variable > default.
 * @param {string|number} flagVal - Nilai dari flag --size.
 * @returns {number} - Ukuran dalam MB.
 */
function resolveMaxSizeMB(flagVal) {
  if (flagVal) {
    const m = String(flagVal)
      .trim()
      .toUpperCase()
      .match(/^(\d+)(MB)?$/);
    if (m) return Math.max(1, parseInt(m[1], 10));
  }
  const envVal =
    process.env.DL_MAX_SIZE_MB && parseInt(process.env.DL_MAX_SIZE_MB, 10);
  return Number.isFinite(envVal) ? envVal : 80; // Default 80MB
}

/**
 * Membangun array argumen untuk dieksekusi oleh yt-dlp.
 * @param {object} opts - Opsi download.
 * @returns {string[]}
 */
function buildYtDlpArgs({
  url,
  modeAudio,
  wantMp3,
  want720p,
  startAt,
  endAt,
  maxSizeMB,
  outTemplate,
  cookiesFile,
}) {
  const args = [
    url,
    "-o",
    outTemplate,
    "--no-playlist",
    "--no-warnings",
    "--restrict-filenames",
    "--no-call-home",
    "--max-filesize",
    `${maxSizeMB}M`,
  ];

  // Gunakan cookies jika tersedia
  if (cookiesFile) {
    args.push("--cookies", cookiesFile);
  }

  // Argumen untuk memotong video/audio (trimming)
  if (startAt || endAt) {
    const sec = `${startAt || "0"}-${endAt || ""}`;
    args.push("--download-sections", `*${sec}`);
    args.push("--force-keyframes-at-cuts"); // Agar potongan lebih akurat
  }

  if (modeAudio) {
    // Opsi untuk Audio
    args.push("-f", "bestaudio/best", "--extract-audio");
    if (wantMp3) {
      args.push("--audio-format", "mp3", "--audio-quality", "0"); // Kualitas terbaik untuk MP3
    } else {
      args.push("--audio-format", "m4a", "--audio-quality", "0"); // M4A biasanya kualitasnya bagus
    }
  } else {
    // Opsi untuk Video
    if (want720p) {
      // Jika diminta resolusi 720p
      args.push("-f", `bestvideo[height<=720]+bestaudio/best/best`);
    } else {
      // Default ke resolusi terbaik yang tersedia
      args.push("-f", "bestvideo+bestaudio/best");
    }
    // Usahakan output dalam format MP4 agar lebih kompatibel
    args.push("--merge-output-format", "mp4");
  }

  return args;
}

/**
 * Mengambil metadata dari URL menggunakan yt-dlp.
 * @param {string} url - URL sumber.
 * @param {{cookiesFile: string|null}} opts
 * @returns {Promise<object>}
 */
async function fetchMetadata(url, { cookiesFile } = {}) {
  // Menggunakan flag -J untuk mendapatkan output dalam format JSON
  const args = ["-J", "--no-playlist", "--no-warnings", url];
  if (cookiesFile) args.splice(1, 0, "--cookies", cookiesFile);
  const res = await runCmd("yt-dlp", args, process.cwd());

  try {
    const json = JSON.parse(res.stdout || "{}");
    return {
      platform: json.extractor_key || json.extractor || null,
      title: json.title || null,
      uploader: json.uploader || json.channel || null,
      duration: json.duration || null,
      description: json.description || null,
    };
  } catch {
    // Fallback jika parsing JSON gagal
    return {
      platform: null,
      title: null,
      uploader: null,
      duration: null,
      description: null,
    };
  }
}

/**
 * Menebak platform dari URL jika metadata tidak tersedia.
 * @param {string} u - URL.
 * @returns {string}
 */
function guessPlatformFromUrl(u) {
  try {
    const h = new URL(u).hostname.replace(/^www\./, "");
    if (h.includes("youtube") || h.includes("youtu.be")) return "YouTube";
    if (h.includes("tiktok")) return "TikTok";
    if (h.includes("instagram")) return "Instagram";
    if (h.includes("twitter") || h.includes("x.com")) return "X/Twitter";
    if (h.includes("facebook")) return "Facebook";
    return h;
  } catch {
    return "unknown";
  }
}

/**
 * Membersihkan dan memotong string caption.
 * @param {string} s - String input.
 * @param {number} max - Panjang maksimal.
 * @returns {string|null}
 */
function cleanCaption(s, max = 500) {
  if (!s) return null;
  let t = String(s).replace(/\r/g, "").trim();
  t = t.replace(/\n{3,}/g, "\n\n");
  if (t.length > max) t = t.slice(0, max - 3) + "...";
  return t;
}

/**
 * Memformat durasi dari detik ke format HH:MM:SS.
 * @param {number} sec - Durasi dalam detik.
 * @returns {string|null}
 */
function formatDuration(sec) {
  if (!sec && sec !== 0) return null;
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return (
    (h ? String(h).padStart(2, "0") + ":" : "") +
    String(m).padStart(2, "0") + 
    ":" +
    String(s).padStart(2, "0")
  );
}

/**
 * Menjalankan command di shell sebagai child process.
 * @param {string} cmd - Command.
 * @param {string[]} args - Argumen.
 * @param {string} cwd - Current working directory.
 * @returns {Promise<{code: number, stdout: string, stderr: string}>}
 */
function runCmd(cmd, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.on("error", (err) =>
      resolve({ code: -1, stdout, stderr: String(err) }),
    );
  });
}

/**
 * Membersihkan direktori temporary.
 * @param {string} dir - Path direktori.
 */
function cleanup(dir) {
  try {
    if (!fs.existsSync(dir)) return;
    // Menggunakan metode yang lebih kompatibel untuk versi Node.js lama
    for (const f of fs.readdirSync(dir)) {
      try {
        fs.unlinkSync(path.join(dir, f));
      } catch (e) {
        console.error(`Gagal menghapus file ${f}:`, e);
      }
    }
    fs.rmdirSync(dir);
  } catch (e) {
    console.error(`Gagal membersihkan direktori ${dir}:`, e);
  }
}

/**
 * Memotong string jika terlalu panjang.
 * @param {string} s - String input.
 * @param {number} max - Panjang maksimal.
 * @returns {string}
 */
function truncate(s, max) {
  if (!s) return "";
  s = String(s);
  return s.length > max ? s.slice(0, max - 3) + "..." : s;
}

/**
 * Membersihkan URL dari query parameter yang tidak perlu.
 * @param {string} u - URL.
 * @returns {string}
 */
function safeUrl(u) {
  try {
    const x = new URL(u);
    x.search = "";
    return x.toString();
  } catch {
    return u;
  }
}

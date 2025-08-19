const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

/**
 * Mendapatkan informasi resolusi video menggunakan ffprobe.
 * @param {string} filePath - Path file video.
 * @returns {Promise<{width: number|null, height: number|null}>}
 */
async function getVideoResolution(filePath) {
  return new Promise((resolve) => {
    const ffprobe = spawn("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "json",
      filePath
    ]);
    
    let stdout = "";
    let stderr = "";
    
    ffprobe.stdout.on("data", (d) => (stdout += d.toString()));
    ffprobe.stderr.on("data", (d) => (stderr += d.toString()));
    
    ffprobe.on("close", (code) => {
      if (code === 0) {
        try {
          const data = JSON.parse(stdout);
          const stream = data.streams ? data.streams[0] : null;
          if (stream && stream.width && stream.height) {
            resolve({
              width: stream.width,
              height: stream.height
            });
          } else {
            resolve({ width: null, height: null });
          }
        } catch {
          resolve({ width: null, height: null });
        }
      } else {
        resolve({ width: null, height: null });
      }
    });
    
    ffprobe.on("error", () => {
      resolve({ width: null, height: null });
    });
  });
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
 * Menjalankan yt-dlp dengan argumen yang diberikan.
 * @param {string[]} args - Argumen untuk yt-dlp.
 * @param {string} cwd - Current working directory.
 * @returns {Promise<{code: number, stdout: string, stderr: string}>}
 */
async function runYtDlp(args, cwd) {
  return await runCmd("yt-dlp", args, cwd);
}

/**
 * Membuat path output sementara.
 * @returns {string} Path direktori sementara.
 */
function buildOutputPath() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dl-"));
  const base = Date.now().toString(36);
  const outTemplate = path.join(tmpDir, `${base}.%(ext)s`);
  return { tmpDir, base, outTemplate };
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
 * Mengambil informasi format yang tersedia menggunakan yt-dlp -F.
 * @param {string} url - URL sumber.
 * @returns {Promise<{code: number, stdout: string, stderr: string}>}
 */
async function getFormatInfo(url) {
  // Menggunakan flag -F untuk mendapatkan informasi format
  const args = ["-F", "--no-warnings", url];
  return await runCmd("yt-dlp", args, process.cwd());
}

/**
 * Mem-parsing dan memformat informasi format dari output yt-dlp -F.
 * @param {string} formatOutput - Output mentah dari yt-dlp -F.
 * @returns {string} - Informasi format yang diformat.
 */
function parseAndFormatFormatInfo(formatOutput) {
  if (!formatOutput) {
    return "Tidak ada informasi format tersedia.";
  }

  // Split output into lines
  const lines = formatOutput.split('\n').filter(line => line.trim() !== '');
  
  // Find the header line (usually contains "format code" or similar)
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('format code')) {
      headerIndex = i;
      break;
    }
  }
  
  // If no header found, return the original output
  if (headerIndex === -1) {
    return formatOutput;
  }
  
  // Extract header and data lines
  const headerLine = lines[headerIndex];
  const dataLines = lines.slice(headerIndex + 1);
  
  // Parse header to understand column positions
  const headers = headerLine.split(/\s{2,}/).map(h => h.trim()).filter(h => h);
  
  // Create formatted output
  let formattedOutput = `📋 *Format yang tersedia:*\n\n`;
  formattedOutput += headers.join(' | ') + '\n';
  formattedOutput += headers.map(() => '---').join('|') + '\n';
  
  // Process each data line
  for (const line of dataLines) {
    // Skip empty lines or lines that look like separators
    if (line.trim() === '' || line.startsWith('---') || line.includes('Downloading API JSON')) {
      continue;
    }
    
    // Format the line to align with headers
    const columns = line.split(/\s{2,}/).map(c => c.trim()).filter(c => c);
    if (columns.length > 0) {
      formattedOutput += columns.join(' | ') + '\n';
    }
  }
  
  return formattedOutput || "Tidak ada informasi format tersedia.";
}

/**
 * Mengirim media ke pengguna.
 * @param {object} sock - WhatsApp socket.
 * @param {string} chatId - ID chat.
 * @param {string} outputFile - Path file output.
 * @param {object} options - Opsi pengiriman.
 * @param {boolean} isAudio - Apakah file audio.
 * @param {boolean} wantMp3 - Apakah format MP3.
 * @param {string} caption - Caption untuk file.
 */
async function sendMedia(sock, chatId, outputFile, options = {}) {
  const { isAudio, wantMp3, caption } = options;
  
  if (isAudio) {
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
      const title = caption ? caption.split("\n")[0].replace("*", "") : "download";
      await sock.sendMessage(chatId, {
        document: { url: outputFile },
        mimetype: "video/mp4",
        fileName: title + ".mp4",
        caption,
      });
    }
  }
}

module.exports = {
  runYtDlp,
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
  parseAndFormatFormatInfo,
};
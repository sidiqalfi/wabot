// Downloader serbaguna via yt-dlp + ffmpeg
// Contoh:
//   /dl <url>
//   /dl <url> --audio --mp3
//   /dl <url> --720p
//   /dl <url> --size 60MB
//   /dl <url> --start 00:00:30 --end 00:01:00
//
// ENV opsional: YT_COOKIES_FILE=/absolute/path/cookies.txt  (dipakai diam-diam)

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

module.exports = {
  name: "dl",
  description:
    "Download video/audio dari berbagai platform (YouTube, TikTok, IG, X/Twitter, dll)",
  usage:
    "dl <url> [--audio|--video] [--mp3] [--720p|--best] [--size <NNMB>] [--start HH:MM:SS] [--end HH:MM:SS]",
  category: "downloader",

  async execute(message, sock, args) {
    try {
      const chatId = message.key.remoteJid;

      // ====== 1) Validasi argumen dasar
      if (!args || args.length === 0) {
        await sock.sendMessage(chatId, {
          text: `❌ URL diperlukan.

Contoh:
• dl https://youtu.be/XXXX
• dl https://tiktok.com/... --audio --mp3
• dl https://instagram.com/... --720p
• dl https://twitter.com/... --size 60MB
• dl https://youtu.be/XXXX --start 00:00:30 --end 00:01:00`,
        });
        return;
      }

      // ====== 2) Parsing flags
      const parsed = parseArgs(args);
      const url = parsed.url;
      if (!isLikelyUrl(url)) {
        await sock.sendMessage(chatId, { text: "❌ URL tidak valid." });
        return;
      }

      const modeAudio = !!parsed.flags.audio;
      const wantMp3 = !!parsed.flags.mp3;
      const wantBest = !!parsed.flags.best;
      const want720p = !!parsed.flags["720p"];
      const startAt = parsed.flags.start || null;
      const endAt = parsed.flags.end || null;

      const maxSizeMB = resolveMaxSizeMB(parsed.flags.size);

      // ====== 2b) Cookies (backend-only, silent)
      let cookiesFile = null;
      if (process.env.YT_COOKIES_FILE) {
        cookiesFile = String(process.env.YT_COOKIES_FILE).trim();
        if (!path.isAbsolute(cookiesFile))
          cookiesFile = path.resolve(process.cwd(), cookiesFile);
        if (!fs.existsSync(cookiesFile)) cookiesFile = null; // kalau ga ada, skip aja
      }

      // ====== 3) Ambil metadata dulu (buat platform/title/uploader/desc)
      const meta = await fetchMetadata(url, { cookiesFile });
      const platform = meta.platform || guessPlatformFromUrl(url);
      const title = meta.title || "";
      const uploader = meta.uploader || meta.channel || "";
      const durationText = meta.duration ? formatDuration(meta.duration) : null;
      const desc = meta.description
        ? cleanCaption(meta.description, 500)
        : null;

      // ====== 4) Notifikasi awal (tanpa embus cookies)
      await sock.sendMessage(chatId, {
        text: `⏬ Mulai download…
🌐 URL: ${url}
🧭 Platform: ${platform}
🏷️ Judul: ${title || "-"}
👤 Uploader: ${uploader || "-"}
⏱️ Durasi: ${durationText || "-"}
🎛 Mode: ${modeAudio ? (wantMp3 ? "audio (mp3)" : "audio") : wantBest ? "video (best)" : want720p ? "video (≤720p)" : "video (≤720p default)"}
📦 Maks ukuran: ${maxSizeMB}MB${startAt || endAt ? `\n✂️ Trim: ${startAt || "0"} → ${endAt || "end"}` : ""}`,
      });

      // ====== 5) Siapkan file temp unik
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dl-"));
      const base = Date.now().toString(36);
      const outTemplate = path.join(tmpDir, `${base}.%(ext)s`);

      // ====== 6) Susun argumen yt-dlp (download)
      const ytdlpArgs = buildYtDlpArgs({
        url,
        modeAudio,
        wantMp3,
        wantBest,
        want720p,
        startAt,
        endAt,
        maxSizeMB,
        outTemplate,
        cookiesFile, // silent
      });

      // ====== 7) Eksekusi yt-dlp (download)
      const runResult = await runCmd("yt-dlp", ytdlpArgs, tmpDir);

      // Cari file hasil download (cari file dengan prefix base)
      const files = fs
        .readdirSync(tmpDir)
        .filter((f) => f.startsWith(base + "."))
        .map((f) => path.join(tmpDir, f));

      if (files.length === 0) {
        const msg = runResult.stderr || runResult.stdout || "Unknown error";
        await sock.sendMessage(chatId, {
          text: `❌ Gagal download.\n${truncate(msg, 700)}`,
        });
        cleanup(tmpDir);
        return;
      }

      // Ambil file terbesar (kadang output audio+thumbnail, dll)
      files.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
      const outputFile = files[0];
      const sizeMB = (fs.statSync(outputFile).size / (1024 * 1024)).toFixed(2);

      // Cek size lagi (jaga-jaga)
      if (fs.statSync(outputFile).size > maxSizeMB * 1024 * 1024) {
        await sock.sendMessage(chatId, {
          text: `⚠️ File hasil (${sizeMB}MB) melebihi batas ${maxSizeMB}MB.
Coba turunkan kualitas (mis. pakai --720p) atau kecilkan --size.`,
        });
        cleanup(tmpDir);
        return;
      }

      // ====== 8) Bangun caption hasil (platform + title + uploader + potongan deskripsi)
      let caption = `✅ Selesai.
🧭 Platform: ${platform}
🏷️ ${title || "-"}
👤 ${uploader || "-"}
📦 ${sizeMB}MB
🔗 ${safeUrl(url)}`;
      if (desc) {
        caption += `\n\n📝 ${desc}`;
      }

      // ====== 9) Kirim ke user
      if (modeAudio) {
        await sock.sendMessage(chatId, {
          audio: { url: outputFile },
          mimetype: wantMp3 ? "audio/mpeg" : undefined,
          ptt: false,
          caption,
        });
      } else {
        // kirim sebagai video, kalau gagal kirim sebagai dokumen
        try {
          await sock.sendMessage(chatId, {
            video: { url: outputFile },
            caption,
          });
        } catch {
          await sock.sendMessage(chatId, {
            document: { url: outputFile },
            mimetype: "video/mp4",
            fileName: path.basename(outputFile),
            caption,
          });
        }
      }

      // ====== 10) Cleanup
      cleanup(tmpDir);
    } catch (error) {
      console.error("dl command error:", error);
      try {
        await sock.sendMessage(message.key.remoteJid, {
          text: "❌ Terjadi kesalahan saat menjalankan downloader.",
        });
      } catch {}
    }
  },
};

/* ===================== Helpers ===================== */

function parseArgs(args) {
  // Ambil URL = token pertama yang keliatan seperti URL, sisanya flag
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
  // alias singkat
  if (flags.v) flags.video = true;
  if (flags.a) flags.audio = true;

  return { url, flags, rest };
}

function isLikelyUrl(s) {
  if (!s) return false;
  try {
    const u = new URL(s);
    return /^https?:$/.test(u.protocol);
  } catch {
    return false;
  }
}

function resolveMaxSizeMB(flagVal) {
  // Prioritas: --size 60MB → 60, --size 60 → 60, ENV → DL_MAX_SIZE_MB, default 80
  if (flagVal) {
    const m = String(flagVal)
      .trim()
      .toUpperCase()
      .match(/^(\d+)(MB)?$/);
    if (m) return Math.max(1, parseInt(m[1], 10));
  }
  const envVal =
    process.env.DL_MAX_SIZE_MB && parseInt(process.env.DL_MAX_SIZE_MB, 10);
  return Number.isFinite(envVal) ? envVal : 80;
}

function buildYtDlpArgs({
  url,
  modeAudio,
  wantMp3,
  wantBest,
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
    `${maxSizeMB}M`, // hard stop kalau kebesaran
  ];

  // cookies (silent)
  if (cookiesFile) {
    args.push("--cookies", cookiesFile);
  }

  // Download sections (trim) – butuh ffmpeg
  if (startAt || endAt) {
    const sec = `${startAt || "0"}-${endAt || ""}`; // contoh: "*00:00:30-00:01:00"
    args.push("--download-sections", `*${sec}`);
  }

  if (modeAudio) {
    // Audio only
    args.push("-f", "bestaudio/best", "--extract-audio");
    if (wantMp3) {
      args.push("--audio-format", "mp3", "--audio-quality", "0");
    } else {
      // default m4a (umumnya paling alus untuk mobile)
      args.push("--audio-format", "m4a", "--audio-quality", "0");
    }
  } else {
    // Video
    if (wantBest) {
      args.push("-f", "bestvideo+bestaudio/best");
    } else {
      const sel = want720p ? 720 : 720;
      args.push("-f", `bestvideo[height<=${sel}]+bestaudio/best/best`);
    }
    // Force mp4 kalau bisa (lebih kompatibel di WA)
    args.push("--merge-output-format", "mp4");
  }

  return args;
}

async function fetchMetadata(url, { cookiesFile } = {}) {
  // pakai yt-dlp -J --no-playlist buat ambil metadata
  const args = ["-J", "--no-playlist", "--no-warnings", url];
  if (cookiesFile) args.splice(1, 0, "--cookies", cookiesFile); // sisipkan setelah -J
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
    // fallback minimal
    return {
      platform: null,
      title: null,
      uploader: null,
      duration: null,
      description: null,
    };
  }
}

function guessPlatformFromUrl(u) {
  try {
    const h = new URL(u).hostname.replace(/^www\./, "");
    if (h.includes("youtube") || h.includes("youtu.be")) return "YouTube";
    if (h.includes("tiktok")) return "TikTok";
    if (h.includes("instagram")) return "Instagram";
    if (h.includes("twitter") || h.includes("x.com")) return "Twitter/X";
    if (h.includes("facebook")) return "Facebook";
    if (h.includes("reddit")) return "Reddit";
    if (h.includes("vimeo")) return "Vimeo";
    return h;
  } catch {
    return "unknown";
  }
}

function cleanCaption(s, max = 500) {
  if (!s) return null;
  // rapikan whitespace & potong panjang
  let t = String(s).replace(/\r/g, "").trim();
  t = t.replace(/\n{3,}/g, "\n\n"); // normalisasi newline
  if (t.length > max) t = t.slice(0, max - 3) + "...";
  return t;
}

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

function cleanup(dir) {
  try {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      try {
        fs.unlinkSync(path.join(dir, f));
      } catch {}
    }
    fs.rmdirSync(dir);
  } catch {}
}

function truncate(s, max) {
  if (!s) return "";
  s = String(s);
  return s.length > max ? s.slice(0, max - 3) + "..." : s;
}

function safeUrl(u) {
  try {
    const x = new URL(u);
    x.search = ""; // buang query biar gak terlalu panjang/sensitif
    return x.toString();
  } catch {
    return u;
  }
}

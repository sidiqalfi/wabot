const fs = require("fs");
const path = require("path");
const { tmpdir } = require("os");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const { downloadMediaMessage } = require("baileys");
require("dotenv").config();

module.exports = {
  name: "sticker",
  aliases: ["s", "stiker", "stick", "stckr"],
  description:
    "Ubah gambar/video jadi stiker (dengan optional packname & author)",
  usage: "sticker [packname]|[author] (opsional)",
  category: "fun",

  async execute(message, sock, args) {
    try {
      const quoted =
        message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const msgContent = quoted || message.message;

      const mimeType = (msgContent?.imageMessage || msgContent?.videoMessage)
        ?.mimetype;

      if (!mimeType) {
        await sock.sendMessage(message.key.remoteJid, {
          text: "❌ Kirim atau reply *gambar/video* dengan command *!sticker [pack]|[author]*",
        });
        return;
      }

      let packname = process.env.DEFAULT_STICKER_PACK || "Sticker Bot";
      let author = process.env.DEFAULT_STICKER_AUTHOR || "Unknown";

      if (args.length > 0) {
        const raw = args.join(" ").split("|");
        if (raw[0]) packname = raw[0].trim();
        if (raw[1]) author = raw[1].trim();
      }

      const buffer = await downloadMediaMessage(
        { message: msgContent },
        "buffer",
        {},
        { logger: console, reuploadRequest: sock.updateMediaMessage },
      );

      const isVideo = mimeType.startsWith("video");
      const inputPath = path.join(
        tmpdir(),
        `media-${Date.now()}.${isVideo ? "mp4" : "jpg"}`,
      );
      const outputPath = path.join(tmpdir(), `sticker-${Date.now()}.webp`);

      fs.writeFileSync(inputPath, buffer);

      if (isVideo) {
        await new Promise((resolve, reject) => {
          const ffmpeg = spawn(ffmpegPath, [
            "-i",
            inputPath,
            "-vcodec",
            "libwebp",
            "-vf",
            "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=white",
            "-lossless",
            "1",
            "-preset",
            "default",
            "-loop",
            "0",
            "-an",
            "-vsync",
            "0",
            outputPath,
          ]);

          ffmpeg.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`FFmpeg exited with code ${code}`));
          });
        });
      }

      const sticker = new Sticker(isVideo ? outputPath : buffer, {
        pack: packname,
        author: author,
        type: StickerTypes.FULL,
        quality: 70,
        animated: isVideo,
        fps: 15,
      });

      const stickerBuffer = await sticker.toBuffer();

      await sock.sendMessage(message.key.remoteJid, {
        sticker: stickerBuffer,
      });

      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (error) {
      console.error(`Error in ${this.name} command:`, error);

      await sock.sendMessage(message.key.remoteJid, {
        text: "❌ Gagal membuat stiker!",
      });
    }
  },
};

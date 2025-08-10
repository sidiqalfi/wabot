const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const { downloadMediaMessage } = require('baileys');

module.exports = {
  name: 'toimg',
  aliases: ['toimage', 'img', 'unwebp'],
  description: 'Ubah stiker (webp) jadi gambar PNG atau video MP4',
  usage: 'toimg (reply ke stiker / pakai caption di stiker)',
  category: 'utility',

  async execute(message, sock) {
    const jid = message.key.remoteJid;

    try {
      const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const msgContent = quoted || message.message;

      const isSticker = !!msgContent?.stickerMessage;
      const isWebpImage = msgContent?.imageMessage?.mimetype === 'image/webp';

      if (!isSticker && !isWebpImage) {
        await sock.sendMessage(jid, {
          text: '❌ Reply ke *stiker* atau kirim stiker dengan caption *!toimg*.'
        });
        return;
      }

      // Download media
      const buffer = await downloadMediaMessage(
        { message: msgContent },
        'buffer',
        {},
        { logger: console, reuploadRequest: sock.updateMediaMessage }
      );

      // Simpan sementara
      const inputPath = path.join(os.tmpdir(), `sticker-${Date.now()}.webp`);
      fs.writeFileSync(inputPath, buffer);

      // Cek apakah animasi
      const isAnimated = buffer.includes(Buffer.from('ANMF')); // tanda animasi di webp
      const outputPath = path.join(
        os.tmpdir(),
        `output-${Date.now()}.${isAnimated ? 'mp4' : 'png'}`
      );

      await new Promise((resolve, reject) => {
        const args = isAnimated
          ? [
              '-i', inputPath,
              '-movflags', 'faststart',
              '-pix_fmt', 'yuv420p',
              '-vf', 'scale=512:-1:flags=lanczos',
              outputPath
            ]
          : [
              '-i', inputPath,
              outputPath
            ];

        const ff = spawn(ffmpegPath, args);

        ff.on('error', reject);
        ff.on('close', code => {
          if (code === 0) resolve();
          else reject(new Error(`FFmpeg exited with code ${code}`));
        });
      });

      if (isAnimated) {
        await sock.sendMessage(jid, {
          video: fs.readFileSync(outputPath),
          caption: '✅ Stiker berhasil diubah jadi video.'
        });
      } else {
        await sock.sendMessage(jid, {
          image: fs.readFileSync(outputPath),
          caption: '✅ Stiker berhasil diubah jadi gambar.'
        });
      }

      // Hapus file sementara
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);

    } catch (err) {
      console.error(`Error in ${this.name} command:`, err);
      await sock.sendMessage(jid, {
        text: '❌ Gagal mengubah stiker. Pastikan itu stiker/webp yang valid & ffmpeg terinstall.'
      });
    }
  }
};

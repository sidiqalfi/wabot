const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const ffmpeg = require('fluent-ffmpeg');
const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');
const { downloadMediaMessage } = require('baileys');
require('dotenv').config();

module.exports = {
    name: 'sticker',
    description: 'Ubah gambar/video jadi stiker (dengan optional packname & author)',
    usage: 'sticker [packname]|[author] (opsional)\ncontoh: !sticker Botku|Dibuat oleh Sidiq',
    category: 'fun',

    async execute(message, sock, args) {
        try {
            // Detect: reply atau caption
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const msgContent = quoted || message.message;

            const mimeType = (
                msgContent?.imageMessage ||
                msgContent?.videoMessage
            )?.mimetype;

            if (!mimeType) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Kirim atau reply *gambar/video* dengan command *!sticker [pack]|[author]*'
                });
                return;
            }

            // Ambil caption parameter jika ada
            let packname = process.env.DEFAULT_STICKER_PACK || 'Sticker Bot';
            let author = process.env.DEFAULT_STICKER_AUTHOR || 'Unknown';

            if (args.length > 0) {
                const raw = args.join(' ').split('|');
                if (raw[0]) packname = raw[0].trim();
                if (raw[1]) author = raw[1].trim();
            }

            // Download media
            const buffer = await downloadMediaMessage(
                { message: msgContent },
                'buffer',
                {},
                { logger: console, reuploadRequest: sock.updateMediaMessage }
            );

            const isVideo = mimeType.startsWith('video');
            const inputPath = path.join(tmpdir(), `media-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`);
            const outputPath = path.join(tmpdir(), `sticker-${Date.now()}.webp`);

            fs.writeFileSync(inputPath, buffer);

            // Convert ke WebP jika video
            if (isVideo) {
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .inputFormat('mp4')
                        .outputOptions([
                            '-vcodec', 'libwebp',
                            '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=white',
                            '-lossless', '1',
                            '-preset', 'default',
                            '-loop', '0',
                            '-an', '-vsync', '0'
                        ])
                        .output(outputPath)
                        .on('end', resolve)
                        .on('error', reject)
                        .run();
                });
            }

            // Gunakan wa-sticker-formatter
            const sticker = new Sticker(isVideo ? outputPath : buffer, {
                pack: packname,
                author: author,
                type: StickerTypes.FULL,
                quality: 70
            });

            const stickerBuffer = await sticker.toBuffer();

            await sock.sendMessage(message.key.remoteJid, {
                sticker: stickerBuffer
            });

            // Bersih-bersih
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

        } catch (error) {
            console.error(`Error in ${this.name} command:`, error);

            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Gagal membuat stiker! Pastikan media valid & FFmpeg sudah terinstall.'
            });
        }
    }
};

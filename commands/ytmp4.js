const fs = require('fs');
const path = require('path');
const os = require('os');
const ytdl = require('@distube/ytdl-core');

module.exports = {
    name: 'ytmp4',
    description: 'Download video YouTube dalam format MP4',
    usage: 'ytmp4 [link]',
    category: 'utility',

    async execute(message, sock, args) {
        try {
            if (args.length === 0) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Kamu harus memasukkan link YouTube!\n\nContoh: !ytmp4 https://youtu.be/abc123'
                });
                return;
            }

            const url = args[0];
            if (!ytdl.validateURL(url)) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Link YouTube tidak valid!'
                });
                return;
            }

            const info = await ytdl.getInfo(url);
            const title = info.videoDetails.title;
            const lengthSeconds = parseInt(info.videoDetails.lengthSeconds);

            if (lengthSeconds > 600) { // 10 menit
                await sock.sendMessage(message.key.remoteJid, {
                    text: '⚠️ Durasi video terlalu panjang! Maksimal 10 menit.'
                });
                return;
            }

            // Ambil format mp4 360p
            const format = ytdl.chooseFormat(info.formats, { quality: '18' }); // itag 18 = mp4 360p

            // Estimasi size (dari contentLength)
            const contentLength = format.contentLength || '0';
            const fileSizeMB = parseInt(contentLength) / 1024 / 1024;

            if (fileSizeMB > 100) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `⚠️ Ukuran video ${fileSizeMB.toFixed(2)}MB terlalu besar untuk dikirim via WhatsApp (max 100MB).`
                });
                return;
            }

            const tempPath = path.join(os.tmpdir(), `ytmp4-${Date.now()}.mp4`);

            // Stream dan simpan video ke file sementara
            await new Promise((resolve, reject) => {
                const stream = ytdl(url, { quality: '18' })
                    .pipe(fs.createWriteStream(tempPath));

                stream.on('finish', resolve);
                stream.on('error', reject);
            });

            const videoBuffer = fs.readFileSync(tempPath);

            await sock.sendMessage(message.key.remoteJid, {
                video: videoBuffer,
                caption: `📥 *YouTube MP4*\n📹 Judul: ${title}`
            });

            fs.unlinkSync(tempPath); // bersihkan file

        } catch (err) {
            console.error('Error in ytmp4 command:', err);

            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Gagal mengambil video. Pastikan link valid dan server aman.'
            });
        }
    }
};

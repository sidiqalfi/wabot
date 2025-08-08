const speedTest = require('speedtest-net');

module.exports = {
    name: 'speedtest',
    description: 'Tes kecepatan internet server bot',
    usage: 'speedtest',
    category: 'utility',

    async execute(message, sock, args) {
        try {
            await sock.sendMessage(message.key.remoteJid, {
                text: '📡 *Speedtest dimulai...*\nMohon tunggu sekitar 10–30 detik ya...'
            });

            const result = await speedTest({ acceptLicense: true, acceptGdpr: true });

            const ping = result.ping.latency;
            const download = (result.download.bandwidth / 1024 / 1024).toFixed(2);
            const upload = (result.upload.bandwidth / 1024 / 1024).toFixed(2);
            const isp = result.isp;
            const serverName = result.server.name;
            const country = result.server.country;

            const resultText = `📊 *Hasil Speedtest:*\n\n` +
                `📡 ISP: ${isp}\n` +
                `🌍 Server: ${serverName}, ${country}\n` +
                `📶 Ping: ${ping} ms\n` +
                `📥 Download: ${download} Mbps\n` +
                `📤 Upload: ${upload} Mbps`;

            await sock.sendMessage(message.key.remoteJid, {
                text: resultText
            });

        } catch (error) {
            console.error(`Error in speedtest command:`, error);
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Speedtest gagal. Mungkin server kamu diblokir oleh Speedtest.net atau koneksi sedang gangguan.'
            });
        }
    }
};

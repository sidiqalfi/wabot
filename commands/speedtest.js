const FastSpeedtest = require("fast-speedtest-api");

module.exports = {
    name: 'speedtest',
    description: 'Tes kecepatan internet server bot (Fast.com)',
    usage: 'speedtest',
    category: 'utility',

    async execute(message, sock) {
        try {
            const remoteJid = message.key.remoteJid;

            await sock.sendMessage(remoteJid, {
                text: '📡 *Speedtest dimulai...*\nMohon tunggu sekitar 10–20 detik ya...'
            });

            // API token default dari fast-speedtest-api
            const speedtest = new FastSpeedtest({
                token: "YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm", // token bawaan (tidak perlu diubah)
                verbose: false,
                timeout: 10000,
                https: true,
                urlCount: 5,
                bufferSize: 8,
                unit: FastSpeedtest.UNITS.Mbps
            });

            const downloadSpeed = await speedtest.getSpeed();

            const resultText =
                `📊 *Hasil Speedtest:*\n\n` +
                `📥 Download: ${downloadSpeed.toFixed(2)} Mbps\n` +
                `📤 Upload: (Tidak tersedia di Fast.com)\n` +
                `ℹ️ Sumber: Fast.com`;

            await sock.sendMessage(remoteJid, { text: resultText });

        } catch (error) {
            console.error(`Error in ${this.name} command:`, error);
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Speedtest gagal dijalankan. Coba lagi nanti.'
            });
        }
    }
};


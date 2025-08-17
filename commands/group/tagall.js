const CHUNK_SIZE = 20; // jumlah mention per pesan

module.exports = {
    name: 'tagall',
    description: 'Mention semua member di grup (admin-only)',
    usage: 'tagall [pesan opsional]',
    category: 'admin',

    async execute(message, sock, args) {
        try {
            const remoteJid = message.key.remoteJid;
            const isGroup = remoteJid.endsWith('@g.us');
            if (!isGroup) {
                await sock.sendMessage(remoteJid, { text: '❌ Command ini cuma untuk *grup*.' });
                return;
            }

            // Ambil metadata grup
            const metadata = await sock.groupMetadata(remoteJid);
            const participants = metadata.participants || [];
            const admins = participants.filter(p => p.admin);
            const senderJid = message.key.participant || message.key.remoteJid;

            const isSenderAdmin = admins.some(a => a.id === senderJid);
            const isBotAdmin = admins.some(a => a.id === (sock.user?.id));

            if (!isSenderAdmin) {
                await sock.sendMessage(remoteJid, { text: '⛔ *Admin-only.* Minta admin yang jalankan ya.' });
                return;
            }
            if (!isBotAdmin) {
                await sock.sendMessage(remoteJid, { text: '⚠️ Bot belum *admin*. Jadikan admin dulu agar mention massal lebih stabil.' });
            }

            // Pesan opsional setelah command
            const customMsg = args.length ? args.join(' ') : '';
            const header = `📢 *TAGALL* — ${metadata.subject}\n${customMsg ? `\n📝 ${customMsg}\n` : ''}`;

            // List semua member
            const allJids = participants.map(p => p.id);
            if (allJids.length === 0) {
                await sock.sendMessage(remoteJid, { text: 'ℹ️ Tidak ada member yang bisa di-mention.' });
                return;
            }

            const toAt = jid => '@' + (jid.split('@')[0].replace(/[^0-9]/g, ''));

            // Split biar aman
            for (let i = 0; i < allJids.length; i += CHUNK_SIZE) {
                const chunk = allJids.slice(i, i + CHUNK_SIZE);
                const lines = chunk
                    .map((j, idx) => `${i + idx + 1}. ${toAt(j)}`) // ⬅️ nomor urut
                    .join('\n');
                const text = `${i === 0 ? header + '\n' : ''}${lines}`;

                await sock.sendMessage(remoteJid, {
                    text,
                    mentions: chunk
                });

                await new Promise(r => setTimeout(r, 500));
            }

        } catch (err) {
            console.error(`Error in ${this.name} command:`, err);
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Gagal mengeksekusi *tagall*. Coba lagi nanti.'
            });
        }
    }
};

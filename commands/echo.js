module.exports = {
    name: 'echo',
    description: 'Mengulangi pesan yang dikirim',
    usage: 'echo <pesan>',
    category: 'utility',
    
    async execute(message, sock, args) {
        if (args.length === 0) {
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Mohon berikan pesan yang ingin diulangi!\n\nContoh: !echo Hello World'
            });
            return;
        }

        const echoMessage = args.join(' ');
        const sender = message.pushName || 'User';
        
        const response = `🔊 *Echo dari ${sender}:*\n\n"${echoMessage}"`;
        
        await sock.sendMessage(message.key.remoteJid, {
            text: response
        });
    }
};
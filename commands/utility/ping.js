module.exports = {
    name: 'ping',
    description: 'Mengirim respons pong untuk mengecek bot',
    usage: 'ping',
    category: 'utility',
    
    async execute(message, sock, args) {
        const startTime = Date.now();
        
        // Send initial response
        const sentMessage = await sock.sendMessage(message.key.remoteJid, {
            text: '🏓 Pong!'
        });
        
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        // Edit message to include latency
        setTimeout(async () => {
            try {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `🏓 Pong!\n⚡ Latency: ${latency}ms`,
                    edit: sentMessage.key
                });
            } catch (error) {
                // If edit fails, send a new message
                await sock.sendMessage(message.key.remoteJid, {
                    text: `🏓 Pong!\n⚡ Latency: ${latency}ms`
                });
            }
        }, 100);
    }
};
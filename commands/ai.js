require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

module.exports = {
    name: 'ai',
    description: 'Tanya ke AI (ChatGPT)',
    usage: 'ai [pertanyaan]',
    category: 'utility',

    async execute(message, sock, args) {
        try {
            if (args.length === 0) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Kamu harus nanya sesuatu!\n\nContoh: !ai apa itu quantum computing?'
                });
                return;
            }

            const prompt = args.join(' ');
            const senderName = message.pushName || 'User';

            // Panggil OpenAI (GPT-3.5-turbo)
            const chatResponse = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'Kamu adalah asisten pintar dan jenaka yang menjawab dengan gaya santai dan gaul.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7
            });

            const aiReply = chatResponse.choices[0].message.content;

            await sock.sendMessage(message.key.remoteJid, {
                text: `🧠 *Jawaban dari AI:*\n\n${aiReply}`
            });

        } catch (error) {
            console.error(`Error in ${this.name} command:`, error);

            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Gagal konek ke AI. Coba lagi nanti ya.'
            });
        }
    }
};

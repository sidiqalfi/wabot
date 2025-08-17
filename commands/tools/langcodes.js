module.exports = {
    name: 'langcodes',
    description: 'Menampilkan daftar kode bahasa yang bisa dipakai di translate',
    usage: 'langcodes',
    category: 'utility',

    async execute(message, sock) {
        try {
            const remoteJid = message.key.remoteJid;

            // Daftar kode bahasa populer
            const langList = [
                { code: 'af', name: 'Afrikaans' },
                { code: 'ar', name: 'Arabic / Arab' },
                { code: 'bn', name: 'Bengali / Bangla' },
                { code: 'bg', name: 'Bulgarian / Bulgaria' },
                { code: 'ca', name: 'Catalan / Katalan' },
                { code: 'zh-cn', name: 'Chinese (Simplified) / Mandarin Sederhana' },
                { code: 'zh-tw', name: 'Chinese (Traditional) / Mandarin Tradisional' },
                { code: 'cs', name: 'Czech / Ceko' },
                { code: 'da', name: 'Danish / Denmark' },
                { code: 'nl', name: 'Dutch / Belanda' },
                { code: 'en', name: 'English / Inggris' },
                { code: 'fi', name: 'Finnish / Finlandia' },
                { code: 'fr', name: 'French / Prancis' },
                { code: 'de', name: 'German / Jerman' },
                { code: 'el', name: 'Greek / Yunani' },
                { code: 'gu', name: 'Gujarati / Gujarat' },
                { code: 'he', name: 'Hebrew / Ibrani' },
                { code: 'hi', name: 'Hindi / Hindi' },
                { code: 'hu', name: 'Hungarian / Hungaria' },
                { code: 'id', name: 'Indonesian / Indonesia' },
                { code: 'it', name: 'Italian / Italia' },
                { code: 'ja', name: 'Japanese / Jepang' },
                { code: 'jv', name: 'Javanese / Jawa' },
                { code: 'ko', name: 'Korean / Korea' },
                { code: 'ms', name: 'Malay / Melayu' },
                { code: 'mr', name: 'Marathi / Marathi' },
                { code: 'ne', name: 'Nepali / Nepal' },
                { code: 'pa', name: 'Punjabi / Punjab' },
                { code: 'pl', name: 'Polish / Polandia' },
                { code: 'pt', name: 'Portuguese / Portugis' },
                { code: 'ro', name: 'Romanian / Rumania' },
                { code: 'ru', name: 'Russian / Rusia' },
                { code: 'sr', name: 'Serbian / Serbia' },
                { code: 'si', name: 'Sinhala / Sinhala' },
                { code: 'es', name: 'Spanish / Spanyol' },
                { code: 'su', name: 'Sundanese / Sunda' },
                { code: 'sv', name: 'Swedish / Swedia' },
                { code: 'ta', name: 'Tamil / Tamil' },
                { code: 'te', name: 'Telugu / Telugu' },
                { code: 'th', name: 'Thai / Thailand' },
                { code: 'tr', name: 'Turkish / Turki' },
                { code: 'uk', name: 'Ukrainian / Ukraina' },
                { code: 'ur', name: 'Urdu / Urdu' },
                { code: 'vi', name: 'Vietnamese / Vietnam' },
                { code: 'xh', name: 'Xhosa / Xhosa' },
                { code: 'yo', name: 'Yoruba / Yoruba' },
                { code: 'zu', name: 'Zulu / Zulu' }
            ];

            // Format biar rapi (kolom: kode - nama)
            let msg = '🌐 *Daftar Kode Bahasa Translate*\n\n';
            msg += langList.map(l => `${l.code} → ${l.name}`).join('\n');
            msg += `\n\n💡 Gunakan kode ini di command /translate\nContoh: !translate en Selamat pagi`;

            await sock.sendMessage(remoteJid, { text: msg });

        } catch (err) {
            console.error(`Error in ${this.name} command:`, err);
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Gagal menampilkan daftar bahasa.'
            });
        }
    }
};

const fs = require('fs');
const path = require('path');

class ContentFilter {
    constructor(filePath) {
        this.filePath = filePath;
        this.forbiddenWords = new Set();
        this.loadWords();
    }

    /**
     * Memuat atau memuat ulang kata-kata terlarang dari file JSON.
     */
    loadWords() {
        try {
            if (fs.existsSync(this.filePath)) {
                const fileContent = fs.readFileSync(this.filePath, 'utf8');
                const words = JSON.parse(fileContent);
                if (Array.isArray(words)) {
                    // Normalisasi: semua kata diubah ke huruf kecil
                    this.forbiddenWords = new Set(words.map(w => String(w).toLowerCase()));
                    console.log(`✅ ContentFilter: Berhasil memuat ${this.forbiddenWords.size} kata terlarang.`);
                } else {
                    console.warn('⚠️ ContentFilter: File JSON tidak berisi array.');
                }
            } else {
                console.warn(`⚠️ ContentFilter: File tidak ditemukan di ${this.filePath}. Tidak ada kata yang difilter.`);
            }
        } catch (error) {
            console.error('❌ ContentFilter: Gagal memuat atau parsing file JSON.', error);
        }
    }

    /**
     * Membersihkan dan menormalkan teks untuk pemeriksaan.
     * Menghapus spasi berlebih, tanda baca, dan mengubah ke huruf kecil.
     * @param {string} text Teks input.
     * @returns {string} Teks yang sudah dinormalisasi.
     */
    _normalizeText(text) {
        if (!text) return '';
        return text
            .toLowerCase()
            .replace(/[\/.,_\-]/g, '') // Hapus tanda baca umum
            .replace(/\s+/g, ' ') // Normalisasi spasi
            .trim();
    }

    /**
     * Memeriksa apakah teks mengandung kata terlarang.
     * @param {string} text Teks yang akan diperiksa.
     * @returns {string|null} Mengembalikan kata terlarang yang ditemukan, atau null jika tidak ada.
     */
    getForbiddenWord(text) {
        const normalizedText = this._normalizeText(text);
        const wordsInText = new Set(normalizedText.split(/\s+/)); // Cek per kata

        for (const forbiddenWord of this.forbiddenWords) {
            // Cek 1: Kesamaan persis antar kata
            if (wordsInText.has(forbiddenWord)) {
                return forbiddenWord;
            }

            // Cek 2: Apakah teks mengandung kata terlarang (untuk kasus tanpa spasi)
            if (normalizedText.includes(forbiddenWord)) {
                return forbiddenWord;
            }
        }

        return null;
    }
}

module.exports = ContentFilter;
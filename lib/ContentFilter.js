const fs = require('fs');
const path = require('path');

class ContentFilter {
    constructor(filePath) {
        this.filePath = filePath;
        this.forbiddenWords = new Set();
        this.forbiddenPatterns = new Set();
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
                    
                    // Buat pattern untuk setiap kata terlarang
                    this.forbiddenPatterns.clear();
                    for (const word of this.forbiddenWords) {
                        this.forbiddenPatterns.add(word);
                        
                        // Tambahkan variasi leetspeak yang lebih lengkap
                        const leetVariations = this._generateLeetVariations(word);
                        for (const variation of leetVariations) {
                            this.forbiddenPatterns.add(variation);
                        }
                        
                        // Tambahkan variasi dengan angka
                        const numberVariations = this._addNumbers(word);
                        for (const variation of numberVariations) {
                            this.forbiddenPatterns.add(variation);
                        }
                        
                        // Tambahkan variasi dengan karakter khusus
                        const specialVariations = this._addSpecialChars(word);
                        for (const variation of specialVariations) {
                            this.forbiddenPatterns.add(variation);
                        }
                        
                        // Tambahkan variasi dengan spasi dan karakter pemisah
                        const spacedVariations = this._addSpaces(word);
                        for (const variation of spacedVariations) {
                            this.forbiddenPatterns.add(variation);
                        }
                    }
                    
                    console.log(`✅ ContentFilter: Berhasil memuat ${this.forbiddenWords.size} kata terlarang dengan ${this.forbiddenPatterns.size} variasi pattern.`);
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
     * Generate semua variasi leetspeak untuk sebuah kata
     * @param {string} word Kata yang akan diubah
     * @returns {Array} Array variasi leetspeak
     */
    _generateLeetVariations(word) {
        const leetMap = {
            'a': ['4', '@', 'α', 'а'],
            'e': ['3', 'ε', 'е'],
            'i': ['1', '!', '|', 'і'],
            'o': ['0', 'θ', 'о'],
            's': ['5', '$', 'ѕ'],
            't': ['7', '+', 'т'],
            'b': ['8', 'β', 'в'],
            'g': ['9', '6', 'ɡ'],
            'l': ['1', '|', 'l'],
            'z': ['2', 'z'],
            'c': ['с', 'c'],
            'p': ['р', 'p'],
            'x': ['х', 'x'],
            'y': ['у', 'y'],
            'n': ['п', 'n'],
            'm': ['м', 'm'],
            'k': ['к', 'k'],
            'h': ['н', 'h'],
            'd': ['d', 'd'],
            'f': ['f', 'f'],
            'j': ['j', 'j'],
            'q': ['q', 'q'],
            'r': ['r', 'r'],
            'u': ['u', 'u'],
            'v': ['v', 'v'],
            'w': ['w', 'w']
        };

        const variations = new Set();
        
        // Generate semua kombinasi leetspeak
        const generateCombinations = (current, index) => {
            if (index >= word.length) {
                variations.add(current);
                return;
            }
            
            const char = word[index].toLowerCase();
            const replacements = leetMap[char] || [char];
            
            for (const replacement of replacements) {
                generateCombinations(current + replacement, index + 1);
            }
        };
        
        generateCombinations('', 0);
        return Array.from(variations);
    }

    /**
     * Menambahkan angka ke kata
     * @param {string} word Kata yang akan dimodifikasi
     * @returns {Array} Array kata dengan angka
     */
    _addNumbers(word) {
        const variations = [];
        // Tambahkan angka di awal, tengah, atau akhir
        for (let i = 0; i <= 9; i++) {
            variations.push(`${i}${word}`);
            variations.push(`${word}${i}`);
            if (word.length > 2) {
                const mid = Math.floor(word.length / 2);
                variations.push(word.slice(0, mid) + i + word.slice(mid));
            }
        }
        return variations;
    }

    /**
     * Menambahkan karakter khusus ke kata
     * @param {string} word Kata yang akan dimodifikasi
     * @returns {Array} Array kata dengan karakter khusus
     */
    _addSpecialChars(word) {
        const specialChars = ['_', '-', '.', '*', '!', '@', '#', '$', '%', '^', '&', '~', '`', '(', ')', '[', ']', '{', '}', '|', '\\', ':', ';', '"', "'", '<', '>', ',', '?', '/'];
        const variations = [];
        
        for (const char of specialChars) {
            variations.push(`${char}${word}`);
            variations.push(`${word}${char}`);
            if (word.length > 2) {
                const mid = Math.floor(word.length / 2);
                variations.push(word.slice(0, mid) + char + word.slice(mid));
            }
        }
        return variations;
    }

    /**
     * Menambahkan spasi dan karakter pemisah
     * @param {string} word Kata yang akan dimodifikasi
     * @returns {Array} Array kata dengan spasi
     */
    _addSpaces(word) {
        const variations = [];
        if (word.length <= 2) return variations;
        
        // Tambahkan spasi di tengah kata
        for (let i = 1; i < word.length; i++) {
            variations.push(word.slice(0, i) + ' ' + word.slice(i));
            variations.push(word.slice(0, i) + '.' + word.slice(i));
            variations.push(word.slice(0, i) + '_' + word.slice(i));
            variations.push(word.slice(0, i) + '-' + word.slice(i));
        }
        
        return variations;
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
     * Menghitung similarity antara dua string menggunakan algoritma Levenshtein
     * @param {string} str1 String pertama
     * @param {string} str2 String kedua
     * @returns {number} Similarity score (0-1)
     */
    _calculateSimilarity(str1, str2) {
        const matrix = [];
        const len1 = str1.length;
        const len2 = str2.length;

        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,     // deletion
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j - 1] + cost // substitution
                );
            }
        }

        const maxLen = Math.max(len1, len2);
        return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen;
    }

    /**
     * Memeriksa apakah teks mengandung kata terlarang atau variasi yang mirip.
     * @param {string} text Teks yang akan diperiksa.
     * @returns {string|null} Mengembalikan kata terlarang yang ditemukan, atau null jika tidak ada.
     */
    getForbiddenWord(text) {
        const normalizedText = this._normalizeText(text);
        const wordsInText = normalizedText.split(/\s+/);

        // Cek 1: Pattern matching yang ketat
        for (const pattern of this.forbiddenPatterns) {
            // Cek kesamaan persis dalam teks
            if (normalizedText.includes(pattern)) {
                return pattern;
            }

            // Cek dalam array kata
            if (wordsInText.includes(pattern)) {
                return pattern;
            }
        }

        // Cek 2: Leetspeak detection yang lebih agresif
        for (const word of wordsInText) {
            if (word.length < 2) continue; // Skip kata sangat pendek

            // Normalisasi leetspeak ke bentuk asli
            const normalizedLeet = this._normalizeLeetspeak(word);
            
            for (const forbiddenWord of this.forbiddenWords) {
                if (normalizedLeet === forbiddenWord) {
                    return forbiddenWord;
                }
                
                // Cek similarity untuk leetspeak yang tidak sempurna
                const similarity = this._calculateSimilarity(normalizedLeet, forbiddenWord);
                if (similarity > 0.85) {
                    return forbiddenWord;
                }
            }
        }

        // Cek 3: Similarity matching yang lebih ketat
        for (const word of wordsInText) {
            if (word.length < 3) continue; // Skip kata pendek

            for (const forbiddenWord of this.forbiddenWords) {
                const similarity = this._calculateSimilarity(word, forbiddenWord);
                
                // Threshold yang lebih ketat: 75% similarity
                if (similarity > 0.75 && Math.abs(word.length - forbiddenWord.length) <= 3) {
                    return forbiddenWord;
                }
            }
        }

        // Cek 4: Substring matching yang lebih agresif
        for (const forbiddenWord of this.forbiddenWords) {
            if (forbiddenWord.length < 3) continue; // Skip kata pendek

            for (const word of wordsInText) {
                if (word.length < 2) continue;

                // Cek substring dengan threshold yang lebih rendah (60%)
                if (forbiddenWord.includes(word) && word.length >= forbiddenWord.length * 0.6) {
                    return forbiddenWord;
                }
                if (word.includes(forbiddenWord) && forbiddenWord.length >= word.length * 0.6) {
                    return forbiddenWord;
                }
            }
        }

        // Cek 5: Character replacement detection
        for (const word of wordsInText) {
            if (word.length < 3) continue;

            for (const forbiddenWord of this.forbiddenWords) {
                if (this._isCharacterReplacement(word, forbiddenWord)) {
                    return forbiddenWord;
                }
            }
        }

        // Cek 6: Spaced word detection
        const spacedText = text.replace(/\s+/g, '');
        for (const forbiddenWord of this.forbiddenWords) {
            if (spacedText.toLowerCase().includes(forbiddenWord)) {
                return forbiddenWord;
            }
        }

        return null;
    }

    /**
     * Deteksi penggantian karakter yang umum
     * @param {string} word Kata yang diperiksa
     * @param {string} forbiddenWord Kata terlarang
     * @returns {boolean} True jika terdeteksi sebagai penggantian karakter
     */
    _isCharacterReplacement(word, forbiddenWord) {
        if (word.length !== forbiddenWord.length) return false;
        
        const commonReplacements = {
            'a': ['4', '@', 'а'],
            'e': ['3', 'е'],
            'i': ['1', 'і'],
            'o': ['0', 'о'],
            's': ['5', 'ѕ'],
            't': ['7', 'т'],
            'b': ['8', 'в'],
            'g': ['9', 'ɡ'],
            'l': ['1'],
            'z': ['2']
        };

        let matchCount = 0;
        for (let i = 0; i < word.length; i++) {
            const wordChar = word[i].toLowerCase();
            const forbiddenChar = forbiddenWord[i].toLowerCase();
            
            if (wordChar === forbiddenChar) {
                matchCount++;
            } else {
                const replacements = commonReplacements[forbiddenChar] || [];
                if (replacements.includes(wordChar)) {
                    matchCount++;
                }
            }
        }
        
        // Jika 80% karakter cocok, dianggap sebagai penggantian karakter
        return matchCount >= word.length * 0.8;
    }

    /**
     * Normalisasi teks leetspeak ke bentuk asli
     * @param {string} text Teks leetspeak
     * @returns {string} Teks yang dinormalisasi
     */
    _normalizeLeetspeak(text) {
        const reverseLeetMap = {
            '4': 'a', '@': 'a', 'α': 'a', 'а': 'a',
            '3': 'e', 'ε': 'e', 'е': 'e',
            '1': 'i', '!': 'i', '|': 'i', 'і': 'i',
            '0': 'o', 'θ': 'o', 'о': 'o',
            '5': 's', '$': 's', 'ѕ': 's',
            '7': 't', '+': 't', 'т': 't',
            '8': 'b', 'β': 'b', 'в': 'b',
            '9': 'g', '6': 'g', 'ɡ': 'g',
            '2': 'z'
        };

        let normalized = text.toLowerCase();
        for (const [leet, original] of Object.entries(reverseLeetMap)) {
            // Escape special regex characters
            const escapedLeet = leet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            normalized = normalized.replace(new RegExp(escapedLeet, 'g'), original);
        }
        return normalized;
    }
}

module.exports = ContentFilter;
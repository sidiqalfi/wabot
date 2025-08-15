# WhatsApp Bot dengan Baileys

Bot WhatsApp yang dibuat menggunakan Baileys dengan sistem command handler modular yang memudahkan penambahan command baru.

## 🚀 Fitur

- ✅ Command handler modular
- ✅ Konfigurasi prefix melalui `.env`
- ✅ Auto-reload commands saat development (`npm run dev`)
- ✅ Error handling
- ✅ Otentikasi via QR Code di terminal
- ✅ Support group dan private chat

## 📦 Instalasi

1.  **Clone repository ini:**
    ```bash
    git clone <URL_REPOSITORY_ANDA>
    cd wabot
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Konfigurasi environment variables:**
    Buat file `.env` dari contoh yang ada.
    ```bash
    cp .env.example .env
    ```
    Lalu sesuaikan isinya jika perlu.
    ```env
    PREFIX=!
    BOT_NAME=Wabot
    ```

4.  **Jalankan bot:**
    ```bash
    npm start
    ```
    Untuk development dengan auto-reload, gunakan:
    ```bash
    npm run dev
    ```

## 📝 Daftar Perintah

Berikut adalah daftar perintah yang tersedia, dikelompokkan berdasarkan kategori.

### Utilitas & Informasi
| Command | Description |
|---|---|
| `!ping` | Menguji kecepatan respon bot. |
| `!info` | Menampilkan informasi tentang bot. |
| `!help` | Menampilkan daftar semua perintah. |
| `!jadwalsholat [kota]` | Menampilkan jadwal sholat untuk kota tertentu. |
| `!cuaca [kota]` | Menampilkan kondisi cuaca saat ini di kota tertentu. |
| `!news` | Menampilkan berita terkini. |
| `!crypto [simbol]` | Menampilkan harga cryptocurrency. |
| `!ssweb [url]` | Mengambil screenshot dari sebuah halaman web. |
| `!shorturl [url]` | Mempersingkat URL. |
| `!translate [kode_bahasa] [teks]` | Menerjemahkan teks ke bahasa lain. |
| `!langcodes` | Menampilkan daftar kode bahasa untuk translasi. |
| `!tts [kode_bahasa] [teks]` | Mengubah teks menjadi pesan suara. |
| `!qrcode [teks]` | Membuat QR code dari teks. |
| `!whois [domain]` | Menampilkan informasi WHOIS dari sebuah domain. |
| `!speedtest` | Menguji kecepatan koneksi internet server bot. |
| `!wiki [query]` | Mencari artikel di Wikipedia. |

### Hiburan & Seru-seruan
| Command | Description |
|---|---|
| `!sticker` | Mengubah gambar menjadi stiker (kirim bersama gambar). |
| `!toimg` | Mengubah stiker menjadi gambar (balas sebuah stiker). |
| `!meme` | Mengirimkan meme random. |
| `!quote` | Mengirimkan kutipan inspiratif. |
| `!jodoh [nama1] [nama2]` | Meramal kecocokan jodoh. |
| `!gila` | Mengukur tingkat kegilaan seseorang. |
| `!roast [nama]` | Memberikan "roasting" candaan. |
| `!pokemon [nama]` | Menampilkan informasi tentang Pokemon. |
| `!randomfact` | Memberikan fakta random. |
| `!tebakkata` | Game tebak kata. |
| `!slot` | Bermain mesin slot. |

### Grup
| Command | Description |
|---|---|
| `!tagall` | Mention semua anggota grup. |
| `!bot` | Cek melihat status bot. |

### Lainnya
| Command | Description |
|---|---|
| `!asmaulhusna` | Menampilkan Asmaul Husna. |
| `!dl [url]` | Mengunduh konten dari URL (misal: YouTube). |
| `!echo [pesan]` | Mengulang pesan yang dikirim. |
| `!reminder [waktu] [pesan]` | Mengatur pengingat. |

## 🔨 Cara Menambah Perintah Baru

1.  Buat file JavaScript baru di dalam direktori `commands/`.
2.  Gunakan template dari `command-template.js` atau salin dari perintah yang sudah ada.
3.  Struktur dasar perintah adalah sebagai berikut:

    ```javascript
    module.exports = {
        name: 'namacommand',
        description: 'Deskripsi singkat tentang apa yang dilakukan command ini.',
        usage: 'contoh penggunaan', // opsional
        category: 'kategori', // opsional
        
        async execute(message, sock, args) {
            // Logika perintah Anda di sini
            await sock.sendMessage(message.key.remoteJid, { text: 'Hello, World!' });
        }
    };
    ```
4.  Jika Anda menjalankan bot dengan `npm run dev`, perubahan akan dimuat ulang secara otomatis. Jika tidak, restart bot.

## 📁 Struktur Proyek

```
wabot/
├── commands/           # Folder untuk semua file perintah
├── lib/                # Folder untuk modul/library bantuan
├── auth_info/          # Menyimpan sesi otentikasi (dibuat otomatis)
├── .env                # File konfigurasi environment
├── .env.example        # Contoh file environment
├── commandHandler.js   # Logika untuk memuat dan menjalankan perintah
├── index.js            # File utama untuk menjalankan bot
└── package.json        # Daftar dependensi dan skrip proyek
```

## 📄 Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT.

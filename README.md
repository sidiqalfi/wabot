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

## ✨ Fitur Changelogs Otomatis

Bot ini memiliki command `!changelogs` yang menampilkan riwayat commit langsung di chat. Agar command ini berfungsi, Anda perlu melakukan pengaturan satu kali setelah men-clone repositori ini.

### Pengaturan

1.  **Buat Hook `post-commit`**

    Buat file baru di dalam direktori `.git` Anda:
    ```
    .git/hooks/post-commit
    ```

2.  **Isi File Hook**

    Salin dan tempel skrip berikut ke dalam file `post-commit` yang baru saja Anda buat:

    ```sh
    #!/bin/sh
    # Script untuk update otomatis file changelogs.txt setelah commit
    
    cd "$(dirname "$0")/../../"
    
    # Hasilkan log dengan format custom untuk SEMUA commit
    git log --pretty=format:"%h|%s" > data/changelogs.txt
    ```

3.  **Buat Skrip Dapat Dieksekusi**

    Buka terminal di direktori proyek dan jalankan perintah ini:
    ```bash
    chmod +x .git/hooks/post-commit
    ```

4.  **Hasilkan File Changelog Awal**

    Jalankan perintah berikut untuk membuat file `changelogs.txt` pertama kali.
    ```bash
    git log --pretty=format:"%h|%s" > data/changelogs.txt
    ```

Setelah ini, setiap kali Anda membuat `git commit` baru, file `data/changelogs.txt` akan diperbarui secara otomatis, dan command `!changelogs` akan selalu menampilkan data terbaru.

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT.
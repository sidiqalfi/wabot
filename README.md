# WhatsApp Bot dengan Baileys

Bot WhatsApp yang dibuat menggunakan Baileys dengan sistem command handler modular yang memudahkan penambahan command baru.

## 🚀 Fitur

- ✅ Command handler modular
- ✅ Konfigurasi prefix melalui `.env` (support multi-prefix)
- ✅ Auto-reload commands saat development (`npm run dev`)
- ✅ Error handling
- ✅ Otentikasi via QR Code di terminal
- ✅ Support group dan private chat
- ✅ Quick reply tanpa prefix
- ✅ Command suggestion untuk typo
- ✅ Sistem kategori command

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
    
    **Catatan:** Untuk multi-prefix, gunakan format: `PREFIX=!,/,.,&,*`

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

### Utility
| Command | Description |
|---|---|
| `!ping` | Menguji kecepatan respon bot |
| `!info` | Menampilkan informasi tentang bot |
| `!help` | Menampilkan daftar semua perintah |
| `!bot` | Cek status bot |
| `!echo [pesan]` | Mengulang pesan yang dikirim |
| `!report [pesan]` | Melaporkan bug atau saran |

### Islamic
| Command | Description |
|---|---|
| `!doa` | Menampilkan doa-doa harian |
| `!asmaulhusna` | Menampilkan Asmaul Husna |
| `!jadwalsholat [kota]` | Menampilkan jadwal sholat untuk kota tertentu |

### Information & Tools
| Command | Description |
|---|---|
| `!news` | Menampilkan berita lokal terkini |
| `!crypto [simbol]` | Menampilkan harga cryptocurrency |
| `!ssweb [url]` | Mengambil screenshot dari sebuah halaman web |
| `!shorturl [url]` | Mempersingkat URL |
| `!whois [domain]` | Menampilkan informasi WHOIS dari sebuah domain |
| `!speedtest` | Menguji kecepatan koneksi internet server bot |
| `!wiki [query]` | Mencari artikel di Wikipedia |
| `!changelogs` | Menampilkan riwayat perubahan bot |

### Translation & Language
| Command | Description |
|---|---|
| `!translate [kode_bahasa] [teks]` | Menerjemahkan teks ke bahasa lain |
| `!langcodes` | Menampilkan daftar kode bahasa untuk translasi |
| `!tts [kode_bahasa] [teks]` | Mengubah teks menjadi pesan suara |

### Media & Entertainment
| Command | Description |
|---|---|
| `!sticker` | Mengubah gambar menjadi stiker (kirim bersama gambar) |
| `!toimg` | Mengubah stiker menjadi gambar (balas sebuah stiker) |
| `!dl [url]` | Mengunduh konten dari URL (misal: YouTube) |
| `!meme` | Mengirimkan meme random |
| `!quote` | Mengirimkan kutipan inspiratif |
| `!pokemon [nama]` | Menampilkan informasi tentang Pokemon |
| `!fact` | Memberikan fakta random |
| `!waifu` | Mengirimkan gambar waifu random |
| `!cat` | Mengirimkan gambar kucing random |
| `!dog` | Mengirimkan gambar anjing random |
| `!fufufafa` | Mengirimkan gambar komentar fufufafa |

### Games & Fun
| Command | Description |
|---|---|
| `!jodoh [nama1] [nama2]` | Meramal kecocokan jodoh |
| `!gila` | Mengukur tingkat kegilaan seseorang |
| `!roast [nama]` | Memberikan "roasting" candaan |
| `!tebakkata` | Game tebak kata |
| `!slot` | Bermain mesin slot |
| `!family100` | Game Family 100 |

### Weather & Location
| Command | Description |
|---|---|
| `!weather [kota]` | Menampilkan kondisi cuaca saat ini di kota tertentu |

### Group Management
| Command | Description |
|---|---|
| `!tagall` | Mention semua anggota grup |
| `!rules` | Menampilkan aturan grup |

### Tools
| Command | Description |
|---|---|
| `!qrcode [teks]` | Membuat QR code dari teks |
| `!reminder [waktu] [pesan]` | Mengatur pengingat |

### Owner
| Command | Description |
|---|---|
| `!owner` | Informasi owner bot |

## 🔨 Cara Menambah Perintah Baru

1.  Buat file JavaScript baru di dalam direktori `commands/`.
2.  Gunakan template dari `command-template.js` atau salin dari perintah yang sudah ada.
3.  Struktur dasar perintah adalah sebagai berikut:

    ```javascript
    module.exports = {
        name: 'namacommand',
        aliases: ['alias1', 'alias2'], // opsional
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
│   ├── utility/        # Perintah utilitas (ping, help, info, dll)
│   ├── islamic/        # Perintah islami (jadwal sholat, doa, dll)
│   ├── games/          # Perintah game dan hiburan
│   ├── media/          # Perintah media (sticker, download, dll)
│   └── tools/          # Perintah tools (translate, qrcode, dll)
├── lib/                # Folder untuk modul/library bantuan
│   ├── statsStore.js   # Penyimpanan statistik
│   └── groupState.js   # State management untuk grup
├── auth_info/          # Menyimpan sesi otentikasi (dibuat otomatis)
├── data/               # Folder untuk menyimpan data
│   ├── changelogs.txt  # Riwayat perubahan
│   ├── stats.json      # Statistik bot
│   └── groupState.json # State grup
├── .env                # File konfigurasi environment
├── commandHandler.js   # Logika untuk memuat dan menjalankan perintah
├── index.js            # File utama untuk menjalankan bot
├── command-template.js # Template untuk membuat command baru
├── package.json        # Daftar dependensi dan skrip proyek
└── README.md           # Dokumentasi proyek
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

## 🎯 Fitur Khusus

### Multi-Prefix Support
Bot mendukung multiple prefix yang dapat dikonfigurasi di file `.env`:
```env
PREFIX=!,/,.,&,*
```

### Quick Reply tanpa Prefix
Bot dapat merespon pesan tanpa prefix untuk beberapa kata kunci umum seperti "selamat pagi", "terima kasih", dll.

### Command Suggestion
Jika user salah mengetik command, bot akan memberikan saran command yang mirip.

### Auto-Reload Development
Gunakan `npm run dev` untuk development dengan auto-reload saat ada perubahan file.

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT.
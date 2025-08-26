# WhatsApp Bot dengan Baileys

Bot WhatsApp yang dibuat menggunakan Baileys dengan sistem command handler modular yang memudahkan penambahan command baru.

## 🚀 Fitur

- ✅ Command handler modular dengan kategorisasi
- ✅ Konfigurasi prefix melalui `.env` (support multi-prefix)
- ✅ Auto-reload commands saat development (`npm run dev`)
- ✅ Error handling
- ✅ Otentikasi via QR Code di terminal
- ✅ Support group dan private chat
- ✅ Quick reply tanpa prefix
- ✅ Command suggestion untuk typo
- ✅ Sistem kategori command dengan help yang terorganisir

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
    Untuk debugging:
    ```bash
    npm run dev:debug
    ```

## 📝 Daftar Perintah

Bot sekarang menggunakan sistem kategorisasi yang terorganisir. Gunakan `!help` untuk melihat semua kategori atau `!help [kategori]` untuk melihat commands dalam kategori tertentu.

### 🔧 Utility
| Command | Description |
|---|---|
| `!ping` | Menguji kecepatan respon bot |
| `!help` | Menampilkan daftar semua perintah |
| `!info` | Menampilkan informasi tentang bot |
| `!bot` | Cek status bot |
| `!echo [pesan]` | Mengulang pesan yang dikirim |
| `!report [pesan]` | Melaporkan bug atau saran |

### 🕌 Islamic
| Command | Description |
|---|---|
| `!doa` | Menampilkan doa-doa harian |
| `!asmaulhusna` | Menampilkan Asmaul Husna |
| `!jadwalsholat [kota]` | Menampilkan jadwal sholat untuk kota tertentu |

### 📊 Information & Tools
| Command | Description |
|---|---|
| `!news` | Menampilkan berita lokal terkini |
| `!crypto [simbol]` | Menampilkan harga cryptocurrency |
| `!whois [domain]` | Menampilkan informasi WHOIS dari sebuah domain |
| `!wiki [query]` | Mencari artikel di Wikipedia |
| `!speedtest` | Menguji kecepatan koneksi internet server bot |
| `!changelogs` | Menampilkan riwayat perubahan bot |

### 📱 Media
| Command | Description |
|---|---|
| `!sticker` | Mengubah gambar menjadi stiker (kirim bersama gambar) |
| `!toimg` | Mengubah stiker menjadi gambar (balas sebuah stiker) |
| `!dl [url]` | Mengunduh konten dari URL (misal: YouTube) |
| `!ssweb [url]` | Mengambil screenshot dari sebuah halaman web |

### 🎮 Entertainment
| Command | Description |
|---|---|
| `!meme` | Mengirimkan meme random |
| `!quote` | Mengirimkan kutipan inspiratif |
| `!pokemon [nama]` | Menampilkan informasi tentang Pokemon |
| `!fact` | Memberikan fakta random |
| `!waifu` | Mengirimkan gambar waifu random |
| `!cat` | Mengirimkan gambar kucing random |
| `!dog` | Mengirimkan gambar anjing random |
| `!fufufafa` | Mengirimkan gambar komentar fufufafa |

### 🎲 Games & Fun
| Command | Description |
|---|---|
| `!jodoh [nama1] [nama2]` | Meramal kecocokan jodoh |
| `!gila` | Mengukur tingkat kegilaan seseorang |
| `!roast [nama]` | Memberikan "roasting" candaan |
| `!tebakkata` | Game tebak kata |
| `!slot` | Bermain mesin slot |
| `!family100` | Game Family 100 |

### 🛠️ Tools
| Command | Description |
|---|---|
| `!translate [kode_bahasa] [teks]` | Menerjemahkan teks ke bahasa lain |
| `!langcodes` | Menampilkan daftar kode bahasa untuk translasi |
| `!tts [kode_bahasa] [teks]` | Mengubah teks menjadi pesan suara |
| `!qrcode [teks]` | Membuat QR code dari teks |
| `!reminder [waktu] [pesan]` | Mengatur pengingat |
| `!shorturl [url]` | Mempersingkat URL |

### 🌤️ Weather
| Command | Description |
|---|---|
| `!weather [kota]` | Menampilkan kondisi cuaca saat ini di kota tertentu |

### 👥 Group Management
| Command | Description |
|---|---|
| `!tagall` | Mention semua anggota grup (hanya untuk admin grup) |
| `!rules` | Menampilkan aturan menggunakan bot |
| `!promote @user` | Mengangkat member menjadi admin (hanya untuk admin grup) |
| `!demote @user` | Menurunkan jabatan admin menjadi member (hanya untuk admin grup) |
| `!kick @user` | Mengeluarkan member dari grup (hanya untuk admin grup) |
| `!warn @user [alasan]` | Memberikan peringatan kepada member (hanya untuk admin grup) |
| `!unwarn @user [jumlah]` | Menghapus peringatan dari member (hanya untuk admin grup) |
| `!warnings [@user]` | Melihat status peringatan member grup |
| `!link` | Mendapatkan link invite grup |
| `!add [nomor]` | Menambahkan member ke grup (hanya untuk admin grup) |
| `!out` | Membuat bot keluar dari grup (hanya untuk admin grup) |
| `!setgroupname [nama baru]` | Mengganti nama grup (hanya untuk admin grup) |
| `!setgroupdesc [deskripsi baru]` | Mengganti deskripsi grup (hanya untuk admin grup) |
| `!opengroup` | Membuka grup (memungkinkan semua member mengirim pesan) (hanya untuk admin grup) |
| `!closegroup` | Menutup grup (hanya admin yang bisa mengirim pesan) (hanya untuk admin grup) |
| `!setwelcome [pesan|on|off]` | Mengatur pesan selamat datang untuk grup. |
| `!setleave [pesan|on|off]` | Mengatur pesan perpisahan untuk grup. |

### Tools
| Command | Description |
|---|---|
| `!qrcode [teks]` | Membuat QR code dari teks |
| `!reminder [waktu] [pesan]` | Mengatur pengingat |

### 👑 Owner
| Command | Description |
|---|---|
| `!owner` | Informasi owner bot |
| `!blacklist` | Mengelola daftar kontak yang diblokir (add/remove/list) |
| `!delay` | Mengatur delay command untuk pengguna bot |

## 🔒 Blacklist Feature

Bot ini memiliki fitur blacklist yang memungkinkan owner untuk memblokir kontak tertentu. Fitur ini juga secara otomatis memblokir kontak yang menelepon bot.

### Penggunaan:

- `!blacklist add [nomor]` - Memblokir kontak
- `!blacklist remove [nomor]` - Membuka blokir kontak
- `!blacklist list` - Melihat daftar blacklist

### Contoh:

- `!blacklist add 6281234567890`
- `!blacklist remove 6281234567890`
- `!blacklist list`

### Warning System Feature

Bot ini memiliki sistem peringatan (warning) yang memungkinkan admin grup untuk mengelola member yang melanggar aturan. Sistem ini otomatis mengeluarkan member setelah 3 peringatan.

#### Penggunaan Warning System:

- `!warn @user [alasan]` - Memberikan peringatan kepada member
- `!unwarn @user [jumlah]` - Menghapus peringatan dari member
- `!warnings [@user]` - Melihat status peringatan

#### Contoh Penggunaan:

- `!warn @user Spam di grup`
- `!unwarn @user 1` - Menghapus 1 peringatan
- `!warnings @user` - Melihat detail peringatan user
- `!warnings` - Melihat semua peringatan di grup

#### Fitur Otomatis:

- Setelah 3 peringatan, member akan otomatis dikeluarkan dari grup
- Notifikasi peringatan dikirim ke grup dengan detail lengkap
- Riwayat peringatan tersimpan dengan timestamp dan alasan
- Admin dapat menghapus peringatan jika diperlukan

### Command Delay Feature

Bot ini memiliki fitur delay command yang memungkinkan owner untuk mengatur jeda waktu antar penggunaan command. Fitur ini berguna untuk mencegah spam dan mengatur beban server.

### Penggunaan:

- `!delay` - Melihat pengaturan delay saat ini
- `!delay on` - Mengaktifkan delay command
- `!delay off` - Menonaktifkan delay command
- `!delay seconds [angka]` - Mengatur durasi delay dalam detik
- `!delay mode [owner|all]` - Mengatur mode delay (owner: hanya untuk non-owner, all: untuk semua user)
- `!delay test` - Test sistem delay

### Contoh:

- `!delay on`
- `!delay seconds 10`
- `!delay mode all`
- `!delay test`

### Fitur Otomatis:

Ketika seseorang menelepon bot, mereka akan:
1. Menerima pesan peringatan
2. Diblokir secara otomatis
3. Nomor mereka disimpan dalam database blacklist

1.  **Pilih kategori yang sesuai** dan buat file JavaScript baru di dalam direktori `commands/[kategori]/`.
2.  Gunakan template dari `command-template.js` atau salin dari perintah yang sudah ada.
3.  Struktur dasar perintah adalah sebagai berikut:

    ```javascript
    module.exports = {
        name: 'namacommand',
        aliases: ['alias1', 'alias2'], // opsional
        description: 'Deskripsi singkat tentang apa yang dilakukan command ini.',
        usage: 'contoh penggunaan', // opsional
        category: 'kategori', // akan auto-detect dari folder, bisa override
        
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
│   ├── information/    # Perintah informasi (news, crypto, whois, dll)
│   ├── media/          # Perintah media (sticker, download, dll)
│   ├── entertainment/  # Perintah hiburan (meme, quote, pokemon, dll)
│   ├── games/          # Perintah game dan hiburan
│   ├── tools/          # Perintah tools (translate, qrcode, dll)
│   ├── weather/        # Perintah cuaca
│   ├── group/          # Perintah manajemen grup
│   └── owner/          # Perintah khusus owner
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

## 🆕 Fitur Kategorisasi Commands

### Help System yang Terorganisir

Bot sekarang memiliki sistem help yang lebih terorganisir:

- `!help` - Menampilkan semua kategori dengan jumlah commands
- `!help [kategori]` - Menampilkan commands dalam kategori tertentu
- `!help [command]` - Menampilkan detail command tertentu

### Auto-Category Detection

Commands akan otomatis terdeteksi kategorinya berdasarkan folder tempat file berada. Anda juga bisa override dengan menambahkan property `category` di command.

### Category Emojis

Setiap kategori memiliki emoji yang unik untuk memudahkan identifikasi:
- 🔧 Utility
- 🕌 Islamic  
- 📊 Information
- 📱 Media
- 🎮 Entertainment
- 🎲 Games
- 🛠️ Tools
- 🌤️ Weather
- 👥 Group
- 👑 Owner

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

**Scripts yang tersedia:**
- `npm run dev` - Development mode dengan auto-reload

**Konfigurasi Nodemon:**
- ✅ Watch: `index.js`, `commandHandler.js`, `commands/`, `lib/`, `.env`
- ❌ Ignore: `auth_info/`, `data/`, `node_modules/`, logs, cache files

### Recursive Command Loading
Bot sekarang dapat memuat commands dari subfolder secara rekursif, memungkinkan organisasi yang lebih baik.

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT.

# WhatsApp Bot dengan Baileys

Bot WhatsApp yang dibuat menggunakan Baileys dengan sistem command handler modular yang memudahkan penambahan command baru.

## 🚀 Features

- ✅ Command handler modular
- ✅ Konfigurasi prefix melalui .env
- ✅ Auto-reload commands
- ✅ Error handling
- ✅ QR Code authentication
- ✅ Support group dan private chat

## 📦 Installation

1. Clone repository ini
2. Install dependencies:
```bash
npm install
```

3. Konfigurasi environment variables dengan membuat file `.env`:
```env
PREFIX=!
BOT_NAME=WhatsApp Bot
```

4. Jalankan bot:
```bash
npm start
```

## 🔧 Configuration

### Environment Variables (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `PREFIX` | Prefix untuk commands | `!` |
| `BOT_NAME` | Nama bot | `WhatsApp Bot` |

## 📝 Commands

### Built-in Commands

| Command | Description |
|---------|-------------|
| `!ping` | Test koneksi bot |
| `!help` | Menampilkan daftar command |
| `!info` | Informasi bot |

## 🔨 Cara Menambah Command Baru

1. Buat file baru di folder `commands/` dengan format `namacommand.js`
2. Gunakan template berikut:

```javascript
module.exports = {
    name: 'namacommand',
    description: 'Deskripsi command',
    usage: 'namacommand [parameter]',
    category: 'kategori', // optional
    
    async execute(message, sock, args) {
        // Logic command di sini
        
        await sock.sendMessage(message.key.remoteJid, {
            text: 'Response dari command'
        });
    }
};
```

3. Restart bot atau gunakan fitur auto-reload

### Contoh Command Sederhana

```javascript
// commands/hello.js
module.exports = {
    name: 'hello',
    description: 'Menyapa user',
    usage: 'hello [nama]',
    category: 'fun',
    
    async execute(message, sock, args) {
        const name = args.join(' ') || 'World';
        
        await sock.sendMessage(message.key.remoteJid, {
            text: `Hello, ${name}! 👋`
        });
    }
};
```

## 📋 Command Structure

Setiap command harus memiliki struktur berikut:

- `name`: Nama command (wajib)
- `description`: Deskripsi command (wajib)
- `usage`: Cara penggunaan command (opsional)
- `category`: Kategori command (opsional)
- `execute`: Function async yang akan dijalankan (wajib)

### Parameter Function Execute

- `message`: Object message dari Baileys
- `sock`: Instance socket Baileys
- `args`: Array arguments dari command

## 🔄 Auto Restart

Untuk development, Anda bisa menggunakan nodemon:

```bash
npm install -g nodemon
nodemon index.js
```

## 📁 Struktur Project

```
wabot/
├── commands/           # Folder untuk semua commands
│   ├── ping.js        # Command ping
│   ├── help.js        # Command help
│   └── info.js        # Command info
├── auth_info/         # Session data (auto-generated)
├── commandHandler.js  # Command handler utama
├── index.js          # Bot utama
├── .env              # Environment variables
└── package.json      # Dependencies
```

## 🛠️ Development Tips

1. **Testing Commands**: Gunakan command `!ping` untuk test koneksi
2. **Debugging**: Check console untuk log command usage
3. **Error Handling**: Bot akan kirim pesan error jika command gagal
4. **Hot Reload**: Restart bot untuk load command baru

## 🔒 Security

- Jangan commit file `.env` ke repository
- Session data disimpan di folder `auth_info/`
- Bot hanya merespons pesan dengan prefix yang benar

## 📱 Cara Pakai

1. Jalankan bot dengan `npm start`
2. Scan QR code yang muncul di terminal
3. Bot siap digunakan!
4. Kirim `!help` untuk melihat command yang tersedia

## 🐛 Troubleshooting

### Bot tidak merespons
- Pastikan prefix benar
- Check connection status di console
- Restart bot jika perlu

### QR Code tidak muncul
- Pastikan terminal support QR code
- Check network connection
- Coba restart bot

### Command tidak ditemukan
- Pastikan file command ada di folder `commands/`
- Check struktur command sudah benar
- Restart bot untuk reload commands

## 🤝 Contributing

Silakan buat command baru dan submit PR untuk menambah fitur bot!

## 📄 License

MIT License
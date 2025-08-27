// /whois - lookup WHOIS info untuk domain atau IP
// Menggunakan system whois command

const { exec } = require('child_process');

function isIP(input) {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(input) || // IPv4
         /^([0-9a-fA-F:]+:+)+[0-9a-fA-F]+$/.test(input); // IPv6 (sederhana)
}

function extractHost(input) {
  try {
    if (/^https?:\/\//i.test(input)) {
      const u = new URL(input);
      return u.hostname;
    }
    return input;
  } catch {
    return input;
  }
}

function fmtDate(v) {
  if (!v) return '-';
  // Banyak WHOIS date string random; cukup tampilkan mentah kalau gagal parse
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toISOString().slice(0, 10);
}

function truncate(s, n = 500) {
  if (!s) return '-';
  s = String(s);
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function parseWhoisData(rawData) {
  if (!rawData) return {};
  
  const lines = rawData.split('\n');
  const data = {};
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();
    
    if (!value || value === '') continue;
    
    // Skip comments and empty lines
    if (key.startsWith('%') || key.startsWith('#') || key === '') continue;
    
    // Handle multi-line values
    if (data[key]) {
      if (Array.isArray(data[key])) {
        data[key].push(value);
      } else {
        data[key] = [data[key], value];
      }
    } else {
      data[key] = value;
    }
  }
  
  return data;
}

function execWhois(target) {
  return new Promise((resolve, reject) => {
    exec(`whois ${target}`, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      if (stderr) {
        console.log('WHOIS stderr:', stderr);
      }
      
      resolve(stdout);
    });
  });
}

module.exports = {
  name: 'whois',
  description: 'Cek WHOIS untuk domain/IP (registrar, tanggal, NS, status).',
  usage: 'whois <domain|ip> [--raw]',
  category: 'information',

  async execute(message, sock, args) {
    try {
      if (args.length === 0) {
        await sock.sendMessage(message.key.remoteJid, {
          text:
`❌ Butuh target buat dicek.

Contoh:
• !whois google.com
• !whois https://github.com
• !whois 8.8.8.8
• !whois example.org --raw (tampilkan data mentah)`,
        });
        return;
      }

      const wantRaw = args.includes('--raw');
      const targetArg = args.filter(a => a !== '--raw').join(' ').trim();
      const target = extractHost(targetArg);

      // Validasi sangat basic: domain atau IP
      const domainLike = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(target);
      if (!domainLike && !isIP(target)) {
        await sock.sendMessage(message.key.remoteJid, {
          text: `❌ Format tidak valid.\nCoba: !whois <domain|ip>\nContoh: !whois cloudflare.com`
        });
        return;
      }

      // Send loading message
      const loadingMsg = await sock.sendMessage(message.key.remoteJid, {
        text: `🔍 Mencari info WHOIS untuk *${target}*...\nMohon tunggu sebentar...`
      });

      // Query WHOIS with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 30000); // 30 seconds timeout
      });

      const whoisPromise = execWhois(target);
      
      const rawData = await Promise.race([whoisPromise, timeoutPromise]);

      // Delete loading message
      try {
        await sock.sendMessage(message.key.remoteJid, { delete: loadingMsg.key });
      } catch (e) {
        // Ignore if can't delete
      }

      if (!rawData || rawData.trim() === '') {
        await sock.sendMessage(message.key.remoteJid, {
          text: `⚠️ Data WHOIS untuk "${target}" kosong atau tidak tersedia.\n\nMungkin domain/IP tidak valid atau server WHOIS sedang bermasalah.`
        });
        return;
      }

      if (wantRaw) {
        // Kirim raw data sebagai dokumen
        await sock.sendMessage(message.key.remoteJid, {
          document: Buffer.from(rawData, 'utf-8'),
          fileName: `whois-${target}.txt`,
          mimetype: 'text/plain',
          caption: `🧾 WHOIS RAW: ${target}`
        });
        return;
      }

      // Parse the raw data
      const data = parseWhoisData(rawData);
      
      // Normalisasi field names
      const registrar = data.registrar || data['registrar name'] || data['sponsoring registrar'] || data.registry || data['registrar'] || '-';
      const creation = data.creation_date || data['creation date'] || data.created || data['registered on'] || data['registration time'] || data['domain registration date'] || data['created date'];
      const updated = data.updated_date || data['updated date'] || data.modified || data['last modified'] || data['domain last updated date'] || data['last updated'];
      const expiry = data.expiry_date || data['expiry date'] || data.expires || data['expiration date'] || data['registrar registration expiration date'] || data['registry expiry date'];
      const status = data.status || data['domain status'] || data['status'] || data['state'];
      
      let ns = data.name_servers || data['name server'] || data['name servers'] || data.nserver || data.nameservers;
      if (typeof ns === 'string') {
        ns = ns.split(/\s+/g).filter(Boolean);
      }
      if (Array.isArray(ns)) {
        ns = ns
          .flatMap(s => String(s).split(/[,\s]+/g))
          .filter(Boolean)
          .map(s => s.toLowerCase());
      }

      const lines = [];
      lines.push(`🔎 WHOIS Lookup: *${target}*`);
      lines.push('');
      lines.push(`🏢 Registrar : ${truncate(registrar, 120)}`);
      lines.push(`📅 Dibuat   : ${fmtDate(creation)}`);
      lines.push(`♻️  Update   : ${fmtDate(updated)}`);
      lines.push(`⏳ Kadaluarsa: ${fmtDate(expiry)}`);
      
      if (status && status !== '-') {
        const statusStr = Array.isArray(status) ? status.join(', ') : String(status);
        lines.push(`🚦 Status    : ${truncate(statusStr, 300)}`);
      }
      
      if (ns && ns.length > 0) {
        const nsFmt = ns.slice(0, 8).map(s => `• ${s}`).join('\n');
        lines.push(`🧭 Name Server:\n${nsFmt}${ns.length > 8 ? `\n(+${ns.length - 8} lagi)` : ''}`);
      }

      // Info privasi/registry
      if (String(registrar).toLowerCase().includes('privacy') || /redacted/i.test(JSON.stringify(data))) {
        lines.push('');
        lines.push('🔐 Beberapa detail disembunyikan oleh privacy/registry.');
      }

      lines.push('');
      lines.push('💡 Tip: tambah `--raw` untuk data mentah.');

      await sock.sendMessage(message.key.remoteJid, { text: lines.join('\n') });

    } catch (error) {
      console.error(`Error in whois command:`, error);
      
      let errorMessage = '❌ Gagal ambil WHOIS. ';
      
      if (error.message === 'Timeout') {
        errorMessage += 'Request timeout (30 detik). Server WHOIS mungkin lambat atau overload.';
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage += 'Domain/IP tidak ditemukan atau tidak valid.';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage += 'Koneksi ke server WHOIS ditolak.';
      } else if (error.message.includes('ENOENT')) {
        errorMessage += 'Domain/IP tidak ditemukan.';
      } else if (error.message.includes('command not found')) {
        errorMessage += 'System whois command tidak tersedia. Install dengan:\n• Ubuntu/Debian: sudo apt install whois\n• CentOS/RHEL: sudo yum install whois\n• Arch: sudo pacman -S whois\n• macOS: brew install whois';
      } else {
        errorMessage += 'Coba lagi nanti atau cek domain/IP-nya.';
      }
      
      await sock.sendMessage(message.key.remoteJid, { text: errorMessage });
    }
  }
};

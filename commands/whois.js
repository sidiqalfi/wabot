// /whois - lookup WHOIS info untuk domain atau IP
// Dep: npm i whois-json

const whois = require('whois-json');

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

module.exports = {
  name: 'whois',
  description: 'Cek WHOIS untuk domain/IP (registrar, tanggal, NS, status).',
  usage: 'whois <domain|ip> [--raw]',
  category: 'utility',

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
• !whois example.org --raw (tampilkan JSON mentah)`,
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

      // Query WHOIS
      const data = await whois(target, { follow: 3, timeout: 15000 });

      if (!data || Object.keys(data).length === 0) {
        await sock.sendMessage(message.key.remoteJid, {
          text: `⚠️ Data WHOIS untuk "${target}" kosong atau tidak tersedia.`
        });
        return;
      }

      if (wantRaw) {
        // Kirim JSON mentah sebagai dokumen biar rapi
        const jsonStr = JSON.stringify(data, null, 2);
        await sock.sendMessage(message.key.remoteJid, {
          document: Buffer.from(jsonStr, 'utf-8'),
          fileName: `whois-${target}.json`,
          mimetype: 'application/json',
          caption: `🧾 WHOIS RAW: ${target}`
        });
        return;
      }

      // Normalisasi beberapa field umum dari berbagai registry
      const registrar = data.registrar || data.Registrar || data['Sponsoring Registrar'] || data.registry || '-';
      const creation = data.creationDate || data['Creation Date'] || data.created || data['Registered On'] || data['Registration Time'] || data['Domain Registration Date'];
      const updated  = data.updatedDate  || data['Updated Date']  || data.modified || data['Last Modified'] || data['Domain Last Updated Date'];
      const expiry   = data.registrarRegistrationExpirationDate || data['Registry Expiry Date'] || data.expires || data['Expiry Date'] || data['Registrar Registration Expiration Date'];
      const status   = data.status || data['Domain Status'] || data['Status'] || data['state'];
      let ns = data.nameServers || data['Name Server'] || data['Name Servers'] || data.nserver;
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
      if (status) {
        const statusStr = Array.isArray(status) ? status.join(', ') : String(status);
        lines.push(`🚦 Status    : ${truncate(statusStr, 300)}`);
      }
      if (ns && ns.length) {
        const nsFmt = ns.slice(0, 8).map(s => `• ${s}`).join('\n');
        lines.push(`🧭 Name Server:\n${nsFmt}${ns.length > 8 ? `\n(+${ns.length - 8} lagi)` : ''}`);
      }

      // Info privasi/registry
      if (String(registrar).toLowerCase().includes('privacy') || /redacted/i.test(JSON.stringify(data))) {
        lines.push('');
        lines.push('🔐 Beberapa detail disembunyikan oleh privacy/registry.');
      }

      lines.push('');
      lines.push('Tip: tambah `--raw` untuk JSON lengkap.');

      await sock.sendMessage(message.key.remoteJid, { text: lines.join('\n') });

    } catch (error) {
      console.error(`Error in whois command:`, error);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Gagal ambil WHOIS. Coba lagi nanti atau cek domain/IP-nya.'
      });
    }
  }
};

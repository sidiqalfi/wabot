const axios = require('axios');

module.exports = {
  name: 'crypto',
  description: 'Cek harga kripto (CoinGecko)',
  usage: 'crypto [symbol(s)] [fiat]\nContoh: crypto btc | crypto eth usd | crypto btc,eth idr',
  category: 'utility',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;
    try {
      // Defaults
      const defaultFiat = 'idr';
      let fiat = (args[1] || args[0]?.split(' ')[1] || defaultFiat).toLowerCase();
      let symbolsInput = args[0] ? args[0].split(' ')[0] : 'btc';

      // Jika user menulis: "btc,eth usd"
      if (args.length >= 2) {
        symbolsInput = args[0];
        fiat = args[1].toLowerCase();
      }

      // Normalisasi
      const symbols = symbolsInput
        .toLowerCase()
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      // Fiat whitelist sederhana
      const fiatAllowed = ['idr', 'usd', 'eur', 'jpy', 'sgd', 'myr', 'gbp'];
      if (!fiatAllowed.includes(fiat)) fiat = defaultFiat;

      // Peta cepat untuk simbol populer → coingecko id
      const quickMap = {
        btc: 'bitcoin',
        eth: 'ethereum',
        usdt: 'tether',
        usdc: 'usd-coin',
        bnb: 'binancecoin',
        xrp: 'ripple',
        ada: 'cardano',
        doge: 'dogecoin',
        sol: 'solana',
        ton: 'the-open-network',
        trx: 'tron',
        matic: 'matic-network',
        dot: 'polkadot',
        ltc: 'litecoin',
        link: 'chainlink'
      };

      // Resolve: simbol → coingecko id (gunakan quickMap; sisa via /search)
      const ids = [];
      for (const sym of symbols) {
        if (quickMap[sym]) {
          ids.push(quickMap[sym]);
          continue;
        }
        const cgId = await resolveCoinId(sym);
        if (cgId) ids.push(cgId);
      }

      if (!ids.length) {
        await sock.sendMessage(jid, { text: '❌ Koin tidak ditemukan. Coba pakai simbol seperti: btc, eth, sol.' });
        return;
      }

      // Hit simple price
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
        ids.join(',')
      )}&vs_currencies=${encodeURIComponent(fiat)}&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true&precision=2`;

      const res = await axios.get(url, { timeout: 12000 });
      const data = res.data || {};

      // Susun nama tampil dari id → pretty
      const prettyName = (id) => id
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      // Build output
      const lines = [];
      for (const id of ids) {
        const row = data[id];
        if (!row) {
          lines.push(`• ${prettyName(id)}: data tidak tersedia`);
          continue;
        }
        const price = row[fiat];
        const chg = row[`${fiat}_24h_change`];
        const mcap = row[`${fiat}_market_cap`];
        const vol = row[`${fiat}_24h_vol`];

        const arrow = chg > 0 ? '📈' : (chg < 0 ? '📉' : '➖');
        lines.push(
          `• *${prettyName(id)}*\n` +
          `  💰 Harga: ${fmt(price, fiat)}\n` +
          `  ${arrow} 24h: ${chg?.toFixed(2)}%\n` +
          `  🧢 Market Cap: ${mcap ? fmt(mcap, fiat) : '-'}\n` +
          `  🔁 Volume 24h: ${vol ? fmt(vol, fiat) : '-'}`
        );
      }

      const header = `🪙 *Crypto Price* — vs ${fiat.toUpperCase()}\n`;
      await sock.sendMessage(jid, { text: header + '\n' + lines.join('\n\n') });

    } catch (err) {
      console.error(`Error in ${this.name} command:`, err?.message || err);
      await sock.sendMessage(jid, { text: '❌ Gagal mengambil data. Coba lagi nanti.' });
    }
  }
};

/* ---------- Helpers ---------- */

// Format angka sesuai fiat
function fmt(n, fiat) {
  try {
    // Map locale sederhana
    const locale = fiat === 'idr' ? 'id-ID' : 'en-US';
    const currency = fiat.toUpperCase();
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
  } catch {
    return `${n} ${fiat.toUpperCase()}`;
  }
}

// Resolve simbol → CoinGecko ID via /search (prioritas match symbol)
async function resolveCoinId(symbol) {
  try {
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`;
    const res = await axios.get(url, { timeout: 10000 });
    const coins = res.data?.coins || [];

    // Cari match symbol persis dulu
    const exact = coins.find(c => c.symbol?.toLowerCase() === symbol.toLowerCase());
    if (exact) return exact.id;

    // Fallback: ambil hasil pertama
    if (coins[0]?.id) return coins[0].id;

    return null;
  } catch {
    return null;
  }
}


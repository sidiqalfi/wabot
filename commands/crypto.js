// crypto.js
// Command: /crypto
// Fitur:
//  - /crypto <coin>                      → info ringkas + icon besar
//  - /crypto price <coin> [vs]           → harga cepat (default: idr)
//  - /crypto history <coin> [days] [vs]  → ringkasan riwayat N hari (default: 7, idr)
//  - /crypto chart <coin> [days] [vs]    → sama kayak history (ringkas, angka utama)
//  - /crypto top [n] [vs]                → top N market cap (default: 10, idr)
//  - /crypto compare <coin1> <coin2> [vs]→ bandingkan 2 koin
//  - /crypto info <coin>                 → detail lebih lengkap
//
// Dependencies: axios
// API: https://www.coingecko.com/en/api/documentation

const axios = require("axios");

const http = axios.create({
  baseURL: "https://api.coingecko.com/api/v3",
  timeout: 15000,
  headers: { Accept: "application/json", "User-Agent": "WhatsBot/1.0 (+bot)" },
  validateStatus: (s) => s >= 200 && s < 300,
});

module.exports = {
  name: "crypto",
  aliases: ["coin", "coins", "cryto", "cg", "coingecko"],
  description: "Harga, info, dan history crypto (CoinGecko).",
  usage:
    "crypto <coin> | crypto price <coin> [vs] | crypto history <coin> [days] [vs] | crypto top [n] [vs] | crypto compare <coin1> <coin2> [vs] | crypto info <coin>",
  category: "utility",

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;
    try {
      const a = (args || []).map((s) => s.trim()).filter(Boolean);
      if (a.length === 0) {
        await sendHelp(jid, sock);
        return;
      }

      const sub = a[0].toLowerCase();

      // /crypto price btc [usd]
      if (sub === "price") {
        const coinQ = a[1];
        const vs = (a[2] || "idr").toLowerCase();
        if (!coinQ)
          return sock.sendMessage(jid, {
            text: "⚠️ Contoh: /crypto price btc usd",
          });
        const id = await resolveCoinId(coinQ);
        if (!id) return notFound(jid, sock, coinQ);
        const m = await marketSingle(id, vs);
        const caption = renderPriceLine(m, vs);
        return sock.sendMessage(jid, { text: caption });
      }

      // /crypto history btc [7] [usd]
      if (sub === "history" || sub === "chart") {
        const coinQ = a[1];
        if (!coinQ)
          return sock.sendMessage(jid, {
            text: "⚠️ Contoh: /crypto history btc 14 usd",
          });
        const days = toInt(a[2], 7);
        const vs = (a[3] || "idr").toLowerCase();
        const id = await resolveCoinId(coinQ);
        if (!id) return notFound(jid, sock, coinQ);
        const [m, ch] = await Promise.all([
          marketSingle(id, vs),
          marketChart(id, vs, days),
        ]);
        const caption = renderHistoryCard(m, ch, vs, days);
        const img = pickIcon(m);
        return sendImageOrText(sock, jid, img, caption);
      }

      // /crypto top [10] [usd]
      if (sub === "top") {
        const n = Math.max(1, Math.min(50, toInt(a[1], 10)));
        const vs = (a[2] || "idr").toLowerCase();
        const list = await http
          .get("/coins/markets", {
            params: {
              vs_currency: vs,
              order: "market_cap_desc",
              per_page: n,
              page: 1,
              sparkline: false,
              price_change_percentage: "24h",
            },
          })
          .then((r) => r.data || []);
        if (!list.length)
          return sock.sendMessage(jid, {
            text: "❌ Gagal ambil data top coins.",
          });
        const lines = list.map(
          (c, i) =>
            `${i + 1}. ${cap(c.name)} (${(c.symbol || "").toUpperCase()}) — ${fmtFiat(c.current_price, vs)}  (${sign(c.price_change_percentage_24h)}% 24h)`,
        );
        const caption =
          `🏆 Top ${list.length} koin by Market Cap (${vs.toUpperCase()})\n` +
          lines.join("\n");
        return sock.sendMessage(jid, { text: caption });
      }

      // /crypto compare btc eth [usd]
      if (sub === "compare") {
        const c1 = a[1],
          c2 = a[2];
        const vs = (a[3] || "idr").toLowerCase();
        if (!c1 || !c2)
          return sock.sendMessage(jid, {
            text: "⚠️ Contoh: /crypto compare btc eth usd",
          });
        const [id1, id2] = await Promise.all([
          resolveCoinId(c1),
          resolveCoinId(c2),
        ]);
        if (!id1 || !id2)
          return sock.sendMessage(jid, {
            text: "❌ Koin tidak ditemukan untuk perbandingan.",
          });
        const [m1, m2] = await Promise.all([
          marketSingle(id1, vs),
          marketSingle(id2, vs),
        ]);
        const caption = renderCompare(m1, m2, vs);
        const img = pickIcon(m1) || pickIcon(m2);
        return sendImageOrText(sock, jid, img, caption);
      }

      // /crypto info btc
      if (sub === "info") {
        const coinQ = a[1];
        if (!coinQ)
          return sock.sendMessage(jid, {
            text: "⚠️ Contoh: /crypto info solana",
          });
        const id = await resolveCoinId(coinQ);
        if (!id) return notFound(jid, sock, coinQ);
        const detail = await coinDetail(id);
        const caption = renderInfo(detail);
        const img = detail?.image?.large || detail?.image?.small;
        return sendImageOrText(sock, jid, img, caption);
      }

      // Default: /crypto <coin>
      const coinQ = a.join(" ");
      const id = await resolveCoinId(coinQ);
      if (!id) return notFound(jid, sock, coinQ);
      const vs = "idr";
      const m = await marketSingle(id, vs);
      const caption = renderMainCard(m, vs);
      const img = pickIcon(m);
      return sendImageOrText(sock, jid, img, caption);
    } catch (err) {
      console.error(
        "[crypto] error:",
        err?.response?.data || err.message || err,
      );
      await sock.sendMessage(message.key.remoteJid, {
        text: "❌ Gagal memproses permintaan crypto. Coba lagi nanti.",
      });
    }
  },
};

// ---------------- Helpers ----------------

async function sendHelp(jid, sock) {
  const helpText = [
    "📊 *Crypto Command Help*",
    "",
    "• /crypto <coin>",
    "  Info ringkas + icon besar",
    "",
    "• /crypto price <coin> [vs]",
    "  Harga cepat (default vs: idr)",
    "",
    "• /crypto history <coin> [days] [vs]",
    "  Ringkasan riwayat N hari (default 7 hari, idr)",
    "",
    "• /crypto chart <coin> [days] [vs]",
    "  Sama seperti history, fokus ke harga pembuka/penutup/tertinggi/terendah",
    "",
    "• /crypto top [n] [vs]",
    "  Top N koin berdasarkan market cap (default 10, idr)",
    "",
    "• /crypto compare <coin1> <coin2> [vs]",
    "  Bandingkan 2 koin",
    "",
    "• /crypto info <coin>",
    "  Detail lengkap koin",
    "",
    "Contoh: /crypto btc, /crypto price eth usd, /crypto top 15 usd",
  ].join("\n");

  await sock.sendMessage(jid, { text: helpText });
}

async function resolveCoinId(query) {
  // Terima symbol atau nama. Prioritas exact match symbol, lalu id/name.
  const q = String(query).trim().toLowerCase();
  try {
    const { data } = await http.get("/search", { params: { query: q } });
    const coins = data?.coins || [];
    if (!coins.length) return null;

    // exact symbol
    const exactSym = coins.find((c) => (c.symbol || "").toLowerCase() === q);
    if (exactSym) return exactSym.id;

    // exact id or name
    const exactId = coins.find(
      (c) => c.id?.toLowerCase() === q || c.name?.toLowerCase() === q,
    );
    if (exactId) return exactId.id;

    // startswith symbol
    const startSym = coins.find((c) =>
      (c.symbol || "").toLowerCase().startsWith(q),
    );
    if (startSym) return startSym.id;

    // fallback: top result
    return coins[0].id;
  } catch {
    return null;
  }
}

async function marketSingle(id, vs) {
  const arr = await http
    .get("/coins/markets", {
      params: {
        vs_currency: vs,
        ids: id,
        price_change_percentage: "1h,24h,7d",
        sparkline: false,
      },
    })
    .then((r) => r.data || []);
  return arr[0];
}

async function marketChart(id, vs, days) {
  return http
    .get(`/coins/${encodeURIComponent(id)}/market_chart`, {
      params: { vs_currency: vs, days: days, interval: pickInterval(days) },
    })
    .then((r) => r.data || {});
}

async function coinDetail(id) {
  return http
    .get(`/coins/${encodeURIComponent(id)}`, {
      params: {
        localization: "false",
        tickers: "false",
        market_data: "true",
        community_data: "false",
        developer_data: "false",
        sparkline: "false",
      },
    })
    .then((r) => r.data);
}

function pickInterval(days) {
  if (days <= 1) return "hourly";
  if (days <= 7) return "hourly";
  if (days <= 30) return "daily";
  return "daily";
}

function renderMainCard(c, vs) {
  if (!c) return "Data tidak tersedia.";
  const name = `${cap(c.name)} (${String(c.symbol || "").toUpperCase()})`;
  const price = fmtFiat(c.current_price, vs);
  const mc = fmtFiat(c.market_cap, vs);
  const vol = fmtFiat(c.total_volume, vs);
  const ch1h = sign(c.price_change_percentage_1h_in_currency);
  const ch24 = sign(c.price_change_percentage_24h_in_currency);
  const ch7d = sign(c.price_change_percentage_7d_in_currency);

  return [
    `💰 ${name}`,
    `Harga: ${price} (${ch1h}% 1h | ${ch24}% 24h | ${ch7d}% 7d)`,
    `Market Cap: ${mc}`,
    `Volume 24h: ${vol}`,
    `Ranking MC: #${c.market_cap_rank || "-"}`,
  ].join("\n");
}

function renderPriceLine(c, vs) {
  return `💵 ${cap(c.name)} (${String(c.symbol || "").toUpperCase()}) → ${fmtFiat(c.current_price, vs)} (${sign(c.price_change_percentage_24h)}% 24h)`;
}

function renderHistoryCard(c, chart, vs, days) {
  const prices = chart?.prices || [];
  if (!prices.length) return "Riwayat tidak tersedia.";
  const vals = prices.map((p) => Number(p[1]) || 0);
  const open = vals[0],
    close = vals[vals.length - 1];
  const min = Math.min(...vals),
    max = Math.max(...vals);
  const chAbs = close - open;
  const chPct = ((close - open) / open) * 100;

  return [
    `📈 ${cap(c.name)} (${String(c.symbol || "").toUpperCase()}) — ${days} hari (${vs.toUpperCase()})`,
    `Open: ${fmtFiat(open, vs)}`,
    `Close: ${fmtFiat(close, vs)} (${sign(chPct)}%)`,
    `Tertinggi: ${fmtFiat(max, vs)}`,
    `Terendah: ${fmtFiat(min, vs)}`,
  ].join("\n");
}

function renderCompare(a, b, vs) {
  return [
    `⚖️ Perbandingan (${vs.toUpperCase()})`,
    `${cap(a.name)} (${a.symbol.toUpperCase()}) → ${fmtFiat(a.current_price, vs)} (${sign(a.price_change_percentage_24h)}% 24h)`,
    `${cap(b.name)} (${b.symbol.toUpperCase()}) → ${fmtFiat(b.current_price, vs)} (${sign(b.price_change_percentage_24h)}% 24h)`,
    `Cap: ${fmtFiat(a.market_cap, vs)} vs ${fmtFiat(b.market_cap, vs)}`,
  ].join("\n");
}

function renderInfo(d) {
  const name = `${cap(d.name)} (${String(d.symbol || "").toUpperCase()})`;
  const vs = "usd";
  const md = d.market_data || {};
  const price = fmtFiat(md.current_price?.[vs], vs);
  const ath = fmtFiat(md.ath?.[vs], vs);
  const atl = fmtFiat(md.atl?.[vs], vs);
  const supply =
    nf(md.circulating_supply) +
    " / " +
    nf(md.max_supply || md.total_supply || 0);

  return [
    `🪙 ${name}`,
    `Harga (USD): ${price}`,
    `ATH: ${ath}  |  ATL: ${atl}`,
    `Supply: ${supply}`,
    `MC Rank: #${md.market_cap_rank || d.market_cap_rank || "-"}`,
    d.hashing_algorithm ? `Algoritma: ${d.hashing_algorithm}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function pickIcon(c) {
  return c?.image || null; // markets already gives big-ish icon url
}

async function sendImageOrText(sock, jid, url, caption) {
  if (url) {
    try {
      await sock.sendMessage(jid, { image: { url }, caption });
      return;
    } catch {
      // fallback text
    }
  }
  await sock.sendMessage(jid, { text: caption });
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
function toInt(x, d = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
}
function nf(n) {
  const v = Number(n || 0);
  return v.toLocaleString("id-ID");
}
function fmtFiat(n, vs) {
  if (n == null) return "-";
  const v = Number(n);
  const code = vs.toUpperCase();
  const locale = code === "IDR" ? "id-ID" : code === "USD" ? "en-US" : "en-US";
  const currency = [
    "USD",
    "IDR",
    "EUR",
    "JPY",
    "GBP",
    "AUD",
    "CAD",
    "CHF",
    "CNY",
    "SGD",
    "KRW",
    "MYR",
    "THB",
    "PHP",
    "VND",
    "INR",
    "BRL",
    "ZAR",
  ].includes(code)
    ? code
    : undefined;
  if (currency) {
    return v.toLocaleString(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 8,
    });
  }
  // kalau vs bukan fiat (misal btc), tampilkan angka biasa
  return v.toLocaleString("en-US", { maximumFractionDigits: 8 }) + " " + code;
}
function sign(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "0.00";
  const s = n >= 0 ? "+" : "";
  return s + n.toFixed(2);
}

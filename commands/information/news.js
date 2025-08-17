const axios = require("axios");

module.exports = {
  name: "news",
  aliases: ["berita", "kabar", "headline"],
  description:
    "Menampilkan berita dari berbagai portal Indonesia (dengan gambar & dukungan jumlah)",
  usage:
    "/news [sumber] [jumlah]\n/news --list\n\nContoh:\n" +
    "/news              → 1 berita random dari semua portal\n" +
    "/news suara        → 1 berita dari Suara.com\n" +
    "/news tempo 5      → 5 berita dari Tempo.co\n" +
    "/news --list       → lihat semua portal berita yang tersedia\n\n" +
    "*Jumlah maksimal berita adalah 30*",
  category: "general",

  async execute(message, sock, args) {
    try {
      const baseUrl = "https://berita-indo-api-next.vercel.app";

      const newsSources = [
        {
          key: "cnn",
          name: "CNN",
          endpoint: "/api/cnn-news/",
          types: [
            "nasional",
            "internasional",
            "ekonomi",
            "olahraga",
            "teknologi",
            "hiburan",
            "gaya-hidup",
          ],
        },
        {
          key: "cnbc",
          name: "CNBC",
          endpoint: "/api/cnbc-news/",
          types: [
            "market",
            "news",
            "entrepreneur",
            "syariah",
            "tech",
            "lifestyle",
          ],
        },
        {
          key: "republika",
          name: "Republika",
          endpoint: "/api/republika-news/",
          types: [
            "news",
            "nusantara",
            "khazanah",
            "islam-digest",
            "internasional",
            "ekonomi",
            "sepakbola",
            "leisure",
          ],
        },
        {
          key: "tempo",
          name: "Tempo",
          endpoint: "/api/tempo-news/",
          types: [
            "nasional",
            "bisnis",
            "metro",
            "dunia",
            "bola",
            "sport",
            "cantik",
            "tekno",
            "otomotif",
            "nusantara",
          ],
        },
        {
          key: "antara",
          name: "Antara",
          endpoint: "/api/antara-news/",
          types: [
            "terkini",
            "top-news",
            "politik",
            "hukum",
            "ekonomi",
            "metro",
            "sepakbola",
            "olahraga",
            "humaniora",
            "lifestyle",
            "hiburan",
            "dunia",
            "infografik",
            "tekno",
            "otomotif",
            "warta-bumi",
            "rilis-pers",
          ],
        },
        { key: "okezone", name: "Okezone", endpoint: "/api/okezone-news" },
        { key: "bbc", name: "BBC", endpoint: "/api/bbc-news" },
        { key: "kumparan", name: "Kumparan", endpoint: "/api/kumparan-news" },
        { key: "tribun", name: "Tribun", endpoint: "/api/tribun-news" },
        {
          key: "zetizen",
          name: "Zetizen",
          endpoint: "/api/zetizen-jawapos-news",
        },
        { key: "suara", name: "Suara", endpoint: "/api/suara-news" },
        { key: "voa", name: "VOA", endpoint: "/api/voa-news" },
        { key: "vice", name: "Vice", endpoint: "/api/vice-news" },
      ];

      // ---------- Handle /news --list ----------
      if (args[0] === "--list") {
        const listText =
          "📚 *Daftar portal berita yang tersedia:*\n\n" +
          newsSources.map((src) => `• /news ${src.key}`).join("\n") +
          "\n\nContoh: /news tempo 3";

        return await sock.sendMessage(message.key.remoteJid, {
          text: listText,
        });
      }

      const userSource = args[0]?.toLowerCase();
      const userCount = parseInt(args[1]) || 1;

      if (userCount > 10) {
        return await sock.sendMessage(message.key.remoteJid, {
          text: `⚠️ Jumlah berita terlalu banyak (maksimal 10).\nSilakan masukkan angka 10 atau kurang.`,
        });
      }

      const maxCount = userCount;

      // ---------- Pilih sumber berita ----------
      let selectedSource;
      if (userSource) {
        selectedSource = newsSources.find((s) => s.key === userSource);
        if (!selectedSource && !isNaN(userCount)) {
          // Misal: /news 5 (tanpa sumber, hanya jumlah)
          selectedSource =
            newsSources[Math.floor(Math.random() * newsSources.length)];
        } else if (!selectedSource) {
          return await sock.sendMessage(message.key.remoteJid, {
            text: `❌ Sumber "${userSource}" tidak ditemukan.\nGunakan: /news --list`,
          });
        }
      } else {
        selectedSource =
          newsSources[Math.floor(Math.random() * newsSources.length)];
      }

      // ---------- Buat URL endpoint ----------
      let finalUrl = `${baseUrl}${selectedSource.endpoint}`;
      if (selectedSource.types && selectedSource.types.length > 0) {
        const randomType =
          selectedSource.types[
            Math.floor(Math.random() * selectedSource.types.length)
          ];
        finalUrl += randomType;
      }

      const { data } = await axios.get(finalUrl);
      if (!data || !Array.isArray(data.data) || data.data.length === 0) {
        return await sock.sendMessage(message.key.remoteJid, {
          text: `❌ Gagal ambil berita dari ${selectedSource.name}`,
        });
      }

      // ---------- Pilih & kirim berita ----------
      const beritaList = [...data.data]
        .sort(() => 0.5 - Math.random())
        .slice(0, maxCount);

      for (const berita of beritaList) {
        let imageUrl = null;
        if (berita.image) {
          if (typeof berita.image === "object") {
            imageUrl = berita.image.large || berita.image.small || null;
          } else if (typeof berita.image === "string") {
            imageUrl = berita.image;
          }
        }

        if (!imageUrl && typeof berita.thumbnail === "string") {
          imageUrl = berita.thumbnail;
        }

        if (typeof imageUrl !== "string" || !/^https?:\/\//i.test(imageUrl)) {
          imageUrl = null;
        }

        const caption =
          `📰 *${berita.title || "Tanpa Judul"}*\n` +
          `🗞️ Sumber: ${selectedSource.name}\n` +
          (berita.isoDate
            ? `🗓️ ${new Date(berita.isoDate).toLocaleString("id-ID")}\n`
            : "") +
          (berita.contentSnippet ? `\n📌 ${berita.contentSnippet}\n` : "") +
          `\n🔗 ${berita.link || berita.url || "[link tidak tersedia]"}`;

        if (imageUrl) {
          await sock.sendMessage(message.key.remoteJid, {
            image: { url: imageUrl },
            caption: caption,
          });
        } else {
          await sock.sendMessage(message.key.remoteJid, {
            text: caption,
          });
        }

        // Optional: kasih jeda antar berita kalau mau
        await new Promise((res) => setTimeout(res, 500)); // 0.5 detik jeda
      }
    } catch (error) {
      console.error("🔥 ERROR news command:", error);
      await sock.sendMessage(message.key.remoteJid, {
        text: "❌ Terjadi error saat mengambil berita. Coba lagi nanti!",
      });
    }
  },
};


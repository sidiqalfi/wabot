// pokemon.js
// Command: /pokemon
// Fitur: random | by name | by number (dengan gambar + detail gaya "card")
// Dependencies: axios

const axios = require('axios');

const http = axios.create({
  baseURL: 'https://pokeapi.co/api/v2',
  timeout: 15000,
  validateStatus: s => s >= 200 && s < 300
});

// Update jika Dex nambah
const MAX_POKEMON_ID = 1025;

// Emoji untuk tipe
const TYPE_EMOJI = {
  bug: '🐛', dark: '🌑', dragon: '🐉', electric: '⚡',
  fairy: '🧚', fighting: '🥊', fire: '🔥', flying: '🕊️',
  ghost: '👻', grass: '🍃', ground: '🏜️', ice: '❄️',
  normal: '⚪', poison: '☠️', psychic: '🔮', rock: '🪨',
  steel: '⚙️', water: '💧'
};

module.exports = {
  name: 'pokemon',
  aliases: ['poke', 'pkm', 'pokedex'],
  description: 'Tampilkan Pokémon acak, berdasarkan nama, atau nomor (dengan gambar).',
  usage: 'pokemon | pokemon <nama> | pokemon <nomor>',
  category: 'fun',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;

    try {
      const query = (args || []).join(' ').trim();
      let idOrName;

      if (!query || /^random$/i.test(query)) {
        idOrName = randomId();
      } else if (/^\d+$/.test(query)) {
        const n = Number(query);
        if (n < 1 || n > MAX_POKEMON_ID) {
          await sock.sendMessage(jid, { text: `⚠️ Nomor harus 1 sampai ${MAX_POKEMON_ID}.` });
          return;
        }
        idOrName = n;
      } else {
        idOrName = query.toLowerCase();
      }

      const { pokemon } = await fetchPokemon(idOrName);

      const caption = buildCardCaption(pokemon);
      const imageUrl = pickImageUrl(pokemon);

      if (imageUrl) {
        await sock.sendMessage(jid, {
          image: { url: imageUrl },
          caption
        });
      } else {
        await sock.sendMessage(jid, { text: caption });
      }
    } catch (err) {
      console.error('[pokemon] error:', err?.message || err);
      await sock.sendMessage(jid, { text: '❌ Gagal mengambil data Pokémon. Coba lagi sebentar.' });
    }
  }
};

// ---------------- helpers ----------------

function randomId() {
  return Math.floor(Math.random() * MAX_POKEMON_ID) + 1;
}

async function fetchPokemon(idOrName) {
  const { data: pokemon } = await http.get(`/pokemon/${encodeURIComponent(idOrName)}`);
  return { pokemon };
}

function pickImageUrl(pokemon) {
  return (
    pokemon?.sprites?.other?.['official-artwork']?.front_default ||
    pokemon?.sprites?.other?.['official-artwork']?.front_shiny ||
    pokemon?.sprites?.front_default ||
    null
  );
}

function buildCardCaption(p) {
  const id = p.id;
  const name = capitalize(p.name);

  const types = (p.types || []).map(t => t.type?.name || '');
  const typeStr = types
    .map(t => `${TYPE_EMOJI[t] || '❔'} ${capitalize(t)}`)
    .join(' & ');

  const heightM = (p.height ?? 0) / 10; // dm -> m
  const weightKg = (p.weight ?? 0) / 10; // hg -> kg

  const abilities = (p.abilities || [])
    .map(a => `${formatAbility(a.ability?.name)}${a.is_hidden ? ' (Hidden)' : ''}`)
    .join(' & ') || '-';

  // Base stats
  const statsOrder = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
  const statsMap = Object.fromEntries((p.stats || []).map(s => [s.stat?.name, s.base_stat]));
  const lines = statsOrder.map(k => {
    const label = statShort(k);
    const val = statsMap[k] ?? 0;
    return `${label}  ${val}  ${renderBar(val)}`;
  });

  return [
    `#${id} — ${name}`,
    `${typeStr || '-'}`,
    `Ht/Wt: ${heightM.toFixed(1)} m / ${weightKg.toFixed(1)} kg`,
    `Abilities: ${abilities}`,
    ``,
    `Base Stats:`,
    ...lines
  ].join('\n');
}

function renderBar(value) {
  // Skala bar 20 blok, nilai base stat biasanya 1..255
  const BAR_W = 20;
  const clamp = Math.max(0, Math.min(255, Number(value) || 0));
  const filled = Math.round((clamp / 255) * BAR_W);
  const empty = BAR_W - filled;
  // Gunakan blok penuh & titik untuk kontras yang enak di WhatsApp
  return '▉'.repeat(filled) + '░'.repeat(empty);
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatAbility(name) {
  if (!name) return '';
  return name.split('-').map(capitalize).join(' ');
}

function statShort(k) {
  switch (k) {
    case 'hp': return 'HP ';
    case 'attack': return 'ATK';
    case 'defense': return 'DEF';
    case 'special-attack': return 'SPA';
    case 'special-defense': return 'SPD';
    case 'speed': return 'SPE';
    default: return capitalize(k);
  }
}

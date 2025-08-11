// roast.js
// Command: /roast
// Ngasih roast pedes tapi fun. Siapkan mental.

module.exports = {
  name: 'roast',
  aliases: ['panggang', 'bakar', 'roasting', 'celup', 'gasroast', 'satein'],
  description: 'Ngasih roast pedes ke target 🔥',
  usage: 'roast [@user] | reply pesan',
  category: 'fun',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;
    try {
      const isGroup = jid.endsWith('@g.us');
      const sender = message.key.participant || message.key.remoteJid;
      const ctx = message.message?.extendedTextMessage?.contextInfo;
      const mentioned = ctx?.mentionedJid || [];
      const quotedSender = ctx?.participant;

      const at = j => '@' + (j.split('@')[0].replace(/[^0-9]/g, '') || 'user');

      let target;
      if (mentioned.length > 0) {
        target = mentioned[0];
      } else if (quotedSender) {
        target = quotedSender;
      } else {
        target = sender;
      }

      const roasts = [
        'IQ kamu kayak server gratisan: sering down pas dibutuhin 🧠💤',
        'Energi kamu lowbat sejak lahir, charger-nya mana? 🪫',
        'Kepribadian kamu kayak jelly, goyang dikit langsung berubah 🫠',
        'Grafik hidup kamu downtrend sejak introduksi karakter 📉',
        'Kalo jadi fitur, kamu tuh “skip intro” yang gak bisa di-skip 🥴',
        'Isi otaknya rasa angin semriwing, seger tapi kosong 🧃',
        'Argumen kamu lembeknya premium, sekali tekan langsung sobek 🧻',
        'Kalau jadi filter, kamu “no effect” tapi tetap ganggu layar 🫥',
        'Kamu kayak alarm palsu: berisik tanpa solusi 🧯',
        'Kecepatan mikir kamu kalah sama loading bar palsu 🐌',
        'Ingatan kamu 3 detik, Dory aja nyerah 🐟',
        'Kalo bercermin, kaca minta maaf duluan 🪞',
        'Kamu puzzle 1000 keping, tapi isinya putih semua 🧩',
        'Kayu bakar aja ada gunanya, kamu cuma kebagian asap 🪵',
        'Kehadiranmu dingin, tapi bukan cool. AC bocor vibes 🧊',
        'Empty box vibes. Packaging heboh, isinya angin 📦',
        'Keasinan pas nyolot, tapi hambar pas disuruh kerja 🧂',
        'Telat mikir 3 hari, update otaknya manual ya? ⏰',
        'Kamu ringan banget, sampai ide pun enggan nempel 🎈',
        'Dua sisi kamu sama-sama zonk 🪙',
        'Kamu bikin ngantuk bahkan pas bikin masalah 🥱',
        'Kalau jadi dinding, catnya retak dari pabrik 🧱',
        'Banyak gaya, ternyata cuma mie instan tanpa bumbu 🍜',
        'Bawa drama ke mana-mana, isinya tetep kosong 🧳',
        'Eksperimen gagal yang dipublish tanpa peer review 🧪',
        'Kalo lempar koin buat ambil keputusan, koinnya balik minta diskon 🪙',
        'Kamu lubang hitam versi mini: nyedot mood tanpa kontribusi 🕳️',
        'Konten tipis, tulang pun kurang kalsium 🦴',
        'Kompas kebalik, selalu milih arah yang salah 🧭',
        'Target kamu selalu meleset, padahal jaraknya sedekat notif 🎯',
        'Vision-mu kabur padahal sudah mode high contrast 🥽',
        'Produktivitas sloth, attitude karbit 🦥',
        'Kamu batu, tapi bukan kuat. Cuma ngehalangin 🧱',
        'Sinyal hati-hati kamu hilang sejak jamet o’clock 📵',
        'Satu slice otakmu topping-nya “maintenance ongoing” 🍕',
        'Low effort high noise. Kombinasi favorit para penonton sepi 🪫',
        'Kamu sedotan bengkok: aliran ide gak pernah sampai 🧃',
        'Sok jadi pemadam, padahal sumber api-nya kamu 🧯',
        'Elevator sosialmu macet di basement 🛗',
        'Icebreaker kamu itu: “dingin tanpa isi” 🧊',
        'Komunikasi kamu kayak fax: nyampe tapi burem 📠',
        'Benang logika kamu putus di kalimat pertama 🧵',
        'Kehadiranmu kaya debu: muncul di tempat gak penting 🧹',
        'Karisma layu sebelum berkembang 🥀',
        'Naik daun pakai tangga tetangga, jatuhnya tetap dramatis 🪜',
        'Magnet masalah, anti-solusi 🧲',
        'Panas dikit meleleh, dingin dikit ngambek. Termostat error 🧯',
        'Kamu klip kertas ketumpahan kopi: bengkok, lengket, tak berguna 📎',
        'RAM 2GB, Chrome 47 tab. Pantes nge-lag 🧠',
        'Nyari peran? Kamu potongan yang bukan dari puzzle ini 🧩',
        'Datengnya banyak gaya, pulangnya jadi sampah taman 🍂',
        'Ide kamu tidur siang jam kerja 💤',
        'Refleksi diri nol, refleksi lampu iya 🪞',
        'Kalau ada masalah, kamu nyiramnya pakai bensin 🧯',
        'Kalo dibuka, isinya “coming soon” sejak 2016 🧃',
        'Produktif pas tengah malam, hasilnya tetap zombie quality 🧟‍♂️',
        'Identitasmu “try again later” 🪪',
        'Thread hidup kamu cuma balasan “up” 🧵',
        'Kamu retro, tapi bukan estetik. Cuma usang 📼',
        'Selalu nempel di drama orang, jarang nempel di kerjaan 📎',
        'Cold response, warm excuses 🧊',
        'Growth-mu negatif, tapi semangat ngegas positif 📉',
        'Fakta dan opini kamu ketuker terus 🥽',
        'Chemistry-mu sama tanggung jawab: reaksi endothermic, dingin semua 🧪',
        'Arah hidupmu “recalculating…” tanpa tujuan 🧭',
        'Sensitif pas salah, tebal muka pas ngerecokin 🧻',
        'Heads: salah, tails: lebih salah 🪙',
        'Volume bacot full, kualitas ide mute 🎛️',
        'Kerja tim? Kamu bagian percikan api di drum bensin 🧯',
        'Notulen drama, bukan solusi 📎',
        'Panas di mulut, beku di hasil 🔥',
        'Motivasi rechargeable-nya hilang, colokannya beda negara 🪫',
        'Kamu brainstorming sendirian, badai debu hasilnya 🧠',
        'Ngasih saran setebal tembok, isinya sarang rayap 🧱',
        'Cool-coolan, padahal es batu kulkas tetangga 🧊',
        'Topengmu HD, performa SD 🎭',
        'Work in progress sejak kapan, kapan selesai gak jelas 🚧',
        'Kamu recycle masalah lama dengan kemasan baru 🗑️',
        'Sok padamkan api, padahal koreknya di kantong 🧯',
        'Formula favoritmu: drama² + effort⁻¹ = hasil 0 🧪',
        'Mode pesawat saat rapat, mode roket saat gosip 📵',
        'Nempel di momen penting cuma buat merusak foto 🧷',
        'Beku kalau diminta tolong, cair kalau diminta bikin ribut 🧊',
        'Gliter doang, lampunya mati 🪩',
        'KPI kamu turun, tapi ego naik. Grafik silang 📉',
        'Bersih dari prestasi, licin dari tanggung jawab 🧼',
        'Kamu gacha jelek yang diulang tiap hari 🪙',
        'Kalau jadi SOP, kamu bab “kesalahan umum” 🧯',
        'Ide orisinilmu kayak komet: muncul 76 tahun sekali 🧠',
        'Sapu baru, tapi nyapu ke bawah karpet 🧹',
        'Puncak es dari gunung masalah yang kamu buat sendiri 🧊',
        'Unboxing kamu bikin kecewa sejak intro 📦',
        'Kamu narik kritik tapi nol refleksi 🧲',
        'Semangatmu ngetik “nnti” pake vokal irit 🪫',
        'Multitasking: salah semua secara bersamaan 🧠',
        'Slogan: “Trust me bro”, lampiran: none 🧯',
        'Keras kepala premium, logika trial versi 3 hari 🗿',
        'Kamu benang merah masalah yang gak diminta 🧵'
      ];

      const roast = roasts[Math.floor(Math.random() * roasts.length)];

      let caption;
      let mentions = [];

      if (isGroup) {
        caption = `🔥 *Roast Time!*\n${at(target)}, ${roast}`;
        mentions = [target];
      } else {
        caption = `🔥 *Roast Time!*\n${roast}`;
      }

      await sock.sendMessage(jid, { text: caption, mentions });

    } catch (err) {
      console.error(`Error in ${this.name} command:`, err);
      await sock.sendMessage(jid, {
        text: '❌ Gagal roasting. Coba lagi nanti.'
      });
    }
  }
};

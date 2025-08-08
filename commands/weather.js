require('dotenv').config();
const axios = require('axios');

module.exports = {
    name: 'weather',
    description: 'Cek cuaca detail berdasarkan kota',
    usage: 'weather [nama kota]',
    category: 'utility',

    async execute(message, sock, args) {
        try {
            if (args.length === 0) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Kamu harus mengetik nama kota!\n\nContoh: !weather Surabaya'
                });
                return;
            }

            const cityQuery = args.join(' ');
            const apiKey = process.env.OPENWEATHER_API_KEY;

            // Step 1: Ambil koordinat lokasi (geocoding)
            const geoRes = await axios.get(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityQuery)}&limit=1&appid=${apiKey}`);
            const geoData = geoRes.data[0];

            if (!geoData) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ Kota tidak ditemukan. Coba cek penulisan nama kota.'
                });
                return;
            }

            const { lat, lon, name: cityName, country, state } = geoData;

            // Step 2: Ambil data cuaca by koordinat
            const weatherRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=id`);
            const data = weatherRes.data;

            const weather = data.weather[0];
            const temp = data.main;
            const wind = data.wind;
            const sys = data.sys;

            const sunrise = new Date(sys.sunrise * 1000).toLocaleTimeString('id-ID');
            const sunset = new Date(sys.sunset * 1000).toLocaleTimeString('id-ID');

            const icon = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;

            const result = `🌤️ *Cuaca di ${cityName}, ${state ? state + ', ' : ''}${country}*\n\n` +
                `📍 Koordinat: [${lat.toFixed(2)}, ${lon.toFixed(2)}]\n` +
                `📝 Kondisi: ${weather.description}\n` +
                `🌡️ Suhu: ${temp.temp}°C (min: ${temp.temp_min}°C / max: ${temp.temp_max}°C)\n` +
                `🤗 Terasa seperti: ${temp.feels_like}°C\n` +
                `💧 Kelembaban: ${temp.humidity}%\n` +
                `🔽 Tekanan udara: ${temp.pressure} hPa\n` +
                `🌬️ Angin: ${wind.speed} m/s\n` +
                `👀 Visibilitas: ${(data.visibility / 1000).toFixed(1)} km\n` +
                `🌅 Matahari terbit: ${sunrise}\n` +
                `🌇 Matahari terbenam: ${sunset}`;

            await sock.sendMessage(message.key.remoteJid, {
                text: result,
                jpegThumbnail: await getWeatherIconAsThumb(icon) // 👇 Lihat helper-nya di bawah
            });

        } catch (error) {
            console.error('Weather Command Error:', error);
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Gagal mengambil data cuaca. Coba lagi nanti.'
            });
        }
    }
};

// Helper: Fetch icon PNG dan ubah ke thumbnail (buffer base64)
async function getWeatherIconAsThumb(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data, 'binary');
    } catch {
        return null;
    }
}

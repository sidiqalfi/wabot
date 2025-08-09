const puppeteer = require('puppeteer');

module.exports = {
  name: 'ssweb',
  description: 'Screenshot web: 1 layar (viewport) atau full halaman',
  usage: 'ssweb <url> [--full] [--w=1280] [--h=720] [--delay=2000] [--mobile]',
  category: 'utility',

  async execute(message, sock, args) {
    const jid = message.key.remoteJid;

    try {
      // Ambil url dari argumen atau reply
      const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const quotedText =
        quoted?.conversation ||
        quoted?.extendedTextMessage?.text ||
        quoted?.imageMessage?.caption ||
        quoted?.videoMessage?.caption || '';

      // Gabung args jadi string utuh biar gampang parsing
      const raw = (args.join(' ') || '').trim();
      let input = raw || quotedText.trim();

      if (!input) {
        await sock.sendMessage(jid, {
          text: '❌ Kasih URL ya.\nContoh:\n!ssweb https://example.com\n!ssweb https://example.com --full --w=1440 --delay=1500'
        });
        return;
      }

      // Parse flags sederhana
      const flags = {
        full: /--full\b/i.test(input),
        mobile: /--mobile\b/i.test(input),
        w: parseInt((input.match(/--w=(\d{3,5})/i) || [])[1] || '1280', 10),
        h: parseInt((input.match(/--h=(\d{3,5})/i) || [])[1] || '720', 10),
        delay: parseInt((input.match(/--delay=(\d{2,6})/i) || [])[1] || '0', 10),
      };

      // Bersihin flag dari string untuk ambil url bersih
      input = input
        .replace(/--full/gi, '')
        .replace(/--mobile/gi, '')
        .replace(/--w=\d{3,5}/gi, '')
        .replace(/--h=\d{3,5}/gi, '')
        .replace(/--delay=\d{2,6}/gi, '')
        .trim();

      let url = input.split(/\s+/)[0];

      // Auto prepend protocol kalau user lupa
      if (!/^https?:\/\//i.test(url)) url = 'http://' + url;

      // Validasi URL
      try { new URL(url); } catch {
        await sock.sendMessage(jid, { text: '❌ URL tidak valid.' });
        return;
      }

      // Batasan viewport biar gak nyeleneh
      flags.w = Math.min(Math.max(flags.w, 320), 2560);
      flags.h = Math.min(Math.max(flags.h, 320), 3000);
      flags.delay = Math.min(Math.max(flags.delay, 0), 30000);

      await sock.sendMessage(jid, {
        text: `🖼️ *Rendering halaman...*\nMode: ${flags.full ? 'Full Page' : 'Viewport'}${flags.mobile ? ' (Mobile)' : ''}\nViewport: ${flags.w}x${flags.h}\nURL: ${url}`
      });

      // Launch Puppeteer (siap untuk VPS/Docker)
      const browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--single-process'
        ]
      });
      const page = await browser.newPage();

      // Set user agent & viewport
      if (flags.mobile) {
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36');
        await page.setViewport({ width: Math.min(flags.w, 1080), height: flags.h, isMobile: true, deviceScaleFactor: 2 });
      } else {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36');
        await page.setViewport({ width: flags.w, height: flags.h, deviceScaleFactor: 1 });
      }

      // Timeout & load strategy
      page.setDefaultNavigationTimeout(45000);
      await page.goto(url, { waitUntil: 'networkidle2' });

      if (flags.delay) await page.waitForTimeout(flags.delay);

      // Screenshot ke buffer
      const buffer = await page.screenshot({
        fullPage: !!flags.full,
        type: 'png'
      });

      await browser.close();

      const caption =
        `✅ *Screenshot Berhasil*\n` +
        `🌐 URL: ${url}\n` +
        `🧭 Mode: ${flags.full ? 'Full Page' : 'Viewport'}${flags.mobile ? ' (Mobile)' : ''}\n` +
        `📐 Viewport: ${flags.w}x${flags.h}` + (flags.delay ? `\n⏱️ Delay: ${flags.delay}ms` : '');

      await sock.sendMessage(jid, {
        image: buffer,
        caption
      });

    } catch (err) {
      console.error(`Error in ${this.name} command:`, err);
      await sock.sendMessage(jid, {
        text: '❌ Gagal mengambil screenshot. Pastikan URL bisa diakses dan server punya resource cukup.'
      });
    }
  }
};

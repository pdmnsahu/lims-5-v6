import https from 'https';
import http  from 'http';
import { buildReportHTML } from './reportTemplate.js';

let browserInstance  = null;
let browserLaunching = false;
let launchQueue      = [];

// ── Cloudinary URL transformation ──────────────────────────────────────────────
// Ask Cloudinary to serve a pre-resized, compressed version — less data to fetch
function cloudinaryResize(url, width = 900, quality = 75) {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/w_${width},q_${quality},f_jpg/`);
}

// ── Fetch image bytes, follow one redirect ─────────────────────────────────────
async function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 12000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ── Convert URL → base64 data URI ─────────────────────────────────────────────
// isParr=true applies grayscale + PNG compression (calorimeter is always B&W text)
async function toDataURI(url, isParr = false) {
  if (!url) return '';
  try {
    // For Parr image: ask Cloudinary to pre-resize before we even download it
    const fetchUrl = isParr ? cloudinaryResize(url, 900, 75) : url;
    let buf = await fetchBuffer(fetchUrl);

    if (isParr) {
      try {
        const sharp = (await import('sharp')).default;
        // Grayscale: calorimeter printout is B&W — eliminates colour data
        // PNG: beats JPEG for text-on-white; Chrome renders it faster in PDFs
        buf = await sharp(buf)
          .resize(900, null, { withoutEnlargement: true })
          .grayscale()
          .png({ compressionLevel: 9 })
          .toBuffer();
        return `data:image/png;base64,${buf.toString('base64')}`;
      } catch {
        // sharp not installed — fall through to raw JPEG
      }
    }

    const mime = url.match(/\.png(\?|$)/i)  ? 'image/png'
               : url.match(/\.gif(\?|$)/i)  ? 'image/gif'
               : url.match(/\.webp(\?|$)/i) ? 'image/webp'
               : 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (err) {
    console.warn(`[pdf] Could not inline ${url}: ${err.message}`);
    return '';
  }
}

// ── Fetch all report images in parallel ────────────────────────────────────────
async function inlineImages({ tests, settings }) {
  const gcvTest = tests.find(t => t.test_name === 'Gross Calorific Value');

  const [logo, acc, stamp, sig, parr] = await Promise.all([
    toDataURI(settings.logo_url          || '',  false),
    toDataURI(settings.accreditation_url || '',  false),
    toDataURI(settings.stamp_url         || '',  false),
    toDataURI(settings.signature_url     || '',  false),
    toDataURI(gcvTest?.image_url         || '',  true),  // ← grayscale + PNG
  ]);

  return {
    inlinedSettings: {
      ...settings,
      logo_url:          logo,
      accreditation_url: acc,
      stamp_url:         stamp,
      signature_url:     sig,
    },
    inlinedTests: tests.map(t =>
      t.test_name === 'Gross Calorific Value' ? { ...t, image_url: parr } : t
    ),
  };
}

// ── Browser singleton with warm-up ─────────────────────────────────────────────
async function getBrowser() {
  if (browserInstance) {
    try { await browserInstance.version(); return browserInstance; }
    catch { browserInstance = null; }
  }

  if (browserLaunching) {
    return new Promise((resolve, reject) => launchQueue.push({ resolve, reject }));
  }
  browserLaunching = true;

  try {
    let puppeteer;
    try {
      const chromium  = await import('@sparticuz/chromium');
      puppeteer       = (await import('puppeteer-core')).default;
      const execPath  = await chromium.default.executablePath();
      browserInstance = await puppeteer.launch({
        args:            [...chromium.default.args, '--disable-web-security'],
        defaultViewport: chromium.default.defaultViewport,
        executablePath:  execPath,
        headless:        chromium.default.headless,
      });
    } catch {
      puppeteer       = (await import('puppeteer')).default;
      browserInstance = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      });
    }
    launchQueue.forEach(({ resolve }) => resolve(browserInstance));
    return browserInstance;
  } catch (err) {
    launchQueue.forEach(({ reject }) => reject(err));
    throw err;
  } finally {
    browserLaunching = false;
    launchQueue = [];
  }
}

export async function warmUpBrowser() {
  try {
    console.log('[pdf] Warming up Chromium...');
    await getBrowser();
    console.log('[pdf] Chromium ready');
  } catch (err) {
    console.warn('[pdf] Warm-up failed:', err.message);
  }
}

export async function generateReportPDF({ sample, tests, settings }) {
  const { inlinedSettings, inlinedTests } = await inlineImages({ tests, settings });
  const html = buildReportHTML({ sample, tests: inlinedTests, settings: inlinedSettings });

  const browser = await getBrowser();
  const page    = await browser.newPage();
  try {
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
    return await page.pdf({
      format:            'A4',
      printBackground:   true,
      margin:            { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });
  } finally {
    await page.close();
  }
}
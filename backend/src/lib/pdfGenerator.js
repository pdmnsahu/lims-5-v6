// pdfGenerator.js

import https from 'https';
import http  from 'http';
import { buildReportHTML } from './reportTemplate.js';

let browserInstance  = null;
let browserLaunching = false;
let launchQueue      = [];

// ── Cloudinary on-the-fly resize ──────────────────────────────────────────────
// f_auto  → Cloudinary picks the best format (keeps PNG as PNG, JPEG as JPEG)
// c_limit → only downscales, never upscales
function cloudinaryResized(url, width, quality) {
  if (!url) return '';
  if (!url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/w_${width},q_${quality},f_auto,c_limit/`);
}

// ── Fetch with redirect support ────────────────────────────────────────────────
async function fetchBuffer(url, redirects = 3) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 12000 }, (res) => {
      if ([301,302,307,308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        return fetchBuffer(res.headers.location, redirects - 1).then(resolve).catch(reject);
      }
      // Read content-type from actual response headers — not the URL
      const contentType = res.headers['content-type'] || 'image/jpeg';
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve({ buf: Buffer.concat(chunks), contentType }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Image fetch timeout')); });
  });
}

// ── URL → base64 data URI ─────────────────────────────────────────────────────
// MIME type is read from the actual HTTP response Content-Type header,
// not guessed from the URL extension — works correctly for all formats.
async function toDataURI(url) {
  if (!url) return '';
  try {
    const { buf, contentType } = await fetchBuffer(url);
    // Strip charset or extra params e.g. "image/png; charset=utf-8" → "image/png"
    const mime = contentType.split(';')[0].trim() || 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (err) {
    console.warn(`[pdf] Could not inline image: ${err.message}`);
    return '';
  }
}

// ── Inline all report images in parallel ──────────────────────────────────────
async function inlineImages({ tests, settings }) {
  const gcvTest = tests.find(t => t.test_name === 'Gross Calorific Value');

  const [logo, acc, stamp, sig, parr] = await Promise.all([
    toDataURI(cloudinaryResized(settings.logo_url,          300, 85)), // logo — keep crisp
    toDataURI(cloudinaryResized(settings.accreditation_url, 300, 85)), // badge — keep crisp
    toDataURI(cloudinaryResized(settings.stamp_url,         300, 85)), // stamp — keep crisp
    toDataURI(cloudinaryResized(settings.signature_url,     400, 85)), // sig — slightly wider
    toDataURI(cloudinaryResized(gcvTest?.image_url,         800, 85)), // Parr — compress most
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

// ── Browser singleton with warm-up ────────────────────────────────────────────
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
    console.warn('[pdf] Chromium warm-up failed:', err.message);
  }
}

export async function generateReportPDF({ sample, tests, settings }) {
  const { inlinedSettings, inlinedTests } = await inlineImages({ tests, settings });
  const html    = buildReportHTML({ sample, tests: inlinedTests, settings: inlinedSettings });
  const browser = await getBrowser();
  const page    = await browser.newPage();
  try {
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const pdf = await page.pdf({
      format:            'A4',
      printBackground:   true,
      margin:            { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });
    return pdf;
  } finally {
    await page.close();
  }
}
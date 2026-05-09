// pdfGenerator.js
// Fixes:
//   1. Slow generation — browser warms up at server start, reused across requests
//   2. Lagging PDF in Chrome — Parr image resized to max 800px wide before embedding
//   3. Timeout — all images fetched server-side as base64, zero Puppeteer network requests

import https from 'https';
import http  from 'http';
import { buildReportHTML } from './reportTemplate.js';

let browserInstance  = null;
let browserLaunching = false;
let launchQueue      = [];

// ── Image fetch ────────────────────────────────────────────────────────────────
async function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 12000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow one redirect
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Image fetch timeout')); });
  });
}

// Convert URL to base64 data URI, with optional JPEG recompression for large images
async function toDataURI(url, maxWidth = 0) {
  if (!url) return '';
  try {
    let buf = await fetchBuffer(url);

    // Resize large images using sharp (if installed) to keep PDF small and fast
    // Parr image: maxWidth=800, logos: no resize needed
    if (maxWidth > 0) {
      try {
        const sharp = (await import('sharp')).default;
        const meta  = await sharp(buf).metadata();
        if (meta.width > maxWidth) {
          buf = await sharp(buf)
            .resize(maxWidth, null, { withoutEnlargement: true })
            .jpeg({ quality: 85, mozjpeg: true })
            .toBuffer();
        }
      } catch {
        // sharp not installed — use original buffer
      }
    }

    const mime = url.match(/\.png(\?|$)/i) ? 'image/png'
               : url.match(/\.gif(\?|$)/i) ? 'image/gif'
               : url.match(/\.webp(\?|$)/i)? 'image/webp'
               : 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (err) {
    console.warn(`[pdf] Could not inline ${url}: ${err.message}`);
    return '';
  }
}

// Fetch all report images in parallel
async function inlineImages({ tests, settings }) {
  const gcvTest = tests.find(t => t.test_name === 'Gross Calorific Value');

  const [logo, acc, stamp, sig, parr] = await Promise.all([
    toDataURI(settings.logo_url          || ''),        // no resize — small logo
    toDataURI(settings.accreditation_url || ''),        // no resize — small badge
    toDataURI(settings.stamp_url         || ''),        // no resize — small stamp
    toDataURI(settings.signature_url     || ''),        // no resize — small sig
    toDataURI(gcvTest?.image_url         || '', 900),   // resize to max 900px — fixes lag
  ]);

  return {
    inlinedSettings: { ...settings, logo_url: logo, accreditation_url: acc, stamp_url: stamp, signature_url: sig },
    inlinedTests:    tests.map(t => t.test_name === 'Gross Calorific Value' ? { ...t, image_url: parr } : t),
  };
}

// ── Browser singleton ──────────────────────────────────────────────────────────
async function getBrowser() {
  // Return existing healthy instance
  if (browserInstance) {
    try { await browserInstance.version(); return browserInstance; }
    catch { browserInstance = null; }
  }

  // Queue concurrent launch requests
  if (browserLaunching) {
    return new Promise((resolve, reject) => launchQueue.push({ resolve, reject }));
  }
  browserLaunching = true;

  try {
    let puppeteer;
    try {
      // Production (Render): puppeteer-core + @sparticuz/chromium
      const chromium   = await import('@sparticuz/chromium');
      puppeteer        = (await import('puppeteer-core')).default;
      const execPath   = await chromium.default.executablePath();
      browserInstance  = await puppeteer.launch({
        args:            [...chromium.default.args, '--disable-web-security'],
        defaultViewport: chromium.default.defaultViewport,
        executablePath:  execPath,
        headless:        chromium.default.headless,
      });
    } catch {
      // Local dev: full puppeteer
      puppeteer       = (await import('puppeteer')).default;
      browserInstance = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      });
    }

    // Drain queue
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

// ── Warm up — call this at server start ───────────────────────────────────────
export async function warmUpBrowser() {
  try {
    console.log('[pdf] Warming up Chromium...');
    await getBrowser();
    console.log('[pdf] Chromium ready');
  } catch (err) {
    console.warn('[pdf] Chromium warm-up failed (PDF generation will be slower):', err.message);
  }
}

// ── Main export ────────────────────────────────────────────────────────────────
export async function generateReportPDF({ sample, tests, settings }) {
  const { inlinedSettings, inlinedTests } = await inlineImages({ tests, settings });
  const html = buildReportHTML({ sample, tests: inlinedTests, settings: inlinedSettings });

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
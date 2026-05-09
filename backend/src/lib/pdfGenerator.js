// pdfGenerator.js
// All images are fetched server-side and inlined as base64 — zero network
// requests from Puppeteer, eliminating the networkidle0 timeout entirely.

import https from 'https';
import http  from 'http';
import { buildReportHTML } from './reportTemplate.js';

let browserInstance = null;

// Fetch a URL and return a base64 data URI
async function toBase64DataURI(url) {
  if (!url) return '';
  try {
    const buf = await new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, { timeout: 10000 }, (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end',  () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    });
    const mime = url.match(/\.png$/i) ? 'image/png'
               : url.match(/\.gif$/i) ? 'image/gif'
               : 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (err) {
    console.warn(`[pdf] Could not inline image ${url}: ${err.message}`);
    return '';
  }
}

// Fetch all images in parallel and replace URLs with base64 data URIs
async function inlineImages({ tests, settings }) {
  const gcvTest = tests.find(t => t.test_name === 'Gross Calorific Value');

  const [logo, acc, stamp, sig, parr] = await Promise.all([
    toBase64DataURI(settings.logo_url          || ''),
    toBase64DataURI(settings.accreditation_url || ''),
    toBase64DataURI(settings.stamp_url         || ''),
    toBase64DataURI(settings.signature_url     || ''),
    toBase64DataURI(gcvTest?.image_url         || ''),
  ]);

  const inlinedSettings = {
    ...settings,
    logo_url:          logo,
    accreditation_url: acc,
    stamp_url:         stamp,
    signature_url:     sig,
  };

  const inlinedTests = tests.map(t =>
    t.test_name === 'Gross Calorific Value' ? { ...t, image_url: parr } : t
  );

  return { inlinedSettings, inlinedTests };
}

async function getBrowser() {
  if (browserInstance) {
    try { await browserInstance.version(); return browserInstance; }
    catch { browserInstance = null; }
  }

  let puppeteer;
  try {
    // Production: puppeteer-core + @sparticuz/chromium
    const chromium = await import('@sparticuz/chromium');
    puppeteer = (await import('puppeteer-core')).default;
    const executablePath = await chromium.default.executablePath();
    browserInstance = await puppeteer.launch({
      args:            chromium.default.args,
      defaultViewport: chromium.default.defaultViewport,
      executablePath,
      headless:        chromium.default.headless,
    });
  } catch {
    // Local dev: full puppeteer
    try {
      puppeteer = (await import('puppeteer')).default;
      browserInstance = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      });
    } catch {
      throw new Error('No Puppeteer found. Run: npm install puppeteer');
    }
  }
  return browserInstance;
}

export async function generateReportPDF({ sample, tests, settings }) {
  // Fetch all images server-side first — Puppeteer gets zero external requests
  const { inlinedSettings, inlinedTests } = await inlineImages({ tests, settings });
  const html = buildReportHTML({ sample, tests: inlinedTests, settings: inlinedSettings });

  const browser = await getBrowser();
  const page    = await browser.newPage();
  try {
    await page.setViewport({ width: 794, height: 1123 });
    // domcontentloaded is instant — all content is inline, no network needed
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const pdfBuffer = await page.pdf({
      format:            'A4',
      printBackground:   true,
      margin:            { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });
    return pdfBuffer;
  } finally {
    await page.close();
  }
}
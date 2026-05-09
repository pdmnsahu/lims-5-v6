// pdfGenerator.js
// Launches Puppeteer, renders the HTML template, returns a PDF buffer.
// Uses puppeteer-core + @sparticuz/chromium for Render compatibility.

import { buildReportHTML } from './reportTemplate.js';

let browserInstance = null;

async function getBrowser() {
  // Reuse browser instance across requests (warm start)
  if (browserInstance) {
    try {
      // Check it's still alive
      await browserInstance.version();
      return browserInstance;
    } catch {
      browserInstance = null;
    }
  }

  let puppeteer;
  let executablePath;

  try {
    // Try @sparticuz/chromium first (Render/Lambda environments)
    const chromium = await import('@sparticuz/chromium');
    puppeteer = (await import('puppeteer-core')).default;
    executablePath = await chromium.default.executablePath();

    browserInstance = await puppeteer.launch({
      args: chromium.default.args,
      defaultViewport: chromium.default.defaultViewport,
      executablePath,
      headless: chromium.default.headless,
    });
  } catch {
    // Fallback: full puppeteer (local dev)
    try {
      puppeteer = (await import('puppeteer')).default;
      browserInstance = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    } catch (err) {
      throw new Error('No Puppeteer installation found. Run: npm install puppeteer  (dev) or npm install puppeteer-core @sparticuz/chromium  (production)');
    }
  }

  return browserInstance;
}

export async function generateReportPDF({ sample, tests, settings }) {
  const html = buildReportHTML({ sample, tests, settings });

  const browser = await getBrowser();
  const page    = await browser.newPage();

  try {
    // Set A4 viewport
    await page.setViewport({ width: 794, height: 1123 });

    // Load HTML — waitUntil:'networkidle0' ensures all images (Cloudinary URLs) are loaded
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    // Generate PDF — true vector, single A4 page
    const pdfBuffer = await page.pdf({
      format:          'A4',
      printBackground: true,
      margin:          { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,    // respects @page { size: A4 } in CSS
    });

    return pdfBuffer;
  } finally {
    await page.close();
  }
}
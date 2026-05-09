// pdfReport.js
// Generates the coal test report PDF using PDFKit — no browser, instant generation.
// A4 = 595.28 × 841.89 pt. All coordinates are in points.

import PDFDocument from 'pdfkit';
import https from 'https';
import http  from 'http';

// ── Helpers ───────────────────────────────────────────────────────────────────
function dd(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`;
}
function byName(tests, name) { return tests.find(t => t.test_name === name); }
function deriveGrade(v) {
  const n = parseFloat(v); if (isNaN(n)) return '—';
  if (n > 7000) return 'G1';  if (n > 6700) return 'G2';  if (n > 6400) return 'G3';
  if (n > 6100) return 'G4';  if (n > 5800) return 'G5';  if (n > 5500) return 'G6';
  if (n > 5200) return 'G7';  if (n > 4900) return 'G8';  if (n > 4600) return 'G9';
  if (n > 4300) return 'G10'; if (n > 4000) return 'G11'; if (n > 3700) return 'G12';
  if (n > 3400) return 'G13'; if (n > 3100) return 'G14'; if (n > 2800) return 'G15';
  if (n > 2500) return 'G16'; if (n > 2200) return 'G17'; return 'G17+';
}

async function fetchBuffer(url) {
  if (!url) return null;
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// ── Layout constants ──────────────────────────────────────────────────────────
const PW  = 595.28;   // page width
const PH  = 841.89;   // page height
const ML  = 22;       // margin left
const MR  = PW - 22;  // margin right
const CW  = MR - ML;  // content width  = 551.28

// ── Drawing helpers ───────────────────────────────────────────────────────────
function hLine(doc, x1, y, x2, lw = 0.5) {
  doc.moveTo(x1, y).lineTo(x2, y).lineWidth(lw).stroke();
}
function vLine(doc, x, y1, y2, lw = 0.5) {
  doc.moveTo(x, y1).lineTo(x, y2).lineWidth(lw).stroke();
}
function rect(doc, x, y, w, h, lw = 0.5) {
  doc.rect(x, y, w, h).lineWidth(lw).stroke();
}

// Draw a bordered cell with text, returns nothing (caller manages y)
function cell(doc, x, y, w, h, text, opts = {}) {
  const {
    fontSize    = 8,
    bold        = false,
    align       = 'left',
    valign      = 'center',
    color       = '#000000',
    border      = true,
    padX        = 3,
    padY        = 2,
    wrap        = true,
  } = opts;

  if (border) rect(doc, x, y, w, h);

  if (!text && text !== 0) return;
  const str = String(text);

  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
     .fontSize(fontSize)
     .fillColor(color);

  const textW  = w - padX * 2;
  const lineH  = fontSize * 1.3;
  const lines  = wrap
    ? doc.heightOfString(str, { width: textW }) / lineH
    : 1;
  const textH  = lines * lineH;

  let ty;
  if (valign === 'center') ty = y + (h - textH) / 2;
  else                     ty = y + padY;

  let tx = x + padX;
  if (align === 'center') tx = x + (w - Math.min(textW, doc.widthOfString(str))) / 2;
  if (align === 'right')  tx = x + w - padX - doc.widthOfString(str);

  doc.text(str, tx, ty, { width: textW, align, lineBreak: wrap });
  doc.fillColor('#000000');
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateReportPDF({ sample, tests, settings = {} }) {

  // Fetch all images in parallel
  const tGCV = byName(tests, 'Gross Calorific Value');
  const [logoBuf, accBuf, stampBuf, sigBuf, parrBuf] = await Promise.all([
    fetchBuffer(settings.logo_url          || ''),
    fetchBuffer(settings.accreditation_url || ''),
    fetchBuffer(settings.stamp_url         || ''),
    fetchBuffer(settings.signature_url     || ''),
    fetchBuffer(tGCV?.image_url            || ''),
  ]);

  // Test values
  const tTM  = byName(tests, 'Total Moisture (TM)');
  const tAM  = byName(tests, 'Moisture (ADB)');
  const tAA  = byName(tests, 'Ash (ADB)');
  const tEQM = byName(tests, 'Moisture (EQ)');
  const tVM  = byName(tests, 'Volatile Matter (ADB)');

  const eqGcv = tGCV?.result_value ? Math.round(parseFloat(tGCV.result_value) * 0.99) : null;
  const grade = deriveGrade(eqGcv);

  const recv    = dd(sample.group_created_at);
  const startD  = dd(tTM?.submitted_at  || tAM?.submitted_at  || tGCV?.submitted_at);
  const endD    = dd(tTM?.reviewed_at   || tAM?.reviewed_at   || tGCV?.reviewed_at);
  const rptDate = endD || dd(new Date());
  const rptNo   = sample.lab_internal_id || sample.sample_ref_id || '—';
  const auth    = tGCV?.assigned_by_name || tAM?.assigned_by_name || tTM?.assigned_by_name || '—';
  const today   = dd(new Date());

  const labName    = settings.lab_name    || 'Ravi Energie Laboratory';
  const labAddr    = settings.lab_address || 'Plot No14, AstankarBhavan, Behind TukaramSabhagruha, SuyogNagar, District Nagpur - 440015, Maharastra, India.';
  const labPhone   = settings.lab_phone   || '+91 8320021741';
  const labEmail   = settings.lab_email   || 'lab@ravienergie.com';
  const labWebsite = settings.lab_website || 'www.ravienergie.com';
  const corpOffice = settings.corp_office || 'S15 A/B India Bulls Mega Mall, Jetalpur Road, Vadodara – 390 020, India';

  // ── Create PDF ──────────────────────────────────────────────────────────────
  const doc = new PDFDocument({
    size:    'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info:    { Title: `Test Report ${rptNo}`, Author: labName },
  });

  const chunks = [];
  doc.on('data', c => chunks.push(c));

  const pdfDone = new Promise((resolve, reject) => {
    doc.on('end',   resolve);
    doc.on('error', reject);
  });

  // ── Current Y tracker ──────────────────────────────────────────────────────
  let y = 14;

  // ── 1. HEADER ──────────────────────────────────────────────────────────────
  const logoH = 46;

  // Logo left
  if (logoBuf) {
    try { doc.image(logoBuf, ML, y, { fit: [80, logoH], align: 'left', valign: 'center' }); }
    catch (_) {}
  } else {
    doc.rect(ML, y, 80, logoH).lineWidth(0.4).dash(2).stroke().undash();
    doc.font('Helvetica').fontSize(6).fillColor('#aaa').text('Logo', ML, y + logoH/2 - 3, { width: 80, align: 'center' });
    doc.fillColor('#000');
  }

  // Lab name centre
  doc.font('Helvetica-Bold').fontSize(18).fillColor('#000')
     .text(labName, ML + 85, y + 14, { width: CW - 170, align: 'center' });

  // Accreditation right
  if (accBuf) {
    try { doc.image(accBuf, MR - 70, y, { fit: [60, logoH], align: 'right', valign: 'center' }); }
    catch (_) {}
  } else {
    doc.rect(MR - 70, y, 60, logoH).lineWidth(0.4).dash(2).stroke().undash();
    doc.font('Helvetica').fontSize(6).fillColor('#aaa').text('Accreditation', MR - 70, y + logoH/2 - 3, { width: 60, align: 'center' });
    doc.fillColor('#000');
  }

  y += logoH + 4;

  // ── 2. TITLE BOX ───────────────────────────────────────────────────────────
  // Outer border
  const titleBoxTop = y;
  hLine(doc, ML, y, MR, 1.2);
  y += 0;

  // "TEST REPORT" centred
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#000')
     .text('TEST REPORT', ML, y + 4, { width: CW, align: 'center' });
  y += 28;

  // Report number
  doc.font('Helvetica').fontSize(8).fillColor('#444')
     .text(rptNo, ML, y, { width: CW, align: 'center' });
  y += 13;

  hLine(doc, ML, y, MR);

  // Row: Discipline | Chemical | Group | Solid Fuels
  const rh = 14; // row height
  const c1w = CW * 0.22, c2w = CW * 0.28, c3w = CW * 0.18, c4w = CW - c1w - c2w - c3w;
  let cx = ML;
  cell(doc, cx, y, c1w, rh, 'Discipline', { bold: true, fontSize: 8 });   cx += c1w;
  cell(doc, cx, y, c2w, rh, 'Chemical',   { fontSize: 8 });                cx += c2w;
  cell(doc, cx, y, c3w, rh, 'Group',      { bold: true, fontSize: 8 });   cx += c3w;
  cell(doc, cx, y, c4w, rh, 'Solid Fuels',{ fontSize: 8 });
  y += rh;

  // Row: label row (Report No / date / PO / date / pages)
  const m1 = CW*0.20, m2 = CW*0.18, m3 = CW*0.22, m4 = CW*0.18, m5 = CW-m1-m2-m3-m4;
  cx = ML;
  cell(doc, cx, y, m1, rh, 'Test Report No',  { fontSize: 7, color: '#555' }); cx += m1;
  cell(doc, cx, y, m2, rh, 'Report date',     { fontSize: 7, color: '#555' }); cx += m2;
  cell(doc, cx, y, m3, rh, 'Customer PO',     { fontSize: 7, color: '#555' }); cx += m3;
  cell(doc, cx, y, m4, rh, 'Date',            { fontSize: 7, color: '#555' }); cx += m4;
  cell(doc, cx, y, m5, rh, 'Text Pages',      { fontSize: 7, color: '#555' });
  y += rh;

  // Row: values
  cx = ML;
  cell(doc, cx, y, m1, rh, rptNo,                       { bold: true, fontSize: 9 });   cx += m1;
  cell(doc, cx, y, m2, rh, rptDate,                     { bold: true, fontSize: 9 });   cx += m2;
  cell(doc, cx, y, m3, rh, sample.group_ref_id || '—',  { fontSize: 8 });                cx += m3;
  cell(doc, cx, y, m4, rh, dd(sample.group_created_at), { fontSize: 8 });                cx += m4;
  cell(doc, cx, y, m5, rh, '1',                         { fontSize: 8 });
  y += rh;

  // Close title box bottom
  hLine(doc, ML, y, MR, 1);
  // Left and right border of entire title box
  vLine(doc, ML,  titleBoxTop, y, 1.2);
  vLine(doc, MR, titleBoxTop, y, 1.2);

  y += 4;

  // ── 3. CUSTOMER / DESCRIPTION BOX ──────────────────────────────────────────
  const half = CW / 2;
  const custBoxTop = y;

  // Header row
  cell(doc, ML,        y, half, rh, 'Customer Name and address',      { fontSize: 7, color: '#444' });
  cell(doc, ML + half, y, half, rh, 'Description of test item:- COAL',{ fontSize: 7, color: '#444', bold: true });
  y += rh;

  // Customer body
  const custBodyH = 46;
  rect(doc, ML,        y, half, custBodyH);
  rect(doc, ML + half, y, half, custBodyH);

  // Customer text
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000')
     .text(sample.client_name || '—', ML + 3, y + 4, { width: half - 6 });
  if (sample.client_address) {
    doc.font('Helvetica').fontSize(8)
       .text(sample.client_address.replace(/\n/g, ', '), ML + 3, doc.y + 1, { width: half - 6 });
  }
  if (sample.contact_person) {
    doc.font('Helvetica').fontSize(7).fillColor('#555')
       .text(`Attn: ${sample.contact_person}`, ML + 3, doc.y + 1, { width: half - 6 });
  }
  doc.fillColor('#000');
  y += custBodyH;

  // ── 4. AMBIENT ROW ─────────────────────────────────────────────────────────
  const ambH = 26;
  const aw   = CW / 4;
  cx = ML;
  cell(doc, cx, y, aw, ambH / 2, 'Ambient Humidity (% RH)',  { fontSize: 7, color: '#444' }); cx += aw;
  cell(doc, cx, y, aw, ambH / 2, 'Ambient Temperature (°C)', { fontSize: 7, color: '#444' }); cx += aw;
  cell(doc, cx, y, aw, ambH / 2, 'Customer Sample ID',       { fontSize: 7, color: '#444' }); cx += aw;
  cell(doc, cx, y, aw, ambH / 2, 'Sample lab ID',            { fontSize: 7, color: '#444' });
  y += ambH / 2;

  cx = ML;
  cell(doc, cx, y, aw, ambH / 2, String(sample.ambient_humidity ?? '—'), { bold: true, fontSize: 12, align: 'center' }); cx += aw;
  cell(doc, cx, y, aw, ambH / 2, String(sample.ambient_temp    ?? '—'), { bold: true, fontSize: 12, align: 'center' }); cx += aw;
  cell(doc, cx, y, aw, ambH / 2, sample.sample_ref_id   || '—',         { bold: true, fontSize: 11, align: 'center' }); cx += aw;
  cell(doc, cx, y, aw, ambH / 2, sample.lab_internal_id || '—',         { bold: true, fontSize: 11, align: 'center' });
  y += ambH / 2;

  // ── 5. TEST METHOD LINE ─────────────────────────────────────────────────────
  const tmH = 16;
  cell(doc, ML, y, CW, tmH,
    'Test Method :IS1350 (Part-I) :2025 for TM and Proximate and IS1350 (Part-II) : 2022 for GCV analysis',
    { bold: true, fontSize: 8, wrap: true });
  y += tmH;

  // ── 6. TEST RESULTS TABLE ───────────────────────────────────────────────────
  // "Test Results" title row
  const trTitle = 16;
  cell(doc, ML, y, CW, trTitle, 'Test Results', { bold: true, fontSize: 12, align: 'center' });
  y += trTitle;

  // Column widths
  const cols = {
    date:   CW * 0.10,
    period: CW * 0.13,
    tm:     CW * 0.08,
    adbM:   CW * 0.08,
    adbA:   CW * 0.08,
    adbG:   CW * 0.10,
    eqM:    CW * 0.08,
    eqA:    CW * 0.08,
    eqG:    CW * 0.10,
    grade:  CW - CW*0.10 - CW*0.13 - CW*0.08*5 - CW*0.10*2,
  };

  // X positions
  const xs = {};
  let xc = ML;
  for (const [k, w] of Object.entries(cols)) { xs[k] = xc; xc += w; }

  const adbW = cols.adbM + cols.adbA + cols.adbG;
  const eqW  = cols.eqM  + cols.eqA  + cols.eqG;

  const hdr1H = 12;  // super-header row
  const hdr2H = 16;  // sub-header row
  const dataH = 20;  // data row

  // Super-header row 1
  const hOpts = { bold: true, fontSize: 7, align: 'center', valign: 'center', wrap: true };
  cell(doc, xs.date,   y, cols.date,   hdr1H + hdr2H, 'Date of\nsample\nreceipt', hOpts);
  cell(doc, xs.period, y, cols.period, hdr1H + hdr2H, 'Period of\nanalysis',      hOpts);
  cell(doc, xs.tm,     y, cols.tm,     hdr1H + hdr2H, 'Total\nMoisture\n(%)',     hOpts);
  cell(doc, xs.adbM,   y, adbW,        hdr1H,          'Air Dried Basis (ADB)',    hOpts);
  cell(doc, xs.eqM,    y, eqW,         hdr1H,          'Equilibrated basis (60% RH and 40°C)', { ...hOpts, fontSize: 6 });
  cell(doc, xs.grade,  y, cols.grade,  hdr1H + hdr2H, 'Grade',                   hOpts);
  y += hdr1H;

  // Sub-header row 2
  cell(doc, xs.adbM, y, cols.adbM, hdr2H, 'Moisture\n(%)',   hOpts);
  cell(doc, xs.adbA, y, cols.adbA, hdr2H, 'Ash\n(%)',        hOpts);
  cell(doc, xs.adbG, y, cols.adbG, hdr2H, 'GCV\n(kCal/kg)',  hOpts);
  cell(doc, xs.eqM,  y, cols.eqM,  hdr2H, 'Moisture\n(%)',   hOpts);
  cell(doc, xs.eqA,  y, cols.eqA,  hdr2H, 'Ash\n(%)',        hOpts);
  cell(doc, xs.eqG,  y, cols.eqG,  hdr2H, 'GCV\n(kCal/kg)',  hOpts);
  y += hdr2H;

  // Data row
  const dOpts = { fontSize: 9, align: 'center', valign: 'center' };
  const period = (startD && endD) ? `${startD} to\n${endD}` : '—';
  cell(doc, xs.date,   y, cols.date,   dataH, recv,                        dOpts);
  cell(doc, xs.period, y, cols.period, dataH, period,                      { ...dOpts, fontSize: 7.5 });
  cell(doc, xs.tm,     y, cols.tm,     dataH, tTM?.result_value  ?? '—',  dOpts);
  cell(doc, xs.adbM,   y, cols.adbM,   dataH, tAM?.result_value  ?? '—',  dOpts);
  cell(doc, xs.adbA,   y, cols.adbA,   dataH, tAA?.result_value  ?? '—',  dOpts);
  cell(doc, xs.adbG,   y, cols.adbG,   dataH, tGCV?.result_value ?? '—', dOpts);
  cell(doc, xs.eqM,    y, cols.eqM,    dataH, tEQM?.result_value ?? '—', dOpts);
  cell(doc, xs.eqA,    y, cols.eqA,    dataH, '—',                         { ...dOpts, color: '#aaa' });
  cell(doc, xs.eqG,    y, cols.eqG,    dataH, eqGcv ? String(eqGcv) : '—',dOpts);
  cell(doc, xs.grade,  y, cols.grade,  dataH, grade,                       { ...dOpts, bold: true, fontSize: 11 });
  y += dataH + 4;

  // ── 7. PARR IMAGE + SIGNATURE ───────────────────────────────────────────────
  const blockH   = 160;
  const parrW    = CW * 0.60;
  const sigBlockX = ML + parrW + 6;
  const sigBlockW = CW - parrW - 6;

  if (parrBuf) {
    try { doc.image(parrBuf, ML, y, { fit: [parrW - 4, blockH], align: 'left', valign: 'center' }); }
    catch (_) {
      // Image decode error — show placeholder
      doc.rect(ML, y, parrW - 4, blockH).lineWidth(0.4).dash(2).stroke().undash();
      doc.font('Helvetica').fontSize(8).fillColor('#bbb')
         .text('Parr Calorimeter Image', ML, y + blockH/2 - 4, { width: parrW - 4, align: 'center' });
      doc.fillColor('#000');
    }
  } else {
    doc.rect(ML, y, parrW - 4, blockH).lineWidth(0.4).dash(2).stroke().undash();
    doc.font('Helvetica').fontSize(8).fillColor('#bbb')
       .text('Parr 6400 Calorimeter printout', ML, y + blockH/2 - 8, { width: parrW - 4, align: 'center' });
    doc.fontSize(7).text('(Upload image via GCV test submission)', ML, doc.y + 2, { width: parrW - 4, align: 'center' });
    doc.fillColor('#000');
  }

  // Signature block — centred vertically in blockH
  const sigMidY = y + blockH / 2;

  // Stamp
  const stampSize = 52;
  const stampX    = sigBlockX + (sigBlockW - stampSize) / 2;
  const stampY    = y + 6;
  if (stampBuf) {
    try { doc.image(stampBuf, stampX, stampY, { fit: [stampSize, stampSize] }); }
    catch (_) {}
  } else {
    doc.circle(stampX + stampSize/2, stampY + stampSize/2, stampSize/2)
       .lineWidth(0.4).dash(2).stroke().undash();
    doc.font('Helvetica').fontSize(6).fillColor('#bbb')
       .text('Stamp', stampX, stampY + stampSize/2 - 3, { width: stampSize, align: 'center' });
    doc.fillColor('#000');
  }

  // "Reviewed and Authorised By"
  const reviewY = stampY + stampSize + 6;
  doc.font('Helvetica').fontSize(7.5).fillColor('#333')
     .text('Reviewed and Authorised By', sigBlockX, reviewY, { width: sigBlockW, align: 'center' });

  // Signature image
  const sigY   = reviewY + 12;
  const sigH   = 30;
  const sigW   = Math.min(sigBlockW - 8, 100);
  const sigX   = sigBlockX + (sigBlockW - sigW) / 2;
  if (sigBuf) {
    try { doc.image(sigBuf, sigX, sigY, { fit: [sigW, sigH] }); }
    catch (_) {}
  } else {
    hLine(doc, sigX, sigY + sigH, sigX + sigW);
  }

  // Authorised name
  const nameY = sigY + sigH + 5;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000')
     .text(auth, sigBlockX, nameY, { width: sigBlockW, align: 'center' });

  y += blockH + 4;

  // ── 8. DECLARATION ─────────────────────────────────────────────────────────
  const declText =
    'Declaration: ' +
    '1. The test results relates only to the sample submitted for testing and as per Lab scope. Product endorsement is neither inferred nor implied. ' +
    '2. This report cannot be reproduced except in full without prior written approval from the laboratory head. ' +
    '3. The report cannot be used as an evidence in the court of law, without written approval of laboratory. ' +
    '4. The sample will be retained for three months. ' +
    '5. Total liability of the laboratory of this report is limited only to the invoiced amount. ' +
    '6. All disputes are subject to Vadodara Jurisdiction. ' +
    '7. Sampling is not done by the laboratory. ' +
    '8. This report relates to only to the particular sample as received for testing. ' +
    '9. Grade of coal is given basis of Gcv on EQ Basis as per Gazzette notification from Ministry of coal for Declaration of Grade.';

  doc.font('Helvetica').fontSize(7).fillColor('#111')
     .text(declText, ML, y, { width: CW, align: 'justify', lineGap: 1 });
  y = doc.y + 6;

  // ── 9. END OF REPORT ───────────────────────────────────────────────────────
  hLine(doc, ML, y, MR, 0.5);
  y += 3;
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000')
     .text('---------------END OF REPORT---------------', ML, y, { width: CW, align: 'center' });
  y += 13;

  // ── 10. FOOTER ─────────────────────────────────────────────────────────────
  hLine(doc, ML, y, MR, 1.2);
  y += 4;

  const footerH    = PH - y - 8;
  const footerLeft = CW * 0.30;
  const footerMid  = CW * 0.40;
  const footerRight= CW - footerLeft - footerMid;

  // Left: lab address
  doc.font('Helvetica').fontSize(6).fillColor('#333')
     .text(`Laboratory: ${labAddr}`, ML, y, { width: footerLeft - 4, lineGap: 0.5 })
     .text(`Format: QCI/F25/09/01/QCI-CIL Date: ${today} Rev: 04`, ML, doc.y + 2, { width: footerLeft - 4 });

  // Centre: company name (large serif)
  const centreX = ML + footerLeft;
  doc.font('Helvetica').fontSize(7).fillColor('#666')
     .text('Unit of', centreX, y + 2, { width: footerMid, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#000')
     .text('Ravi Energie', centreX, doc.y, { width: footerMid, align: 'center', continued: true })
     .font('Helvetica-Oblique').fontSize(14).text(' Pvt. Ltd', { align: 'left' });

  // Right: contact
  const rightX = ML + footerLeft + footerMid;
  doc.font('Helvetica').fontSize(6).fillColor('#333')
     .text(`${corpOffice}`, rightX, y, { width: footerRight, align: 'right', lineGap: 0.5 })
     .text(`Phone: ${labPhone}`, rightX, doc.y + 2, { width: footerRight, align: 'right' })
     .text(`Email: ${labEmail}`, rightX, doc.y + 1, { width: footerRight, align: 'right' })
     .text(`Website: ${labWebsite}`, rightX, doc.y + 1, { width: footerRight, align: 'right' });

  doc.fillColor('#000');

  // ── Finalise ────────────────────────────────────────────────────────────────
  doc.end();
  await pdfDone;
  return Buffer.concat(chunks);
}
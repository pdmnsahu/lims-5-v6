// pdfReport.js
// Pixel-perfect A4 coal test report using PDFKit.
// Coordinates derived from the reference HTML (26031401.html) where 1em = 12pt
// Page scale: 49.58333em × 70.08334em → A4 595.28 × 841.89 pt
// Scale factor: 595.28 / 49.58333 = 12.0055 pt/em ≈ 12 pt/em
// All coordinates below are in POINTS (pt), converted from em in HTML.

import PDFDocument from 'pdfkit';
import https from 'https';
import http  from 'http';

// ── Scale: 1em in reference HTML = S pt ──────────────────────────────────────
const S = 12.0;  // pt per em

// Convert reference em coords to pt
const em = (v) => v * S;

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
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { timeout: 12000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchBuffer(res.headers.location).then(resolve);
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end',  () => resolve(Buffer.concat(chunks)));
        res.on('error', () => resolve(null));
      });
      req.on('error',   () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    } catch { resolve(null); }
  });
}

// ── Layout constants (all in pt) ──────────────────────────────────────────────
const PW = 595.28;
const PH = 841.89;
const LM = em(1.125);       // left margin  ≈ 13.5pt
const RM = em(46.08);       // right edge   ≈ 552.96pt
const CW = RM - LM;        // content width ≈ 539.46pt

// ── Draw helpers ──────────────────────────────────────────────────────────────
function hLine(doc, x1, y, x2, lw = 0.4) {
  doc.save().moveTo(x1, y).lineTo(x2, y).lineWidth(lw).stroke().restore();
}
function vLine(doc, x, y1, y2, lw = 0.4) {
  doc.save().moveTo(x, y1).lineTo(x, y2).lineWidth(lw).stroke().restore();
}
function box(doc, x, y, w, h, lw = 0.4) {
  doc.save().rect(x, y, w, h).lineWidth(lw).stroke().restore();
}

// Draw text at absolute (x, y) with font/size, no reflow
function T(doc, text, x, y, opts = {}) {
  const { font = 'Times-Roman', size = em(0.833), color = '#000000', align, width } = opts;
  doc.save()
     .font(font)
     .fontSize(size)
     .fillColor(color);
  if (align && width) {
    doc.text(String(text), x, y, { align, width, lineBreak: false });
  } else {
    doc.text(String(text), x, y, { lineBreak: false });
  }
  doc.restore();
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export async function generateReportPDF({ sample, tests, settings = {} }) {

  // Fetch all images in parallel
  const tGCV  = byName(tests, 'Gross Calorific Value');
  const [logoBuf, accBuf, stampBuf, sigBuf, parrBuf] = await Promise.all([
    fetchBuffer(settings.logo_url          || ''),
    fetchBuffer(settings.accreditation_url || ''),
    fetchBuffer(settings.stamp_url         || ''),
    fetchBuffer(settings.signature_url     || ''),
    fetchBuffer(tGCV?.image_url            || ''),
  ]);

  const tTM  = byName(tests, 'Total Moisture (TM)');
  const tAM  = byName(tests, 'Moisture (ADB)');
  const tAA  = byName(tests, 'Ash (ADB)');
  const tEQM = byName(tests, 'Moisture (EQ)');
  const tEQA = byName(tests, 'Ash (EQ)');

  const eqGcv = tGCV?.result_value ? Math.round(parseFloat(tGCV.result_value) * 0.99) : null;
  const grade  = deriveGrade(eqGcv);

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
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    compress: true,
    info: { Title: `Test Report ${rptNo}`, Author: labName, Creator: 'CoalLIMS' },
  });

  const chunks = [];
  doc.on('data', c => chunks.push(c));
  const done = new Promise((res, rej) => { doc.on('end', res); doc.on('error', rej); });

  // ── Font aliases (PDFKit built-ins) ──────────────────────────────────────────
  const BOLD   = 'Helvetica-Bold';
  const REG    = 'Helvetica';
  const TIMES  = 'Times-Roman';
  const TIMESB = 'Times-Bold';

  // ── Reference coordinate system ──────────────────────────────────────────────
  // HTML reference page: 49.58em wide × 70.08em tall → 595 × 841 pt
  // Left clip: 1.125em, Right clip: 46.08em
  // Absolute position in pt = (html_left_em) * S

  // ── 1. HEADER AREA ─────────────────────────────────────────────────────────
  // Logo: top-left area (from reference image, approximately)
  const logoY = em(0.9);
  const logoH = em(3.6);
  const logoW = em(6.0);

  if (logoBuf) {
    try { doc.image(logoBuf, LM, logoY, { fit: [logoW, logoH] }); } catch(_) {}
  } else {
    box(doc, LM, logoY, logoW, logoH, 0.3);
    doc.save().font(REG).fontSize(6).fillColor('#aaa')
       .text('Logo', LM, logoY + logoH/2 - 3, { width: logoW, align: 'center', lineBreak: false })
       .restore();
  }

  // Lab name — from reference: "Ravi Energie Laboratory" at approximately left:9.4em, top:1.2em
  // Font: Arial Bold, size ~1.33em → em(1.33) = 15.96pt
  doc.font(BOLD).fontSize(em(1.33)).fillColor('#000')
     .text(labName, em(9.4), em(1.35), { lineBreak: false });

  // Accreditation badge: top-right
  const accW = em(5.0);
  const accH = em(3.6);
  const accX = RM - accW;
  if (accBuf) {
    try { doc.image(accBuf, accX, logoY, { fit: [accW, accH] }); } catch(_) {}
  } else {
    box(doc, accX, logoY, accW, accH, 0.3);
    doc.save().font(REG).fontSize(6).fillColor('#aaa')
       .text('Accred.', accX, logoY + accH/2 - 3, { width: accW, align: 'center', lineBreak: false })
       .restore();
  }

  // ── 2. TITLE BOX (thick border) ─────────────────────────────────────────────
  // From reference: box starts around top:4.7em, thick border
  // "TEST REPORT" at ~top:5.27em, font 2.0em bold
  // Report No below it at ~top:6.53em

  const titleBoxTop = em(4.75);
  const titleBoxH   = em(7.1);

  // Outer box
  box(doc, LM, titleBoxTop, CW, titleBoxH, 1.0);

  // "TEST REPORT"
  const testReportSize = em(1.67);
  doc.font(BOLD).fontSize(testReportSize).fillColor('#000');
  const trW = doc.widthOfString('TEST REPORT');
  doc.text('TEST REPORT', LM + (CW - trW) / 2, em(5.27), { lineBreak: false });

  // Report number below
  doc.font(TIMESB).fontSize(em(0.833)).fillColor('#000');
  const rnoW = doc.widthOfString(rptNo);
  doc.text(rptNo, LM + (CW - rnoW) / 2, em(6.53), { lineBreak: false });

  // Horizontal line separating title from metadata rows
  const hline1Y = em(7.20);
  hLine(doc, LM, hline1Y, RM, 0.5);

  // Row: Discipline | Chemical | Group | Solid Fuels
  // From reference: top ~ 7.3em
  const row1Y  = em(7.30);
  const rowH   = em(1.08);
  const c1w = CW * 0.22, c2w = CW * 0.28, c3w = CW * 0.18, c4w = CW - c1w - c2w - c3w;

  // Vertical dividers for this row
  vLine(doc, LM + c1w,              row1Y, row1Y + rowH);
  vLine(doc, LM + c1w + c2w,        row1Y, row1Y + rowH);
  vLine(doc, LM + c1w + c2w + c3w,  row1Y, row1Y + rowH);

  doc.font(BOLD).fontSize(em(0.75)).fillColor('#000')
     .text('Discipline', LM + 2,             row1Y + 2, { lineBreak: false });
  doc.font(TIMESB).fontSize(em(0.75))
     .text('Chemical',   LM + c1w + 2,       row1Y + 2, { lineBreak: false });
  doc.font(BOLD).fontSize(em(0.75))
     .text('Group',      LM + c1w + c2w + 2, row1Y + 2, { lineBreak: false });
  doc.font(TIMESB).fontSize(em(0.75))
     .text('Solid Fuels',LM + c1w + c2w + c3w + 2, row1Y + 2, { lineBreak: false });

  // Horizontal line below row 1
  const hline2Y = row1Y + rowH;
  hLine(doc, LM, hline2Y, RM, 0.4);

  // Row: label row (Report No / date / PO / date / pages)
  const row2Y  = hline2Y;
  const row2H  = em(0.85);
  const m1 = CW*0.20, m2 = CW*0.18, m3 = CW*0.22, m4 = CW*0.18, m5 = CW-m1-m2-m3-m4;
  vLine(doc, LM+m1,         row2Y, row2Y+row2H+em(1.1));
  vLine(doc, LM+m1+m2,      row2Y, row2Y+row2H+em(1.1));
  vLine(doc, LM+m1+m2+m3,   row2Y, row2Y+row2H+em(1.1));
  vLine(doc, LM+m1+m2+m3+m4,row2Y, row2Y+row2H+em(1.1));

  const labelSz = em(0.625);
  doc.font(REG).fontSize(labelSz).fillColor('#555');
  doc.text('Test Report No', LM + 2,             row2Y + 1, { lineBreak: false });
  doc.text('Report date',    LM + m1 + 2,        row2Y + 1, { lineBreak: false });
  doc.text('Customer PO',    LM + m1+m2 + 2,     row2Y + 1, { lineBreak: false });
  doc.text('Date',           LM + m1+m2+m3 + 2,  row2Y + 1, { lineBreak: false });
  doc.text('Text Pages',     LM + m1+m2+m3+m4+2, row2Y + 1, { lineBreak: false });

  // Horizontal line between label and value rows
  hLine(doc, LM, row2Y + row2H, RM, 0.3);

  // Value row
  const row3Y  = row2Y + row2H;
  const row3H  = em(1.1);
  const valSz  = em(0.833);
  doc.font(BOLD).fontSize(valSz).fillColor('#000');
  doc.text(rptNo,                       LM + 2,             row3Y + 2, { lineBreak: false });
  doc.text(rptDate,                     LM + m1 + 2,        row3Y + 2, { lineBreak: false });
  doc.font(TIMES).fontSize(valSz);
  doc.text(sample.group_ref_id || '—',  LM + m1+m2 + 2,    row3Y + 2, { lineBreak: false });
  doc.text(dd(sample.group_created_at), LM + m1+m2+m3 + 2, row3Y + 2, { lineBreak: false });
  doc.text('1',                         LM + m1+m2+m3+m4+2, row3Y+2,  { lineBreak: false });

  // Close title box bottom line
  const titleBoxBottom = row3Y + row3H;
  hLine(doc, LM, titleBoxBottom, RM, 0.8);

  // ── 3. CUSTOMER / DESCRIPTION BOX ──────────────────────────────────────────
  // From reference image and HTML coordinates
  const custTop = titleBoxBottom;
  const half    = CW / 2;

  // Header labels row
  const custHdrH = em(0.75);
  hLine(doc, LM, custTop, RM, 0.4);

  doc.font(REG).fontSize(em(0.625)).fillColor('#444')
     .text('Customer Name and address', LM + 2, custTop + 1, { lineBreak: false });
  vLine(doc, LM + half, custTop, custTop + custHdrH + em(5.5));
  doc.font(TIMES).fontSize(em(0.625)).fillColor('#444')
     .text('Description of test item:- COAL', LM + half + 2, custTop + 1, { lineBreak: false });

  // Customer body
  const custBodyTop = custTop + custHdrH;
  const custBodyH   = em(4.75);

  // Draw customer text
  let cy = custBodyTop + em(0.4);
  doc.font(BOLD).fontSize(em(0.833)).fillColor('#000')
     .text(sample.client_name || '—', LM + 2, cy, { lineBreak: false });
  cy += em(1.0);
  if (sample.client_address) {
    const addrLines = sample.client_address.split('\n');
    doc.font(TIMES).fontSize(em(0.833)).fillColor('#000');
    for (const line of addrLines) {
      doc.text(line, LM + 2, cy, { lineBreak: false, width: half - 6 });
      cy += em(0.85);
    }
  }
  if (sample.contact_person) {
    doc.font(TIMES).fontSize(em(0.7)).fillColor('#555')
       .text(`Attn: ${sample.contact_person}`, LM + 2, cy, { lineBreak: false });
  }

  // ── 4. AMBIENT ROW ─────────────────────────────────────────────────────────
  const ambTop = custBodyTop + custBodyH;
  hLine(doc, LM, ambTop, RM, 0.4);

  const aw     = CW / 4;
  const ambLH  = em(0.7);
  const ambVH  = em(1.25);

  // Label row
  doc.font(REG).fontSize(em(0.6)).fillColor('#444');
  vLine(doc, LM + aw,     ambTop, ambTop + ambLH + ambVH);
  vLine(doc, LM + aw*2,   ambTop, ambTop + ambLH + ambVH);
  vLine(doc, LM + aw*3,   ambTop, ambTop + ambLH + ambVH);
  doc.text('Ambient Humidity (% RH)',  LM + 2,       ambTop + 1, { lineBreak: false });
  doc.text('Ambient Temperature (°C)', LM + aw + 2,  ambTop + 1, { lineBreak: false });
  doc.text('Customer Sample ID',       LM + aw*2+2,  ambTop + 1, { lineBreak: false });
  doc.text('Sample lab ID',            LM + aw*3+2,  ambTop + 1, { lineBreak: false });

  // Value row
  const ambValY = ambTop + ambLH;
  hLine(doc, LM, ambValY, RM, 0.3);
  doc.font(BOLD).fontSize(em(1.17)).fillColor('#000');
  doc.text(String(sample.ambient_humidity ?? '—'), LM + aw*0 + aw/2, ambValY + 1,
    { lineBreak: false, align: 'center', width: aw });
  doc.text(String(sample.ambient_temp ?? '—'),     LM + aw*1 + aw/2, ambValY + 1,
    { lineBreak: false, align: 'center', width: aw });
  doc.font(BOLD).fontSize(em(0.917));
  doc.text(sample.sample_ref_id   || '—', LM + aw*2 + 2, ambValY + 2, { lineBreak: false });
  doc.text(sample.lab_internal_id || '—', LM + aw*3 + 2, ambValY + 2, { lineBreak: false });

  // ── 5. TEST METHOD LINE ─────────────────────────────────────────────────────
  const tmTop = ambValY + ambVH;
  hLine(doc, LM, tmTop, RM, 0.4);

  const tmH = em(1.2);
  doc.font(BOLD).fontSize(em(0.75)).fillColor('#000')
     .text('Test Method :IS1350 (Part-I) :2025 for TM and Proximate and IS1350 (Part-II) : 2022 for GCV analysis',
           LM + 2, tmTop + em(0.25), { lineBreak: false, width: CW - 4 });

  // ── 6. TEST RESULTS TABLE ───────────────────────────────────────────────────
  const tblTop = tmTop + tmH;
  hLine(doc, LM, tblTop, RM, 0.4);

  // "Test Results" title row
  const trTitleH = em(1.33);
  doc.font(BOLD).fontSize(em(1.0)).fillColor('#000');
  const trTW = doc.widthOfString('Test Results');
  doc.text('Test Results', LM + (CW - trTW)/2, tblTop + em(0.22), { lineBreak: false });

  hLine(doc, LM, tblTop + trTitleH, RM, 0.4);

  // Column widths matching reference proportions
  const colW = {
    date:   CW * 0.100,
    period: CW * 0.130,
    tm:     CW * 0.082,
    adbM:   CW * 0.082,
    adbA:   CW * 0.082,
    adbG:   CW * 0.102,
    eqM:    CW * 0.082,
    eqA:    CW * 0.082,
    eqG:    CW * 0.102,
    grade:  CW - 0.100*CW - 0.130*CW - 0.082*CW*5 - 0.102*CW*2,
  };

  const adbW = colW.adbM + colW.adbA + colW.adbG;
  const eqW  = colW.eqM  + colW.eqA  + colW.eqG;

  // X positions
  const xs = {};
  let xc = LM;
  for (const [k, w] of Object.entries(colW)) { xs[k] = xc; xc += w; }

  const hdr1Top = tblTop + trTitleH;
  const hdr1H   = em(0.9);   // super-header
  const hdr2H   = em(1.4);   // sub-header (2 lines)
  const dataH   = em(1.67);  // data row

  // Vertical dividers for full table height
  const tblFullH = hdr1H + hdr2H + dataH;
  for (const k of ['period','tm','adbM','adbA','adbG','eqM','eqA','eqG','grade']) {
    vLine(doc, xs[k], hdr1Top, hdr1Top + tblFullH, 0.3);
  }

  // Super-header row
  const hdrSz = em(0.67);
  doc.font(BOLD).fontSize(hdrSz).fillColor('#000');

  // ADB group header centered
  const adbHdrX = xs.adbM + (adbW - doc.widthOfString('Air Dried Basis (ADB)')) / 2;
  doc.text('Air Dried Basis (ADB)', adbHdrX, hdr1Top + em(0.15), { lineBreak: false });

  // EQ group header centered
  const eqLbl  = 'Equilibrated basis (60% RH and 40°C)';
  doc.font(BOLD).fontSize(em(0.58));
  const eqHdrX = xs.eqM + (eqW - doc.widthOfString(eqLbl)) / 2;
  doc.text(eqLbl, eqHdrX, hdr1Top + em(0.15), { lineBreak: false });

  hLine(doc, xs.adbM, hdr1Top + hdr1H, xs.grade, 0.3);
  hLine(doc, LM,      hdr1Top + hdr1H, xs.adbM,  0.3);
  hLine(doc, xs.grade, hdr1Top + hdr1H, RM,       0.3);

  // Sub-header row (row 2) — 2-line headers
  const hdr2Top = hdr1Top + hdr1H;
  doc.font(BOLD).fontSize(hdrSz);

  function subHdr(doc, label1, label2, x, y, w) {
    const l1w = doc.widthOfString(label1);
    const l2w = label2 ? doc.widthOfString(label2) : 0;
    doc.text(label1, x + (w - l1w)/2, y + em(0.1), { lineBreak: false });
    if (label2) doc.text(label2, x + (w - l2w)/2, y + em(0.75), { lineBreak: false });
  }

  subHdr(doc, 'Date of',  'sample',     xs.date,   hdr2Top, colW.date);
  doc.text('receipt', xs.date + (colW.date - doc.widthOfString('receipt'))/2, hdr2Top + em(1.4), { lineBreak: false });
  subHdr(doc, 'Period of','analysis',   xs.period, hdr2Top, colW.period);
  subHdr(doc, 'Total',    'Moisture',   xs.tm,     hdr2Top, colW.tm);
  doc.text('(%)',  xs.tm + (colW.tm - doc.widthOfString('(%)'))/2, hdr2Top + em(1.4), { lineBreak: false });
  subHdr(doc, 'Moisture', '(%)',        xs.adbM,   hdr2Top, colW.adbM);
  subHdr(doc, 'Ash',      '(%)',        xs.adbA,   hdr2Top, colW.adbA);
  subHdr(doc, 'GCV',      '(kCal/kg)', xs.adbG,   hdr2Top, colW.adbG);
  subHdr(doc, 'Moisture', '(%)',        xs.eqM,    hdr2Top, colW.eqM);
  subHdr(doc, 'Ash',      '(%)',        xs.eqA,    hdr2Top, colW.eqA);
  subHdr(doc, 'GCV',      '(kCal/kg)', xs.eqG,    hdr2Top, colW.eqG);
  subHdr(doc, 'Grade',    null,         xs.grade,  hdr2Top, colW.grade);

  hLine(doc, LM, hdr2Top + hdr2H, RM, 0.4);

  // Data row
  const dataTop = hdr2Top + hdr2H;
  const dataSz  = em(0.833);
  doc.font(TIMES).fontSize(dataSz).fillColor('#000');

  function datVal(doc, val, x, y, w) {
    const s = String(val ?? '—');
    const vw = doc.widthOfString(s);
    doc.text(s, x + (w - vw)/2, y + em(0.5), { lineBreak: false });
  }

  const period = (startD && endD) ? `${startD} to` : '—';
  const period2 = (startD && endD) ? endD : '';
  datVal(doc, recv,                              xs.date,   dataTop, colW.date);
  doc.font(TIMES).fontSize(em(0.7));
  doc.text(period,  xs.period + 2, dataTop + em(0.25), { lineBreak: false });
  if (period2) doc.text(period2, xs.period + 2, dataTop + em(0.95), { lineBreak: false });
  doc.font(TIMES).fontSize(dataSz);
  datVal(doc, tTM?.result_value  ?? '—',         xs.tm,     dataTop, colW.tm);
  datVal(doc, tAM?.result_value  ?? '—',         xs.adbM,   dataTop, colW.adbM);
  datVal(doc, tAA?.result_value  ?? '—',         xs.adbA,   dataTop, colW.adbA);
  datVal(doc, tGCV?.result_value ?? '—',         xs.adbG,   dataTop, colW.adbG);
  datVal(doc, tEQM?.result_value ?? '—',         xs.eqM,    dataTop, colW.eqM);
  doc.fillColor('#aaa');
  datVal(doc, '—',                               xs.eqA,    dataTop, colW.eqA);
  doc.fillColor('#000');
  datVal(doc, eqGcv ?? '—',                      xs.eqG,    dataTop, colW.eqG);
  doc.font(BOLD).fontSize(em(0.917));
  datVal(doc, grade,                             xs.grade,  dataTop, colW.grade);

  hLine(doc, LM, dataTop + dataH, RM, 0.6);

  // ── 7. PARR IMAGE + SIGNATURE BLOCK ─────────────────────────────────────────
  // From reference: parr image takes left ~60%, sig block right ~40%
  // Parr block top ~ 34.4em, height ~ 12em → top: 412pt, height: 144pt
  const parrTop  = dataTop + dataH + em(0.2);
  const parrH    = em(11.5);
  const parrW    = CW * 0.60;
  const sigBlockX = LM + parrW + em(0.5);
  const sigBlockW = CW - parrW - em(0.5);

  // Parr image — "Run Data File 1/1, Parr 6400 Calorimeter..."
  if (parrBuf) {
    try {
      doc.image(parrBuf, LM, parrTop, {
        fit:   [parrW - 4, parrH],
        align: 'left',
        valign:'center',
      });
    } catch(_) {
      box(doc, LM, parrTop, parrW - 4, parrH, 0.3);
      doc.font(REG).fontSize(7).fillColor('#bbb')
         .text('Parr 6400 Calorimeter Data', LM, parrTop + parrH/2 - 8, { width: parrW - 4, align: 'center', lineBreak: false });
    }
  } else {
    box(doc, LM, parrTop, parrW - 4, parrH, 0.3);
    doc.save().font(REG).fontSize(7).fillColor('#bbb')
       .text('Parr 6400 Calorimeter printout', LM, parrTop + parrH/2 - 8, { width: parrW - 4, align: 'center', lineBreak: false })
       .restore();
  }

  // Signature block: stamp, "Reviewed and Authorised By", signature, name
  // From reference HTML: "Reviewed and Authorised By" at top:46.422em, "Chandan Behera" at top:50.252em
  // In pt: 46.422*12 = 557pt, 50.252*12 = 603pt
  // But we need relative to our dynamic layout, so place relative to parrTop

  const sigMidY     = parrTop + parrH * 0.35;
  const stampSize   = em(4.0);
  const stampX      = sigBlockX + (sigBlockW - stampSize) / 2;
  const stampY      = parrTop + em(0.5);

  if (stampBuf) {
    try { doc.image(stampBuf, stampX, stampY, { fit: [stampSize, stampSize] }); }
    catch(_) {}
  } else {
    doc.save().circle(stampX + stampSize/2, stampY + stampSize/2, stampSize/2)
       .lineWidth(0.3).dash(2).stroke().undash().restore();
    doc.font(REG).fontSize(6).fillColor('#ccc')
       .text('Stamp', stampX, stampY + stampSize/2 - 3, { width: stampSize, align: 'center', lineBreak: false });
    doc.fillColor('#000');
  }

  // "Reviewed and Authorised By" — from reference at top:46.422em
  const revY = parrTop + parrH * 0.55;
  doc.font(REG).fontSize(em(0.75)).fillColor('#000');
  const revTxt = 'Reviewed and Authorised By';
  const revW   = doc.widthOfString(revTxt);
  doc.text(revTxt, sigBlockX + (sigBlockW - revW)/2, revY, { lineBreak: false });

  // Signature image
  const sigImgY = revY + em(1.0);
  const sigImgW = Math.min(sigBlockW - 4, em(8));
  const sigImgH = em(3.0);
  const sigImgX = sigBlockX + (sigBlockW - sigImgW) / 2;

  if (sigBuf) {
    try { doc.image(sigBuf, sigImgX, sigImgY, { fit: [sigImgW, sigImgH] }); }
    catch(_) { hLine(doc, sigImgX, sigImgY + sigImgH, sigImgX + sigImgW, 0.4); }
  } else {
    hLine(doc, sigImgX, sigImgY + sigImgH, sigImgX + sigImgW, 0.4);
  }

  // Authorised name — from reference: "Chandan Behera" at top:50.252em
  const authY  = sigImgY + sigImgH + em(0.5);
  doc.font(BOLD).fontSize(em(0.833)).fillColor('#000');
  const authW2 = doc.widthOfString(auth);
  doc.text(auth, sigBlockX + (sigBlockW - authW2)/2, authY, { lineBreak: false });

  // ── 8. DECLARATION ─────────────────────────────────────────────────────────
  // From reference HTML: "Declaration:" at top:53.7537em → 644pt
  // Our content ends around parrTop + parrH + gap
  const declTop = parrTop + parrH + em(0.8);

  doc.font(BOLD).fontSize(em(0.75)).fillColor('#000')
     .text('Declaration:', LM, declTop, { lineBreak: false });

  const declText =
    '1. The test results relates only to the sample submitted for testing and as per Lab scope. ' +
    'Product endorsement is neither inferred nor implied. ' +
    '2. This report cannot be reproduced except in full without prior written approval from the laboratory head. ' +
    '3. The report cannot be used as an evidence in the court of law, without written approval of laboratory. ' +
    '4. The sample will be retained for three months. ' +
    '5. Total liability of the laboratory of this report is limited only to the invoiced amount. ' +
    '6. All disputes are subject to Vadodara Jurisdiction. ' +
    '7. Sampling is not done by the laboratory ' +
    '8. This report relates to only to the particular sample as received for testing. ' +
    '9. Grade of coal is given basis of Gcv on EQ Basis as per Gazzette notification from Ministry of coal for Declaration of Grade.';

  doc.font(TIMES).fontSize(em(0.75)).fillColor('#000')
     .text(declText, LM, declTop + em(0.85), { width: CW, lineGap: 0.5, align: 'justify' });

  // ── 9. END OF REPORT ───────────────────────────────────────────────────────
  // From reference: at top:60.2674em → 723pt
  const endTop = em(60.27);
  hLine(doc, LM, endTop - em(0.3), RM, 0.3);
  doc.font(BOLD).fontSize(em(0.833)).fillColor('#000');
  const endTxt = '---------------END OF REPORT---------------';
  const endW   = doc.widthOfString(endTxt);
  doc.text(endTxt, LM + (CW - endW)/2, endTop, { lineBreak: false });

  // ── 10. FOOTER ─────────────────────────────────────────────────────────────
  // From reference HTML: footer starts at top:~62.6em → 751pt
  // Double horizontal rule
  const footTop = em(62.0);
  hLine(doc, LM, footTop,       RM, 1.2);
  hLine(doc, LM, footTop + 2.5, RM, 0.3);

  // "Unit of Ravi EnergiePvt. Ltd" centered at top:62.6515em → 750.6pt
  const unitOfY = em(62.65);
  doc.font(REG).fontSize(em(0.58)).fillColor('#000')
     .text('Unit of ', LM + (CW)/2 - em(5.5), unitOfY + em(0.2), { lineBreak: false });
  // "Ravi Energie Pvt. Ltd" in large font (1.67em)
  doc.font(BOLD).fontSize(em(1.67)).fillColor('#000')
     .text('Ravi Energie', LM + (CW)/2 - em(4.5), unitOfY, { lineBreak: false });
  doc.font(REG).fontSize(em(1.0))
     .text('Pvt. Ltd', LM + (CW)/2 + em(2.5), unitOfY + em(0.5), { lineBreak: false });

  // Left: lab address
  const footTextY = em(64.55);
  const footLColW = em(11.5);
  doc.font(REG).fontSize(em(0.583)).fillColor('#000')
     .text(`Laboratory: ${labAddr}`,
           LM, footTextY, { width: footLColW, lineGap: 0.5 });
  doc.text(`Format: QCI/F25/09/01/QCI-CIL Date: ${today} Rev: 04`,
           LM, doc.y + 1, { width: footLColW, lineGap: 0.5, lineBreak: false });

  // Center: Corporate Office
  const footMidX = LM + footLColW + em(1.0);
  const footMidW = em(11.0);
  doc.font(REG).fontSize(em(0.583))
     .text(`Corporate Office: ${corpOffice}`,
           footMidX, footTextY, { width: footMidW, lineGap: 0.5 });

  // Right: phone / email / website
  const footRX = RM - em(9.0);
  doc.font(REG).fontSize(em(0.583))
     .text(`Phone: ${labPhone}`,   footRX, footTextY, { lineBreak: false })
     .text(`Email: ${labEmail}`,   footRX, footTextY + em(0.85), { lineBreak: false })
     .text(`Website: ${labWebsite}`, footRX, footTextY + em(1.7), { lineBreak: false });

  // ── Finalise ────────────────────────────────────────────────────────────────
  doc.end();
  await done;
  return Buffer.concat(chunks);
}
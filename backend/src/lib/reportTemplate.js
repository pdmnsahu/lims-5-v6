// reportTemplate.js — all 13 fixes applied

function dd(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`;
}

function deriveGrade(v) {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  if (n > 7000) return 'G1';  if (n > 6700) return 'G2';  if (n > 6400) return 'G3';
  if (n > 6100) return 'G4';  if (n > 5800) return 'G5';  if (n > 5500) return 'G6';
  if (n > 5200) return 'G7';  if (n > 4900) return 'G8';  if (n > 4600) return 'G9';
  if (n > 4300) return 'G10'; if (n > 4000) return 'G11'; if (n > 3700) return 'G12';
  if (n > 3400) return 'G13'; if (n > 3100) return 'G14'; if (n > 2800) return 'G15';
  if (n > 2500) return 'G16'; if (n > 2200) return 'G17'; return 'G17+';
}

function byName(tests, name) {
  return tests.find(t => t.test_name === name);
}

export function buildReportHTML({ sample, tests, settings = {} }) {
  const tTM  = byName(tests, 'Total Moisture (TM)');
  const tAM  = byName(tests, 'Moisture (ADB)');
  const tAA  = byName(tests, 'Ash (ADB)');
  const tGCV = byName(tests, 'Gross Calorific Value');
  const tEQM = byName(tests, 'Moisture (EQ)');

  const eqGcv   = tGCV?.result_value ? Math.round(parseFloat(tGCV.result_value) * 0.99) : null;
  const grade   = deriveGrade(eqGcv);
  const recv    = dd(sample.group_created_at);
  const start   = dd(tTM?.submitted_at || tAM?.submitted_at || tGCV?.submitted_at);
  const end     = dd(tTM?.reviewed_at  || tAM?.reviewed_at  || tGCV?.reviewed_at);
  const rptDate = end || dd(new Date());
  const auth    = tGCV?.assigned_by_name || tAM?.assigned_by_name || tTM?.assigned_by_name || '—';
  const rptNo   = sample.lab_internal_id || sample.sample_ref_id || '—';
  const today   = dd(new Date());

  const logoUrl = settings.logo_url          || '';
  const accUrl  = settings.accreditation_url || '';
  const sigUrl  = settings.signature_url     || '';  // Fix #10: stamp removed entirely
  const parrUrl = tGCV?.image_url            || '';

  const labName    = settings.lab_name    || 'Ravi Energie Laboratory';
  const labPhone   = settings.lab_phone   || '+91 8320021741';
  const labEmail   = settings.lab_email   || 'lab@ravienergie.com';
  const labWebsite = settings.lab_website || 'www.ravienergie.com';
  const corpOffice = settings.corp_office || 'S15 A/B India Bulls Mega Mall, Jetalpur Road, Vadodara – 390 020, India';

  const period = (start && end) ? `${start} to<br/>${end}` : '—';
  const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  @page { size: A4 portrait; margin: 0; }

  /* Fix #13 — Arial/Helvetica everywhere, was Times New Roman */
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 210mm; height: 297mm; overflow: hidden; background: #fff;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9pt; color: #000;
  }
  .page {
    width: 210mm; height: 297mm;
    padding: 5mm 6mm 3mm 6mm;
    display: flex; flex-direction: column; overflow: hidden;
  }

  /* ── HEADER ── */
  /* Fix #1 — lab name uses Arial Bold (inherits from body now) */
  /* Fix #2 — thick rule below header */
  .header {
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0; height: 16mm;
    padding-bottom: 2mm;
    border-bottom: 0.6mm solid #000;
  }
  .header-logo { width: 28mm; height: 14mm; display: flex; align-items: center; }
  .header-logo img { max-width: 28mm; max-height: 14mm; object-fit: contain; }
  .header-logo-placeholder {
    width: 28mm; height: 14mm; border: 0.3mm dashed #ccc;
    display: flex; align-items: center; justify-content: center;
    font-size: 6pt; color: #ccc; text-align: center;
  }
  .header-center { flex: 1; text-align: center; padding: 0 3mm; }
  .lab-name { font-size: 20pt; font-weight: bold; font-family: Arial, Helvetica, sans-serif; }
  .header-acc { width: 28mm; height: 14mm; display: flex; align-items: center; justify-content: flex-end; }
  .header-acc img { max-width: 28mm; max-height: 14mm; object-fit: contain; }
  .header-acc-placeholder {
    width: 28mm; height: 14mm; border: 0.3mm dashed #ccc;
    display: flex; align-items: center; justify-content: center;
    font-size: 6pt; color: #ccc; text-align: center;
  }

  /* ── TABLES ── */
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 0.3mm solid #000; padding: 0.5mm 1.2mm; vertical-align: middle; }

  /* ── TITLE BOX ── */
  .report-title {
    text-align: center; font-size: 20pt; font-weight: bold;
    padding: 1.5mm 0 0.5mm; border-bottom: 0.3mm solid #000;
  }
  .report-no {
    text-align: center; font-size: 9pt; padding: 0.5mm 0 0.8mm;
    border-bottom: 0.3mm solid #000;
  }

  /* ── CUSTOMER BOX ── */
  /* Fix #3 — client name normal weight, not bold */
  /* Fix #4 — 8mm top padding pushes name down to match reference */
  .customer-body-cell {
    height: 20mm; vertical-align: top;
    padding: 8mm 1.5mm 1.5mm 1.5mm;
  }
  .customer-name { font-size: 9.5pt; font-weight: normal; }
  .customer-addr { font-size: 9pt; }

  /* ── AMBIENT ROW ── */
  .ambient-label { font-size: 7.5pt; color: #333; }
  /* Fix #5 — large bold for all four ambient values */
  .ambient-value { font-size: 12pt; font-weight: bold; padding: 0.5mm 1.5mm; }

  /* ── TEST METHOD ── */
  /* Fix #6 — border-top:none on the TD itself, not just the table */
  .test-method-td { font-size: 8.5pt; font-weight: bold; border-top: none; padding: 1mm 1.2mm; }

  /* ── RESULTS TABLE ── */
  /* Fix #7 — results-title has border-top:none, no double border */
  .results-title {
    font-size: 12pt; font-weight: bold; text-align: center;
    padding: 1.2mm 0; border-top: none;
  }
  .results-hdr { font-size: 7.5pt; font-weight: bold; text-align: center; }
  .results-val { font-size: 10pt; text-align: center; padding: 1.2mm 0.8mm; }

  /* ── PARR + SIGNATURE ── */
  .parr-sig { display: flex; flex-shrink: 0; margin-top: 2mm; }
  /* Fix #8 — object-position: top left so image anchors from top */
  .parr-block { flex: 0 0 62%; overflow: hidden; }
  .parr-block img { width: 100%; height: 100%; object-fit: contain; object-position: top left; }
  .parr-placeholder {
    width: 100%; height: 100%; border: 0.3mm dashed #ccc;
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; color: #bbb; font-size: 8pt; gap: 2mm;
  }
  /* Fix #10 — NO stamp in sig-block */
  .sig-block {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 3mm; padding-left: 3mm;
  }
  .sig-by-text { font-size: 8pt; color: #333; text-align: center; }
  .sig-image img { max-width: 42mm; max-height: 14mm; object-fit: contain; }
  .sig-line { width: 42mm; border-bottom: 0.3mm solid #000; height: 14mm; }
  /* Fix — sig-name not bold (reference shows regular weight) */
  .sig-name { font-size: 9pt; font-weight: normal; text-align: center; }

  /* ── DECLARATION ── */
  .declaration { flex-shrink: 0; font-size: 7.5pt; line-height: 1.5; margin-top: 2mm; }
  .declaration-label { font-weight: bold; }

  /* ── END OF REPORT ── */
  .end-of-report {
    text-align: center; font-size: 8.5pt; font-weight: bold;
    letter-spacing: 0.2mm; margin: 2mm 0 1.5mm; flex-shrink: 0;
  }

  /* ── FOOTER ── */
  /* Fix #11 — company name "Ravi EnergiePvt. Ltd" no space, Georgia serif */
  /* Fix #12 — Format line visually separated at smaller font */
  .footer {
    border-top: 0.6mm solid #000;
    display: flex; justify-content: space-between; align-items: flex-start;
    padding-top: 1.5mm; margin-top: auto; flex-shrink: 0;
  }
  .footer-left { width: 42mm; font-size: 5.5pt; line-height: 1.45; }
  .footer-format { font-size: 5pt; color: #555; margin-top: 1mm; }
  .footer-center { flex: 1; text-align: center; line-height: 1.1; }
  .footer-center .unit-of { font-size: 7.5pt; color: #444; }
  .footer-center .company-name {
    font-size: 22pt; font-weight: bold;
    font-family: Georgia, 'Times New Roman', serif;
  }
  .footer-right { width: 42mm; font-size: 5.5pt; line-height: 1.45; text-align: right; }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER: Fix #1 Arial Bold, Fix #2 thick rule below -->
  <div class="header">
    <div class="header-logo">
      ${logoUrl
        ? `<img src="${esc(logoUrl)}" alt="Logo"/>`
        : `<div class="header-logo-placeholder">Company Logo</div>`}
    </div>
    <div class="header-center">
      <div class="lab-name">${esc(labName)}</div>
    </div>
    <div class="header-acc">
      ${accUrl
        ? `<img src="${esc(accUrl)}" alt="Accreditation"/>`
        : `<div class="header-acc-placeholder">Accreditation</div>`}
    </div>
  </div>

  <!-- TITLE BOX -->
  <table>
    <tbody>
      <tr><td colspan="5" class="report-title">TEST REPORT</td></tr>
      <tr><td colspan="5" class="report-no">${esc(rptNo)}</td></tr>
      <tr>
        <td style="font-weight:bold;font-size:9pt;">Discipline</td>
        <td style="font-size:9pt;">Chemical</td>
        <td style="font-weight:bold;font-size:9pt;">Group</td>
        <td colspan="2" style="font-size:9pt;">Solid Fuels</td>
      </tr>
      <tr>
        <td style="font-size:7pt;color:#555;padding-bottom:0;">Test Report No</td>
        <td style="font-size:7pt;color:#555;padding-bottom:0;">Report date</td>
        <td style="font-size:7pt;color:#555;padding-bottom:0;">Customer PO</td>
        <td style="font-size:7pt;color:#555;padding-bottom:0;">Date</td>
        <td style="font-size:7pt;color:#555;padding-bottom:0;">Text Pages</td>
      </tr>
      <tr>
        <td style="font-weight:bold;font-size:10.5pt;padding-top:0;border-top:none;">${esc(rptNo)}</td>
        <td style="font-weight:bold;font-size:10.5pt;padding-top:0;border-top:none;">${esc(rptDate)}</td>
        <td style="font-size:9pt;padding-top:0;border-top:none;">${esc(sample.group_ref_id || '—')}</td>
        <td style="font-size:9pt;padding-top:0;border-top:none;">${esc(dd(sample.group_created_at))}</td>
        <td style="font-size:9pt;padding-top:0;border-top:none;">1</td>
      </tr>
    </tbody>
  </table>

  <!-- CUSTOMER BOX: Fix #3 name not bold, Fix #4 top padding gap -->
  <table>
    <tbody>
      <tr>
        <td style="width:50%;font-size:7.5pt;color:#333;">Customer Name and address</td>
        <td style="font-size:7.5pt;color:#333;">Description of test item:- <strong>COAL</strong></td>
      </tr>
      <tr>
        <td class="customer-body-cell">
          <div class="customer-name">${esc(sample.client_name || '—')}</div>
          ${sample.client_address
            ? `<div class="customer-addr">${esc(sample.client_address).replace(/\n/g,'<br/>')}</div>`
            : ''}
          ${sample.contact_person
            ? `<div style="font-size:8pt;color:#555;">Attn: ${esc(sample.contact_person)}</div>`
            : ''}
        </td>
        <td style="height:20mm;vertical-align:top;padding:1.5mm;"></td>
      </tr>
    </tbody>
  </table>

  <!-- AMBIENT ROW: Fix #5 seamless, all values bold large -->
  <table>
    <tbody>
      <tr>
        <td style="width:25%;border-top:none;" class="ambient-label">Ambient Humidity (% RH)</td>
        <td style="width:25%;border-top:none;" class="ambient-label">Ambient Temperature (°C)</td>
        <td style="width:25%;border-top:none;" class="ambient-label">Customer Sample ID</td>
        <td style="width:25%;border-top:none;" class="ambient-label">Sample lab ID</td>
      </tr>
      <tr>
        <td class="ambient-value">${esc(String(sample.ambient_humidity ?? '—'))}</td>
        <td class="ambient-value">${esc(String(sample.ambient_temp    ?? '—'))}</td>
        <td class="ambient-value">${esc(sample.sample_ref_id          || '—')}</td>
        <td class="ambient-value">${esc(sample.lab_internal_id        || '—')}</td>
      </tr>
    </tbody>
  </table>

  <!-- TEST METHOD: Fix #6 border-top:none on the TD -->
  <table>
    <tbody>
      <tr>
        <td class="test-method-td">
          Test Method :IS1350 (Part-I) :2025 for TM and Proximate and IS1350 (Part-II) : 2022 for GCV analysis
        </td>
      </tr>
    </tbody>
  </table>

  <!-- TEST RESULTS: Fix #7 results-title border-top:none -->
  <table>
    <thead>
      <tr><td colspan="10" class="results-title">Test Results</td></tr>
      <tr>
        <th rowspan="2" class="results-hdr" style="width:10%;">Date of<br/>sample<br/>receipt</th>
        <th rowspan="2" class="results-hdr" style="width:14%;">Period of<br/>analysis</th>
        <th rowspan="2" class="results-hdr" style="width:8%;">Total<br/>Moisture<br/>(%)</th>
        <th colspan="3" class="results-hdr">Air Dried Basis (ADB)</th>
        <th colspan="3" class="results-hdr">Equilibrated basis (60% RH and 40 °C)</th>
        <th rowspan="2" class="results-hdr" style="width:7%;">Grade</th>
      </tr>
      <tr>
        <th class="results-hdr">Moisture<br/>(%)</th>
        <th class="results-hdr">Ash<br/>(%)</th>
        <th class="results-hdr">GCV<br/>(kCal/kg)</th>
        <th class="results-hdr">Moisture<br/>(%)</th>
        <th class="results-hdr">Ash<br/>(%)</th>
        <th class="results-hdr">GCV<br/>(kCal/kg)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="results-val">${esc(recv)}</td>
        <td class="results-val" style="font-size:8pt;">${period}</td>
        <td class="results-val">${esc(tTM?.result_value  ?? '—')}</td>
        <td class="results-val">${esc(tAM?.result_value  ?? '—')}</td>
        <td class="results-val">${esc(tAA?.result_value  ?? '—')}</td>
        <td class="results-val">${esc(tGCV?.result_value ?? '—')}</td>
        <td class="results-val">${esc(tEQM?.result_value ?? '—')}</td>
        <td class="results-val" style="color:#999;">—</td>
        <td class="results-val">${eqGcv != null ? esc(String(eqGcv)) : '<span style="color:#999;">—</span>'}</td>
        <td class="results-val" style="font-weight:bold;font-size:11pt;">${esc(grade)}</td>
      </tr>
    </tbody>
  </table>

  <!-- PARR + SIGNATURE: Fix #8 top-left anchor, Fix #9 text, Fix #10 no stamp -->
  <div class="parr-sig" style="height:60mm;">
    <div class="parr-block" style="height:60mm;">
      ${parrUrl
        ? `<img src="${esc(parrUrl)}" alt="Parr Calorimeter" style="width:100%;height:60mm;object-fit:contain;object-position:top left;"/>`
        : `<div class="parr-placeholder">
             <span style="font-size:20pt;">🖨️</span>
             <span>Parr 6400 Calorimeter printout</span>
             <span style="font-size:7pt;">Upload via GCV test submission</span>
           </div>`}
    </div>
    <div class="sig-block">
      <div class="sig-by-text">Re Reviewed and Authorised By</div>
      <div class="sig-image">
        ${sigUrl
          ? `<img src="${esc(sigUrl)}" alt="Signature"/>`
          : `<div class="sig-line"></div>`}
      </div>
      <div class="sig-name">${esc(auth)}</div>
    </div>
  </div>

  <!-- DECLARATION -->
  <div class="declaration">
    <span class="declaration-label">Declaration:</span>
    1. The test results relates only to the sample submitted for testing and as per Lab scope. Product endorsement is neither inferred nor implied.
    2. This report cannot be reproduced except in full without prior written approval from the laboratory head.
    3. The report cannot be used as an evidence in the court of law, without written approval of laboratory.
    4. The sample will be retained for three months.
    5. Total liability of the laboratory of this report is limited only to the invoiced amount.
    6. All disputes are subject to Vadodara Jurisdiction.
    7. Sampling is not done by the laboratory
    8. This report relates to only to the particular sample as received for testing.
    9. Grade of coal is given basis of Gcv on EQ Basis as per Gazzette notification from Ministry of coal for Declaration of Grade.
  </div>

  <!-- END OF REPORT -->
  <div class="end-of-report">---------------END OF REPORT---------------</div>

  <!-- FOOTER: Fix #11 no space in company name, Fix #12 format line separated -->
  <div class="footer">
    <div class="footer-left">
      Laboratory: Plot No-<br/>
      14,AstankarBhavan, Behind<br/>
      TukaramSabhagruha,<br/>
      SuyogNagar,District Nagpur - 440015,<br/>
      Maharastra, India.
      <div class="footer-format">Format: QCI/F25/09/01/QCI-CIL Date: ${today} Rev: 04</div>
    </div>
    <div class="footer-center">
      <div class="unit-of">Unit of</div>
      <div class="company-name">Ravi Energie<em style="font-style:italic;">Pvt. Ltd</em></div>
    </div>
    <div class="footer-right">
      ${esc(corpOffice)}<br/>
      Phone:${esc(labPhone)}<br/>
      Email: ${esc(labEmail)}<br/>
      Website: ${esc(labWebsite)}
    </div>
  </div>

</div>
</body>
</html>`;
}
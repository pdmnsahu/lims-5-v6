// backend/src/lib/reportTemplate.js
// Generates a self-contained HTML string for one coal test report.
// Puppeteer renders this at A4 (794×1123 px) → true vector PDF.

function fmt(d) {
  if (!d) return '—';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${dt.getFullYear()}`;
}

function byName(tests, name) {
  return tests.find(t => t.test_name === name);
}

function grade(eqGcv) {
  const v = parseFloat(eqGcv);
  if (isNaN(v)) return '—';
  if (v > 7000) return 'G1';  if (v > 6700) return 'G2';  if (v > 6400) return 'G3';
  if (v > 6100) return 'G4';  if (v > 5800) return 'G5';  if (v > 5500) return 'G6';
  if (v > 5200) return 'G7';  if (v > 4900) return 'G8';  if (v > 4600) return 'G9';
  if (v > 4300) return 'G10'; if (v > 4000) return 'G11'; if (v > 3700) return 'G12';
  if (v > 3400) return 'G13'; if (v > 3100) return 'G14'; if (v > 2800) return 'G15';
  if (v > 2500) return 'G16'; if (v > 2200) return 'G17'; return 'G17+';
}

function esc(s) {
  if (s == null) return '—';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildReportHtml({ sample, tests, logoBase64, accBase64, stampBase64, sigBase64 }) {
  const tTM  = byName(tests, 'Total Moisture (TM)');
  const tAM  = byName(tests, 'Moisture (ADB)');
  const tAA  = byName(tests, 'Ash (ADB)');
  const tGCV = byName(tests, 'Gross Calorific Value');
  const tEQM = byName(tests, 'Moisture (EQ)');
  const tEQA = byName(tests, 'Ash (EQ)');
  const tEQG = byName(tests, 'GCV (EQ)') || byName(tests, 'Gross Calorific Value (EQ)');

  const eqGcvVal = tEQG?.result_value
    ?? (tGCV?.result_value ? Math.round(parseFloat(tGCV.result_value) * 0.99) : null);
  const coalGrade  = grade(eqGcvVal);
  const recv       = fmt(sample.group_created_at);
  const startDate  = fmt(tTM?.submitted_at || tAM?.submitted_at || tGCV?.submitted_at);
  const endDate    = fmt(tTM?.reviewed_at  || tAM?.reviewed_at  || tGCV?.reviewed_at);
  const period     = startDate && endDate ? `${startDate} to ${endDate}` : '—';
  const rptDate    = endDate || fmt(new Date());
  const auth       = esc(tGCV?.assigned_by_name || tAM?.assigned_by_name || tTM?.assigned_by_name || '—');
  const parrImg    = tGCV?.image_url || null;
  const rptNo      = esc(sample.lab_internal_id || sample.sample_ref_id || '—');
  const today      = fmt(new Date());

  const logoSrc  = logoBase64  ? `data:image/png;base64,${logoBase64}`  : '';
  const accSrc   = accBase64   ? `data:image/png;base64,${accBase64}`   : '';
  const stampSrc = stampBase64 ? `data:image/png;base64,${stampBase64}` : '';
  const sigSrc   = sigBase64   ? `data:image/png;base64,${sigBase64}`   : '';

  // Client address — newlines → <br>
  const addrLines = esc(sample.client_address || '').replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }

  /* Exact A4 at 96 dpi = 794×1123 px */
  html, body { width:794px; height:1123px; overflow:hidden; background:#fff; }

  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 10pt;
    color: #000;
    padding: 13px 18px 10px 18px;
    display: flex;
    flex-direction: column;
  }

  /* ── shared table rules ── */
  table  { border-collapse: collapse; width: 100%; }
  td, th { vertical-align: middle; }

  .b  { border: 1px solid #000; }
  .bt { border-top:    1px solid #000; }
  .bb { border-bottom: 1px solid #000; }
  .bl { border-left:   1px solid #000; }
  .br { border-right:  1px solid #000; }
  .b2 { border: 1.5px solid #000; }
  .b2t{ border-top: 1.5px solid #000; }
  .b2b{ border-bottom: 2px solid #000; }

  /* ── HEADER ── */
  .hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:3px; flex-shrink:0; }
  .hdr-logo { width:100px; height:58px; display:flex; align-items:center; }
  .hdr-logo img { max-width:100px; max-height:58px; object-fit:contain; }
  .hdr-logo-placeholder { width:100px; height:58px; border:1px dashed #bbb; display:flex; align-items:center; justify-content:center; font-size:7pt; color:#bbb; text-align:center; }
  .hdr-title { flex:1; text-align:center; font-size:18pt; font-weight:bold; letter-spacing:0.3px; }
  .hdr-acc { width:100px; height:58px; display:flex; align-items:center; justify-content:flex-end; }
  .hdr-acc img { max-width:100px; max-height:58px; object-fit:contain; }
  .hdr-acc-placeholder { width:100px; height:58px; border:1px dashed #bbb; display:flex; align-items:center; justify-content:center; font-size:7pt; color:#bbb; text-align:center; }

  /* ── ADDRESS BAR ── */
  .addr-bar {
    border-top: 2px solid #000; border-bottom: 1px solid #000;
    padding: 1px 0; margin-bottom: 2px;
    display: flex; justify-content: space-between;
    font-size: 7.5pt; flex-shrink:0;
  }

  .fmt-line { font-size:7.5pt; text-align:right; margin-bottom:3px; color:#333; flex-shrink:0; }

  /* ── TITLE BOX ── */
  .title-box { border: 1.5px solid #000; flex-shrink:0; }
  .title-box td { padding: 1px 6px; }
  .report-heading { text-align:center; padding: 4px 0 2px !important; border-bottom: 1px solid #000; }
  .report-heading .big  { font-size:16pt; font-weight:bold; letter-spacing:1px; }
  .report-heading .sub  { font-size:8.5pt; }
  .lbl  { font-size: 8pt; color:#555; }
  .val  { font-size:11pt; font-weight:bold; }

  /* ── CUSTOMER ── */
  .cust-table { border: 1px solid #000; border-top:none; flex-shrink:0; }
  .cust-table td { padding: 2px 6px; }
  .mini-lbl { font-size:7.8pt; color:#555; }
  .mini-val { font-size:13pt; font-weight:bold; }

  /* ── RESULTS ── */
  .results-table { border:1px solid #000; border-top:none; flex-shrink:0; }
  .results-title { text-align:center; font-weight:bold; font-size:12pt; padding:3px 0; border-bottom:1px solid #000; }
  .results-table th {
    font-size:8pt; font-weight:normal; text-align:center;
    padding:2px 3px; border-right:1px solid #000; border-bottom:1px solid #000;
  }
  .results-table td {
    font-size:10.5pt; text-align:center; padding:3px 4px;
    border-right:1px solid #000;
  }

  /* ── PARR + SIG ── */
  .parr-sig { display:flex; gap:8px; margin-top:6px; flex-shrink:0; height:142px; }
  .parr-box  { flex:1; display:flex; align-items:center; justify-content:center; overflow:hidden; }
  .parr-box img { max-width:100%; max-height:142px; object-fit:contain; }
  .parr-placeholder {
    border:1px dashed #ccc; width:100%; height:100%;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    font-family:"Courier New",monospace; font-size:8pt; color:#bbb; gap:4px;
  }
  .sig-box {
    width:172px; display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:5px;
  }
  .stamp-img { width:74px; height:74px; object-fit:contain; }
  .stamp-ph  {
    width:74px; height:74px; border-radius:50%;
    border:1px dashed #bbb; display:flex; align-items:center;
    justify-content:center; font-size:7.5pt; color:#bbb; text-align:center;
  }
  .auth-lbl  { font-size:8.5pt; color:#333; }
  .sig-img   { max-width:152px; max-height:44px; object-fit:contain; }
  .sig-line  {
    width:152px; height:32px; border-bottom:1px solid #333;
    display:flex; align-items:flex-end; justify-content:center;
    padding-bottom:2px; font-size:7.5pt; color:#ccc; font-style:italic;
  }
  .auth-name { font-size:10.5pt; }

  /* ── DECLARATION ── */
  .decl { margin-top:7px; font-size:7.8pt; line-height:1.48; color:#111; flex-shrink:0; }

  /* ── END OF REPORT ── */
  .eor { text-align:center; margin:5px 0 4px; font-size:9pt; font-weight:bold; letter-spacing:0.4px; flex-shrink:0; }

  /* ── FOOTER ── */
  .footer {
    border-top:2px solid #000; padding-top:4px;
    display:flex; justify-content:space-between; align-items:flex-start;
    flex-shrink:0; margin-top:auto;
  }
  .footer-left  { font-size:7.5pt; width:33%; line-height:1.45; }
  .footer-mid   { flex:1; text-align:center; }
  .footer-mid .unit-of { font-size:8.5pt; color:#666; }
  .footer-mid .company { font-size:20pt; font-weight:bold; font-family:Georgia,serif; }
  .footer-right { font-size:7.5pt; width:28%; text-align:right; line-height:1.5; }
</style>
</head>
<body>

<!-- ══ HEADER ══ -->
<div class="hdr">
  <div class="hdr-logo">
    ${logoSrc
      ? `<img src="${logoSrc}" alt="logo"/>`
      : `<div class="hdr-logo-placeholder">Company<br>Logo</div>`}
  </div>
  <div class="hdr-title">Ravi Energie Laboratory</div>
  <div class="hdr-acc">
    ${accSrc
      ? `<img src="${accSrc}" alt="accreditation"/>`
      : `<div class="hdr-acc-placeholder">Accreditation<br>Badge</div>`}
  </div>
</div>

<!-- ══ ADDRESS BAR ══ -->
<div class="addr-bar">
  <span>Laboratory: Plot No14, AstankarBhavan, Behind TukaramSabhagruha, SuyogNagar, District Nagpur - 440015, Maharashtra, India.</span>
  <span>Phone:+91 8320021741 &nbsp;|&nbsp; Email: lab@ravienergie.com &nbsp;|&nbsp; Website: www.ravienergie.com</span>
</div>
<div class="fmt-line">Format: QCI/F25/09/01/QCI-CIL &nbsp;&nbsp; Date: ${today} &nbsp;&nbsp; Rev: 04</div>

<!-- ══ TITLE BOX ══ -->
<table class="title-box">
  <tbody>
    <tr>
      <td colspan="5" class="report-heading">
        <div class="big">TEST REPORT</div>
        <div class="sub">${rptNo}</div>
      </td>
    </tr>
    <tr>
      <td class="br bb" style="font-weight:bold;font-size:9.5pt;width:20%">Discipline</td>
      <td class="br bb" style="font-size:9.5pt;width:20%">Chemical</td>
      <td class="br bb" style="font-weight:bold;font-size:9.5pt;width:15%">Group</td>
      <td colspan="2" class="bb" style="font-size:9.5pt">Solid Fuels</td>
    </tr>
    <tr>
      <td class="br bb lbl">Test Report No</td>
      <td class="br bb lbl">Report date</td>
      <td class="br bb lbl">Customer PO</td>
      <td class="br bb lbl" style="width:15%">Date</td>
      <td class="bb lbl" style="width:10%">Text Pages</td>
    </tr>
    <tr>
      <td class="br val">${rptNo}</td>
      <td class="br val">${rptDate}</td>
      <td class="br" style="font-size:10pt">${esc(sample.group_ref_id) || '—'}</td>
      <td class="br" style="font-size:10pt">${fmt(sample.group_created_at)}</td>
      <td style="font-size:10pt">1</td>
    </tr>
  </tbody>
</table>

<!-- ══ CUSTOMER INFO ══ -->
<table class="cust-table">
  <tbody>
    <tr>
      <td class="br bb lbl" style="width:50%">Customer Name and address</td>
      <td class="bb lbl">Description of test item:- <strong>COAL</strong></td>
    </tr>
    <tr>
      <td class="br bb" style="font-size:10.5pt;padding:3px 6px 10px;vertical-align:top">
        <strong>${esc(sample.client_name) || '—'}</strong>
        ${addrLines ? `<br>${addrLines}` : ''}
        ${sample.contact_person ? `<br><span style="font-size:8.5pt;color:#555">Attn: ${esc(sample.contact_person)}</span>` : ''}
      </td>
      <td class="bb" style="padding:3px 6px 10px"></td>
    </tr>
    <tr>
      <td colspan="2" style="padding:0" class="bb">
        <table>
          <tr>
            <td class="br mini-lbl" style="width:25%;padding:1px 6px">Ambient Humidity (% RH)</td>
            <td class="br mini-lbl" style="width:25%;padding:1px 6px">Ambient Temperature (°C)</td>
            <td class="br mini-lbl" style="width:25%;padding:1px 6px">Customer Sample ID</td>
            <td class="mini-lbl"    style="width:25%;padding:1px 6px">Sample lab ID</td>
          </tr>
          <tr>
            <td class="br mini-val" style="padding:1px 6px">${esc(sample.ambient_humidity) || '—'}</td>
            <td class="br mini-val" style="padding:1px 6px">${esc(sample.ambient_temp) || '—'}</td>
            <td class="br mini-val" style="padding:1px 6px">${esc(sample.sample_ref_id) || '—'}</td>
            <td class="mini-val"    style="padding:1px 6px">${esc(sample.lab_internal_id) || '—'}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="padding:3px 6px;font-size:9.5pt;font-weight:bold">
        Test Method :IS1350 (Part-I) :2025 for TM and Proximate and IS1350 (Part-II) : 2022 for GCV analysis
      </td>
    </tr>
  </tbody>
</table>

<!-- ══ TEST RESULTS ══ -->
<table class="results-table">
  <thead>
    <tr><td colspan="9" class="results-title">Test Results</td></tr>
    <tr>
      <th rowspan="2" style="width:10%;vertical-align:middle">Date of<br>sample<br>receipt</th>
      <th rowspan="2" style="width:15%;vertical-align:middle">Period of<br>analysis</th>
      <th rowspan="2" style="width:8%;vertical-align:middle">Total<br>Moisture<br>(%)</th>
      <th colspan="3" style="border-bottom:1px solid #000">Air Dried Basis (ADB)</th>
      <th colspan="3" style="border-right:none;border-bottom:1px solid #000">Equilibrated basis (60% RH and 40°C)</th>
    </tr>
    <tr>
      <th>Moisture<br>(%)</th>
      <th>Ash<br>(%)</th>
      <th>GCV<br>(kCal/kg)</th>
      <th>Moisture<br>(%)</th>
      <th>Ash<br>(%)</th>
      <th style="border-right:none">GCV<br>(kCal/kg)</th>
    </tr>
    <tr>
      <th colspan="8" style="border-right:1px solid #000"></th>
      <th style="border-right:none;font-size:9.5pt;font-weight:bold">Grade</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>${recv}</td>
      <td style="font-size:9pt">${period}</td>
      <td>${tTM  ? esc(tTM.result_value)  : '—'}</td>
      <td>${tAM  ? esc(tAM.result_value)  : '—'}</td>
      <td>${tAA  ? esc(tAA.result_value)  : '—'}</td>
      <td>${tGCV ? esc(tGCV.result_value) : '—'}</td>
      <td>${tEQM ? esc(tEQM.result_value) : '—'}</td>
      <td>${tEQA ? esc(tEQA.result_value) : '—'}</td>
      <td style="border-right:none">
        ${eqGcvVal != null ? esc(String(eqGcvVal)) : '—'}
        &nbsp;&nbsp;<strong style="font-size:12pt">${coalGrade}</strong>
      </td>
    </tr>
  </tbody>
</table>

<!-- ══ PARR + SIGNATURE ══ -->
<div class="parr-sig">
  <div class="parr-box">
    ${parrImg
      ? `<img src="${parrImg}" alt="Parr Calorimeter"/>`
      : `<div class="parr-placeholder">
           <span style="font-size:18pt">🖨</span>
           <span>Parr 6400 Calorimeter printout</span>
           <span style="font-size:7.5pt">Attach image via GCV test upload</span>
         </div>`
    }
  </div>
  <div class="sig-box">
    ${stampSrc
      ? `<img src="${stampSrc}" class="stamp-img" alt="stamp"/>`
      : `<div class="stamp-ph">Lab<br>Stamp</div>`}
    <div class="auth-lbl">Reviewed and Authorised By</div>
    ${sigSrc
      ? `<img src="${sigSrc}" class="sig-img" alt="signature"/>`
      : `<div class="sig-line">Signature</div>`}
    <div class="auth-name">${auth}</div>
  </div>
</div>

<!-- ══ DECLARATION ══ -->
<div class="decl">
  <strong>Declaration:</strong>
  1. The test results relates only to the sample submitted for testing and as per Lab scope. Product endorsement is neither inferred nor implied.
  2. This report cannot be reproduced except in full without prior written approval from the laboratory head.
  3. The report cannot be used as an evidence in the court of law, without written approval of laboratory.
  4. The sample will be retained for three months.
  5. Total liability of the laboratory of this report is limited only to the invoiced amount.
  6. All disputes are subject to Vadodara Jurisdiction.
  7. Sampling is not done by the laboratory.
  8. This report relates to only to the particular sample as received for testing.
  9. Grade of coal is given basis of Gcv on EQ Basis as per Gazzette notification from Ministry of coal for Declaration of Grade.
</div>

<!-- ══ END OF REPORT ══ -->
<div class="eor">---------------END OF REPORT---------------</div>

<!-- ══ FOOTER ══ -->
<div class="footer">
  <div class="footer-left">
    Laboratory: Plot No-14, AstankarBhavan, Behind TukaramSabhagruha,<br>
    SuyogNagar, District Nagpur - 440015, Maharashtra, India.<br>
    <span style="color:#555">Format: QCI/F25/09/01/QCI-CIL &nbsp; Date: ${today} &nbsp; Rev: 04</span>
  </div>
  <div class="footer-mid">
    <div class="unit-of">Unit of</div>
    <div class="company">Ravi Energie<em> Pvt. Ltd</em></div>
  </div>
  <div class="footer-right">
    Corporate Office: S15 A/B India Bulls Mega Mall,<br>
    Jetalpur Road, Vadodara – 390 020, India<br>
    Phone: +91 8320021741<br>
    Email: lab@ravienergie.com<br>
    Website: www.ravienergie.com
  </div>
</div>

</body>
</html>`;
}
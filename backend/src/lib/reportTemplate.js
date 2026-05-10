// reportTemplate.js
// Builds a self-contained HTML string that Puppeteer renders into a pixel-perfect A4 PDF.
// All dimensions are in mm to match A4 (210mm × 297mm) exactly.

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
  const tVM  = byName(tests, 'Volatile Matter (ADB)');

  const eqGcv = tGCV?.result_value
    ? Math.round(parseFloat(tGCV.result_value) * 0.99)
    : null;
  const grade   = deriveGrade(eqGcv);
  const recv    = dd(sample.group_created_at);
  const start   = dd(tTM?.submitted_at  || tAM?.submitted_at  || tGCV?.submitted_at);
  const end     = dd(tTM?.reviewed_at   || tAM?.reviewed_at   || tGCV?.reviewed_at);
  const rptDate = end || dd(new Date());
  const auth    = tGCV?.assigned_by_name || tAM?.assigned_by_name || tTM?.assigned_by_name || '—';
  const rptNo   = sample.lab_internal_id || sample.sample_ref_id || '—';
  const today   = dd(new Date());

  // Images — from lab settings (Cloudinary URLs)
  const logoUrl  = settings.logo_url          || '';
  const accUrl   = settings.accreditation_url || '';
  const stampUrl = settings.stamp_url         || '';
  const sigUrl   = settings.signature_url     || '';
  const parrUrl  = tGCV?.image_url            || '';

  // Lab info
  const labName    = settings.lab_name    || 'Ravi Energie Laboratory';
  const labAddress = settings.lab_address || 'Plot No-14, AstankarBhavan, Behind TukaramSabhagruha, SuyogNagar, District Nagpur - 440015, Maharastra, India.';
  const labPhone   = settings.lab_phone   || '+91 8320021741';
  const labEmail   = settings.lab_email   || 'lab@ravienergie.com';
  const labWebsite = settings.lab_website || 'www.ravienergie.com';
  const corpOffice = settings.corp_office || 'S15 A/B India Bulls Mega Mall, Jetalpur Road, Vadodara – 390 020, India';

  const period = (start && end) ? `${start} to <br/> ${end}` : '—';

  // Escape HTML to prevent XSS from user data
  const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      padding: 0;
      margin: 0;
      box-sizing: border-box;
    }

    html, body {
      width: 210mm;
      height: 297mm;
      background: #fff;
      font-family: 'Times New Roman', Times, serif;
      color: #000;
      font-size: 9pt;
    }

    #page {
      width: 210mm;
      height: 297mm;
      padding: 5mm;
      display: flex;
      flex-direction: column;
    }

    .flex-row {
      display: flex;
      flex-direction: row;
    }

    .flex-col {
      display: flex;
      flex-direction: col;
    }

    .seven-pt {
      font-size: 8pt;
    }

    .bold {
      font-weight: bold;
    }

    /* Header */

    #header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5mm;
    }

    #header-logo {
      display: flex;
      align-items: flex-end;
      gap: 1mm;
    }

    #header-logo img {
      max-width: 24mm;
      max-height: 24mm;
      object-fit: contain;
    }

    #header-logo #lab-name {
      font-family: sans-serif;
      font-size: 16pt;
      font-weight: bold;
    }

    #header-acc {
      display: flex;
      align-items: flex-end;
      margin-right: 12mm;
    }

    #header-acc img {
      max-width: 24mm;
      max-height: 24mm;
      object-fit: contain;
    }

    /* First table */

    #first-table {
      border-collapse: collapse;
      margin-right: 12mm;
      margin-left: 22mm;
      margin-bottom: 5mm;
    }

    #first-table td {
      border: 0.1px solid #000;
      vertical-align: middle;
    }

    #report-title {
      display: flex;
      justify-content: center;
      font-size: 20pt;
      font-weight: bold;
    }

    #report-no {
      display: flex;
      justify-content: center;
      font-weight: bold;
    }

    #discipline-chemical {
      display: flex;
      font-weight: bold;
    }

    #group-solid-fules {
      display: flex;
    }

    #discipline-chemical div,
    #group-solid-fules div {
      width: 50%;
      display: flex;
      justify-content: center;
    }

    #testreport-reportdate,
    #customerpo-date {
      display: flex;
      width: 100%;
    }

    #testreport,
    #reportdate,
    #customerpo,
    #date {
      display: flex;
      flex-direction: column;
      width: 50%;
      margin-left: 1mm;
    }

    #textpages {
      margin-left: 1mm;
    }

    /* Second table */

    #second-table {
      border-collapse: collapse;
      margin-right: 12mm;
      margin-left: 22mm;
    }

    #second-table td {
      border: 0.1px solid #000;
    }
  </style>
</head>
<body>
  <div id="page">

    <!-- ── HEADER ── -->
    <div id="header">
      <div id="header-logo">
        ${logoUrl
          ? `<img src="${esc(logoUrl)}" alt="Company Logo" />`
          : `<img src="" alt="Company Logo" style="display:none;" />`}
        <span id="lab-name">${esc(labName)}</span>
      </div>
      <div id="header-acc">
        ${accUrl
          ? `<img src="${esc(accUrl)}" alt="Accreditation" />`
          : ''}
      </div>
    </div>

    <!-- ── FIRST TABLE (Report identity) ── -->
    <table id="first-table">
      <tr>
        <td colspan="3">
          <div id="report-title">TEST REPORT</div>
          <div id="report-no">${esc(rptNo)}</div>
        </td>
      </tr>
      <tr>
        <td style="line-height: 2.5;">
          <div id="discipline-chemical">
            <div>Discipline</div>
            <div>Chemical</div>
          </div>
        </td>
        <td style="line-height: 2.5;">
          <div id="group-solid-fules">
            <div>Group</div>
            <div>Solid Fuels</div>
          </div>
        </td>
        <td></td>
      </tr>
      <tr>
        <td>
          <div id="testreport-reportdate" style="margin-bottom: 4mm; margin-top: 1mm;">
            <div id="testreport" style="gap: 1mm;">
              <span class="seven-pt">Test Report No</span>
              <span class="bold">${esc(rptNo)}</span>
            </div>
            <div id="reportdate" style="gap: 1mm;">
              <span class="seven-pt">Report date</span>
              <span class="bold">${esc(rptDate)}</span>
            </div>
          </div>
        </td>
        <td>
          <div id="customerpo-date" style="margin-bottom: 4mm; margin-top: 1mm;">
            <div id="customerpo" style="gap: 1mm;">
              <span class="seven-pt">Customer PO</span>
              <span>${esc(sample.group_ref_id || '—')}</span>
            </div>
            <div id="date" style="gap: 1mm;">
              <span class="seven-pt">Date</span>
              <span>${esc(dd(sample.group_created_at))}</span>
            </div>
          </div>
        </td>
        <td>
          <div id="textpages" style="display: flex; flex-direction: column; gap: 1mm; margin-bottom: 4mm; margin-top: 1mm;">
            <div class="seven-pt">Text Pages</div>
            <div>1</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- ── SECOND TABLE (Customer, ambient, results) ── -->
    <table id="second-table">
      <col style="width: 12%;">
      <col style="width: 13%;">
      <col style="width: 11%;">
      <col style="width: 12%;">
      <col style="width: 8%;">
      <col style="width: 9%;">
      <col style="width: 9%;">
      <col style="width: 5%;">
      <col style="width: 5%;">
      <col style="width: 8%;">
      <col style="width: 8%;">

      <!-- Customer / Description -->
      <tr>
        <td colspan="4">
          <div style="display: flex; flex-direction: column; justify-content: space-between; height: 24mm; margin-left: 1mm;">
            <div>Customer Name and address</div>
            <div>
              ${esc(sample.client_name || '—')}
              ${sample.client_address ? ' ' + esc(sample.client_address).replace(/\n/g, ', ') : ''}
            </div>
          </div>
        </td>
        <td colspan="7" style="height: 24mm;">
          <div class="seven-pt" style="display: flex; height: 100%; align-items: flex-start; line-height: 1.5; margin-left: 1mm;">
            Description of test item:- COAL
          </div>
        </td>
      </tr>

      <!-- Ambient labels -->
      <tr>
        <td colspan="2" style="text-align: center;">Ambient Humidity (% RH)</td>
        <td colspan="2" style="text-align: center;">Ambient Temperature (°C)</td>
        <td colspan="4" style="text-align: center;">Customer Sample ID</td>
        <td colspan="3" style="text-align: center;">Sample lab ID</td>
      </tr>

      <!-- Ambient values -->
      <tr>
        <td colspan="2" class="bold" style="text-align: center; line-height: 2;">${esc(String(sample.ambient_humidity ?? '—'))}</td>
        <td colspan="2" class="bold" style="text-align: center;">${esc(String(sample.ambient_temp ?? '—'))}</td>
        <td colspan="4" class="bold" style="text-align: center;">${esc(sample.sample_ref_id || '—')}</td>
        <td colspan="3" class="bold" style="text-align: center;">${esc(sample.lab_internal_id || '—')}</td>
      </tr>

      <!-- Test method -->
      <tr>
        <td colspan="11" class="bold">
          <div style="margin-left: 1mm; line-height: 1.5;">
            Test Method :IS1350 (Part-I) :2025 for TM and Proximate and IS1350 (Part-II) : 2022 for GCV analysis
          </div>
        </td>
      </tr>

      <!-- Results heading -->
      <tr>
        <td colspan="11" class="bold" style="font-size: 14pt; text-align: center; line-height: 1.5;">Test Results</td>
      </tr>

      <!-- Results column group headers -->
      <tr>
        <td rowspan="2" class="seven-pt" style="text-align: center; height: 14mm;">
          Date of <br> sample <br> receipt
        </td>
        <td rowspan="2" class="seven-pt" style="text-align: center;">
          Period of <br> analysis
        </td>
        <td rowspan="2" class="seven-pt" style="text-align: center;">
          Total <br>Moisture <br>(%)
        </td>
        <td colspan="3" class="seven-pt" style="text-align: center; line-height: 2;">
          Air Dried Basis (ADB)
        </td>
        <td colspan="5" class="seven-pt" style="text-align: center;">
          Equilibrated basis (60% RH and 40 °C)
        </td>
      </tr>

      <!-- Results sub-column headers -->
      <tr style="height: 1mm;">
        <td class="seven-pt" style="text-align: center; height: 10mm;">Moisture <br> (%)</td>
        <td class="seven-pt" style="text-align: center;">Ash <br> (%)</td>
        <td class="seven-pt" style="text-align: center;">GCV <br> (kCal/kg)</td>
        <td class="seven-pt" style="text-align: center;">Moisture <br> (%)</td>
        <td colspan="2" class="seven-pt" style="text-align: center;">Ash <br> (%)</td>
        <td class="seven-pt" style="text-align: center;">GCV <br> (kCal/kg)</td>
        <td class="seven-pt" style="text-align: center;">Grade</td>
      </tr>

      <!-- Results data row -->
      <tr>
        <td class="seven-pt" style="text-align: center;">${esc(recv)}</td>
        <td class="seven-pt" style="text-align: center; height: 8mm;">${period}</td>
        <td class="seven-pt" style="text-align: center;">${esc(tTM?.result_value  ?? '—')}</td>
        <td class="seven-pt" style="text-align: center;">${esc(tAM?.result_value  ?? '—')}</td>
        <td class="seven-pt" style="text-align: center;">${esc(tAA?.result_value  ?? '—')}</td>
        <td class="seven-pt" style="text-align: center;">${esc(tGCV?.result_value ?? '—')}</td>
        <td class="seven-pt" style="text-align: center;">${esc(tEQM?.result_value ?? '—')}</td>
        <td colspan="2" class="seven-pt" style="text-align: center; color: #999;">—</td>
        <td class="seven-pt" style="text-align: center;">${eqGcv != null ? esc(String(eqGcv)) : '<span style="color:#999;">—</span>'}</td>
        <td class="seven-pt" style="text-align: center; font-weight: bold;">${esc(grade)}</td>
      </tr>
    </table>

    <!-- ── PARR IMAGE + SIGNATURE ── -->
    <div style="margin-left: 23mm; margin-right: 12mm; display: flex;">
      ${parrUrl
        ? `<img src="${esc(parrUrl)}" style="width: 60%; object-fit: contain;" alt="Parr Calorimeter" />`
        : `<div style="width:60%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#bbb;font-size:8pt;gap:2mm;border:0.3mm dashed #ccc;">
             <span style="font-size:20pt;">🖨️</span>
             <span>Parr 6400 Calorimeter printout</span>
             <span style="font-size:7pt;">Upload via GCV test submission</span>
           </div>`}
      <div style="display: flex; flex-direction: column; align-items: center; gap: 3mm; width: 40%; height: max-content; margin-top: 15mm;">
        ${stampUrl
          ? `<img src="${esc(stampUrl)}" style="width: 24mm; object-fit: contain;" alt="Stamp" />`
          : `<div style="width:24mm;height:24mm;border-radius:50%;border:0.3mm dashed #ccc;display:flex;align-items:center;justify-content:center;font-size:6pt;color:#ccc;text-align:center;">Lab<br/>Stamp</div>`}
        <span style="font-size: 10pt;">Reviewed and Authorised By</span>
        ${sigUrl
          ? `<img src="${esc(sigUrl)}" style="width: 70%; object-fit: contain;" alt="Signature" />`
          : `<div style="width:70%;border-bottom:0.3mm solid #000;height:12mm;"></div>`}
        <span style="font-size: 10pt;">${esc(auth)}</span>
      </div>
    </div>

    <!-- ── DECLARATION + FOOTER ── -->
    <div style="margin-top: auto; margin-left: 23mm; margin-right: 10mm;">
      <span style="font-family: Calibri, 'Trebuchet MS', sans-serif;">
        Declaration:
        1. The test results relates only to the sample submitted for testing and as per Lab scope. Product
        endorsement is neither inferred nor implied.
        2. This report cannot be reproduced except in full without prior written approval from the laboratory head.
        3. The report cannot be used as an evidence in the court of law, without written approval of laboratory.
        4. The sample will be retained for three months.
        5. Total liability of the laboratory of this report is limited only to the invoiced amount.
        6. All disputes are subject to Vadodara Jurisdiction.
        7. Sampling is not done by the laboratory.
        8. This report relates to only to the particular sample as received for testing.
        9. Grade of coal is given basis of Gcv on EQ Basis as per Gazzette notification from Ministry of coal for Declaration of Grade.
      </span>

      <div style="font-size: 12pt; font-family: Calibri; font-weight: bold; text-align: center; margin-block: 5mm;">
        ---------------END OF REPORT---------------
      </div>

      <div style="width: 100%; height: 1mm; background-color: #000;"></div>

      <div>
        <div style="text-align: center;">
          <span style="font-size: 12pt; font-family: Calibri;">Unit of</span>
          <span style="font-size: 18pt; font-family: Calibri;">${esc(labName)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="width: 24%;">
            Laboratory: ${esc(labAddress)}
          </div>
          <div style="width: 42%;">
            Corporate Office: ${esc(corpOffice)}
          </div>
          <div style="width: 25%; text-align: right;">
            Phone: ${esc(labPhone)}<br/>
            Email: ${esc(labEmail)}<br/>
            Website: ${esc(labWebsite)}
          </div>
        </div>
      </div>

      <div style="font-family: Calibri;">Format: QCI/F25/09/01/QCI-CIL Date: ${today} Rev: 04</div>
    </div>

  </div>
</body>
</html>`;
}
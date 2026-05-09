import jsPDF from 'jspdf';

// ── helpers ───────────────────────────────────────────────────────────────────
function dd(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return [String(dt.getDate()).padStart(2,'0'), String(dt.getMonth()+1).padStart(2,'0'), dt.getFullYear()].join('-');
}
function byName(tests, name) {
  return tests.find(t => t.test_name === name);
}

// ── Build the report HTML string ──────────────────────────────────────────────
function buildReportHTML(sample, tests) {
  const tTM  = byName(tests, 'Total Moisture (TM)');
  const tAM  = byName(tests, 'Moisture (ADB)');
  const tAA  = byName(tests, 'Ash (ADB)');
  const tGCV = byName(tests, 'Gross Calorific Value');
  const tEQ  = byName(tests, 'Moisture (EQ)');
  const tVM  = byName(tests, 'Volatile Matter (ADB)');

  const receiptDate  = dd(sample.group_created_at);
  const startDate    = dd(tTM?.submitted_at || tAM?.submitted_at || tGCV?.submitted_at);
  const endDate      = dd(tTM?.reviewed_at  || tAM?.reviewed_at  || tGCV?.reviewed_at);
  const periodStr    = (startDate && endDate) ? `${startDate} to ${endDate}` : '—';
  const reportDate   = endDate || dd(new Date());
  const reportNo     = sample.lab_internal_id || sample.sample_ref_id || '—';
  const authorisedBy = tGCV?.assigned_by_name || tAM?.assigned_by_name || '—';
  const parrSrc      = tGCV?.image_url || '';

  const RED = '#be123c';

  // Table cell helpers as inline-style strings
  const border = 'border:1px solid #ccc;';
  const c  = (extra='') => `style="${border}padding:4px 7px;font-size:10px;${extra}"`;
  const ch = (extra='') => `style="${border}padding:4px 7px;font-size:9px;background:${RED};color:#fff;font-weight:700;text-align:center;${extra}"`;
  const cs = (extra='') => `style="${border}padding:3px 5px;font-size:9px;background:#fff1f2;color:${RED};font-weight:700;text-align:center;${extra}"`;
  const cv = (extra='') => `style="${border}padding:5px 5px;font-size:11px;text-align:center;font-family:monospace;${extra}"`;
  const cl = (extra='') => `style="${border}padding:3px 7px;font-size:9px;color:#666;${extra}"`;

  return `
<div style="width:750px;font-family:'Times New Roman',Times,serif;font-size:11px;color:#000;background:#fff;padding:16px 20px;box-sizing:border-box;">

  <!-- HEADER -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
    <div style="font-size:9px;color:#555;width:200px;">
      Laboratory: Coal Testing Division<br/>India
    </div>
    <div style="text-align:center;flex:1;">
      <div style="font-size:20px;font-weight:bold;color:${RED};letter-spacing:1px;">CoalLIMS Laboratory</div>
      <div style="font-size:8px;color:#555;">Laboratory Information Management System</div>
    </div>
    <div style="font-size:9px;color:#555;width:200px;text-align:right;">
      Email: lab@coallims.com<br/>Website: www.coallims.com
    </div>
  </div>

  <!-- Red top rule -->
  <div style="height:4px;background:${RED};margin-bottom:1px;"></div>
  <div style="height:1px;background:#e11d48;margin-bottom:4px;"></div>

  <!-- Format line -->
  <div style="font-size:8px;text-align:right;margin-bottom:4px;color:#555;">
    Format: LIMS/F01/01 &nbsp;&nbsp; Date: ${dd(new Date())} &nbsp;&nbsp; Rev: 01
  </div>

  <!-- TITLE BOX -->
  <table style="width:100%;border-collapse:collapse;border:2px solid ${RED};margin-bottom:0;">
    <tr>
      <td colspan="5" style="text-align:center;padding:5px 0 2px;border-bottom:1px solid ${RED};">
        <div style="font-size:17px;font-weight:bold;color:${RED};">TEST REPORT</div>
        <div style="font-size:10px;color:#555;">${reportNo}</div>
      </td>
    </tr>
    <tr style="border-bottom:1px solid #ddd;">
      <td ${c(`font-weight:700;color:${RED};`)}>Discipline</td>
      <td ${c()}>Chemical</td>
      <td ${c(`font-weight:700;color:${RED};`)}>Group</td>
      <td colspan="2" ${c()}>Solid Fuels</td>
    </tr>
    <tr>
      <td ${cl()}>Test Report No</td>
      <td ${cl()}>Report date</td>
      <td ${cl()}>Customer PO</td>
      <td ${cl()}>Date</td>
      <td ${cl()}>Text Pages</td>
    </tr>
    <tr>
      <td ${c(`font-weight:bold;font-size:12px;`)}>${reportNo}</td>
      <td ${c(`font-weight:bold;font-size:12px;`)}>${reportDate}</td>
      <td ${c()}>${sample.group_ref_id || '—'}</td>
      <td ${c()}>${dd(sample.group_created_at)}</td>
      <td ${c()}>1</td>
    </tr>
  </table>

  <!-- CUSTOMER INFO -->
  <table style="width:100%;border-collapse:collapse;border:1px solid #ccc;border-top:none;">
    <tr>
      <td style="width:50%;${border}padding:3px 7px;font-size:9px;color:#555;border-right:1px solid #ccc;">Customer Name and address</td>
      <td style="${border}padding:3px 7px;font-size:9px;color:#555;">Description of test item:- <strong>COAL</strong></td>
    </tr>
    <tr>
      <td style="${border}padding:5px 7px 10px;vertical-align:top;border-right:1px solid #ccc;font-size:11px;">
        <strong>${sample.client_name || '—'}</strong><br/>
        ${(sample.client_address || '').replace(/\n/g,'<br/>')}
        ${sample.contact_person ? `<br/><span style="color:#555;font-size:10px;">Attn: ${sample.contact_person}</span>` : ''}
      </td>
      <td style="${border}padding:5px 7px 10px;vertical-align:top;font-size:11px;"></td>
    </tr>
    <tr style="border-top:1px solid #ccc;">
      <td colspan="2" style="padding:0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td ${cl(`width:25%;border-right:1px solid #ccc;`)}>Ambient Humidity (% RH)</td>
            <td ${cl(`width:25%;border-right:1px solid #ccc;`)}>Ambient Temperature (°C)</td>
            <td ${cl(`width:25%;border-right:1px solid #ccc;`)}>Customer Sample ID</td>
            <td ${cl(`width:25%;`)}>Sample lab ID</td>
          </tr>
          <tr>
            <td ${cv(`border-right:1px solid #ccc;font-weight:bold;font-size:13px;`)}>${sample.ambient_humidity || '—'}</td>
            <td ${cv(`border-right:1px solid #ccc;font-weight:bold;font-size:13px;`)}>${sample.ambient_temp || '—'}</td>
            <td ${cv(`border-right:1px solid #ccc;font-weight:bold;font-size:13px;`)}>${sample.sample_ref_id || '—'}</td>
            <td ${cv(`font-weight:bold;font-size:13px;`)}>${sample.lab_internal_id || '—'}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr style="border-top:1px solid #ccc;">
      <td colspan="2" style="${border}padding:4px 7px;font-size:10px;font-weight:bold;color:${RED};">
        Test Method: IS1350 (Part-I):2025 for TM and Proximate &nbsp;|&nbsp; IS1350 (Part-II):2022 for GCV analysis
      </td>
    </tr>
  </table>

  <!-- TEST RESULTS -->
  <table style="width:100%;border-collapse:collapse;border:1px solid #ccc;border-top:none;">
    <thead>
      <tr>
        <td colspan="10" ${ch(`font-size:12px;padding:5px 0;`)}>Test Results</td>
      </tr>
      <tr>
        <td rowspan="2" ${cs(`vertical-align:middle;`)}>Date of<br/>sample<br/>receipt</td>
        <td rowspan="2" ${cs(`vertical-align:middle;`)}>Period of<br/>analysis</td>
        <td rowspan="2" ${cs(`vertical-align:middle;`)}>Total<br/>Moisture<br/>(%)</td>
        <td colspan="3" ${cs(`border-bottom:1px solid #fecdd3;`)}>Air Dried Basis (ADB)</td>
        <td colspan="2" ${cs(`border-bottom:1px solid #fecdd3;`)}>Equilibrated Basis</td>
        <td rowspan="2" ${cs(`vertical-align:middle;`)}>VM<br/>ADB<br/>(%)</td>
        <td rowspan="2" ${cs(`vertical-align:middle;`)}>Grade</td>
      </tr>
      <tr>
        <td ${cs()}>Moisture<br/>(%)</td>
        <td ${cs()}>Ash<br/>(%)</td>
        <td ${cs()}>GCV<br/>(kCal/kg)</td>
        <td ${cs()}>Moisture<br/>(%)</td>
        <td ${cs()}>GCV<br/>(kCal/kg)</td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td ${cv()}>${receiptDate}</td>
        <td ${cv(`font-size:9px;`)}>${periodStr}</td>
        <td ${cv()}>${tTM?.result_value  || '—'}</td>
        <td ${cv()}>${tAM?.result_value  || '—'}</td>
        <td ${cv()}>${tAA?.result_value  || '—'}</td>
        <td ${cv()}>${tGCV?.result_value || '—'}</td>
        <td ${cv()}>${tEQ?.result_value  || '—'}</td>
        <td ${cv(`color:#aaa;`)}>—</td>
        <td ${cv()}>${tVM?.result_value  || '—'}</td>
        <td ${cv(`font-weight:bold;color:#aaa;`)}>—</td>
      </tr>
    </tbody>
  </table>

  <!-- PARR IMAGE + SIGNATURE -->
  <div style="display:flex;gap:12px;margin-top:10px;align-items:flex-start;min-height:140px;">
    <div style="flex:1;">
      ${parrSrc
        ? `<img src="${parrSrc}" style="width:100%;max-height:200px;object-fit:contain;display:block;" alt="Parr Calorimeter"/>`
        : `<div style="border:1.5px dashed #e11d48;border-radius:4px;height:160px;display:flex;align-items:center;justify-content:center;color:#fda4af;font-size:11px;flex-direction:column;gap:4px;">
             <span style="font-size:24px;">🖨️</span>
             <span>Parr 6400 Calorimeter printout</span>
           </div>`
      }
    </div>
    <div style="width:190px;display:flex;flex-direction:column;align-items:center;gap:6px;">
      <div style="width:90px;height:90px;border:1.5px dashed #e11d48;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fda4af;text-align:center;">Lab Stamp</div>
      <div style="font-size:9px;color:#555;">Reviewed and Authorised By</div>
      <div style="width:160px;height:38px;border-bottom:1px solid #333;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px;font-size:9px;color:#bbb;">Signature</div>
      <div style="font-size:11px;font-weight:bold;">${authorisedBy}</div>
    </div>
  </div>

  <!-- DECLARATION -->
  <div style="margin-top:10px;font-size:8px;line-height:1.55;color:#333;border-top:1px solid #fecdd3;padding-top:6px;">
    <span style="font-weight:bold;">Declaration:</span>
    1. The test results relates only to the sample submitted for testing and as per Lab scope. Product endorsement is neither inferred nor implied.
    2. This report cannot be reproduced except in full without prior written approval from the laboratory head.
    3. The report cannot be used as an evidence in the court of law, without written approval of laboratory.
    4. The sample will be retained for three months.
    5. Total liability of the laboratory of this report is limited only to the invoiced amount.
    6. All disputes are subject to jurisdiction of the competent court.
    7. Sampling is not done by the laboratory.
    8. This report relates only to the particular sample as received for testing.
    9. Grade of coal is given basis of GCV on EQ Basis as per Gazette notification from Ministry of coal.
  </div>

  <!-- END OF REPORT -->
  <div style="text-align:center;margin:8px 0 6px;font-size:10px;font-weight:bold;color:${RED};letter-spacing:1px;">
    ---------------END OF REPORT---------------
  </div>

  <!-- FOOTER -->
  <div style="border-top:2px solid ${RED};padding-top:6px;display:flex;justify-content:space-between;align-items:flex-start;">
    <div style="font-size:8px;width:30%;color:#555;">
      <strong style="color:${RED};">CoalLIMS</strong><br/>
      Laboratory: Coal Testing Division, India.
    </div>
    <div style="text-align:center;flex:1;">
      <div style="font-size:9px;color:#888;">Unit of</div>
      <div style="font-size:22px;font-weight:bold;color:${RED};font-family:Georgia,serif;">CoalLIMS</div>
    </div>
    <div style="font-size:8px;width:30%;text-align:right;color:#555;">
      Email: lab@coallims.com<br/>Website: www.coallims.com<br/>
      <span style="color:#aaa;">Generated: ${dd(new Date())}</span>
    </div>
  </div>

</div>`;
}

// ── Main export — called by ReportsPage ───────────────────────────────────────
// Returns a promise, resolves when PDF is downloaded.
export async function downloadSampleReport(sample, tests) {
  // Build the HTML string
  const html = buildReportHTML(sample, tests);

  // Mount it off-screen so jsPDF.html() can measure it
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:795px;background:#fff;';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4', hotfixes: ['px_scaling'] });

    await new Promise((resolve, reject) => {
      doc.html(container, {
        callback: (pdf) => {
          const filename = `CoalLIMS_${sample.lab_internal_id || sample.sample_ref_id}_${dd(new Date())}.pdf`;
          pdf.save(filename);
          resolve();
        },
        x: 0,
        y: 0,
        width: 795,
        windowWidth: 795,
        margin: [0, 0, 0, 0],
        autoPaging: false,   // single page
        html2canvas: {
          scale: 1,
          useCORS: true,       // needed for Cloudinary images
          allowTaint: false,
          logging: false,
        },
      });
    });
  } finally {
    document.body.removeChild(container);
  }
}

import jsPDF from 'jspdf';

function dd(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return [String(dt.getDate()).padStart(2,'0'), String(dt.getMonth()+1).padStart(2,'0'), dt.getFullYear()].join('-');
}
function byName(tests, name) {
  return tests.find(t => t.test_name === name);
}

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
  const RED          = '#be123c';
  const b            = 'border:1px solid #ccc;';

  return `<div style="width:794px;font-family:'Times New Roman',Times,serif;font-size:11px;color:#000;background:#fff;padding:18px 22px 14px;box-sizing:border-box;">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
    <div style="font-size:9px;color:#555;width:180px;">Laboratory: Coal Testing Division<br/>India</div>
    <div style="text-align:center;flex:1;">
      <div style="font-size:21px;font-weight:bold;color:${RED};letter-spacing:1px;">CoalLIMS Laboratory</div>
      <div style="font-size:8px;color:#888;">Laboratory Information Management System</div>
    </div>
    <div style="font-size:9px;color:#555;width:180px;text-align:right;">Email: lab@coallims.com<br/>Website: www.coallims.com</div>
  </div>
  <div style="height:4px;background:${RED};margin-bottom:2px;"></div>
  <div style="height:1px;background:#fda4af;margin-bottom:4px;"></div>
  <div style="font-size:8px;text-align:right;margin-bottom:4px;color:#777;">Format: LIMS/F01 &nbsp; Date: ${dd(new Date())} &nbsp; Rev: 01</div>
  <table style="width:100%;border-collapse:collapse;border:2px solid ${RED};margin-bottom:0;">
    <tr><td colspan="5" style="${b}text-align:center;padding:5px 0 2px;border-bottom:1px solid ${RED};"><div style="font-size:18px;font-weight:bold;color:${RED};">TEST REPORT</div><div style="font-size:10px;color:#666;">${reportNo}</div></td></tr>
    <tr style="border-bottom:1px solid #ddd;">
      <td style="${b}padding:4px 8px;font-weight:700;color:${RED};font-size:10px;">Discipline</td>
      <td style="${b}padding:4px 8px;font-size:10px;">Chemical</td>
      <td style="${b}padding:4px 8px;font-weight:700;color:${RED};font-size:10px;">Group</td>
      <td colspan="2" style="${b}padding:4px 8px;font-size:10px;">Solid Fuels</td>
    </tr>
    <tr>
      <td style="${b}padding:3px 8px;font-size:9px;color:#777;">Test Report No</td>
      <td style="${b}padding:3px 8px;font-size:9px;color:#777;">Report date</td>
      <td style="${b}padding:3px 8px;font-size:9px;color:#777;">Customer PO</td>
      <td style="${b}padding:3px 8px;font-size:9px;color:#777;">Date</td>
      <td style="${b}padding:3px 8px;font-size:9px;color:#777;">Text Pages</td>
    </tr>
    <tr>
      <td style="${b}padding:3px 8px;font-weight:bold;font-size:12px;">${reportNo}</td>
      <td style="${b}padding:3px 8px;font-weight:bold;font-size:12px;">${reportDate}</td>
      <td style="${b}padding:3px 8px;font-size:11px;">${sample.group_ref_id || '—'}</td>
      <td style="${b}padding:3px 8px;font-size:11px;">${dd(sample.group_created_at)}</td>
      <td style="${b}padding:3px 8px;font-size:11px;">1</td>
    </tr>
  </table>
  <table style="width:100%;border-collapse:collapse;border:1px solid #ccc;border-top:none;">
    <tr>
      <td style="width:50%;${b}padding:3px 8px;font-size:9px;color:#777;border-right:1px solid #ccc;">Customer Name and address</td>
      <td style="${b}padding:3px 8px;font-size:9px;color:#777;">Description of test item:- <strong>COAL</strong></td>
    </tr>
    <tr>
      <td style="${b}padding:5px 8px 10px;vertical-align:top;border-right:1px solid #ccc;font-size:11px;"><strong>${sample.client_name || '—'}</strong><br/>${(sample.client_address || '').replace(/\n/g,'<br/>')}${sample.contact_person ? `<br/><span style="color:#777;font-size:10px;">Attn: ${sample.contact_person}</span>` : ''}</td>
      <td style="${b}padding:5px 8px 10px;vertical-align:top;font-size:11px;"></td>
    </tr>
    <tr style="border-top:1px solid #ccc;"><td colspan="2" style="padding:0;"><table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="${b}padding:3px 8px;font-size:9px;color:#777;border-right:1px solid #ccc;width:25%;">Ambient Humidity (% RH)</td>
        <td style="${b}padding:3px 8px;font-size:9px;color:#777;border-right:1px solid #ccc;width:25%;">Ambient Temperature (°C)</td>
        <td style="${b}padding:3px 8px;font-size:9px;color:#777;border-right:1px solid #ccc;width:25%;">Customer Sample ID</td>
        <td style="${b}padding:3px 8px;font-size:9px;color:#777;width:25%;">Sample lab ID</td>
      </tr>
      <tr>
        <td style="${b}padding:3px 8px;font-weight:bold;font-size:13px;border-right:1px solid #ccc;">${sample.ambient_humidity || '—'}</td>
        <td style="${b}padding:3px 8px;font-weight:bold;font-size:13px;border-right:1px solid #ccc;">${sample.ambient_temp || '—'}</td>
        <td style="${b}padding:3px 8px;font-weight:bold;font-size:13px;border-right:1px solid #ccc;">${sample.sample_ref_id || '—'}</td>
        <td style="${b}padding:3px 8px;font-weight:bold;font-size:13px;">${sample.lab_internal_id || '—'}</td>
      </tr>
    </table></td></tr>
    <tr style="border-top:1px solid #ccc;"><td colspan="2" style="${b}padding:5px 8px;font-size:10px;font-weight:bold;color:${RED};">Test Method: IS1350 (Part-I):2025 for TM and Proximate | IS1350 (Part-II):2022 for GCV analysis</td></tr>
  </table>
  <table style="width:100%;border-collapse:collapse;border:1px solid #ccc;border-top:none;">
    <thead>
      <tr><td colspan="10" style="${b}text-align:center;font-weight:bold;font-size:13px;padding:5px 0;background:${RED};color:#fff;">Test Results</td></tr>
      <tr>
        <td rowspan="2" style="${b}padding:3px 4px;text-align:center;font-size:9px;background:#fff1f2;color:${RED};font-weight:700;vertical-align:middle;">Date of<br/>sample<br/>receipt</td>
        <td rowspan="2" style="${b}padding:3px 4px;text-align:center;font-size:9px;background:#fff1f2;color:${RED};font-weight:700;vertical-align:middle;">Period of<br/>analysis</td>
        <td rowspan="2" style="${b}padding:3px 4px;text-align:center;font-size:9px;background:#fff1f2;color:${RED};font-weight:700;vertical-align:middle;">Total<br/>Moisture<br/>(%)</td>
        <td colspan="3" style="${b}padding:3px 4px;text-align:center;font-size:9px;background:#fff1f2;color:${RED};font-weight:700;border-bottom:1px solid #fecdd3;">Air Dried Basis (ADB)</td>
        <td colspan="2" style="${b}padding:3px 4px;text-align:center;font-size:9px;background:#fff1f2;color:${RED};font-weight:700;border-bottom:1px solid #fecdd3;">Equilibrated Basis</td>
        <td rowspan="2" style="${b}padding:3px 4px;text-align:center;font-size:9px;background:#fff1f2;color:${RED};font-weight:700;vertical-align:middle;">VM ADB<br/>(%)</td>
        <td rowspan="2" style="${b}padding:3px 4px;text-align:center;font-size:9px;background:#fff1f2;color:${RED};font-weight:700;vertical-align:middle;">Grade</td>
      </tr>
      <tr>
        <td style="${b}padding:3px 4px;text-align:center;font-size:9px;background:#fff1f2;color:${RED};font-weight:700;">Moisture<br/>(%)</td>
        <td style="${b}padding:3px 4px;text-align:center;font-size:9px;background:#fff1f2;color:${RED};font-weight:700;">Ash<br/>(%)</td>
        <td style="${b}padding:3px 4px;text-align:center;font-size:9px;background:#fff1f2;color:${RED};font-weight:700;">GCV<br/>(kCal/kg)</td>
        <td style="${b}padding:3px 4px;text-align:center;font-size:9px;background:#fff1f2;color:${RED};font-weight:700;">Moisture<br/>(%)</td>
        <td style="${b}padding:3px 4px;text-align:center;font-size:9px;background:#fff1f2;color:${RED};font-weight:700;">GCV<br/>(kCal/kg)</td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="${b}padding:5px 4px;text-align:center;font-size:11px;">${receiptDate}</td>
        <td style="${b}padding:5px 4px;text-align:center;font-size:9px;">${periodStr}</td>
        <td style="${b}padding:5px 4px;text-align:center;font-size:11px;">${tTM?.result_value  || '—'}</td>
        <td style="${b}padding:5px 4px;text-align:center;font-size:11px;">${tAM?.result_value  || '—'}</td>
        <td style="${b}padding:5px 4px;text-align:center;font-size:11px;">${tAA?.result_value  || '—'}</td>
        <td style="${b}padding:5px 4px;text-align:center;font-size:11px;">${tGCV?.result_value || '—'}</td>
        <td style="${b}padding:5px 4px;text-align:center;font-size:11px;">${tEQ?.result_value  || '—'}</td>
        <td style="${b}padding:5px 4px;text-align:center;font-size:11px;color:#aaa;">—</td>
        <td style="${b}padding:5px 4px;text-align:center;font-size:11px;">${tVM?.result_value  || '—'}</td>
        <td style="${b}padding:5px 4px;text-align:center;font-size:11px;color:#aaa;">—</td>
      </tr>
    </tbody>
  </table>
  <div style="display:flex;gap:12px;margin-top:10px;align-items:flex-start;min-height:140px;">
    <div style="flex:1;">${parrSrc ? `<img src="${parrSrc}" crossorigin="anonymous" style="width:100%;max-height:200px;object-fit:contain;display:block;"/>` : `<div style="border:1.5px dashed #fda4af;border-radius:4px;height:160px;display:flex;align-items:center;justify-content:center;color:#fda4af;font-size:11px;flex-direction:column;gap:6px;"><span style="font-size:26px;">🖨️</span><span>Parr 6400 Calorimeter printout</span></div>`}</div>
    <div style="width:190px;display:flex;flex-direction:column;align-items:center;gap:6px;">
      <div style="width:88px;height:88px;border:1.5px dashed #fda4af;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fda4af;text-align:center;">Lab Stamp</div>
      <div style="font-size:9px;color:#555;">Reviewed and Authorised By</div>
      <div style="width:155px;height:38px;border-bottom:1px solid #333;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px;font-size:9px;color:#bbb;">Signature</div>
      <div style="font-size:11px;font-weight:bold;">${authorisedBy}</div>
    </div>
  </div>
  <div style="margin-top:10px;font-size:8px;line-height:1.6;color:#333;border-top:1px solid #fecdd3;padding-top:5px;">
    <strong>Declaration:</strong> 1. The test results relates only to the sample submitted for testing and as per Lab scope. Product endorsement is neither inferred nor implied. 2. This report cannot be reproduced except in full without prior written approval from the laboratory head. 3. The report cannot be used as an evidence in the court of law, without written approval of laboratory. 4. The sample will be retained for three months. 5. Total liability of the laboratory of this report is limited only to the invoiced amount. 6. All disputes are subject to jurisdiction of the competent court. 7. Sampling is not done by the laboratory. 8. This report relates only to the particular sample as received for testing. 9. Grade of coal is given basis of GCV on EQ Basis as per Gazette notification from Ministry of coal.
  </div>
  <div style="text-align:center;margin:8px 0 6px;font-size:10px;font-weight:bold;color:${RED};letter-spacing:1px;">---------------END OF REPORT---------------</div>
  <div style="border-top:3px solid ${RED};padding-top:7px;display:flex;justify-content:space-between;align-items:flex-start;">
    <div style="font-size:8px;width:30%;color:#555;"><strong style="color:${RED};font-size:10px;">CoalLIMS</strong><br/>Laboratory: Coal Testing Division, India.</div>
    <div style="text-align:center;flex:1;"><div style="font-size:9px;color:#888;">Unit of</div><div style="font-size:22px;font-weight:bold;color:${RED};font-family:Georgia,serif;">CoalLIMS</div></div>
    <div style="font-size:8px;width:30%;text-align:right;color:#555;">Email: lab@coallims.com<br/>Website: www.coallims.com</div>
  </div>
</div>`;
}

export async function downloadSampleReport(sample, tests) {
  const html = buildReportHTML(sample, tests);

  // Render into a real on-screen div (html2canvas requires visible, rendered content)
  // We position it absolutely at scroll top-left, behind a loading state
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:absolute;top:0;left:0;width:794px;z-index:-9999;background:#fff;';
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  // Wait for images to load (important for Parr calorimeter image)
  const images = wrapper.querySelectorAll('img');
  await Promise.all(Array.from(images).map(img =>
    new Promise(resolve => {
      if (img.complete) resolve();
      else { img.onload = resolve; img.onerror = resolve; }
    })
  ));

  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await new Promise((resolve, reject) => {
      doc.html(wrapper, {
        callback(pdf) {
          pdf.save(`CoalLIMS_${sample.lab_internal_id || sample.sample_ref_id}_${dd(new Date())}.pdf`);
          resolve();
        },
        x: 0,
        y: 0,
        width: 210,
        windowWidth: 794,
        margin: 0,
        autoPaging: false,
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: -window.scrollY,
        },
      });
    });
  } finally {
    document.body.removeChild(wrapper);
  }
}

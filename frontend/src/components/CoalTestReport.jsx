import { useRef, useState, useEffect } from 'react';
import { api } from '../lib/api';

function dd(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`;
}
function byName(tests, name) { return tests.find(t => t.test_name === name); }

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

export default function CoalTestReport({ sample, tests, onClose }) {
  const reportRef = useRef();
  const [busy,     setBusy]     = useState(false);
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // ── Load html2pdf from CDN + lab settings on mount ──────────────────────────
  useEffect(() => {
    if (!window.html2pdf) {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      document.head.appendChild(s);
    }
    api.getSettings()
      .then(data => setSettings(data))
      .catch(() => setSettings({}))
      .finally(() => setSettingsLoading(false));
  }, []);

  const downloadPdf = async () => {
    if (!reportRef.current) return;
    setBusy(true);
    try {
      await new Promise(res => {
        if (window.html2pdf) return res();
        const iv = setInterval(() => { if (window.html2pdf) { clearInterval(iv); res(); } }, 100);
      });
      await window.html2pdf()
        .set({
          margin: 0,
          filename: `TestReport_${sample.lab_internal_id || sample.sample_ref_id || 'report'}.pdf`,
          image:       { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak:   { mode: 'avoid-all' },
        })
        .from(reportRef.current)
        .save();
    } catch (e) { alert('PDF failed: ' + e.message); }
    finally { setBusy(false); }
  };

  // ── test values ───────────────────────────────────────────────────────────
  const tTM  = byName(tests, 'Total Moisture (TM)');
  const tAM  = byName(tests, 'Moisture (ADB)');
  const tAA  = byName(tests, 'Ash (ADB)');
  const tGCV = byName(tests, 'Gross Calorific Value');
  const tEQM = byName(tests, 'Moisture (EQ)');
  const tVM  = byName(tests, 'Volatile Matter (ADB)');

  const eqGcv  = tGCV?.result_value ? Math.round(parseFloat(tGCV.result_value) * 0.99) : null;
  const grade  = deriveGrade(eqGcv);
  const recv   = dd(sample.group_created_at);
  const start  = dd(tTM?.submitted_at  || tAM?.submitted_at  || tGCV?.submitted_at);
  const end    = dd(tTM?.reviewed_at   || tAM?.reviewed_at   || tGCV?.reviewed_at);
  const period = start && end ? `${start} to\n${end}` : '—';
  const rptDate= end || dd(new Date());
  const auth   = tGCV?.assigned_by_name || tAM?.assigned_by_name || tTM?.assigned_by_name || '—';
  const parrImg= tGCV?.image_url || null;
  const rptNo  = sample.lab_internal_id || sample.sample_ref_id || '—';
  const today  = dd(new Date());

  // Images — locked, come from settings set by super admin
  const logoImg  = settings?.logo_url          || null;
  const accImg   = settings?.accreditation_url || null;
  const stampImg = settings?.stamp_url         || null;
  const sigImg   = settings?.signature_url     || null;

  // Lab info from settings with fallbacks
  const labName    = settings?.lab_name    || 'Ravi Energie Laboratory';
  const labAddress = settings?.lab_address || 'Plot No14, AstankarBhavan, Behind TukaramSabhagruha, SuyogNagar, District Nagpur - 440015, Maharashtra, India.';
  const labPhone   = settings?.lab_phone   || '+91 8320021741';
  const labEmail   = settings?.lab_email   || 'lab@ravienergie.com';
  const labWebsite = settings?.lab_website || 'www.ravienergie.com';
  const corpOffice = settings?.corp_office || 'S15 A/B India Bulls Mega Mall, Jetalpur Road, Vadodara – 390 020, India';

  const b  = '1px solid #000';
  const b2 = '1.5px solid #000';

  const TH = (ex={}) => ({
    padding:'2px 3px', fontSize:7.5, textAlign:'center',
    fontWeight:'bold', borderRight:b, borderBottom:b, lineHeight:1.3, ...ex,
  });
  const TD = (ex={}) => ({
    padding:'3px 3px', fontSize:10, textAlign:'center',
    borderRight:b, whiteSpace:'pre-line', ...ex,
  });

  // ── A4 PAGE — every section has a fixed height so total = exactly 1123px ───
  const Page = () => (
    <div ref={reportRef} style={{
      width:794, height:1123, overflow:'hidden',
      background:'#fff', fontFamily:"'Times New Roman',Times,serif",
      fontSize:10, color:'#000', boxSizing:'border-box',
      padding:'10px 15px 10px 15px',
      display:'flex', flexDirection:'column',
    }}>

      {/* HEADER — h:57 */}
      <div style={{ height:57, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, marginBottom:3 }}>
        <div style={{ width:96, height:54, flexShrink:0 }}>
          {logoImg
            ? <img src={logoImg} alt="logo" style={{ width:96, height:54, objectFit:'contain' }} />
            : <div style={{ width:96, height:54, border:'1px dashed #ccc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#ccc', textAlign:'center' }}>Logo</div>}
        </div>
        <div style={{ textAlign:'center', flex:1 }}>
          <div style={{ fontSize:16, fontWeight:'bold', letterSpacing:0.3 }}>{labName}</div>
        </div>
        <div style={{ width:96, height:54, display:'flex', justifyContent:'flex-end', alignItems:'center', flexShrink:0 }}>
          {accImg
            ? <img src={accImg} alt="accreditation" style={{ width:96, height:54, objectFit:'contain' }} />
            : <div style={{ width:96, height:54, border:'1px dashed #ccc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#ccc', textAlign:'center' }}>Accreditation</div>}
        </div>
      </div>

      {/* ADDRESS BAR — h:13 */}
      <div style={{ height:13, borderTop:'2px solid #000', borderBottom:'1px solid #000', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:6.5, flexShrink:0, marginBottom:2, overflow:'hidden', paddingLeft:2, paddingRight:2 }}>
        <span>Laboratory: {labAddress}</span>
        <span>Phone:{labPhone} | Email: {labEmail} | Website: {labWebsite}</span>
      </div>

      {/* FORMAT LINE — h:13 */}
      <div style={{ height:13, fontSize:6.5, textAlign:'right', color:'#555', flexShrink:0, marginBottom:3, display:'flex', alignItems:'center', justifyContent:'flex-end' }}>
        Format: QCI/F25/09/01/QCI-CIL &nbsp;&nbsp; Date: {today} &nbsp;&nbsp; Rev: 04
      </div>

      {/* TITLE BOX — h:62 */}
      <div style={{ height:62, flexShrink:0, marginBottom:0, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', border:b2 }}>
          <tbody>
            <tr>
              <td colSpan={5} style={{ textAlign:'center', padding:'2px 0 1px', borderBottom:b }}>
                <div style={{ fontSize:14, fontWeight:'bold', letterSpacing:1 }}>TEST REPORT</div>
                <div style={{ fontSize:7.5 }}>{rptNo}</div>
              </td>
            </tr>
            <tr>
              <td style={{ padding:'1px 5px', borderRight:b, borderBottom:b, fontWeight:'bold', fontSize:8.5 }}>Discipline</td>
              <td style={{ padding:'1px 5px', borderRight:b, borderBottom:b, fontSize:8.5 }}>Chemical</td>
              <td style={{ padding:'1px 5px', borderRight:b, borderBottom:b, fontWeight:'bold', fontSize:8.5 }}>Group</td>
              <td colSpan={2} style={{ padding:'1px 5px', borderBottom:b, fontSize:8.5 }}>Solid Fuels</td>
            </tr>
            <tr>
              <td style={{ padding:'0px 5px', borderRight:b, borderBottom:b, fontSize:7, color:'#555' }}>Test Report No</td>
              <td style={{ padding:'0px 5px', borderRight:b, borderBottom:b, fontSize:7, color:'#555' }}>Report date</td>
              <td style={{ padding:'0px 5px', borderRight:b, borderBottom:b, fontSize:7, color:'#555' }}>Customer PO</td>
              <td style={{ padding:'0px 5px', borderRight:b, borderBottom:b, fontSize:7, color:'#555' }}>Date</td>
              <td style={{ padding:'0px 5px', borderBottom:b, fontSize:7, color:'#555' }}>Text Pages</td>
            </tr>
            <tr>
              <td style={{ padding:'1px 5px', borderRight:b, fontWeight:'bold', fontSize:9.5 }}>{rptNo}</td>
              <td style={{ padding:'1px 5px', borderRight:b, fontWeight:'bold', fontSize:9.5 }}>{rptDate}</td>
              <td style={{ padding:'1px 5px', borderRight:b, fontSize:9 }}>{sample.group_ref_id || '—'}</td>
              <td style={{ padding:'1px 5px', borderRight:b, fontSize:9 }}>{dd(sample.group_created_at)}</td>
              <td style={{ padding:'1px 5px', fontSize:9 }}>1</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* CUSTOMER BOX — h:88 */}
      <div style={{ height:88, flexShrink:0, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', border:b, borderTop:'none' }}>
          <tbody>
            <tr>
              <td style={{ width:'50%', padding:'1px 5px', borderRight:b, borderBottom:b, fontSize:7, color:'#555' }}>Customer Name and address</td>
              <td style={{ padding:'1px 5px', borderBottom:b, fontSize:7, color:'#555' }}>Description of test item:- <strong>COAL</strong></td>
            </tr>
            <tr>
              <td style={{ height:64, padding:'2px 5px', borderRight:b, fontSize:10, verticalAlign:'top', overflow:'hidden' }}>
                <div style={{ overflow:'hidden', maxHeight:60 }}>
                  <strong>{sample.client_name || '—'}</strong>
                  {sample.client_address && <><br/><span style={{ fontSize:8.5 }}>{sample.client_address.replace(/\n/g,', ')}</span></>}
                  {sample.contact_person && <><br/><span style={{ fontSize:8, color:'#555' }}>Attn: {sample.contact_person}</span></>}
                </div>
              </td>
              <td style={{ height:64, padding:'2px 5px', fontSize:10, verticalAlign:'top' }}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* AMBIENT ROW — h:26 */}
      <div style={{ height:26, flexShrink:0, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', border:b, borderTop:'none' }}>
          <tbody>
            <tr>
              <td style={{ padding:'0px 5px', fontSize:7, color:'#555', borderRight:b, width:'25%' }}>Ambient Humidity (% RH)</td>
              <td style={{ padding:'0px 5px', fontSize:7, color:'#555', borderRight:b, width:'25%' }}>Ambient Temperature (°C)</td>
              <td style={{ padding:'0px 5px', fontSize:7, color:'#555', borderRight:b, width:'25%' }}>Customer Sample ID</td>
              <td style={{ padding:'0px 5px', fontSize:7, color:'#555', width:'25%' }}>Sample lab ID</td>
            </tr>
            <tr>
              <td style={{ padding:'0px 5px', fontWeight:'bold', fontSize:11, borderRight:b }}>{sample.ambient_humidity || '—'}</td>
              <td style={{ padding:'0px 5px', fontWeight:'bold', fontSize:11, borderRight:b }}>{sample.ambient_temp     || '—'}</td>
              <td style={{ padding:'0px 5px', fontWeight:'bold', fontSize:11, borderRight:b }}>{sample.sample_ref_id   || '—'}</td>
              <td style={{ padding:'0px 5px', fontWeight:'bold', fontSize:11 }}>{sample.lab_internal_id || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* TEST METHOD — h:16 */}
      <div style={{ height:16, flexShrink:0, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', border:b, borderTop:'none' }}>
          <tbody>
            <tr>
              <td style={{ padding:'2px 5px', fontSize:8.5, fontWeight:'bold' }}>
                Test Method :IS1350 (Part-I) :2025 for TM and Proximate and IS1350 (Part-II) : 2022 for GCV analysis
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* TEST RESULTS TABLE — h:60 */}
      <div style={{ height:60, flexShrink:0, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', border:b, borderTop:'none' }}>
          <thead>
            <tr>
              <td colSpan={10} style={{ textAlign:'center', fontWeight:'bold', fontSize:10, padding:'2px 0', borderBottom:b }}>Test Results</td>
            </tr>
            <tr>
              <th rowSpan={2} style={TH({ verticalAlign:'middle', width:'9%' })}>Date of<br/>sample<br/>receipt</th>
              <th rowSpan={2} style={TH({ verticalAlign:'middle', width:'13%' })}>Period of<br/>analysis</th>
              <th rowSpan={2} style={TH({ verticalAlign:'middle', width:'8%' })}>Total<br/>Moisture<br/>(%)</th>
              <th colSpan={3} style={TH({ borderBottom:b })}>Air Dried Basis (ADB) &nbsp;</th>
              <th colSpan={3} style={TH({ borderBottom:b })}>Equilibrated basis (60% RH and 40°C)</th>
              <th rowSpan={2} style={TH({ borderRight:'none', verticalAlign:'middle', width:'6%' })}>Grade</th>
            </tr>
            <tr>
              <th style={TH()}>Moisture<br/>(%)</th>
              <th style={TH()}>Ash<br/>(%)</th>
              <th style={TH()}>GCV<br/>(kCal/kg)</th>
              <th style={TH()}>Moisture<br/>(%)</th>
              <th style={TH()}>Ash<br/>(%)</th>
              <th style={TH()}>GCV<br/>(kCal/kg)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={TD()}>{recv}</td>
              <td style={TD({ fontSize:7.5 })}>{period}</td>
              <td style={TD()}>{tTM?.result_value  ?? '—'}</td>
              <td style={TD()}>{tAM?.result_value  ?? '—'}</td>
              <td style={TD()}>{tAA?.result_value  ?? '—'}</td>
              <td style={TD()}>{tGCV?.result_value ?? '—'}</td>
              <td style={TD()}>{tEQM?.result_value ?? '—'}</td>
              <td style={TD({ color:'#999' })}>—</td>
              <td style={TD({ color: eqGcv ? '#000' : '#999' })}>{eqGcv ?? '—'}</td>
              <td style={TD({ borderRight:'none', fontWeight:'bold', fontSize:11 })}>{grade}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* PARR IMAGE + SIGNATURE — h:196 */}
      <div style={{ height:196, flexShrink:0, display:'flex', gap:6, marginTop:5, overflow:'hidden' }}>
        <div style={{ width:'60%', height:196, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
          {parrImg
            ? <img src={parrImg} alt="Parr calorimeter" style={{ maxWidth:'100%', maxHeight:196, objectFit:'contain' }} />
            : <div style={{ border:'1px dashed #ccc', width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#bbb', fontSize:8.5, gap:4 }}>
                <span style={{ fontSize:20 }}>🖨️</span>
                <span>Parr 6400 Calorimeter printout</span>
                <span style={{ fontSize:7.5 }}>Upload image via GCV test</span>
              </div>}
        </div>
        <div style={{ width:'40%', height:196, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:5 }}>
          {stampImg
            ? <img src={stampImg} alt="stamp" style={{ width:68, height:68, objectFit:'contain' }} />
            : <div style={{ width:68, height:68, borderRadius:'50%', border:'1px dashed #ccc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:7.5, color:'#ccc' }}>Stamp</div>}
          <div style={{ fontSize:8.5, color:'#333', textAlign:'center' }}>Reviewed and Authorised By</div>
          {sigImg
            ? <img src={sigImg} alt="signature" style={{ maxWidth:140, maxHeight:38, objectFit:'contain' }} />
            : <div style={{ width:140, height:26, borderBottom:'1px solid #333', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:2, fontSize:7.5, color:'#ccc', fontStyle:'italic' }}>Signature</div>}
          <div style={{ fontSize:10, fontWeight:'bold', textAlign:'center' }}>{auth}</div>
        </div>
      </div>

      {/* DECLARATION — h:78 */}
      <div style={{ height:78, flexShrink:0, marginTop:5, fontSize:7.5, lineHeight:1.42, color:'#111', overflow:'hidden' }}>
        <span style={{ fontWeight:'bold' }}>Declaration: </span>
        1. The test results relates only to the sample submitted for testing and as per Lab scope. Product endorsement is neither inferred nor implied.{' '}
        2. This report cannot be reproduced except in full without prior written approval from the laboratory head.{' '}
        3. The report cannot be used as an evidence in the court of law, without written approval of laboratory.{' '}
        4. The sample will be retained for three months.{' '}
        5. Total liability of the laboratory of this report is limited only to the invoiced amount.{' '}
        6. All disputes are subject to Vadodara Jurisdiction.{' '}
        7. Sampling is not done by the laboratory.{' '}
        8. This report relates to only to the particular sample as received for testing.{' '}
        9. Grade of coal is given basis of Gcv on EQ Basis as per Gazzette notification from Ministry of coal for Declaration of Grade.
      </div>

      {/* END OF REPORT — h:14 */}
      <div style={{ height:14, flexShrink:0, textAlign:'center', fontSize:8.5, fontWeight:'bold', letterSpacing:0.4, display:'flex', alignItems:'center', justifyContent:'center' }}>
        ---------------END OF REPORT---------------
      </div>

      {/* FOOTER — h:38, pinned to bottom */}
      <div style={{ height:38, flexShrink:0, borderTop:'2px solid #000', paddingTop:3, display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginTop:'auto', overflow:'hidden' }}>
        <div style={{ fontSize:6.5, width:'32%', lineHeight:1.35 }}>
          Laboratory: {labAddress}<br/>
          <span style={{ color:'#555' }}>Format: QCI/F25/09/01/QCI-CIL &nbsp; Date: {today} &nbsp; Rev: 04</span>
        </div>
        <div style={{ textAlign:'center', flex:1 }}>
          <div style={{ fontSize:7.5, color:'#666' }}>Unit of</div>
          <div style={{ fontSize:18, fontWeight:'bold', fontFamily:'Georgia,serif' }}>
            Ravi Energie<span style={{ fontStyle:'italic' }}> Pvt. Ltd</span>
          </div>
        </div>
        <div style={{ fontSize:6.5, width:'26%', textAlign:'right', lineHeight:1.35 }}>
          {corpOffice}<br/>
          Phone: {labPhone} | Email: {labEmail}<br/>
          Website: {labWebsite}
        </div>
      </div>

    </div>
  );

  // ── SHELL ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', height:'100vh', background:'#dde3ec', fontFamily:"'Segoe UI',Helvetica,sans-serif", overflow:'hidden' }}>

      {/* SIDEBAR */}
      <div style={{ width:265, background:'#fff', borderRight:'1px solid #e2e8f0', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'13px 15px 10px', background:'#111827', borderBottom:'1px solid #1f2937' }}>
          <div style={{ color:'#f9fafb', fontWeight:700, fontSize:13 }}>🧾 Test Report</div>
          <div style={{ color:'#9ca3af', fontSize:10.5, marginTop:2 }}>
            {sample.lab_internal_id || sample.sample_ref_id} · {sample.client_name}
          </div>
        </div>

        {/* Data summary */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 14px' }}>
          {settingsLoading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'20px 0' }}>
              <div style={{ width:18, height:18, border:'2px solid #e5e7eb', borderTopColor:'#111827', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <div style={{ fontSize:11.5 }}>
              {/* Images status */}
              <SD label="Report Images" />
              <SR label="Logo"          v={logoImg  ? '✓ Set' : '✗ Not set'} ok={!!logoImg} />
              <SR label="Accreditation" v={accImg   ? '✓ Set' : '✗ Not set'} ok={!!accImg} />
              <SR label="Stamp"         v={stampImg ? '✓ Set' : '✗ Not set'} ok={!!stampImg} />
              <SR label="Signature"     v={sigImg   ? '✓ Set' : '✗ Not set'} ok={!!sigImg} />
              {(!logoImg || !accImg || !stampImg || !sigImg) && (
                <div style={{ fontSize:10, color:'#d97706', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:6, padding:'6px 8px', marginTop:6, lineHeight:1.5 }}>
                  Some images are not set. Ask the super admin to upload them in Lab Settings.
                </div>
              )}
              {/* Test data */}
              <SD label="Sample Info" />
              <SR label="Lab ID"        v={sample.lab_internal_id} />
              <SR label="Sample Ref"    v={sample.sample_ref_id} />
              <SR label="Client"        v={sample.client_name} />
              <SR label="Date Received" v={recv} />
              <SR label="Report Date"   v={rptDate} />
              <SD label="Test Results" />
              <SR label="Total Moisture"  v={tTM  ? `${tTM.result_value} %`        : '—'} />
              <SR label="Moisture ADB"    v={tAM  ? `${tAM.result_value} %`        : '—'} />
              <SR label="Ash ADB"         v={tAA  ? `${tAA.result_value} %`        : '—'} />
              <SR label="GCV ADB"         v={tGCV ? `${tGCV.result_value} kCal/kg` : '—'} />
              <SR label="VM ADB"          v={tVM  ? `${tVM.result_value} %`        : '—'} />
              <SR label="Moisture EQ"     v={tEQM ? `${tEQM.result_value} %`       : '—'} />
              <SR label="GCV EQ (est.)"   v={eqGcv ? `${eqGcv} kCal/kg`           : '—'} />
              <SR label="Grade"           v={grade} hi />
              <SR label="Parr Image"      v={parrImg ? '✓ Attached' : '✗ Missing'} ok={!!parrImg} />
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ padding:'10px 14px', borderTop:'1px solid #e2e8f0', display:'flex', flexDirection:'column', gap:7 }}>
          <button onClick={downloadPdf} disabled={busy || settingsLoading} style={{
            width:'100%', padding:'10px 0',
            background: (busy || settingsLoading) ? '#4b5563' : '#111827',
            color:'#fff', border:'none', borderRadius:7,
            fontWeight:700, fontSize:13, cursor: (busy || settingsLoading) ? 'not-allowed' : 'pointer',
          }}>
            {busy ? '⏳ Generating…' : settingsLoading ? '⏳ Loading…' : '⬇️ Download PDF'}
          </button>
          <button onClick={onClose} style={{
            width:'100%', padding:'8px 0', background:'#fff', color:'#6b7280',
            border:'1.5px solid #e5e7eb', borderRadius:7, fontWeight:600, fontSize:12, cursor:'pointer',
          }}>
            ← Back to Reports
          </button>
          <div style={{ textAlign:'center', fontSize:9.5, color:'#9ca3af' }}>Single-page A4 · portrait</div>
        </div>
      </div>

      {/* LIVE PREVIEW */}
      <div style={{ flex:1, overflowY:'auto', padding:'22px 18px', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ marginBottom:10, alignSelf:'flex-start', color:'#6b7280', fontSize:10.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em' }}>
          Live Preview — A4 (794 × 1123 px)
        </div>
        <div style={{ boxShadow:'0 6px 36px rgba(0,0,0,0.16)', borderRadius:2, flexShrink:0 }}>
          <Page />
        </div>
      </div>
    </div>
  );
}

function SR({ label, v, mono, hi, ok }) {
  const color = ok === true ? '#16a34a' : ok === false ? '#dc2626' : hi ? '#1d4ed8' : '#111827';
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0', borderBottom:'1px solid #f3f4f6' }}>
      <span style={{ color:'#6b7280', fontSize:10.5 }}>{label}</span>
      <span style={{ fontWeight: hi ? 800 : 600, fontSize:10.5, color, fontFamily: mono ? 'monospace' : 'inherit' }}>{v || '—'}</span>
    </div>
  );
}
function SD({ label }) {
  return (
    <div style={{ fontSize:9.5, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.07em', margin:'10px 0 5px', paddingBottom:3, borderBottom:'2px solid #f3f4f6' }}>
      {label}
    </div>
  );
}
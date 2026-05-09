import { useRef, useState, useEffect } from 'react';

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
  const [logoImg,  setLogoImg]  = useState(null);
  const [accImg,   setAccImg]   = useState(null);
  const [stampImg, setStampImg] = useState(null);
  const [sigImg,   setSigImg]   = useState(null);
  const [tab,      setTab]      = useState('data');
  const [busy,     setBusy]     = useState(false);

  const logoRef  = useRef(); const accRef  = useRef();
  const stampRef = useRef(); const sigRef  = useRef();

  const upload = (e, set) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => set(ev.target.result);
    r.readAsDataURL(f);
  };

  useEffect(() => {
    if (window.html2pdf) return;
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    document.head.appendChild(s);
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
          image:      { type: 'jpeg', quality: 0.98 },
          html2canvas:{ scale: 2, useCORS: true, logging: false },
          jsPDF:      { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak:  { mode: 'avoid-all' },
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
  const start  = dd(tTM?.submitted_at || tAM?.submitted_at || tGCV?.submitted_at);
  const end    = dd(tTM?.reviewed_at  || tAM?.reviewed_at  || tGCV?.reviewed_at);
  const period = start && end ? `${start} to\n${end}` : '—';
  const rptDate= end || dd(new Date());
  const auth   = tGCV?.assigned_by_name || tAM?.assigned_by_name || tTM?.assigned_by_name || '—';
  const parrImg= tGCV?.image_url || null;
  const rptNo  = sample.lab_internal_id || sample.sample_ref_id || '—';
  const today  = dd(new Date());

  const b   = '1px solid #000';
  const b2  = '2px solid #000';

  const ImgUpload = ({ label, val, set, ref_ }) => (
    <div style={{ marginBottom:12 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'#64748b', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>
      <div onClick={() => ref_.current?.click()} style={{ border:`2px dashed ${val?'#94a3b8':'#cbd5e1'}`, borderRadius:6, padding:10, textAlign:'center', cursor:'pointer', background:val?'#f8fafc':'#f1f5f9', minHeight:64, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:3 }}>
        {val ? <img src={val} alt={label} style={{ maxHeight:60, maxWidth:'100%', objectFit:'contain' }} />
             : <><span style={{ fontSize:16 }}>📎</span><span style={{ fontSize:10, color:'#94a3b8' }}>Click to upload</span></>}
      </div>
      <input ref={ref_} type="file" accept="image/*" style={{ display:'none' }} onChange={e => upload(e, set)} />
    </div>
  );

  // ── A4 page ───────────────────────────────────────────────────────────────
  const Page = () => (
    <div ref={reportRef} style={{
      width: 794, height: 1123, overflow: 'hidden',
      background: '#fff', fontFamily: "'Times New Roman', Times, serif",
      fontSize: 10, color: '#000', boxSizing: 'border-box',
      padding: '10px 16px 8px 16px',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── HEADER ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2, flexShrink:0 }}>
        {/* Logo */}
        <div style={{ width:90, height:52, display:'flex', alignItems:'center' }}>
          {logoImg
            ? <img src={logoImg} alt="logo" style={{ maxWidth:90, maxHeight:52, objectFit:'contain' }} />
            : <div style={{ width:90, height:52, border:'1px dashed #bbb', display:'flex', alignItems:'center', justifyContent:'center', fontSize:7.5, color:'#bbb', textAlign:'center' }}>Logo</div>}
        </div>
        {/* Lab name center */}
        <div style={{ textAlign:'center', flex:1 }}>
          <div style={{ fontSize:17, fontWeight:'bold', letterSpacing:0.5 }}>Ravi Energie Laboratory</div>
        </div>
        {/* Accreditation right */}
        <div style={{ width:90, height:52, display:'flex', alignItems:'center', justifyContent:'flex-end' }}>
          {accImg
            ? <img src={accImg} alt="acc" style={{ maxWidth:90, maxHeight:52, objectFit:'contain' }} />
            : <div style={{ width:90, height:52, border:'1px dashed #bbb', display:'flex', alignItems:'center', justifyContent:'center', fontSize:7.5, color:'#bbb', textAlign:'center' }}>Accreditation</div>}
        </div>
      </div>

      {/* ── ADDRESS BAR ── */}
      <div style={{ borderTop:b2, borderBottom:b, padding:'1.5px 0', marginBottom:1.5, display:'flex', justifyContent:'space-between', fontSize:7, flexShrink:0 }}>
        <span>Laboratory: Plot No-14, AstankarBhavan, Behind TukaramSabhagruha, SuyogNagar, District Nagpur - 440015, Maharashtra, India.</span>
        <span>Phone:+91 8320021741 &nbsp;|&nbsp; Email: lab@ravienergie.com &nbsp;|&nbsp; Website: www.ravienergie.com</span>
      </div>

      {/* Format line */}
      <div style={{ fontSize:7, textAlign:'right', marginBottom:3, color:'#444', flexShrink:0 }}>
        Format: QCI/F25/09/01/QCI-CIL &nbsp;&nbsp; Date: {today} &nbsp;&nbsp; Rev: 04
      </div>

      {/* ── TITLE BOX ── */}
      <table style={{ width:'100%', borderCollapse:'collapse', border:b2, marginBottom:0, flexShrink:0 }}>
        <tbody>
          <tr>
            <td colSpan={5} style={{ textAlign:'center', padding:'3px 0 1px', borderBottom:b }}>
              <div style={{ fontSize:15, fontWeight:'bold', letterSpacing:1 }}>TEST REPORT</div>
              <div style={{ fontSize:8 }}>{rptNo}</div>
            </td>
          </tr>
          <tr>
            <td style={{ padding:'2px 6px', borderRight:b, borderBottom:b, fontWeight:'bold', fontSize:9 }}>Discipline</td>
            <td style={{ padding:'2px 6px', borderRight:b, borderBottom:b, fontSize:9 }}>Chemical</td>
            <td style={{ padding:'2px 6px', borderRight:b, borderBottom:b, fontWeight:'bold', fontSize:9 }}>Group</td>
            <td colSpan={2} style={{ padding:'2px 6px', borderBottom:b, fontSize:9 }}>Solid Fuels</td>
          </tr>
          <tr>
            <td style={{ padding:'1px 6px', borderRight:b, borderBottom:b, fontSize:7.5, color:'#555' }}>Test Report No</td>
            <td style={{ padding:'1px 6px', borderRight:b, borderBottom:b, fontSize:7.5, color:'#555' }}>Report date</td>
            <td style={{ padding:'1px 6px', borderRight:b, borderBottom:b, fontSize:7.5, color:'#555' }}>Customer PO</td>
            <td style={{ padding:'1px 6px', borderRight:b, borderBottom:b, fontSize:7.5, color:'#555' }}>Date</td>
            <td style={{ padding:'1px 6px', borderBottom:b, fontSize:7.5, color:'#555' }}>Text Pages</td>
          </tr>
          <tr>
            <td style={{ padding:'2px 6px', borderRight:b, fontWeight:'bold', fontSize:10 }}>{rptNo}</td>
            <td style={{ padding:'2px 6px', borderRight:b, fontWeight:'bold', fontSize:10 }}>{rptDate}</td>
            <td style={{ padding:'2px 6px', borderRight:b, fontSize:9.5 }}>{sample.group_ref_id || '—'}</td>
            <td style={{ padding:'2px 6px', borderRight:b, fontSize:9.5 }}>{dd(sample.group_created_at)}</td>
            <td style={{ padding:'2px 6px', fontSize:9.5 }}>1</td>
          </tr>
        </tbody>
      </table>

      {/* ── CUSTOMER / DESCRIPTION ── */}
      <table style={{ width:'100%', borderCollapse:'collapse', border:b, borderTop:'none', flexShrink:0 }}>
        <tbody>
          <tr>
            <td style={{ width:'50%', padding:'2px 6px', borderRight:b, borderBottom:b, fontSize:7.5, color:'#555' }}>Customer Name and address</td>
            <td style={{ padding:'2px 6px', borderBottom:b, fontSize:7.5, color:'#555' }}>Description of test item:- <strong>COAL</strong></td>
          </tr>
          <tr>
            <td style={{ padding:'3px 6px 7px', borderRight:b, borderBottom:b, fontSize:10, verticalAlign:'top' }}>
              <strong>{sample.client_name || '—'}</strong>
              {sample.client_address && sample.client_address.split('\n').map((l,i) => <span key={i}><br/>{l}</span>)}
              {sample.contact_person && <><br/><span style={{ fontSize:8, color:'#555' }}>Attn: {sample.contact_person}</span></>}
            </td>
            <td style={{ padding:'3px 6px 7px', borderBottom:b, fontSize:10, verticalAlign:'top' }}></td>
          </tr>
          {/* Ambient row */}
          <tr>
            <td colSpan={2} style={{ padding:0, borderBottom:b }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding:'1px 6px', fontSize:7.5, color:'#555', borderRight:b, width:'25%' }}>Ambient Humidity (% RH)</td>
                    <td style={{ padding:'1px 6px', fontSize:7.5, color:'#555', borderRight:b, width:'25%' }}>Ambient Temperature (°C)</td>
                    <td style={{ padding:'1px 6px', fontSize:7.5, color:'#555', borderRight:b, width:'25%' }}>Customer Sample ID</td>
                    <td style={{ padding:'1px 6px', fontSize:7.5, color:'#555', width:'25%' }}>Sample lab ID</td>
                  </tr>
                  <tr>
                    <td style={{ padding:'2px 6px', fontWeight:'bold', fontSize:12, borderRight:b }}>{sample.ambient_humidity || '—'}</td>
                    <td style={{ padding:'2px 6px', fontWeight:'bold', fontSize:12, borderRight:b }}>{sample.ambient_temp || '—'}</td>
                    <td style={{ padding:'2px 6px', fontWeight:'bold', fontSize:12, borderRight:b }}>{sample.sample_ref_id || '—'}</td>
                    <td style={{ padding:'2px 6px', fontWeight:'bold', fontSize:12 }}>{sample.lab_internal_id || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          {/* Test method */}
          <tr>
            <td colSpan={2} style={{ padding:'3px 6px', fontSize:8.5, fontStyle:'italic', fontWeight:'bold' }}>
              Test Method :IS1350 (Part-I) :2025 for TM and Proximate and IS1350 (Part-II) : 2022 for GCV analysis
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── TEST RESULTS TABLE ── */}
      <table style={{ width:'100%', borderCollapse:'collapse', border:b, borderTop:'none', flexShrink:0 }}>
        <thead>
          <tr>
            <td colSpan={9} style={{ textAlign:'center', fontWeight:'bold', fontSize:11, padding:'2px 0', borderBottom:b }}>Test Results</td>
          </tr>
          <tr>
            {/* rowspan cells */}
            <th rowSpan={2} style={{ padding:'2px 3px', fontSize:8, textAlign:'center', fontWeight:'normal', borderRight:b, borderBottom:b, verticalAlign:'middle', width:'9%' }}>Date of<br/>sample<br/>receipt</th>
            <th rowSpan={2} style={{ padding:'2px 3px', fontSize:8, textAlign:'center', fontWeight:'normal', borderRight:b, borderBottom:b, verticalAlign:'middle', width:'13%' }}>Period of<br/>analysis</th>
            <th rowSpan={2} style={{ padding:'2px 3px', fontSize:8, textAlign:'center', fontWeight:'normal', borderRight:b, borderBottom:b, verticalAlign:'middle', width:'8%' }}>Total<br/>Moisture<br/>(%)</th>
            {/* ADB group */}
            <th colSpan={3} style={{ padding:'2px 3px', fontSize:8, textAlign:'center', fontWeight:'normal', borderRight:b, borderBottom:b }}>Air Dried Basis (ADB)</th>
            {/* EQ group */}
            <th colSpan={3} style={{ padding:'2px 3px', fontSize:8, textAlign:'center', fontWeight:'normal', borderBottom:b }}>Equilibrated basis (60% RH and 40°C)</th>
          </tr>
          <tr>
            <th style={{ padding:'2px 3px', fontSize:8, textAlign:'center', fontWeight:'normal', borderRight:b, borderBottom:b }}>Moisture<br/>(%)</th>
            <th style={{ padding:'2px 3px', fontSize:8, textAlign:'center', fontWeight:'normal', borderRight:b, borderBottom:b }}>Ash<br/>(%)</th>
            <th style={{ padding:'2px 3px', fontSize:8, textAlign:'center', fontWeight:'normal', borderRight:b, borderBottom:b }}>GCV<br/>(kCal/kg)</th>
            <th style={{ padding:'2px 3px', fontSize:8, textAlign:'center', fontWeight:'normal', borderRight:b, borderBottom:b }}>Moisture<br/>(%)</th>
            <th style={{ padding:'2px 3px', fontSize:8, textAlign:'center', fontWeight:'normal', borderRight:b, borderBottom:b }}>Ash<br/>(%)</th>
            {/* last col: GCV + Grade combined like reference */}
            <th style={{ padding:'2px 3px', fontSize:8, textAlign:'center', fontWeight:'normal', borderBottom:b }}>GCV<br/>(kCal/kg) &nbsp; Grade</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding:'4px 3px', fontSize:10, textAlign:'center', borderRight:b }}>{recv}</td>
            <td style={{ padding:'4px 3px', fontSize:8.5, textAlign:'center', borderRight:b, whiteSpace:'pre-line' }}>{period}</td>
            <td style={{ padding:'4px 3px', fontSize:10, textAlign:'center', borderRight:b }}>{tTM?.result_value  ?? '—'}</td>
            <td style={{ padding:'4px 3px', fontSize:10, textAlign:'center', borderRight:b }}>{tAM?.result_value  ?? '—'}</td>
            <td style={{ padding:'4px 3px', fontSize:10, textAlign:'center', borderRight:b }}>{tAA?.result_value  ?? '—'}</td>
            <td style={{ padding:'4px 3px', fontSize:10, textAlign:'center', borderRight:b }}>{tGCV?.result_value ?? '—'}</td>
            <td style={{ padding:'4px 3px', fontSize:10, textAlign:'center', borderRight:b }}>{tEQM?.result_value ?? '—'}</td>
            {/* EQ Ash — not tracked, placeholder */}
            <td style={{ padding:'4px 3px', fontSize:10, textAlign:'center', borderRight:b, color:'#999' }}>—</td>
            {/* EQ GCV + Grade */}
            <td style={{ padding:'4px 3px', fontSize:10, textAlign:'center' }}>
              {eqGcv ?? '—'}&nbsp;&nbsp;<strong style={{ fontSize:11 }}>{grade}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── PARR IMAGE (left) + STAMP + SIGNATURE (right) ── */}
      <div style={{ display:'flex', gap:8, marginTop:6, flexShrink:0, alignItems:'flex-start', height:148 }}>
        {/* Parr image */}
        <div style={{ flex:'0 0 60%', height:148, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {parrImg
            ? <img src={parrImg} alt="Parr" crossOrigin="anonymous" style={{ maxWidth:'100%', maxHeight:148, objectFit:'contain', display:'block' }} />
            : <div style={{ border:'1px dashed #bbb', width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#bbb', fontSize:8.5, gap:4 }}>
                <span style={{ fontSize:18 }}>🖨️</span>
                <span>Parr 6400 Calorimeter printout</span>
                <span style={{ fontSize:7.5 }}>Upload image via GCV test</span>
              </div>}
        </div>
        {/* Auth block */}
        <div style={{ flex:'0 0 38%', height:148, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 }}>
          {stampImg
            ? <img src={stampImg} alt="stamp" style={{ width:68, height:68, objectFit:'contain' }} />
            : <div style={{ width:68, height:68, borderRadius:'50%', border:'1px dashed #bbb', display:'flex', alignItems:'center', justifyContent:'center', fontSize:7.5, color:'#bbb', textAlign:'center' }}>Stamp</div>}
          <div style={{ fontSize:8, color:'#333', textAlign:'center' }}>Reviewed and Authorised By</div>
          {sigImg
            ? <img src={sigImg} alt="sig" style={{ maxWidth:140, maxHeight:36, objectFit:'contain' }} />
            : <div style={{ width:140, height:28, borderBottom:'1px solid #333', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:2, fontSize:7.5, color:'#bbb', fontStyle:'italic' }}>Signature</div>}
          <div style={{ fontSize:10, fontWeight:'bold', textAlign:'center' }}>{auth}</div>
        </div>
      </div>

      {/* ── DECLARATION ── */}
      <div style={{ marginTop:5, fontSize:7.5, lineHeight:1.45, color:'#111', flexShrink:0 }}>
        <span style={{ fontWeight:'bold' }}>Declaration: </span>
        1. The test results relates only to the sample submitted for testing and as per Lab scope. Product endorsement is neither inferred nor implied.{' '}
        2. This report cannot be reproduced except in full without prior written approval from the laboratory head.{' '}
        3. The report cannot be used as an evidence in the court of law, without written approval of laboratory.{' '}
        4. The sample will be retained for three months.{' '}
        5. Total liability of the laboratory of this report is limited only to the invoiced amount.{' '}
        6. All disputes are subject to Vadodara Jurisdiction.{' '}
        7. Sampling is not done by the laboratory{' '}
        8. This report relates to only to the particular sample as received for testing.{' '}
        9. Grade of coal is given basis of Gcv on EQ Basis as per Gazzette notification from Ministry of coal for Declaration of Grade.
      </div>

      {/* ── END OF REPORT ── */}
      <div style={{ textAlign:'center', margin:'5px 0 3px', fontSize:8.5, fontWeight:'bold', letterSpacing:0.5, flexShrink:0 }}>
        ---------------END OF REPORT---------------
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop:b2, paddingTop:4, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexShrink:0, marginTop:'auto' }}>
        {/* Left: lab address */}
        <div style={{ fontSize:7, width:'32%', lineHeight:1.5 }}>
          Laboratory: Plot No-14, AstankarBhavan, Behind TukaramSabhagruha,<br/>
          SuyogNagar, District Nagpur - 440015, Maharashtra, India.<br/>
          <span style={{ color:'#555' }}>Format: QCI/F25/09/01/QCI-CIL &nbsp; Date: {today} &nbsp; Rev: 04</span>
        </div>
        {/* Center: company name */}
        <div style={{ textAlign:'center', flex:1 }}>
          <div style={{ fontSize:8, color:'#555' }}>Unit of</div>
          <div style={{ fontSize:19, fontWeight:'bold', fontFamily:'Georgia, serif', letterSpacing:0.3 }}>
            Ravi Energie<span style={{ fontStyle:'italic' }}> Pvt. Ltd</span>
          </div>
        </div>
        {/* Right: contact */}
        <div style={{ fontSize:7, width:'28%', textAlign:'right', lineHeight:1.5 }}>
          Corporate Office: S15 A/B India Bulls Mega Mall,<br/>
          Jetalpur Road, Vadodara – 390 020, India<br/>
          Phone: +91 8320021741<br/>
          Email: lab@ravienergie.com<br/>
          Website: www.ravienergie.com
        </div>
      </div>

    </div>
  );

  // ── SHELL (sidebar + preview) ─────────────────────────────────────────────
  return (
    <div style={{ display:'flex', height:'100vh', background:'#dde3ec', fontFamily:"'Segoe UI',Helvetica,sans-serif", overflow:'hidden' }}>

      {/* SIDEBAR */}
      <div style={{ width:268, background:'#fff', borderRight:'1px solid #e2e8f0', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'14px 16px 10px', background:'#111827', borderBottom:'1px solid #e2e8f0' }}>
          <div style={{ color:'#f9fafb', fontWeight:700, fontSize:13 }}>🧾 Test Report</div>
          <div style={{ color:'#9ca3af', fontSize:10.5, marginTop:2 }}>
            {sample.lab_internal_id || sample.sample_ref_id} · {sample.client_name}
          </div>
        </div>

        <div style={{ display:'flex', borderBottom:'1px solid #e2e8f0' }}>
          {[['data','📋 Data'],['images','🖼️ Images']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex:1, padding:'8px 0', border:'none',
              background: tab===k ? '#f8fafc' : '#fff',
              borderBottom: tab===k ? '2px solid #111827' : '2px solid transparent',
              fontWeight: tab===k ? 700 : 400, fontSize:11.5,
              cursor:'pointer', color: tab===k ? '#111827' : '#6b7280',
            }}>{l}</button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'12px 14px' }}>
          {tab === 'data' ? (
            <div style={{ fontSize:11.5 }}>
              <SR label="Lab ID"          v={sample.lab_internal_id} />
              <SR label="Sample Ref"      v={sample.sample_ref_id} />
              <SR label="Group"           v={sample.group_ref_id} />
              <SR label="Client"          v={sample.client_name} />
              <SR label="Date Received"   v={recv} />
              <SR label="Report Date"     v={rptDate} />
              <SD label="Test Results" />
              <SR label="Total Moisture"  v={tTM  ? `${tTM.result_value} %`        : '—'} />
              <SR label="Moisture ADB"    v={tAM  ? `${tAM.result_value} %`        : '—'} />
              <SR label="Ash ADB"         v={tAA  ? `${tAA.result_value} %`        : '—'} />
              <SR label="GCV ADB"         v={tGCV ? `${tGCV.result_value} kCal/kg` : '—'} />
              <SR label="Moisture EQ"     v={tEQM ? `${tEQM.result_value} %`       : '—'} />
              <SR label="VM ADB"          v={tVM  ? `${tVM.result_value} %`        : '—'} />
              <SR label="EQ GCV (est.)"   v={eqGcv ? `${eqGcv} kCal/kg`           : '—'} />
              <SR label="Grade"           v={grade} hi />
              <SD label="Auth" />
              <SR label="Authorised By"   v={auth} />
              <SR label="Parr Image"      v={parrImg ? '✓ Attached' : '✗ Missing'} ok={!!parrImg} />
              <SR label="Humidity"        v={sample.ambient_humidity ? `${sample.ambient_humidity} %RH` : '—'} />
              <SR label="Temperature"     v={sample.ambient_temp ? `${sample.ambient_temp} °C` : '—'} />
            </div>
          ) : (
            <>
              <ImgUpload label="Company Logo (top-left)"         val={logoImg}  set={setLogoImg}  ref_={logoRef} />
              <ImgUpload label="Accreditation Badge (top-right)" val={accImg}   set={setAccImg}   ref_={accRef} />
              <ImgUpload label="Lab Stamp (circular)"            val={stampImg} set={setStampImg} ref_={stampRef} />
              <ImgUpload label="Authorised Signature"            val={sigImg}   set={setSigImg}   ref_={sigRef} />
              <div style={{ fontSize:9.5, color:'#94a3b8', marginTop:4, padding:'7px 10px', background:'#f8fafc', borderRadius:6, lineHeight:1.5 }}>
                Parr calorimeter image is pulled automatically from the GCV test upload.
              </div>
            </>
          )}
        </div>

        <div style={{ padding:'10px 14px', borderTop:'1px solid #e2e8f0', display:'flex', flexDirection:'column', gap:7 }}>
          <button onClick={downloadPdf} disabled={busy} style={{
            width:'100%', padding:'10px 0',
            background: busy ? '#4b5563' : '#111827',
            color:'#fff', border:'none', borderRadius:7,
            fontWeight:700, fontSize:13, cursor: busy ? 'not-allowed' : 'pointer',
          }}>
            {busy ? '⏳ Generating…' : '⬇️ Download PDF'}
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

      {/* PREVIEW */}
      <div style={{ flex:1, overflowY:'auto', padding:'24px 20px', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ marginBottom:12, alignSelf:'flex-start', color:'#6b7280', fontSize:10.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em' }}>
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
  return <div style={{ fontSize:9.5, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.07em', margin:'10px 0 5px', paddingBottom:3, borderBottom:'2px solid #f3f4f6' }}>{label}</div>;
}
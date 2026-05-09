import { useRef, useState, useEffect } from 'react';

// ── helpers ───────────────────────────────────────────────────────────────────
function dd(d) {
  if (!d) return '—';
  const dt = new Date(d);
  const day = String(dt.getDate()).padStart(2, '0');
  const mon = String(dt.getMonth() + 1).padStart(2, '0');
  return `${day}-${mon}-${dt.getFullYear()}`;
}

function byName(tests, name) {
  return tests.find(t => t.test_name === name);
}

// ── Main component ─────────────────────────────────────────────────────────────
// Props:
//   sample: { lab_internal_id, sample_ref_id, group_ref_id, group_created_at,
//             client_name, client_address, contact_person, client_email }
//   tests:  [{ test_name, test_unit, result_value, submitted_at, reviewed_at,
//              chemist_name, assigned_by_name, image_url }]
//   onClose: () => void
export default function CoalTestReport({ sample, tests, onClose }) {
  const reportRef = useRef();

  // Image state — logo and accreditation can be uploaded by user at print time
  const [logoImage,          setLogoImage]          = useState(null);
  const [accreditationImage, setAccreditationImage] = useState(null);
  const [stampImage,         setStampImage]         = useState(null);
  const [signatureImage,     setSignatureImage]      = useState(null);
  const [activeTab,          setActiveTab]          = useState('preview');

  const logoRef          = useRef();
  const accreditationRef = useRef();
  const stampRef         = useRef();
  const signatureRef     = useRef();

  const handleImageUpload = (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setter(ev.target.result);
    reader.readAsDataURL(file);
  };

  const [downloading, setDownloading] = useState(false);

  // Load html2pdf.js once from CDN
  useEffect(() => {
    if (window.html2pdf) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      // Wait for html2pdf to be available
      await new Promise((resolve) => {
        if (window.html2pdf) return resolve();
        const interval = setInterval(() => {
          if (window.html2pdf) { clearInterval(interval); resolve(); }
        }, 100);
      });

      const filename = `CoalTestReport_${sample.lab_internal_id || sample.sample_ref_id || 'report'}.pdf`;
      await window.html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(reportRef.current)
        .save();
    } catch (e) {
      alert('PDF download failed: ' + e.message);
    } finally {
      setDownloading(false);
    }
  };

  // ── Pull values from actual tests ──────────────────────────────────────────
  const tTM  = byName(tests, 'Total Moisture (TM)');
  const tAM  = byName(tests, 'Moisture (ADB)');
  const tAA  = byName(tests, 'Ash (ADB)');
  const tGCV = byName(tests, 'Gross Calorific Value');
  const tEQ  = byName(tests, 'Moisture (EQ)');

  // Dates
  const receiptDate  = dd(sample.group_created_at);
  const startDate    = dd(tTM?.submitted_at || tAM?.submitted_at || tGCV?.submitted_at);
  const endDate      = dd(tTM?.reviewed_at  || tAM?.reviewed_at  || tGCV?.reviewed_at);
  const periodStr    = startDate && endDate ? `${startDate} to ${endDate}` : '—';
  const reportDate   = endDate || dd(new Date());
  const authorisedBy = tGCV?.assigned_by_name || tAM?.assigned_by_name || '—';

  // Parr calorimeter image from GCV test
  const parrImage = tGCV?.image_url || null;

  // Report number = lab internal ID
  const reportNo = sample.lab_internal_id || sample.sample_ref_id || '—';

  // ── ImageUpload helper ─────────────────────────────────────────────────────
  const ImageUpload = ({ label, value, setter, refEl }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <div
        onClick={() => refEl.current.click()}
        style={{
          border: '2px dashed #cbd5e1', borderRadius: 8, padding: 16, textAlign: 'center',
          cursor: 'pointer', background: value ? '#f8fafc' : '#f1f5f9',
          minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 6,
        }}
      >
        {value
          ? <img src={value} alt={label} style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' }} />
          : <><span style={{ fontSize: 20 }}>📎</span><span style={{ fontSize: 12, color: '#94a3b8' }}>Click to upload</span></>}
      </div>
      <input ref={refEl} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => handleImageUpload(e, setter)} />
    </div>
  );

  // ── REPORT HTML (matches reference PDF exactly) ────────────────────────────
  const Report = () => (
    <div
      id="report-content"
      ref={reportRef}
      style={{
        width: 794, minHeight: 1123, margin: '0 auto', background: '#fff',
        fontFamily: "'Times New Roman', Times, serif", fontSize: 11, color: '#000',
        border: '1px solid #ccc', boxSizing: 'border-box', padding: '18px 22px 14px 22px',
        position: 'relative',
      }}
    >
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        {/* Logo left */}
        <div style={{ width: 120, height: 70, display: 'flex', alignItems: 'center' }}>
          {logoImage
            ? <img src={logoImage} alt="Logo" style={{ maxWidth: 120, maxHeight: 70, objectFit: 'contain' }} />
            : <div style={{ width: 120, height: 70, border: '1px dashed #aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#aaa', textAlign: 'center' }}>Company Logo</div>}
        </div>

        {/* Center title */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 'bold', letterSpacing: 1 }}>CoalLIMS Laboratory</div>
        </div>

        {/* Accreditation right */}
        <div style={{ width: 120, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          {accreditationImage
            ? <img src={accreditationImage} alt="Accreditation" style={{ maxWidth: 120, maxHeight: 70, objectFit: 'contain' }} />
            : <div style={{ width: 120, height: 70, border: '1px dashed #aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#aaa', textAlign: 'center' }}>Accreditation Logo</div>}
        </div>
      </div>

      {/* Address bar */}
      <div style={{ borderTop: '2px solid #000', borderBottom: '1px solid #000', padding: '3px 0', marginBottom: 6, display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
        <span>Laboratory: Coal Testing Division, India</span>
        <span>Email: lab@coallims.com | Website: www.coallims.com</span>
      </div>

      {/* Format line */}
      <div style={{ fontSize: 8.5, textAlign: 'right', marginBottom: 4, color: '#333' }}>
        Format: LIMS/F01/01 &nbsp;&nbsp; Date: {dd(new Date())} &nbsp;&nbsp; Rev: 01
      </div>

      {/* ── TITLE BOX ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', marginBottom: 0 }}>
        <tbody>
          <tr>
            <td colSpan={5} style={{ textAlign: 'center', padding: '6px 0 2px', borderBottom: '1px solid #000' }}>
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>TEST REPORT</div>
              <div style={{ fontSize: 10 }}>{reportNo}</div>
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <td style={{ padding: '4px 8px', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: 10 }}>Discipline</td>
            <td style={{ padding: '4px 8px', borderRight: '1px solid #000', fontSize: 10 }}>Chemical</td>
            <td style={{ padding: '4px 8px', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: 10 }}>Group</td>
            <td colSpan={2} style={{ padding: '4px 8px', fontSize: 10 }}>Solid Fuels</td>
          </tr>
          <tr>
            <td style={{ padding: '3px 8px', borderRight: '1px solid #000', fontSize: 9, color: '#555' }}>Test Report No</td>
            <td style={{ padding: '3px 8px', borderRight: '1px solid #000', fontSize: 9, color: '#555' }}>Report date</td>
            <td style={{ padding: '3px 8px', borderRight: '1px solid #000', fontSize: 9, color: '#555' }}>Customer PO</td>
            <td style={{ padding: '3px 8px', borderRight: '1px solid #000', fontSize: 9, color: '#555' }}>Date</td>
            <td style={{ padding: '3px 8px', fontSize: 9, color: '#555' }}>Text Pages</td>
          </tr>
          <tr>
            <td style={{ padding: '2px 8px', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: 11 }}>{reportNo}</td>
            <td style={{ padding: '2px 8px', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: 11 }}>{reportDate}</td>
            <td style={{ padding: '2px 8px', borderRight: '1px solid #000', fontSize: 11 }}>{sample.group_ref_id || '—'}</td>
            <td style={{ padding: '2px 8px', borderRight: '1px solid #000', fontSize: 11 }}>{dd(sample.group_created_at)}</td>
            <td style={{ padding: '2px 8px', fontSize: 11 }}>1</td>
          </tr>
        </tbody>
      </table>

      {/* ── CUSTOMER INFO ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none' }}>
        <tbody>
          <tr>
            <td style={{ width: '50%', padding: '4px 8px', verticalAlign: 'top', borderRight: '1px solid #000', fontSize: 9, color: '#555' }}>
              Customer Name and address
            </td>
            <td style={{ padding: '4px 8px', verticalAlign: 'top', fontSize: 9, color: '#555' }}>
              Description of test item:- <strong>COAL</strong>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '4px 8px 12px', verticalAlign: 'top', borderRight: '1px solid #000', fontSize: 11 }}>
              <strong>{sample.client_name || '—'}</strong>
              {sample.client_address && (
                <>{sample.client_address.split('\n').map((line, i) => <span key={i}><br />{line}</span>)}</>
              )}
              {sample.contact_person && <><br /><span style={{ color: '#555', fontSize: 10 }}>Attn: {sample.contact_person}</span></>}
            </td>
            <td style={{ padding: '4px 8px 12px', verticalAlign: 'top', fontSize: 11 }}></td>
          </tr>
          <tr style={{ borderTop: '1px solid #000' }}>
            <td colSpan={2} style={{ padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '3px 8px', fontSize: 9, color: '#555', borderRight: '1px solid #000', width: '25%' }}>Ambient Humidity (% RH)</td>
                    <td style={{ padding: '3px 8px', fontSize: 9, color: '#555', borderRight: '1px solid #000', width: '25%' }}>Ambient Temperature (C)</td>
                    <td style={{ padding: '3px 8px', fontSize: 9, color: '#555', borderRight: '1px solid #000', width: '25%' }}>Customer Sample ID</td>
                    <td style={{ padding: '3px 8px', fontSize: 9, color: '#555', width: '25%' }}>Sample lab ID</td>
                  </tr>
                  <tr>
                    {/* Ambient values — placeholders, filled from ambient_readings if available */}
                    <td style={{ padding: '3px 8px', fontWeight: 'bold', fontSize: 13, borderRight: '1px solid #000' }}>{sample.ambient_humidity || '—'}</td>
                    <td style={{ padding: '3px 8px', fontWeight: 'bold', fontSize: 13, borderRight: '1px solid #000' }}>{sample.ambient_temp || '—'}</td>
                    <td style={{ padding: '3px 8px', fontWeight: 'bold', fontSize: 13, borderRight: '1px solid #000' }}>{sample.sample_ref_id || '—'}</td>
                    <td style={{ padding: '3px 8px', fontWeight: 'bold', fontSize: 13 }}>{sample.lab_internal_id || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr style={{ borderTop: '1px solid #000' }}>
            <td colSpan={2} style={{ padding: '5px 8px', fontSize: 10, fontWeight: 'bold' }}>
              Test Method :IS1350 (Part-I) :2025 for TM and Proximate and IS1350 (Part-II) : 2022 for GCV analysis
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── TEST RESULTS ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none' }}>
        <thead>
          <tr>
            <td colSpan={10} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #000' }}>
              Test Results
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <td rowSpan={2} style={{ padding: '3px 5px', textAlign: 'center', fontSize: 9, borderRight: '1px solid #000', verticalAlign: 'middle' }}>Date of<br />sample<br />receipt</td>
            <td rowSpan={2} style={{ padding: '3px 5px', textAlign: 'center', fontSize: 9, borderRight: '1px solid #000', verticalAlign: 'middle' }}>Period of<br />analysis</td>
            <td rowSpan={2} style={{ padding: '3px 5px', textAlign: 'center', fontSize: 9, borderRight: '1px solid #000', verticalAlign: 'middle' }}>Total<br />Moisture<br />(%)</td>
            <td colSpan={3} style={{ padding: '3px 5px', textAlign: 'center', fontSize: 9, borderRight: '1px solid #000', borderBottom: '1px solid #000' }}>Air Dried Basis (ADB)</td>
            <td colSpan={2} style={{ padding: '3px 5px', textAlign: 'center', fontSize: 9, borderRight: '1px solid #000', borderBottom: '1px solid #000' }}>Equilibrated basis (60% RH and 40°C)</td>
            <td rowSpan={2} style={{ padding: '3px 5px', textAlign: 'center', fontSize: 9, borderRight: '1px solid #000', verticalAlign: 'middle' }}>VM<br />ADB<br />(%)</td>
            <td rowSpan={2} style={{ padding: '3px 5px', textAlign: 'center', fontSize: 9, verticalAlign: 'middle' }}>Grade</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <td style={{ padding: '3px 5px', textAlign: 'center', fontSize: 9, borderRight: '1px solid #000' }}>Moisture<br />(%)</td>
            <td style={{ padding: '3px 5px', textAlign: 'center', fontSize: 9, borderRight: '1px solid #000' }}>Ash<br />(%)</td>
            <td style={{ padding: '3px 5px', textAlign: 'center', fontSize: 9, borderRight: '1px solid #000' }}>GCV<br />(kCal/kg)</td>
            <td style={{ padding: '3px 5px', textAlign: 'center', fontSize: 9, borderRight: '1px solid #000' }}>Moisture<br />(%)</td>
            <td style={{ padding: '3px 5px', textAlign: 'center', fontSize: 9, borderRight: '1px solid #000' }}>GCV<br />(kCal/kg)</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '5px 5px', textAlign: 'center', fontSize: 11, borderRight: '1px solid #000' }}>{receiptDate}</td>
            <td style={{ padding: '5px 5px', textAlign: 'center', fontSize: 11, borderRight: '1px solid #000' }}>{periodStr}</td>
            <td style={{ padding: '5px 5px', textAlign: 'center', fontSize: 11, borderRight: '1px solid #000' }}>{tTM?.result_value || '—'}</td>
            <td style={{ padding: '5px 5px', textAlign: 'center', fontSize: 11, borderRight: '1px solid #000' }}>{tAM?.result_value || '—'}</td>
            <td style={{ padding: '5px 5px', textAlign: 'center', fontSize: 11, borderRight: '1px solid #000' }}>{tAA?.result_value || '—'}</td>
            <td style={{ padding: '5px 5px', textAlign: 'center', fontSize: 11, borderRight: '1px solid #000' }}>{tGCV?.result_value || '—'}</td>
            <td style={{ padding: '5px 5px', textAlign: 'center', fontSize: 11, borderRight: '1px solid #000' }}>{tEQ?.result_value || '—'}</td>
            {/* EQ GCV — placeholder, not a tracked test in current system */}
            <td style={{ padding: '5px 5px', textAlign: 'center', fontSize: 11, borderRight: '1px solid #000', color: '#aaa' }}>—</td>
            {/* VM ADB */}
            <td style={{ padding: '5px 5px', textAlign: 'center', fontSize: 11, borderRight: '1px solid #000' }}>
              {byName(tests, 'Volatile Matter (ADB)')?.result_value || '—'}
            </td>
            {/* Grade — placeholder */}
            <td style={{ padding: '5px 5px', textAlign: 'center', fontWeight: 'bold', fontSize: 11, color: '#aaa' }}>—</td>
          </tr>
        </tbody>
      </table>

      {/* ── PARR CALORIMETER + SIGNATURE ── */}
      <div style={{ display: 'flex', gap: 12, marginTop: 10, minHeight: 160, alignItems: 'flex-start' }}>
        {/* Parr image — from GCV test upload */}
        <div style={{ flex: 1 }}>
          {parrImage ? (
            <img src={parrImage} alt="Parr Calorimeter Data"
              style={{ width: '100%', maxHeight: 220, objectFit: 'contain', display: 'block' }} />
          ) : (
            <div style={{ border: '1.5px dashed #aaa', borderRadius: 4, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 11, flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 28 }}>🖨️</span>
              <span>Parr 6400 Calorimeter printout</span>
              <span style={{ fontSize: 9 }}>(Upload the calorimeter image when submitting the GCV test)</span>
            </div>
          )}
        </div>

        {/* Signature block */}
        <div style={{ width: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          {stampImage ? (
            <img src={stampImage} alt="Lab Stamp" style={{ width: 100, height: 100, objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 100, height: 100, border: '1px dashed #aaa', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#bbb', textAlign: 'center' }}>
              Lab Stamp
            </div>
          )}
          <div style={{ fontSize: 9, color: '#333' }}>Reviewed and Authorised By</div>
          {signatureImage ? (
            <img src={signatureImage} alt="Signature" style={{ maxWidth: 160, maxHeight: 60, objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 160, height: 40, borderBottom: '1px solid #333', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 2, fontSize: 9, color: '#bbb' }}>
              Signature
            </div>
          )}
          <div style={{ fontSize: 11 }}>{authorisedBy}</div>
        </div>
      </div>

      {/* ── DECLARATION ── */}
      <div style={{ marginTop: 12, fontSize: 8.5, lineHeight: 1.5, color: '#222' }}>
        <div style={{ fontWeight: 'bold', marginBottom: 2 }}>Declaration:</div>
        <div>
          1. The test results relates only to the sample submitted for testing and as per Lab scope. Product endorsement is neither inferred nor implied.{' '}
          2. This report cannot be reproduced except in full without prior written approval from the laboratory head.{' '}
          3. The report cannot be used as an evidence in the court of law, without written approval of laboratory.{' '}
          4. The sample will be retained for three months.{' '}
          5. Total liability of the laboratory of this report is limited only to the invoiced amount.{' '}
          6. All disputes are subject to the jurisdiction of the competent court.{' '}
          7. Sampling is not done by the laboratory.{' '}
          8. This report relates to only to the particular sample as received for testing.{' '}
          9. Grade of coal is given basis of GCV on EQ Basis as per Gazette notification from Ministry of coal for Declaration of Grade.
        </div>
      </div>

      {/* ── END OF REPORT ── */}
      <div style={{ textAlign: 'center', margin: '10px 0 8px', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>
        ---------------END OF REPORT---------------
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop: '2px solid #000', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 8.5, width: '30%' }}>
          <strong>Laboratory:</strong> Coal Testing Division, India.
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 10, color: '#555' }}>Unit of</div>
          <div style={{ fontSize: 26, fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>CoalLIMS</div>
        </div>
        <div style={{ fontSize: 8.5, width: '30%', textAlign: 'right' }}>
          Email: lab@coallims.com<br />
          Website: www.coallims.com
        </div>
      </div>
    </div>
  );

  // ── SHELL (sidebar + preview) ──────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Segoe UI', sans-serif" }}>


      {/* ── LEFT PANEL ── */}
      <div style={{ width: 300, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Header */}
        <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid #e2e8f0', background: '#0f172a' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>⚗️ Coal Test Report</div>
          <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
            {sample.lab_internal_id} · {sample.client_name}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
          {['preview', 'images'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '10px 0', border: 'none',
              background: activeTab === tab ? '#f8fafc' : '#fff',
              borderBottom: activeTab === tab ? '2px solid #0f172a' : '2px solid transparent',
              fontWeight: activeTab === tab ? 700 : 400,
              fontSize: 12, cursor: 'pointer',
              color: activeTab === tab ? '#0f172a' : '#64748b',
              textTransform: 'capitalize',
            }}>
              {tab === 'preview' ? '📋 Data' : '🖼️ Images'}
            </button>
          ))}
        </div>

        {/* Scrollable panel content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {activeTab === 'preview' ? (
            // Read-only data summary
            <div style={{ fontSize: 12 }}>
              <Row label="Lab ID"      value={sample.lab_internal_id} />
              <Row label="Sample Ref"  value={sample.sample_ref_id} />
              <Row label="Group"       value={sample.group_ref_id} />
              <Row label="Client"      value={sample.client_name} />
              <Row label="Receipt"     value={receiptDate} />
              <Row label="Period"      value={periodStr} />
              <Divider label="Test Results" />
              <Row label="Total Moisture (TM)" value={tTM  ? `${tTM.result_value} %`       : '—'} />
              <Row label="Moisture (ADB)"      value={tAM  ? `${tAM.result_value} %`       : '—'} />
              <Row label="Ash (ADB)"           value={tAA  ? `${tAA.result_value} %`       : '—'} />
              <Row label="GCV"                 value={tGCV ? `${tGCV.result_value} kCal/kg`: '—'} />
              <Row label="Moisture (EQ)"       value={tEQ  ? `${tEQ.result_value} %`       : '—'} />
              <Row label="VM (ADB)"            value={byName(tests,'Volatile Matter (ADB)') ? `${byName(tests,'Volatile Matter (ADB)').result_value} %` : '—'} />
              <Divider label="Authorisation" />
              <Row label="Authorised By" value={authorisedBy} />
              <Row label="Parr Image"    value={parrImage ? '✓ Attached' : '✗ Not uploaded'} valueColor={parrImage ? '#16a34a' : '#dc2626'} />
            </div>
          ) : (
            <>
              <ImageUpload label="Company Logo (top left)"   value={logoImage}          setter={setLogoImage}          refEl={logoRef} />
              <ImageUpload label="Accreditation Logo (top right)" value={accreditationImage} setter={setAccreditationImage} refEl={accreditationRef} />
              <ImageUpload label="Lab Stamp (circular)"      value={stampImage}         setter={setStampImage}         refEl={stampRef} />
              <ImageUpload label="Authorised Signature"      value={signatureImage}     setter={setSignatureImage}     refEl={signatureRef} />
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 6 }}>
                The Parr calorimeter image is automatically taken from the GCV test submission.
              </div>
            </>
          )}
        </div>

        {/* Buttons */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={handleDownloadPdf} disabled={downloading} style={{
            width: '100%', padding: '12px 0', background: downloading ? '#475569' : '#0f172a', color: '#fff',
            border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: downloading ? 'not-allowed' : 'pointer',
            opacity: downloading ? 0.8 : 1,
          }}>
            {downloading ? '⏳ Generating PDF…' : '⬇️ Download PDF'}
          </button>
          <button onClick={onClose} style={{
            width: '100%', padding: '10px 0', background: '#fff', color: '#64748b',
            border: '1.5px solid #e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>
            ← Back to Reports
          </button>
          <div style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8' }}>
            PDF will be downloaded automatically
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: PREVIEW ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: 16, alignSelf: 'flex-start', color: '#64748b', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Live Preview — A4
        </div>
        <div style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.12)', borderRadius: 4 }}>
          <Report />
        </div>
      </div>
    </div>
  );
}

// ── Small helpers for the data panel ─────────────────────────────────────────
function Row({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ color: '#64748b', fontSize: 11 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: 12, color: valueColor || '#0f172a' }}>{value || '—'}</span>
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '14px 0 8px' }}>
      {label}
    </div>
  );
}
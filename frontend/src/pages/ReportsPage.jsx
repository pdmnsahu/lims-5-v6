// frontend/src/pages/ReportsPage.jsx
import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { Badge, Empty, Table, PageSpinner } from '../components/shared/UI';
import { FileText, FileDown, Loader2, Upload, X } from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────
function groupBySample(tests) {
  const map = new Map();
  tests.forEach(t => {
    const sid = t.sample_db_id;
    if (!map.has(sid)) {
      map.set(sid, {
        sample_db_id:    sid,
        sample_ref_id:   t.sample_ref_id,
        lab_internal_id: t.lab_internal_id,
        group_ref_id:    t.group_ref_id,
        client_name:     t.client_name,
        tests: [],
      });
    }
    map.get(sid).tests.push(t);
  });
  return Array.from(map.values());
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result.split(',')[1]); // strip data:…;base64,
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Image slot component ──────────────────────────────────────────────────────
function ImageSlot({ label, value, preview, onChange, onClear }) {
  const ref = useRef();
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      {preview ? (
        <div className="relative border border-gray-200 rounded-lg p-1 bg-gray-50 flex items-center justify-center" style={{ height: 64 }}>
          <img src={preview} alt={label} className="max-h-14 max-w-full object-contain" />
          <button
            onClick={onClear}
            className="absolute top-1 right-1 bg-white border border-gray-200 rounded-full p-0.5 hover:bg-red-50 hover:border-red-300 transition-colors"
          >
            <X size={10} className="text-gray-400" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => ref.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all"
          style={{ height: 64 }}
        >
          <Upload size={14} className="text-gray-300 mb-1" />
          <span className="text-xs text-gray-400">Click to upload</span>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onChange} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [tests,      setTests]      = useState([]);
  const [groups,     setGroups]     = useState([]);
  const [sampleMeta, setSampleMeta] = useState({});
  const [loading,    setLoading]    = useState(true);
  const [view,       setView]       = useState('samples');

  // Per-row download state
  const [dlLoading,      setDlLoading]      = useState({});
  const [dlGroupLoading, setDlGroupLoading] = useState({});

  // Image assets (shared across all reports in this session)
  const [logoFile,  setLogoFile]  = useState(null); const [logoPreview,  setLogoPreview]  = useState(null);
  const [accFile,   setAccFile]   = useState(null); const [accPreview,   setAccPreview]   = useState(null);
  const [stampFile, setStampFile] = useState(null); const [stampPreview, setStampPreview] = useState(null);
  const [sigFile,   setSigFile]   = useState(null); const [sigPreview,   setSigPreview]   = useState(null);

  const [showImages, setShowImages] = useState(false);

  useEffect(() => {
    Promise.all([api.getTests(), api.getSampleGroups(), api.getSamples()])
      .then(([t, g, s]) => {
        setTests(t);
        setGroups(g);
        const meta = {};
        s.forEach(sample => {
          meta[sample.id] = { test_count: sample.test_count, approved_count: sample.approved_count };
        });
        setSampleMeta(meta);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleImage = async (e, setFile, setPreview) => {
    const file = e.target.files[0];
    if (!file) return;
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  // ── Download single-sample PDF via Puppeteer backend ─────────────────────
  const downloadSamplePdf = async (sampleId, label) => {
    setDlLoading(p => ({ ...p, [sampleId]: true }));
    try {
      // Convert images to base64 strings
      const [logoBase64, accBase64, stampBase64, sigBase64] = await Promise.all([
        logoFile  ? fileToBase64(logoFile)  : Promise.resolve(null),
        accFile   ? fileToBase64(accFile)   : Promise.resolve(null),
        stampFile ? fileToBase64(stampFile) : Promise.resolve(null),
        sigFile   ? fileToBase64(sigFile)   : Promise.resolve(null),
      ]);

      const token = localStorage.getItem('token');
      const res   = await fetch(`/api/reports/sample/${sampleId}/pdf`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ logoBase64, accBase64, stampBase64, sigBase64 }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `TestReport_${label}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('PDF download failed: ' + e.message);
    } finally {
      setDlLoading(p => ({ ...p, [sampleId]: false }));
    }
  };

  // ── Group report still uses html2pdf (not changed) ────────────────────────
  const downloadGroup = async (groupId, groupRef) => {
    setDlGroupLoading(p => ({ ...p, [groupId]: true }));
    try {
      const { group, tests: gTests } = await api.getGroupReport(groupId);
      if (!gTests.length) return alert('No approved tests in this group yet.');

      if (!window.html2pdf) {
        await new Promise((resolve, reject) => {
          const s   = document.createElement('script');
          s.src     = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          s.onload  = resolve;
          s.onerror = () => reject(new Error('Failed to load PDF library'));
          document.head.appendChild(s);
        });
      }

      const rows = gTests.map(t =>
        `<tr><td>${t.sample_ref_id}</td><td>${t.lab_internal_id||'—'}</td><td>${t.test_name}</td><td>${t.result_value}</td><td>${t.test_unit||'—'}</td><td>${t.chemist_name||'—'}</td></tr>`
      ).join('');

      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;font-family:serif;font-size:12px;padding:30px;';
      container.innerHTML = `
        <h2 style="margin-bottom:4px;font-size:16px;">Group Analysis Report — ${group.group_ref_id}</h2>
        <p style="margin:2px 0 16px;color:#555;font-size:13px;">Client: ${group.client_name} &nbsp;|&nbsp; Contact: ${group.contact_person||'—'}</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:#f0f0f0;">
            <th style="border:1px solid #000;padding:6px 10px;text-align:left;">Sample Ref</th>
            <th style="border:1px solid #000;padding:6px 10px;text-align:left;">Lab ID</th>
            <th style="border:1px solid #000;padding:6px 10px;text-align:left;">Parameter</th>
            <th style="border:1px solid #000;padding:6px 10px;text-align:left;">Result</th>
            <th style="border:1px solid #000;padding:6px 10px;text-align:left;">Unit</th>
            <th style="border:1px solid #000;padding:6px 10px;text-align:left;">Analyst</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:20px;font-size:11px;color:#888;">Generated by CoalLIMS · ${new Date().toLocaleDateString()}</p>
      `;
      document.body.appendChild(container);
      await window.html2pdf()
        .set({ margin:[10,10,10,10], filename:`GroupReport_${groupRef}.pdf`, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2,useCORS:true}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} })
        .from(container).save();
      document.body.removeChild(container);
    } catch (e) { alert(e.message); }
    finally { setDlGroupLoading(p => ({ ...p, [groupId]: false })); }
  };

  if (loading) return <PageSpinner />;

  const sampleRows = groupBySample(tests);
  const uploadedCount = [logoFile, accFile, stampFile, sigFile].filter(Boolean).length;

  return (
    <div className="flex h-full gap-0">

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 overflow-auto p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Each sample gets one pixel-perfect A4 PDF — rendered by Puppeteer on the server.
            </p>
          </div>
          <button
            onClick={() => setShowImages(p => !p)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              showImages ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            <Upload size={14} />
            Images {uploadedCount > 0 && <span className="bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{uploadedCount}</span>}
          </button>
        </div>

        {/* Image panel (collapsible) */}
        {showImages && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Report Images — applied to all PDF downloads</div>
            <div className="grid grid-cols-4 gap-4">
              <ImageSlot label="Company Logo" preview={logoPreview}
                onChange={e => handleImage(e, setLogoFile, setLogoPreview)}
                onClear={() => { setLogoFile(null); setLogoPreview(null); }} />
              <ImageSlot label="Accreditation Badge" preview={accPreview}
                onChange={e => handleImage(e, setAccFile, setAccPreview)}
                onClear={() => { setAccFile(null); setAccPreview(null); }} />
              <ImageSlot label="Lab Stamp (circular)" preview={stampPreview}
                onChange={e => handleImage(e, setStampFile, setStampPreview)}
                onClear={() => { setStampFile(null); setStampPreview(null); }} />
              <ImageSlot label="Authorised Signature" preview={sigPreview}
                onChange={e => handleImage(e, setSigFile, setSigPreview)}
                onClear={() => { setSigFile(null); setSigPreview(null); }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Parr calorimeter image is pulled automatically from the GCV test upload.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-100">
          {[{ key:'samples', label:'By Sample' }, { key:'groups', label:'By Group' }].map(tab => (
            <button key={tab.key} onClick={() => setView(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                view === tab.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── By Sample ── */}
        {view === 'samples' && (
          <Table headers={['Lab Internal ID', 'Sample Ref ID', 'Group', 'Client', 'Approved Tests', 'Download']} loading={false}>
            {sampleRows.length === 0
              ? <tr><td colSpan={6}><Empty message="No approved tests yet." icon={FileText} /></td></tr>
              : sampleRows.map(s => {
                const meta        = sampleMeta[s.sample_db_id];
                const allApproved = meta && meta.test_count > 0 && meta.approved_count === meta.test_count;
                const busy        = dlLoading[s.sample_db_id];
                return (
                  <tr key={s.sample_db_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-blue-700">{s.lab_internal_id || '—'}</td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-600">{s.sample_ref_id}</td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-500">{s.group_ref_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{s.client_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.tests.map(t => (
                          <span key={t.id} className="badge bg-green-50 text-green-700 text-xs">{t.test_name}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {allApproved ? (
                        <button
                          onClick={() => downloadSamplePdf(s.sample_db_id, s.lab_internal_id || s.sample_ref_id)}
                          disabled={busy}
                          className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                        >
                          {busy
                            ? <><Loader2 size={12} className="animate-spin" /> Generating…</>
                            : <><FileDown size={12} /> Download PDF</>
                          }
                        </button>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg font-medium">
                          {meta ? `${meta.approved_count}/${meta.test_count} approved` : 'Pending'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </Table>
        )}

        {/* ── By Group ── */}
        {view === 'groups' && (
          <Table headers={['Group Ref ID', 'Client', 'Samples', 'Status', 'Download']} loading={false}>
            {groups.length === 0
              ? <tr><td colSpan={5}><Empty message="No groups available." icon={FileText} /></td></tr>
              : groups.map(g => (
                <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">{g.group_ref_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{g.client_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{g.sample_count} sample(s)</td>
                  <td className="px-4 py-3"><Badge status={g.status} /></td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => downloadGroup(g.id, g.group_ref_id)}
                      disabled={dlGroupLoading[g.id]}
                      className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                    >
                      {dlGroupLoading[g.id]
                        ? <><Loader2 size={12} className="animate-spin" /> Generating…</>
                        : <><FileDown size={12} /> Download PDF</>}
                    </button>
                  </td>
                </tr>
              ))}
          </Table>
        )}
      </div>
    </div>
  );
}
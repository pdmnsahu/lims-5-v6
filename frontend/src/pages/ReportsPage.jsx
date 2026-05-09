import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Badge, Empty, Table, PageSpinner } from '../components/shared/UI';
import { FileDown, FileText, Loader2 } from 'lucide-react';

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

export default function ReportsPage() {
  const [tests,        setTests]       = useState([]);
  const [groups,       setGroups]      = useState([]);
  const [sampleMeta,   setSampleMeta]  = useState({});
  const [loading,      setLoading]     = useState(true);
  const [dlLoading,    setDlLoading]   = useState({});
  const [dlGrpLoading, setDlGrpLoading]= useState({});
  const [view,         setView]        = useState('samples');

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

  const handleDownloadSample = async (sampleId, labId, refId) => {
    setDlLoading(p => ({ ...p, [sampleId]: true }));
    try {
      await api.downloadSamplePDF(sampleId, `TestReport_${labId || refId || sampleId}.pdf`);
    } catch (e) { alert(e.message); }
    finally { setDlLoading(p => ({ ...p, [sampleId]: false })); }
  };

  const handleDownloadGroup = async (groupId) => {
    setDlGrpLoading(p => ({ ...p, [groupId]: true }));
    try {
      const { group, tests } = await api.getGroupReport(groupId);
      if (!tests.length) return alert('No approved tests in this group yet.');
      const rows = tests.map(t =>
        `<tr><td>${t.sample_ref_id}</td><td>${t.lab_internal_id||'—'}</td>` +
        `<td>${t.test_name}</td><td style="text-align:center">${t.result_value}</td>` +
        `<td>${t.test_unit||'—'}</td><td>${t.chemist_name||'—'}</td></tr>`
      ).join('');
      const html = `<!DOCTYPE html><html><head><title>Group Report ${group.group_ref_id}</title>
        <style>body{font-family:'Times New Roman',serif;padding:28px}h2{font-size:18px;margin-bottom:4px}
        p{margin:2px 0 14px;color:#555;font-size:12px}table{width:100%;border-collapse:collapse}
        th{background:#f0f0f0;padding:6px 10px;border:1px solid #000;font-size:11px;text-align:left}
        td{border:1px solid #000;padding:5px 10px;font-size:11px}@media print{button{display:none}}</style>
        </head><body>
        <h2>Group Analysis Report — ${group.group_ref_id}</h2>
        <p>Client: ${group.client_name} | Contact: ${group.contact_person||'—'}</p>
        <table><thead><tr><th>Sample Ref</th><th>Lab ID</th><th>Parameter</th><th>Result</th><th>Unit</th><th>Analyst</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <button onclick="window.print()" style="margin-top:16px;padding:10px 24px;font-size:14px;cursor:pointer;background:#111;color:#fff;border:none;border-radius:6px;">
          🖨️ Print / Save as PDF</button>
        </body></html>`;
      const w = window.open('', '_blank');
      w.document.write(html); w.document.close();
    } catch (e) { alert(e.message); }
    finally { setDlGrpLoading(p => ({ ...p, [groupId]: false })); }
  };

  if (loading) return <PageSpinner />;
  const sampleRows = groupBySample(tests);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          PDFs are generated instantly on the server — no browser rendering needed.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-100">
        {[{ key:'samples', label:'By Sample' }, { key:'groups', label:'By Group' }].map(tab => (
          <button key={tab.key} onClick={() => setView(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              view===tab.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'samples' && (
        <Table headers={['Lab Internal ID','Sample Ref ID','Group','Client','Approved Tests','Download']} loading={false}>
          {sampleRows.length === 0
            ? <tr><td colSpan={6}><Empty message="No approved tests yet." icon={FileText} /></td></tr>
            : sampleRows.map(s => {
              const meta        = sampleMeta[s.sample_db_id];
              const allApproved = meta && meta.test_count > 0 && meta.approved_count === meta.test_count;
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
                        onClick={() => handleDownloadSample(s.sample_db_id, s.lab_internal_id, s.sample_ref_id)}
                        disabled={dlLoading[s.sample_db_id]}
                        className="btn-primary py-1 px-3 text-xs">
                        {dlLoading[s.sample_db_id]
                          ? <><Loader2 size={12} className="animate-spin"/> Generating…</>
                          : <><FileDown size={12}/> Download PDF</>}
                      </button>
                    ) : (
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg font-medium whitespace-nowrap">
                        {meta ? `${meta.approved_count}/${meta.test_count} approved` : 'Pending tests'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
        </Table>
      )}

      {view === 'groups' && (
        <Table headers={['Group Ref ID','Client','Samples','Status','Download']} loading={false}>
          {groups.length === 0
            ? <tr><td colSpan={5}><Empty message="No groups available." icon={FileText} /></td></tr>
            : groups.map(g => (
              <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">{g.group_ref_id}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{g.client_name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{g.sample_count} sample(s)</td>
                <td className="px-4 py-3"><Badge status={g.status} /></td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDownloadGroup(g.id)}
                    disabled={dlGrpLoading[g.id]} className="btn-primary py-1 px-3 text-xs">
                    {dlGrpLoading[g.id] ? <><Loader2 size={12} className="animate-spin"/> Loading…</> : <><FileDown size={12}/> Download</>}
                  </button>
                </td>
              </tr>
            ))}
        </Table>
      )}
    </div>
  );
}
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Badge, Empty, PageSpinner, Modal, Field, Alert } from '../components/shared/UI';
import { FlaskConical, RotateCcw } from 'lucide-react';

export default function SuperAdminAllTestsPage() {
  const [tests,   setTests]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');
  const [revokeModal, setRevokeModal] = useState(null);
  const [reason,      setReason]      = useState('');
  const [revokeErr,   setRevokeErr]   = useState('');
  const [saving,      setSaving]      = useState(false);

  const load = async () => {
    setLoading(true);
    try { const data = await api.getTests(); setTests(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRevoke = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return setRevokeErr('Reason required');
    setSaving(true); setRevokeErr('');
    try {
      await api.revokeApproval(revokeModal.id, reason);
      setRevokeModal(null);
      load();
    } catch (err) { setRevokeErr(err.message); }
    finally { setSaving(false); }
  };

  const filtered = filter === 'all' ? tests : tests.filter(t => t.status === filter);

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Tests</h1>
        <p className="text-sm text-gray-500 mt-0.5">Complete view of every test. Only admin can revoke approvals.</p>
      </div>

      <div className="flex gap-2 border-b border-gray-100">
        {['all','pending','submitted','approved','rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
              filter===s ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {s} <span className="text-xs text-gray-400">({tests.filter(t => s==='all'||t.status===s).length})</span>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Test','Unit','Sample Ref','Lab ID','Group','Client','Chemist','Result','Status','Actions'].map((h,i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0
                ? <tr><td colSpan={10}><Empty message="No tests." icon={FlaskConical} /></td></tr>
                : filtered.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{t.test_name}</td>
                    <td className="px-4 py-3"><span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{t.test_unit||'—'}</span></td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-600">{t.sample_ref_id}</td>
                    <td className="px-4 py-3 font-mono text-sm text-blue-600">{t.lab_internal_id||'—'}</td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-500">{t.group_ref_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{t.client_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{t.chemist_name||'—'}</td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">
                      {t.result_value ? `${t.result_value} ${t.test_unit||''}` : <span className="text-gray-300 font-normal">—</span>}
                    </td>
                    <td className="px-4 py-3"><Badge status={t.status} /></td>
                    <td className="px-4 py-3">
                      {t.status === 'approved' && (
                        <button onClick={() => { setReason(''); setRevokeErr(''); setRevokeModal(t); }}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium transition-colors">
                          <RotateCcw size={11} /> Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!revokeModal} onClose={() => setRevokeModal(null)} title="Revoke Test Approval" size="sm">
        {revokeModal && (
          <form onSubmit={handleRevoke} className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500 text-xs uppercase font-semibold">Test</span><span className="font-medium">{revokeModal.test_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-xs uppercase font-semibold">Result</span><span className="font-mono">{revokeModal.result_value} {revokeModal.test_unit}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-xs uppercase font-semibold">Chemist</span><span>{revokeModal.chemist_name}</span></div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700">
              This will push the test back to <strong>Rejected</strong>. The chemist must resubmit.
            </div>
            <Field label="Reason for revoking approval" required>
              <textarea className="input min-h-[80px] resize-none" required value={reason}
                onChange={e => setReason(e.target.value)} placeholder="Why is this approval being revoked?" autoFocus />
            </Field>
            <Alert type="error" message={revokeErr} />
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setRevokeModal(null)}>Cancel</button>
              <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors" disabled={saving}>
                <RotateCcw size={14} /> {saving ? 'Revoking…' : 'Revoke Approval'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

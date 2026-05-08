import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Modal, Field, Alert, PageSpinner, Empty } from '../components/shared/UI';
import { CheckCircle, XCircle, FlaskConical } from 'lucide-react';

// Status dot for each cell
function StatusDot({ status }) {
  if (!status) return <span className="text-gray-200 text-xs">—</span>;
  const map = {
    pending:   'bg-gray-300',
    submitted: 'bg-purple-400',
    approved:  'bg-green-500',
    rejected:  'bg-red-500',
  };
  return (
    <span className="flex items-center gap-1">
      <span className={`w-2 h-2 rounded-full inline-block ${map[status] || 'bg-gray-300'}`} />
    </span>
  );
}

// A result cell — shows value + status dot, clickable if submitted
function ResultCell({ value, status, testId, onAction }) {
  if (!testId) return <td className="px-3 py-3 text-center text-gray-200 text-xs">—</td>;

  const isSubmitted = status === 'submitted';
  const isApproved  = status === 'approved';
  const isRejected  = status === 'rejected';

  return (
    <td className={`px-3 py-3 text-center ${isSubmitted ? 'cursor-pointer hover:bg-purple-50' : ''}`}
      onClick={() => isSubmitted && onAction && onAction(testId, value, status)}>
      <div className="flex items-center justify-center gap-1">
        <StatusDot status={status} />
        <span className={`font-mono text-sm ${
          isApproved ? 'text-green-700 font-semibold' :
          isRejected ? 'text-red-500 line-through' :
          isSubmitted ? 'text-purple-700 font-semibold' :
          'text-gray-400'}`}>
          {value || '—'}
        </span>
      </div>
    </td>
  );
}

export default function SampleApprovalPage() {
  const [samples,  setSamples]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [modal,    setModal]    = useState(null); // { sampleId, testId, value, action: 'approve'|'reject'|'sample' }
  const [reason,   setReason]   = useState('');
  const [saving,   setSaving]   = useState(false);
  const [modalErr, setModalErr] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const data = await api.getSampleApproval();
      setSamples(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Open modal to approve or reject a single test
  const openTest = (testId, value, status, action = 'choose') => {
    if (status !== 'submitted') return;
    setReason(''); setModalErr('');
    setModal({ testId, value, action });
  };

  // Open modal to approve/reject ALL submitted tests for a sample at once
  const openSample = (sample) => {
    setReason(''); setModalErr('');
    setModal({ type: 'sample', sample, action: 'choose' });
  };

  const handleSingleTest = async (action) => {
    setSaving(true); setModalErr('');
    try {
      await api.reviewTest(modal.testId, {
        action,
        rejection_reason: action === 'reject' ? reason : undefined,
      });
      setModal(null);
      load();
    } catch (err) { setModalErr(err.message); }
    finally { setSaving(false); }
  };

  // Approve or reject ALL submitted tests for the selected sample
  const handleSampleAction = async (action) => {
    if (action === 'reject' && !reason.trim()) return setModalErr('Rejection reason required');
    setSaving(true); setModalErr('');
    try {
      const s = modal.sample;
      const submittedTests = [
        s.tm_test_id       && s.tm_status       === 'submitted' ? s.tm_test_id       : null,
        s.adb_moist_test_id && s.adb_moist_status === 'submitted' ? s.adb_moist_test_id : null,
        s.adb_ash_test_id  && s.adb_ash_status  === 'submitted' ? s.adb_ash_test_id  : null,
        s.gcv_test_id      && s.gcv_status      === 'submitted' ? s.gcv_test_id      : null,
        s.adb_vm_test_id   && s.adb_vm_status   === 'submitted' ? s.adb_vm_test_id   : null,
        s.eq_moist_test_id && s.eq_moist_status === 'submitted' ? s.eq_moist_test_id : null,
      ].filter(Boolean);

      for (const testId of submittedTests) {
        await api.reviewTest(testId, {
          action,
          rejection_reason: action === 'reject' ? reason : undefined,
        });
      }
      setModal(null);
      load();
    } catch (err) { setModalErr(err.message); }
    finally { setSaving(false); }
  };

  const pendingReviewCount = samples.filter(s => s.pending_review_count > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sample Approval</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Approve or reject test results per sample. Sorted by Lab ID.
          {pendingReviewCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              {pendingReviewCount} sample{pendingReviewCount !== 1 ? 's' : ''} awaiting review
            </span>
          )}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error} <button onClick={load} className="ml-2 underline">Retry</button>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="font-semibold text-gray-600">Legend:</span>
        {[
          { color: 'bg-gray-300',  label: 'Pending' },
          { color: 'bg-purple-400',label: 'Submitted' },
          { color: 'bg-green-500', label: 'Approved' },
          { color: 'bg-red-500',   label: 'Rejected' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1">
            <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
            {l.label}
          </span>
        ))}
        <span className="text-gray-400 ml-2">Click a purple cell to review that test</span>
      </div>

      {loading ? <PageSpinner /> : samples.length === 0 ? (
        <div className="card py-16"><Empty message="No samples with submitted results yet." icon={FlaskConical} /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap sticky left-0 bg-gray-50 z-10">Lab ID</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Sample ID</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">TM (%)</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">ADB Moist (%)</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">ADB Ash (%)</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">ADB GCV (kCal/kg)</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">ADB VM (%)</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">EQ Moist (%)</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {samples.map(s => {
                  const hasPending = s.pending_review_count > 0;
                  return (
                    <tr key={s.sample_id} className={`transition-colors ${hasPending ? 'bg-purple-50/30 hover:bg-purple-50/60' : 'hover:bg-gray-50'}`}>
                      <td className="px-3 py-3 sticky left-0 bg-inherit z-10">
                        <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {s.lab_internal_id}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-gray-600">{s.sample_ref_id}</td>

                      <ResultCell value={s.tm_value}        status={s.tm_status}        testId={s.tm_test_id}
                        onAction={(tid, val) => openTest(tid, val, s.tm_status)} />
                      <ResultCell value={s.adb_moist_value} status={s.adb_moist_status} testId={s.adb_moist_test_id}
                        onAction={(tid, val) => openTest(tid, val, s.adb_moist_status)} />
                      <ResultCell value={s.adb_ash_value}   status={s.adb_ash_status}   testId={s.adb_ash_test_id}
                        onAction={(tid, val) => openTest(tid, val, s.adb_ash_status)} />
                      <ResultCell value={s.gcv_value}       status={s.gcv_status}       testId={s.gcv_test_id}
                        onAction={(tid, val) => openTest(tid, val, s.gcv_status)} />
                      <ResultCell value={s.adb_vm_value}    status={s.adb_vm_status}    testId={s.adb_vm_test_id}
                        onAction={(tid, val) => openTest(tid, val, s.adb_vm_status)} />
                      <ResultCell value={s.eq_moist_value}  status={s.eq_moist_status}  testId={s.eq_moist_test_id}
                        onAction={(tid, val) => openTest(tid, val, s.eq_moist_status)} />

                      <td className="px-3 py-3 text-center">
                        {hasPending ? (
                          <button onClick={() => openSample(s)}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-brand-700 text-white hover:bg-brand-800 font-medium transition-colors">
                            Review Sample
                          </button>
                        ) : s.all_approved ? (
                          <span className="text-xs text-green-600 font-semibold">✓ All Approved</span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Single Test Modal */}
      <Modal open={!!modal && modal.action === 'choose' && !modal.type} onClose={() => setModal(null)} title="Review Test Result" size="sm">
        {modal && !modal.type && (
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 uppercase font-semibold">Result</span>
                <span className="font-mono font-semibold text-gray-800">{modal.value}</span>
              </div>
            </div>
            <Alert type="error" message={modalErr} />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleSingleTest('approve')} disabled={saving}
                className="btn-success justify-center">
                <CheckCircle size={14} /> {saving ? 'Approving…' : 'Approve'}
              </button>
              <button onClick={() => setModal(m => ({ ...m, action: 'reject' }))}
                className="btn-danger justify-center">
                <XCircle size={14} /> Reject
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Single Test Reject Reason */}
      <Modal open={!!modal && modal.action === 'reject' && !modal.type} onClose={() => setModal(null)} title="Reject Test" size="sm">
        {modal && !modal.type && (
          <div className="space-y-4">
            <Field label="Rejection Reason" required>
              <textarea className="input min-h-[80px] resize-none" required value={reason}
                onChange={e => setReason(e.target.value)} placeholder="Explain what needs to be corrected…" autoFocus />
            </Field>
            <Alert type="error" message={modalErr} />
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setModal(m => ({ ...m, action: 'choose' }))}>Back</button>
              <button className="btn-danger" onClick={() => handleSingleTest('reject')} disabled={saving || !reason.trim()}>
                <XCircle size={14} /> {saving ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Sample-level Review Modal */}
      <Modal open={!!modal && modal.type === 'sample' && modal.action === 'choose'} onClose={() => setModal(null)}
        title="Review All Submitted Tests for Sample" size="sm">
        {modal?.type === 'sample' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-gray-500 uppercase font-semibold">Lab ID</span>
                <span className="font-mono font-bold text-blue-700">{modal.sample.lab_internal_id}</span>
              </div>
              <p className="text-xs text-gray-500">
                {modal.sample.pending_review_count} submitted test(s) will be reviewed at once.
              </p>
            </div>
            <Alert type="error" message={modalErr} />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleSampleAction('approve')} disabled={saving}
                className="btn-success justify-center">
                <CheckCircle size={14} /> {saving ? 'Approving…' : 'Approve All'}
              </button>
              <button onClick={() => setModal(m => ({ ...m, action: 'reject' }))}
                className="btn-danger justify-center">
                <XCircle size={14} /> Reject All
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Sample Reject Reason Modal */}
      <Modal open={!!modal && modal.type === 'sample' && modal.action === 'reject'} onClose={() => setModal(null)}
        title="Reject All Submitted Tests" size="sm">
        {modal?.type === 'sample' && (
          <div className="space-y-4">
            <Field label="Rejection Reason (applied to all)" required>
              <textarea className="input min-h-[80px] resize-none" required value={reason}
                onChange={e => setReason(e.target.value)} placeholder="Explain what needs correction…" autoFocus />
            </Field>
            <Alert type="error" message={modalErr} />
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setModal(m => ({ ...m, action: 'choose' }))}>Back</button>
              <button className="btn-danger" onClick={() => handleSampleAction('reject')} disabled={saving || !reason.trim()}>
                <XCircle size={14} /> {saving ? 'Rejecting…' : 'Reject All'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

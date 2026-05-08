import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Badge, Modal, Field, Alert, Empty, Confirm, PageSpinner } from '../shared/UI';
import { useAuth } from '../contexts/AuthContext';
import {
  Layers, List, Plus, Trash2, ChevronRight,
  Filter, X, ScanLine, ClipboardList
} from 'lucide-react';

// ── Sample status badge ────────────────────────────────────────────────────────
function SampleStatusBadge({ status }) {
  const map = {
    on_the_way:    { label: 'On the Way',    cls: 'bg-blue-50 text-blue-700'   },
    tests_ongoing: { label: 'Tests Ongoing', cls: 'bg-amber-50 text-amber-700' },
    completed:     { label: 'Completed',     cls: 'bg-green-50 text-green-700' },
  };
  const m = map[status] || { label: status, cls: 'bg-gray-100 text-gray-500' };
  return <span className={`badge text-xs font-semibold ${m.cls}`}>{m.label}</span>;
}

export default function SamplesPage() {
  const { user }     = useAuth();
  const isAdmin      = user.role === 'admin';
  const isManager    = user.role === 'lab_manager';
  const isSuperAdmin = user.role === 'super_admin';

  // ── View toggle: 'groups' | 'individual' ──────────────────────────────────
  // Admins and managers default to groups (that's where they start their work)
  // Super admin defaults to individual (they want the full sorted list)
  const [view, setView] = useState(isSuperAdmin ? 'individual' : 'groups');

  // ── Group view state ───────────────────────────────────────────────────────
  const [groups,    setGroups]   = useState([]);
  const [clients,   setClients]  = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // Register group modal
  const [modal,      setModal]     = useState(false);
  const [groupRefId, setGroupRefId]= useState('');
  const [clientId,   setClientId]  = useState('');
  const [rows,       setRows]      = useState([{ sample_ref_id: '', description: '' }]);
  const [regError,   setRegError]  = useState('');
  const [saving,     setSaving]    = useState(false);
  const inputRefs = useRef({});

  // ── Individual view state ──────────────────────────────────────────────────
  const [samples,       setSamples]      = useState([]);
  const [samplesLoading,setSamplesLoading] = useState(false);
  const [samplesError,  setSamplesError] = useState('');
  const [fromDate,      setFromDate]     = useState('');
  const [toDate,        setToDate]       = useState('');
  const [statusFilter,  setStatusFilter] = useState('');
  const [groupFilter,   setGroupFilter]  = useState('');
  const [deleteConfirm, setDeleteConfirm]= useState(null);

  // ── Load functions ─────────────────────────────────────────────────────────
  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const [g, c] = await Promise.all([
        api.getSampleGroups(),
        (isAdmin || isSuperAdmin) ? api.getClients() : Promise.resolve([]),
      ]);
      setGroups(g); setClients(c);
    } catch (err) { console.error(err); }
    finally { setGroupsLoading(false); }
  }, [isAdmin, isSuperAdmin]);

  const loadSamples = useCallback(async () => {
    setSamplesLoading(true); setSamplesError('');
    try {
      const data = await api.getSamples({
        from:     fromDate     || undefined,
        to:       toDate       || undefined,
        status:   statusFilter || undefined,
        group_id: groupFilter  || undefined,
      });
      setSamples(data);
    } catch (err) { setSamplesError(err.message); }
    finally { setSamplesLoading(false); }
  }, [fromDate, toDate, statusFilter, groupFilter]);

  useEffect(() => { loadGroups(); }, [loadGroups]);
  useEffect(() => { if (view === 'individual') loadSamples(); }, [view, loadSamples]);

  // ── Register group — barcode-aware row management ─────────────────────────
  useEffect(() => {
    if (!modal) return;
    const el = inputRefs.current[rows.length - 1];
    if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }, [rows.length, modal]);

  const addRow = useCallback(() => setRows(r => [...r, { sample_ref_id: '', description: '' }]), []);

  const removeRow = (i) => {
    setRows(r => r.filter((_, idx) => idx !== i));
    delete inputRefs.current[i];
    inputRefs.current[i - 1]?.focus();
  };

  const updateRow = (i, key, val) =>
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [key]: val } : row));

  const handleSampleKeyDown = (e, i) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (!rows[i].sample_ref_id.trim()) return;
    if (i === rows.length - 1) addRow();
    else inputRefs.current[i + 1]?.focus();
  };

  const openModal = () => {
    setGroupRefId(''); setClientId('');
    setRows([{ sample_ref_id: '', description: '' }]);
    inputRefs.current = {};
    setRegError(''); setModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!groupRefId || !clientId) return setRegError('Group ID and client are required');
    const filled = rows.filter(r => r.sample_ref_id.trim());
    if (!filled.length) return setRegError('Add at least one sample');
    setSaving(true); setRegError('');
    try {
      await api.createSampleGroup({ group_ref_id: groupRefId, client_id: clientId, samples: filled });
      setModal(false);
      loadGroups();
    } catch (err) { setRegError(err.message); }
    finally { setSaving(false); }
  };

  // ── Delete sample (super admin) ────────────────────────────────────────────
  const handleDeleteSample = async () => {
    try { await api.deleteSample(deleteConfirm.id); setDeleteConfirm(null); loadSamples(); }
    catch (err) { alert(err.message); setDeleteConfirm(null); }
  };

  const filledCount  = rows.filter(r => r.sample_ref_id.trim()).length;
  const hasFilters   = fromDate || toDate || statusFilter || groupFilter;
  const clearFilters = () => { setFromDate(''); setToDate(''); setStatusFilter(''); setGroupFilter(''); };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Page header + view toggle ─────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Samples</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {view === 'groups'
              ? 'Sample batches received from clients.'
              : `${samples.length} sample${samples.length !== 1 ? 's' : ''} · sorted by Lab ID then registration date`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Register Group — admin only, groups view only */}
          {isAdmin && view === 'groups' && (
            <button className="btn-primary" onClick={openModal}>
              <Plus size={15} /> Register Group
            </button>
          )}

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setView('groups')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${view === 'groups' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <Layers size={13} /> By Group
            </button>
            <button onClick={() => setView('individual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${view === 'individual' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <List size={13} /> All Samples
            </button>
          </div>
        </div>
      </div>

      {/* ══ BY GROUP VIEW ════════════════════════════════════════════════════ */}
      {view === 'groups' && (
        <>
          {groupsLoading ? <PageSpinner /> : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Group Ref ID','Client','Samples','Status','Received',''].map((h,i) => (
                        <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {groups.length === 0
                      ? <tr><td colSpan={6}><Empty message="No sample groups registered yet." icon={ClipboardList} /></td></tr>
                      : groups.map(g => (
                        <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">{g.group_ref_id}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{g.client_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{g.sample_count} sample(s)</td>
                          <td className="px-4 py-3"><Badge status={g.status} /></td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {new Date(g.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <Link to={`/sample-groups/${g.id}`}
                              className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium">
                              View <ChevronRight size={12} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ ALL SAMPLES VIEW ═════════════════════════════════════════════════ */}
      {view === 'individual' && (
        <>
          {/* Filters */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filters</span>
              {hasFilters && (
                <button onClick={clearFilters}
                  className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                  <X size={12} /> Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="label">From Date</label>
                <input type="date" className="input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="label">To Date</label>
                <input type="date" className="input" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  <option value="on_the_way">On the Way</option>
                  <option value="tests_ongoing">Tests Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="label">Group</label>
                <select className="input" value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
                  <option value="">All groups</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.group_ref_id} ({g.client_name})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {samplesError && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 flex items-center gap-2">
              {samplesError}
              <button onClick={loadSamples} className="ml-auto underline text-xs">Retry</button>
            </div>
          )}

          {samplesLoading ? <PageSpinner /> : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Lab ID','Sample Ref ID','Group','Client','Tests','Status','Registered',
                        isSuperAdmin ? 'Actions' : ''].filter(Boolean).map((h,i) => (
                        <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {samples.length === 0
                      ? <tr><td colSpan={8}><Empty message="No samples match your filters." /></td></tr>
                      : samples.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            {s.lab_internal_id
                              ? <span className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">{s.lab_internal_id}</span>
                              : <span className="text-gray-300 text-xs italic">Not assigned</span>}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-gray-700">{s.sample_ref_id}</td>
                          <td className="px-4 py-3">
                            <Link to={`/sample-groups/${s.sample_group_id}`}
                              className="font-mono text-xs text-brand-600 hover:underline">
                              {s.group_ref_id}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{s.client_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{s.approved_count}/{s.test_count} approved</td>
                          <td className="px-4 py-3"><SampleStatusBadge status={s.sample_status} /></td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                            {new Date(s.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                          </td>
                          {isSuperAdmin && (
                            <td className="px-4 py-3">
                              <button onClick={() => setDeleteConfirm(s)} title="Delete sample"
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ REGISTER GROUP MODAL ════════════════════════════════════════════ */}
      <Modal open={modal} onClose={() => setModal(false)} title="Register Sample Group" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Group Reference ID" required>
              <input className="input font-mono" required value={groupRefId}
                onChange={e => setGroupRefId(e.target.value)} placeholder="GRP-2024-001" />
            </Field>
            <Field label="Client" required>
              <select className="input" required value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">— Select client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label className="label mb-0">Samples <span className="text-brand-600">*</span></label>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                  <ScanLine size={10} /> Barcode scanner ready
                </span>
              </div>
              <button type="button" onClick={addRow}
                className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1">
                <Plus size={12} /> Add Row
              </button>
            </div>

            <div className="grid grid-cols-[24px_1fr_1fr_28px] gap-2 px-0.5 mb-1">
              <span />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sample Ref ID</span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Description (optional)</span>
              <span />
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {rows.map((row, i) => {
                const isLast   = i === rows.length - 1;
                const isFilled = !!row.sample_ref_id.trim();
                return (
                  <div key={i} className={`grid grid-cols-[24px_1fr_1fr_28px] items-center gap-2 rounded-lg px-1 py-0.5
                    ${isLast ? 'bg-brand-50 ring-1 ring-brand-200' : isFilled ? 'bg-green-50' : ''}`}>
                    <span className={`text-xs text-right font-mono ${isFilled ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                      {isFilled ? '✓' : `${i+1}.`}
                    </span>
                    <input
                      ref={el => { inputRefs.current[i] = el; }}
                      className={`input font-mono text-sm transition-all
                        ${isLast ? 'ring-2 ring-brand-400 border-brand-400'
                          : isFilled ? 'border-green-200 bg-green-50 text-green-800' : ''}`}
                      placeholder={isLast ? '▸ Scan barcode or type…' : 'Sample Ref ID'}
                      value={row.sample_ref_id}
                      onChange={e => updateRow(i, 'sample_ref_id', e.target.value)}
                      onKeyDown={e => handleSampleKeyDown(e, i)}
                      autoComplete="off" spellCheck={false}
                    />
                    <input
                      className="input text-sm"
                      placeholder="Description"
                      value={row.description}
                      onChange={e => updateRow(i, 'description', e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Tab' && !e.shiftKey && i === rows.length - 1) {
                          e.preventDefault(); addRow();
                        }
                      }}
                    />
                    {rows.length > 1
                      ? <button type="button" onClick={() => removeRow(i)} tabIndex={-1}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded shrink-0">
                          <Trash2 size={13} />
                        </button>
                      : <span />}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-400">
                {filledCount > 0
                  ? <><span className="text-green-600 font-semibold">{filledCount}</span> sample{filledCount !== 1 ? 's' : ''} scanned · {rows.length - filledCount} empty</>
                  : `${rows.length} row${rows.length !== 1 ? 's' : ''} — start scanning`}
              </p>
              <p className="text-[10px] text-gray-400">
                Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-500 font-mono text-[9px]">Enter</kbd> to advance
              </p>
            </div>
          </div>

          <Alert type="error" message={regError} />

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving || filledCount === 0}>
              <ClipboardList size={15} />
              {saving ? 'Registering…' : `Register Group (${filledCount} sample${filledCount !== 1 ? 's' : ''})`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete sample confirm */}
      <Confirm open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={handleDeleteSample} danger
        title="Delete Sample"
        message={`Delete sample "${deleteConfirm?.sample_ref_id}"${deleteConfirm?.lab_internal_id ? ` (Lab ID: ${deleteConfirm.lab_internal_id})` : ''}? Samples with submitted or approved results cannot be deleted.`} />
    </div>
  );
}
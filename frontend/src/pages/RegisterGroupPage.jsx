import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Field, Alert } from '../components/shared/UI';
import { Plus, Trash2, ScanLine, ClipboardList } from 'lucide-react';

export default function RegisterGroupPage() {
  const navigate = useNavigate();
  const [clients,    setClients]    = useState([]);
  const [groupRefId, setGroupRefId] = useState('');
  const [clientId,   setClientId]   = useState('');
  const [rows,       setRows]       = useState([{ sample_ref_id: '', description: '' }]);
  const [error,      setError]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const inputRefs = useRef({});

  useEffect(() => {
    api.getClients().then(setClients).catch(() => {});
  }, []);

  // Auto-focus last row when a new one is added
  useEffect(() => {
    const el = inputRefs.current[rows.length - 1];
    if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }, [rows.length]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupRefId || !clientId) return setError('Group ID and client are required');
    const filled = rows.filter(r => r.sample_ref_id.trim());
    if (!filled.length) return setError('Add at least one sample');
    setSaving(true); setError('');
    try {
      const group = await api.createSampleGroup({ group_ref_id: groupRefId, client_id: clientId, samples: filled });
      navigate(`/sample-groups/${group.id}`);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const filledCount = rows.filter(r => r.sample_ref_id.trim()).length;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Register Sample Group</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Create a new batch of samples received from a client. Use a barcode scanner for fast entry.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Group Reference ID" required>
            <input
              className="input font-mono"
              required
              value={groupRefId}
              onChange={e => setGroupRefId(e.target.value)}
              placeholder="GRP-2024-001"
              autoFocus
            />
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

          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
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
                    autoComplete="off"
                    spellCheck={false}
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

        <Alert type="error" message={error} />

        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <button type="button" className="btn-secondary" onClick={() => navigate('/samples')}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving || filledCount === 0}>
            <ClipboardList size={15} />
            {saving ? 'Registering…' : `Register Group (${filledCount} sample${filledCount !== 1 ? 's' : ''})`}
          </button>
        </div>
      </form>
    </div>
  );
}

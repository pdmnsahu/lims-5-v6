import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Badge, Empty, PageSpinner, Confirm } from '../components/shared/UI';
import { useAuth } from '../contexts/AuthContext';
import { Layers, List, Trash2, ChevronRight, Filter, X } from 'lucide-react';

// Sample status badge — 3 states
function SampleStatusBadge({ status }) {
  const map = {
    on_the_way:    { label: 'On the Way',     cls: 'bg-blue-50 text-blue-700'    },
    tests_ongoing: { label: 'Tests Ongoing',  cls: 'bg-amber-50 text-amber-700'  },
    completed:     { label: 'Completed',      cls: 'bg-green-50 text-green-700'  },
  };
  const m = map[status] || { label: status, cls: 'bg-gray-100 text-gray-500' };
  return <span className={`badge text-xs font-semibold ${m.cls}`}>{m.label}</span>;
}

export default function SamplesPage() {
  const { user }    = useAuth();
  const isSuperAdmin = user.role === 'super_admin';

  const [view,     setView]     = useState('individual'); // 'individual' | 'by_group'
  const [samples,  setSamples]  = useState([]);
  const [groups,   setGroups]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  // Filters
  const [fromDate,     setFromDate]     = useState('');
  const [toDate,       setToDate]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [groupFilter,  setGroupFilter]  = useState('');

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadSamples = async () => {
    setLoading(true); setError('');
    try {
      const data = await api.getSamples({
        from: fromDate || undefined,
        to:   toDate   || undefined,
        status: statusFilter || undefined,
        group_id: groupFilter || undefined,
      });
      setSamples(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const loadGroups = async () => {
    try { const data = await api.getSampleGroups(); setGroups(data); }
    catch (err) { console.error(err); }
  };

  useEffect(() => { loadGroups(); }, []);
  useEffect(() => { loadSamples(); }, [fromDate, toDate, statusFilter, groupFilter]);

  const handleDelete = async () => {
    try {
      await api.deleteSample(deleteConfirm.id);
      setDeleteConfirm(null);
      loadSamples();
    } catch (err) { alert(err.message); setDeleteConfirm(null); }
  };

  const clearFilters = () => { setFromDate(''); setToDate(''); setStatusFilter(''); setGroupFilter(''); };
  const hasFilters   = fromDate || toDate || statusFilter || groupFilter;

  if (loading && samples.length === 0) return <PageSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Samples</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {samples.length} sample{samples.length !== 1 ? 's' : ''} · sorted by Lab ID then registration date
          </p>
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setView('individual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'individual' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <List size={13} /> Individual
          </button>
          <button onClick={() => setView('by_group')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'by_group' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <Layers size={13} /> By Group
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filters</span>
          {hasFilters && (
            <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
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
              {groups.map(g => <option key={g.id} value={g.id}>{g.group_ref_id} ({g.client_name})</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error} <button onClick={loadSamples} className="ml-2 underline">Retry</button>
        </div>
      )}

      {/* Individual view */}
      {view === 'individual' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Lab ID', 'Sample Ref ID', 'Group', 'Client', 'Tests', 'Status', 'Registered', isSuperAdmin ? 'Actions' : ''].filter(Boolean).map((h,i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {samples.length === 0 && !loading
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
                        <Link to={`/sample-groups/${s.sample_group_id}`} className="font-mono text-xs text-brand-600 hover:underline">
                          {s.group_ref_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{s.client_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {s.approved_count}/{s.test_count} approved
                      </td>
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

      {/* By Group view */}
      {view === 'by_group' && (
        <div className="space-y-4">
          {(() => {
            // Group samples by group_ref_id
            const grouped = {};
            samples.forEach(s => {
              const key = s.sample_group_id;
              if (!grouped[key]) grouped[key] = { group_ref_id: s.group_ref_id, client_name: s.client_name, id: s.sample_group_id, samples: [] };
              grouped[key].samples.push(s);
            });
            const groupList = Object.values(grouped);
            if (groupList.length === 0) return <Empty message="No samples match your filters." />;
            return groupList.map(g => (
              <div key={g.id} className="card overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-gray-800">{g.group_ref_id}</span>
                    <span className="text-xs text-gray-500">{g.client_name}</span>
                    <span className="badge bg-gray-200 text-gray-600 text-xs">{g.samples.length} sample{g.samples.length !== 1 ? 's' : ''}</span>
                  </div>
                  <Link to={`/sample-groups/${g.id}`} className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1">
                    View group <ChevronRight size={12} />
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Lab ID</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Sample Ref</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Tests</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Registered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {g.samples.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            {s.lab_internal_id
                              ? <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{s.lab_internal_id}</span>
                              : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-gray-700">{s.sample_ref_id}</td>
                          <td className="px-4 py-2 text-xs text-gray-500">{s.approved_count}/{s.test_count}</td>
                          <td className="px-4 py-2"><SampleStatusBadge status={s.sample_status} /></td>
                          <td className="px-4 py-2 text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      <Confirm open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={handleDelete} danger
        title="Delete Sample"
        message={`Delete sample "${deleteConfirm?.sample_ref_id}"${deleteConfirm?.lab_internal_id ? ` (Lab ID: ${deleteConfirm.lab_internal_id})` : ''}? This cannot be undone. Samples with submitted or approved results cannot be deleted.`} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Field, Alert } from '../components/shared/UI';
import { Thermometer, Droplets, Save, ChevronLeft, ChevronRight } from 'lucide-react';

function fmtDate(d) {
  const dt = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
  return dt.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function toISODate(d) {
  const dt = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export default function AmbientPage() {
  const today = toISODate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [reading,   setReading]   = useState(null);
  const [loadingR,  setLoadingR]  = useState(false);
  const [history,   setHistory]   = useState([]);
  const [loadingH,  setLoadingH]  = useState(false);
  const [form,      setForm]      = useState({ temperature: '', humidity: '', notes: '' });
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  // Load reading for selected date
  const loadReading = async (date) => {
    setLoadingR(true); setError(''); setSuccess('');
    try {
      const data = await api.getAmbientByDate(date);
      setReading(data);
      if (data) {
        setForm({
          temperature: data.temperature ?? '',
          humidity:    data.humidity    ?? '',
          notes:       data.notes       ?? '',
        });
      } else {
        setForm({ temperature: '', humidity: '', notes: '' });
      }
    } catch (err) { setError(err.message); }
    finally { setLoadingR(false); }
  };

  // Load last 14 days history
  const loadHistory = async () => {
    setLoadingH(true);
    try {
      const data = await api.getAmbientReadings(14);
      setHistory(data);
    } catch (err) { console.error(err); }
    finally { setLoadingH(false); }
  };

  useEffect(() => { loadReading(selectedDate); }, [selectedDate]);
  useEffect(() => { loadHistory(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.temperature && !form.humidity) return setError('Enter at least temperature or humidity');
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.saveAmbient(selectedDate, {
        temperature: form.temperature ? parseFloat(form.temperature) : null,
        humidity:    form.humidity    ? parseFloat(form.humidity)    : null,
        notes:       form.notes || null,
      });
      setSuccess(`Reading saved for ${fmtDate(selectedDate)}`);
      await loadReading(selectedDate);
      await loadHistory();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const isToday = selectedDate === today;
  const isFuture = selectedDate > today;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ambient Conditions</h1>
        <p className="text-sm text-gray-500 mt-0.5">Record daily laboratory temperature and humidity readings.</p>
      </div>

      {/* Date navigator */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-4">
          <button onClick={() => setSelectedDate(d => addDays(d, -1))}
            className="btn-secondary py-1.5 px-3">
            <ChevronLeft size={16} />
          </button>

          <div className="flex-1 text-center">
            <p className="text-lg font-semibold text-gray-900">{fmtDate(selectedDate)}</p>
            {isToday && <span className="text-xs text-brand-600 font-medium">Today</span>}
            {isFuture && <span className="text-xs text-amber-600 font-medium">Future date</span>}
          </div>

          <button onClick={() => setSelectedDate(d => addDays(d, 1))}
            disabled={isToday}
            className="btn-secondary py-1.5 px-3 disabled:opacity-40">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Date picker */}
        <div className="flex justify-center mt-3">
          <input type="date" className="input text-sm max-w-[180px] text-center"
            value={selectedDate}
            max={today}
            onChange={e => setSelectedDate(e.target.value)} />
        </div>
      </div>

      {/* Current reading form */}
      <div className="card p-6">
        {loadingR ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-semibold text-gray-900">
                {reading ? 'Update Reading' : 'Add Reading'}
              </h2>
              {reading && (
                <span className="text-xs text-gray-400">
                  Last recorded by {reading.recorded_by_name} at {new Date(reading.updated_at || reading.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-5">
              {/* Temperature */}
              <div>
                <label className="label flex items-center gap-1.5">
                  <Thermometer size={13} className="text-orange-500" /> Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="60"
                  className="input font-mono text-lg text-center"
                  placeholder="28.0"
                  value={form.temperature}
                  onChange={e => setForm(f => ({ ...f, temperature: e.target.value }))}
                />
              </div>

              {/* Humidity */}
              <div>
                <label className="label flex items-center gap-1.5">
                  <Droplets size={13} className="text-blue-500" /> Humidity (% RH)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  className="input font-mono text-lg text-center"
                  placeholder="54.0"
                  value={form.humidity}
                  onChange={e => setForm(f => ({ ...f, humidity: e.target.value }))}
                />
              </div>
            </div>

            <Field label="Notes (optional)">
              <textarea
                className="input resize-none min-h-[60px]"
                placeholder="Any observations about lab conditions…"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </Field>

            {error   && <Alert type="error"   message={error}   />}
            {success && <Alert type="success" message={success} />}

            <button type="submit" className="btn-primary" disabled={saving || isFuture}>
              <Save size={15} /> {saving ? 'Saving…' : reading ? 'Update Reading' : 'Save Reading'}
            </button>

            {isFuture && <p className="text-xs text-amber-600">Cannot save readings for future dates.</p>}
          </form>
        )}
      </div>

      {/* History table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Readings (last 14 days)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Date', 'Temperature (°C)', 'Humidity (% RH)', 'Notes', 'Recorded By'].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loadingH ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">Loading…</td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">No readings recorded yet.</td></tr>
              ) : history.map(r => (
                <tr key={r.id}
                  onClick={() => setSelectedDate(toISODate(r.reading_date))}
                  className={`cursor-pointer transition-colors hover:bg-brand-50 ${toISODate(r.reading_date) === selectedDate ? 'bg-brand-50' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-800">
                      {fmtDate(r.reading_date)}
                    </span>
                    {toISODate(r.reading_date) === today && (
                      <span className="ml-2 text-[10px] font-semibold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">TODAY</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.temperature != null
                      ? <span className="flex items-center gap-1"><Thermometer size={12} className="text-orange-400" /><span className="font-mono font-semibold text-gray-800">{r.temperature}</span></span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.humidity != null
                      ? <span className="flex items-center gap-1"><Droplets size={12} className="text-blue-400" /><span className="font-mono font-semibold text-gray-800">{r.humidity}</span></span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{r.notes || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.recorded_by_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

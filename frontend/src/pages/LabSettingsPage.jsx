import { useEffect, useState, useRef } from 'react';
import { api } from '../../lib/api';
import { Alert, Field } from '../shared/UI';
import { Save, Upload, Check } from 'lucide-react';

const IMAGE_FIELDS = [
  { key: 'logo',          label: 'Company Logo',        hint: 'Appears top-left of every report',          col: 'logo_url'          },
  { key: 'accreditation', label: 'Accreditation Badge', hint: 'Appears top-right of every report',         col: 'accreditation_url' },
  { key: 'stamp',         label: 'Lab Stamp',           hint: 'Circular stamp in the signature block',     col: 'stamp_url'         },
  { key: 'signature',     label: 'Authorised Signature',hint: 'Signature line in the signature block',     col: 'signature_url'     },
];

export default function LabSettingsPage() {
  const [settings,   setSettings]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [saveError,  setSaveError]  = useState('');
  const [saveOk,     setSaveOk]     = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [imgUploading, setImgUploading] = useState({});
  const [imgError,   setImgError]   = useState({});
  const [imgOk,      setImgOk]      = useState({});

  // Text form state
  const [form, setForm] = useState({
    lab_name: '', lab_address: '', lab_phone: '',
    lab_email: '', lab_website: '', corp_office: '',
  });

  const fileRefs = useRef({});

  useEffect(() => {
    api.getSettings()
      .then(data => {
        setSettings(data);
        setForm({
          lab_name:    data.lab_name    || '',
          lab_address: data.lab_address || '',
          lab_phone:   data.lab_phone   || '',
          lab_email:   data.lab_email   || '',
          lab_website: data.lab_website || '',
          corp_office: data.corp_office || '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveError(''); setSaveOk(false);
    try {
      const updated = await api.updateSettings(form);
      setSettings(updated);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) { setSaveError(err.message); }
    finally { setSaving(false); }
  };

  const handleImageUpload = async (field, file) => {
    setImgUploading(p => ({ ...p, [field]: true }));
    setImgError(p => ({ ...p, [field]: '' }));
    setImgOk(p => ({ ...p, [field]: false }));
    try {
      const { settings: updated } = await api.uploadSettingsImage(field, file);
      setSettings(updated);
      setImgOk(p => ({ ...p, [field]: true }));
      setTimeout(() => setImgOk(p => ({ ...p, [field]: false })), 3000);
    } catch (err) {
      setImgError(p => ({ ...p, [field]: err.message }));
    } finally {
      setImgUploading(p => ({ ...p, [field]: false }));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lab Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          These images and details are automatically used in every test report PDF. Set them once — no one else needs to upload anything.
        </p>
      </div>

      {/* ── IMAGE UPLOADS ── */}
      <div className="card p-6 space-y-6">
        <h2 className="font-semibold text-gray-900 text-base">Report Images</h2>
        <p className="text-sm text-gray-500 -mt-4">
          Each image is stored securely and auto-loaded when any report is opened.
        </p>

        <div className="grid grid-cols-2 gap-6">
          {IMAGE_FIELDS.map(({ key, label, hint, col }) => {
            const currentUrl = settings?.[col];
            const uploading  = imgUploading[key];
            const ok         = imgOk[key];
            const err        = imgError[key];

            return (
              <div key={key} className="space-y-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{hint}</p>
                </div>

                {/* Current image preview */}
                <div className="h-28 border border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
                  {currentUrl
                    ? <img src={currentUrl} alt={label} className="max-h-full max-w-full object-contain p-2" />
                    : <span className="text-xs text-gray-400 italic">Not uploaded yet</span>}
                </div>

                {/* Upload button */}
                <button
                  onClick={() => fileRefs.current[key]?.click()}
                  disabled={uploading}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    ok
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {uploading ? (
                    <><div className="w-3.5 h-3.5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /> Uploading…</>
                  ) : ok ? (
                    <><Check size={14} /> Saved!</>
                  ) : (
                    <><Upload size={14} /> {currentUrl ? 'Replace Image' : 'Upload Image'}</>
                  )}
                </button>

                {err && <p className="text-xs text-red-500">{err}</p>}

                <input
                  ref={el => fileRefs.current[key] = el}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) handleImageUpload(key, file);
                    e.target.value = '';
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TEXT SETTINGS ── */}
      <form onSubmit={handleSave} className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 text-base">Lab Information</h2>
        <p className="text-sm text-gray-500 -mt-4">
          These details appear in the report header, address bar, and footer.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Laboratory Name" required>
            <input className="input" value={form.lab_name}
              onChange={e => setForm(f => ({ ...f, lab_name: e.target.value }))} />
          </Field>
          <Field label="Lab Phone">
            <input className="input" value={form.lab_phone} placeholder="+91 XXXXXXXXXX"
              onChange={e => setForm(f => ({ ...f, lab_phone: e.target.value }))} />
          </Field>
          <Field label="Lab Email">
            <input className="input" type="email" value={form.lab_email}
              onChange={e => setForm(f => ({ ...f, lab_email: e.target.value }))} />
          </Field>
          <Field label="Website">
            <input className="input" value={form.lab_website} placeholder="www.example.com"
              onChange={e => setForm(f => ({ ...f, lab_website: e.target.value }))} />
          </Field>
        </div>

        <Field label="Laboratory Address">
          <textarea className="input resize-none min-h-[60px]" value={form.lab_address}
            onChange={e => setForm(f => ({ ...f, lab_address: e.target.value }))} />
        </Field>

        <Field label="Corporate Office Address">
          <textarea className="input resize-none min-h-[60px]" value={form.corp_office}
            onChange={e => setForm(f => ({ ...f, corp_office: e.target.value }))} />
        </Field>

        {saveError && <Alert type="error" message={saveError} />}
        {saveOk    && <Alert type="success" message="Settings saved successfully." />}

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={15} /> {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

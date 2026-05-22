import { useState, useRef } from 'react';
import { api } from '../lib/api';
import { Alert } from '../components/shared/UI';
import { Download, Upload, FileSpreadsheet, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export default function ExportImportPage() {
  const [exporting,  setExporting]  = useState(false);
  const [exportErr,  setExportErr]  = useState('');
  const [exportOk,   setExportOk]   = useState(false);

  const [importFile, setImportFile] = useState(null);
  const [importing,  setImporting]  = useState(false);
  const [importErr,  setImportErr]  = useState('');
  const [importResult, setImportResult] = useState(null);

  const fileRef = useRef(null);

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true); setExportErr(''); setExportOk(false);
    try {
      await api.exportData();
      setExportOk(true);
      setTimeout(() => setExportOk(false), 4000);
    } catch (err) {
      setExportErr(err.message);
    } finally {
      setExporting(false);
    }
  };

  // ── Import ─────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true); setImportErr(''); setImportResult(null);
    try {
      const result = await api.importData(importFile);
      setImportResult(result.summary);
      setImportFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setImportErr(err.message);
    } finally {
      setImporting(false);
    }
  };

  const totalImported = importResult
    ? Object.values(importResult).reduce((sum, s) => sum + s.imported, 0)
    : 0;
  const totalSkipped = importResult
    ? Object.values(importResult).reduce((sum, s) => sum + s.skipped, 0)
    : 0;

  const SHEET_LABELS = {
    users:   'Users',
    clients: 'Clients',
    groups:  'Sample Groups',
    samples: 'Samples',
    tests:   'Test Results',
    ambient: 'Ambient Readings',
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Backup</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Export all lab data to Excel for safekeeping. Import a previous export to restore missing records.
        </p>
      </div>

      {/* ── EXPORT ── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <FileSpreadsheet size={20} className="text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Export Data</h2>
            <p className="text-sm text-gray-500">
              Downloads a single Excel file with 7 sheets — Users, Clients, Sample Groups,
              Samples, Test Results, Ambient Readings, and Lab Settings.
            </p>
          </div>
        </div>

        {exportErr && <Alert type="error" message={exportErr} />}

        <button
          onClick={handleExport}
          disabled={exporting}
          className={`btn-primary w-full justify-center py-2.5 ${exportOk ? 'bg-green-600 hover:bg-green-700' : ''}`}
        >
          {exporting
            ? <><Loader2 size={16} className="animate-spin" /> Generating Excel…</>
            : exportOk
            ? <><CheckCircle size={16} /> Downloaded Successfully</>
            : <><Download size={16} /> Download Full Export</>}
        </button>

        <p className="text-xs text-gray-400 text-center">
          This action is logged in the audit trail. Download monthly for a reliable backup.
        </p>
      </div>

      {/* ── IMPORT ── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Upload size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Import Data</h2>
            <p className="text-sm text-gray-500">
              Upload a previously exported Excel file. Records that already exist are skipped —
              only missing data is added.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 flex items-start gap-2">
          <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Only import files that were exported from this system. Manually edited files
            may cause errors. Imported users will have their username as their default password.
          </p>
        </div>

        {/* File picker */}
        <div>
          <label
            onClick={() => fileRef.current?.click()}
            className={`flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors
              ${importFile
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-500'}`}
          >
            <FileSpreadsheet size={18} />
            <span className="text-sm font-medium">
              {importFile ? importFile.name : 'Choose Excel file (.xlsx)…'}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={e => {
                const file = e.target.files[0];
                if (file) { setImportFile(file); setImportResult(null); setImportErr(''); }
                e.target.value = '';
              }}
            />
          </label>
          {importFile && (
            <p className="text-xs text-gray-400 mt-1 text-center">
              {(importFile.size / 1024).toFixed(1)} KB · Click above to choose a different file
            </p>
          )}
        </div>

        {importErr && <Alert type="error" message={importErr} />}

        <button
          onClick={handleImport}
          disabled={!importFile || importing}
          className="btn-primary w-full justify-center py-2.5 disabled:opacity-40"
        >
          {importing
            ? <><Loader2 size={16} className="animate-spin" /> Importing…</>
            : <><Upload size={16} /> Import Data</>}
        </button>

        {/* Import result summary */}
        {importResult && (
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="bg-green-50 px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-green-800">
                Import complete — {totalImported} records added, {totalSkipped} skipped
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {Object.entries(importResult).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-700">{SHEET_LABELS[key] || key}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-green-700">
                      +{val.imported} added
                    </span>
                    <span className="text-sm text-gray-400">
                      {val.skipped} skipped
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

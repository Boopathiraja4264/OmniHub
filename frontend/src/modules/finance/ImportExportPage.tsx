import React, { useRef, useState } from 'react';
import { importExportApi } from '../../services/api';
import FilterDropdown from '../../components/FilterDropdown';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const triggerDownload = (data: BlobPart, filename: string) => {
  const url = URL.createObjectURL(new Blob([data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const ImportExportPage: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [summaryYear, setSummaryYear] = useState(now.getFullYear());
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingSummary, setExportingSummary] = useState(false);
  const [importResult, setImportResult] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const res = await importExportApi.exportAll();
      triggerDownload(res.data, 'all_transactions.xlsx');
    } catch {} finally { setExportingAll(false); }
  };

  const handleExportSummary = async () => {
    setExportingSummary(true);
    try {
      const res = await importExportApi.exportSummary(summaryYear);
      triggerDownload(res.data, `expense_summary_${summaryYear}.xlsx`);
    } catch {} finally { setExportingSummary(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await importExportApi.exportTransactions(month, year);
      triggerDownload(res.data, `transactions_${MONTHS[month - 1]}_${year}.xlsx`);
    } catch {} finally { setExporting(false); }
  };

  const handleTemplate = async () => {
    try {
      const res = await importExportApi.downloadTemplate();
      triggerDownload(res.data, 'import_template.xlsx');
    } catch {}
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await importExportApi.importTransactions(file);
      setImportResult(res.data.imported);
    } catch {} finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Import / Export</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Summary Report */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>Annual Summary Report</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Download a pivot-table Excel report with expenses by category &amp; item across all 12 months, plus charts (donut by category, column by month).
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <FilterDropdown
              value={summaryYear}
              options={[2024, 2025, 2026, 2027].map(y => ({ label: String(y), value: y }))}
              onChange={v => setSummaryYear(v as number)}
              minWidth={100}
            />
            <button className="btn btn-primary" onClick={handleExportSummary} disabled={exportingSummary}>
              {exportingSummary ? 'Generating...' : 'Download Summary Report (.xlsx)'}
            </button>
          </div>
        </div>

        {/* Export All */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>Export All Transactions</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Download every transaction across all time as a single Excel file.
          </p>
          <button className="btn btn-primary" onClick={handleExportAll} disabled={exportingAll}>
            {exportingAll ? 'Exporting...' : 'Download All (.xlsx)'}
          </button>
        </div>

        {/* Export by month */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>Export by Month</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Download transactions for a specific month.
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
            <FilterDropdown
              value={month}
              options={MONTHS.map((m, i) => ({ label: m, value: i + 1 }))}
              onChange={v => setMonth(v as number)}
              minWidth={100}
            />
            <FilterDropdown
              value={year}
              options={[2024, 2025, 2026, 2027].map(y => ({ label: String(y), value: y }))}
              onChange={v => setYear(v as number)}
              minWidth={100}
            />
          </div>
          <button className="btn btn-secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Download (.xlsx)'}
          </button>
        </div>
      </div>

      {/* Import */}
      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>Import Transactions</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          Upload an Excel file (.xlsx) to bulk import transactions. Download the template first to see the required format.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <button className="btn btn-secondary" onClick={handleTemplate}>Download Template</button>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: 300 }}>
            <label>Upload Excel File (.xlsx)</label>
            <input ref={fileRef} type="file" accept=".xlsx" onChange={handleImport} disabled={importing} />
          </div>
        </div>
        {importing && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>Importing...</p>}
        {importResult !== null && (
          <p style={{ fontSize: 13, color: 'var(--income)', marginTop: 12, fontWeight: 600 }}>
            ✓ {importResult} transactions imported successfully.
          </p>
        )}
      </div>
    </div>
  );
};

export default ImportExportPage;

import React, { useEffect, useRef, useState } from 'react';
import { bankAccountApi, creditCardApi, categoryItemApi, transactionApi } from '../../services/api';
import { BankAccount, CreditCard } from '../../types';
import { ParsedRow, parseKotakCSV, parseKotakExcel, parseKotakPDF } from './parsers/KotakParser';

type FileType = 'PDF' | 'CSV' | 'Excel';
type BankFormat = 'Kotak Mahindra Bank';

interface ReviewRow extends ParsedRow {
  id: string;
  category: string;
  itemName: string;
  notes: string;
  included: boolean;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const BANK_FORMATS: BankFormat[] = ['Kotak Mahindra Bank'];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

const ImportStatementModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<'setup' | 'review'>('setup');

  // Setup state
  const [fileType, setFileType] = useState<FileType>('PDF');
  const [bankFormat, setBankFormat] = useState<BankFormat>('Kotak Mahindra Bank');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedAccountType, setSelectedAccountType] = useState<'BANK' | 'CARD'>('BANK');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Accounts
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);

  // Review state
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    bankAccountApi.getAll().then(r => setBankAccounts(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    creditCardApi.getAll().then(r => setCards(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    categoryItemApi.getCategories().then(r => setCategories(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const acceptMap: Record<FileType, string> = {
    PDF: '.pdf',
    CSV: '.csv',
    Excel: '.xlsx,.xls',
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    setParseError('');
    try {
      let parsed: ParsedRow[] = [];
      if (fileType === 'PDF')   parsed = await parseKotakPDF(file);
      if (fileType === 'CSV')   parsed = await parseKotakCSV(file);
      if (fileType === 'Excel') parsed = await parseKotakExcel(file);

      if (!parsed.length) {
        setParseError('No transactions found. Make sure the file matches the selected bank format.');
        return;
      }
      setRows(parsed.map((r, i) => ({
        ...r,
        id: String(i),
        category: '',
        itemName: '',
        notes: '',
        included: true,
      })));
      setStep('review');
    } catch (err) {
      setParseError('Failed to parse file. Please check the file and bank format.');
    } finally {
      setParsing(false);
    }
  };

  const toggleAll = (val: boolean) => setRows(r => r.map(x => ({ ...x, included: val })));
  const toggleRow = (id: string) => setRows(r => r.map(x => x.id === id ? { ...x, included: !x.included } : x));
  const deleteRow = (id: string) => setRows(r => r.filter(x => x.id !== id));
  const updateRow = (id: string, patch: Partial<ReviewRow>) =>
    setRows(r => r.map(x => x.id === id ? { ...x, ...patch } : x));

  const includedRows = rows.filter(r => r.included);

  const handleImport = async () => {
    if (!includedRows.length) return;
    setSaving(true);
    try {
      const accountId = parseInt(selectedAccountId);
      await Promise.all(includedRows.map(row => {
        const payload: any = {
          description: row.notes.trim() || (row.type === 'EXPENSE' ? 'Expense' : 'Income'),
          amount: row.amount,
          type: row.type,
          category: row.category || 'Uncategorised',
          itemName: row.itemName || undefined,
          date: row.date,
          notes: row.notes.trim() || undefined,
          paymentSource: selectedAccountType === 'BANK' ? 'BANK' : 'CREDIT_CARD',
        };
        if (selectedAccountType === 'BANK') payload.bankAccountId = accountId;
        else payload.cardId = accountId;
        return transactionApi.create(payload);
      }));
      onSuccess();
      onClose();
    } catch {
      alert('Some transactions failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Step 1: Setup ────────────────────────────────────────────────────────────
  const renderSetup = () => (
    <>
      <div className="modal-header">
        <h3 className="modal-title">Import Bank Statement</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="form-grid" style={{ gap: 16 }}>
        {/* File type */}
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>File Type</label>
          <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {(['PDF', 'CSV', 'Excel'] as FileType[]).map(t => (
              <button key={t} type="button"
                onClick={() => { setFileType(t); setFile(null); }}
                style={{
                  flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                  borderRight: t !== 'Excel' ? '1px solid var(--border)' : 'none',
                  background: fileType === t ? 'var(--primary)' : 'var(--bg-elevated)',
                  color: fileType === t ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Bank format */}
        <div className="form-group">
          <label>Bank Format</label>
          <select value={bankFormat} onChange={e => setBankFormat(e.target.value as BankFormat)}
            style={{ width: '100%' }}>
            {BANK_FORMATS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Source account */}
        <div className="form-group">
          <label>Source Account</label>
          <select value={selectedAccountId}
            onChange={e => {
              const val = e.target.value;
              setSelectedAccountId(val);
              // Determine if bank or card
              const isCard = cards.some(c => String(c.id) === val);
              setSelectedAccountType(isCard ? 'CARD' : 'BANK');
            }}
            style={{ width: '100%' }}>
            <option value="">— Select account —</option>
            {bankAccounts.length > 0 && (
              <optgroup label="Bank Accounts">
                {bankAccounts.map(a => (
                  <option key={`bank-${a.id}`} value={String(a.id)}>{a.name}{a.bankName ? ` · ${a.bankName}` : ''}</option>
                ))}
              </optgroup>
            )}
            {cards.length > 0 && (
              <optgroup label="Credit Cards">
                {cards.map(c => (
                  <option key={`card-${c.id}`} value={String(c.id)}>{c.name}{c.bank ? ` · ${c.bank}` : ''}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* File upload */}
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Statement File</label>
          <div
            onDrop={handleFileDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${file ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 12, padding: '24px 20px', textAlign: 'center',
              cursor: 'pointer', transition: 'border 0.15s',
              background: file ? 'var(--primary-dim)' : 'var(--bg-elevated)',
            }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{file ? '✅' : '📂'}</div>
            {file
              ? <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{file.name}</div>
              : <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Drag & drop or click to browse
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Accepts {acceptMap[fileType]} files
                  </div>
                </>
            }
            <input ref={fileRef} type="file" accept={acceptMap[fileType]} style={{ display: 'none' }}
              onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
        </div>

        {parseError && (
          <div style={{ gridColumn: '1 / -1', background: 'var(--expense-dim)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--expense)' }}>
            {parseError}
          </div>
        )}

        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }}
            disabled={!file || !selectedAccountId || parsing}
            onClick={handleParse}>
            {parsing ? 'Parsing…' : 'Parse & Preview →'}
          </button>
        </div>
      </div>
    </>
  );

  // ── Step 2: Review ───────────────────────────────────────────────────────────
  const renderReview = () => (
    <>
      <div className="modal-header">
        <div>
          <h3 className="modal-title">Review Transactions</h3>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {rows.length} found · {includedRows.length} selected
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Select all / deselect all */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
        <button className="btn btn-sm btn-secondary" onClick={() => toggleAll(true)}>Select All</button>
        <button className="btn btn-sm btn-secondary" onClick={() => toggleAll(false)}>Deselect All</button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {file?.name}
        </span>
      </div>

      {/* Table */}
      <div style={{ maxHeight: '52vh', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', position: 'sticky', top: 0, zIndex: 1 }}>
              <th style={th}>✓</th>
              <th style={th}>Date</th>
              <th style={th}>Amount</th>
              <th style={th}>Type</th>
              <th style={{ ...th, minWidth: 130 }}>Category</th>
              <th style={{ ...th, minWidth: 120 }}>Item</th>
              <th style={{ ...th, minWidth: 140 }}>Description</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} style={{
                background: idx % 2 === 0 ? 'transparent' : 'var(--bg-elevated)',
                opacity: row.included ? 1 : 0.4,
              }}>
                <td style={td}>
                  <input type="checkbox" checked={row.included} onChange={() => toggleRow(row.id)}
                    style={{ cursor: 'pointer' }} />
                </td>
                <td style={td}>
                  <span style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{row.date}</span>
                </td>
                <td style={td}>
                  <span style={{ fontWeight: 600, whiteSpace: 'nowrap', color: row.type === 'INCOME' ? 'var(--income)' : 'var(--expense)' }}>
                    {fmt(row.amount)}
                  </span>
                </td>
                <td style={td}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    background: row.type === 'INCOME' ? 'var(--income-dim)' : 'var(--expense-dim)',
                    color: row.type === 'INCOME' ? 'var(--income)' : 'var(--expense)',
                  }}>{row.type}</span>
                </td>
                <td style={td}>
                  <select value={row.category}
                    onChange={e => updateRow(row.id, { category: e.target.value })}
                    style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', width: '100%' }}>
                    <option value="">— category —</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </td>
                <td style={td}>
                  <input value={row.itemName}
                    onChange={e => updateRow(row.id, { itemName: e.target.value })}
                    placeholder="item"
                    style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', width: '100%' }} />
                </td>
                <td style={td}>
                  <input value={row.notes}
                    onChange={e => updateRow(row.id, { notes: e.target.value })}
                    placeholder="optional"
                    style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', width: '100%' }} />
                </td>
                <td style={td}>
                  <button type="button" onClick={() => deleteRow(row.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '2px 4px', borderRadius: 4 }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--expense)'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'}
                    title="Remove">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep('setup')}>← Back</button>
        <button className="btn btn-primary" style={{ flex: 2 }}
          disabled={!includedRows.length || saving}
          onClick={handleImport}>
          {saving ? 'Importing…' : `Import ${includedRows.length} Transaction${includedRows.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </>
  );

  const th: React.CSSProperties = {
    padding: '8px 10px', textAlign: 'left', fontWeight: 600,
    color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 0.6, borderBottom: '1px solid var(--border)',
  };
  const td: React.CSSProperties = {
    padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)',
    verticalAlign: 'middle',
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: step === 'review' ? 900 : 540, width: '96vw' }}>
        {step === 'setup' ? renderSetup() : renderReview()}
      </div>
    </div>
  );
};

export default ImportStatementModal;

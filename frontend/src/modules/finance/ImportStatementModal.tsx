import React, { useEffect, useRef, useState } from 'react';
import { bankAccountApi, creditCardApi, categoryItemApi, transactionApi } from '../../services/api';
import { BankAccount, CreditCard, ExpenseCategory, ExpenseItem } from '../../types';
import { ParsedRow, parseKotakCSV, parseKotakExcel, parseKotakPDF } from './parsers/KotakParser';
import { parseUjjivanPDF } from './parsers/UjjivanParser';
import { parseSBIPDF } from './parsers/SBIParser';
import { parseAUPDF } from './parsers/AUParser';
import { parseHDFCPDF } from './parsers/HDFCParser';
import { parseICICIPDF } from './parsers/ICICIParser';

type FileType = 'PDF' | 'CSV' | 'Excel';
type BankFormat =
  | 'Kotak Mahindra Bank'
  | 'Ujjivan Small Finance Bank'
  | 'State Bank of India'
  | 'AU Small Finance Bank'
  | 'HDFC Bank'
  | 'ICICI Bank';

interface ReviewRow extends ParsedRow {
  id: string;
  categoryId: string;
  category: string;
  itemName: string;
  notes: string;
  included: boolean;
  isTransfer: boolean;
  transferToAccountId: string;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const BANK_FORMATS: BankFormat[] = [
  'Kotak Mahindra Bank',
  'Ujjivan Small Finance Bank',
  'State Bank of India',
  'AU Small Finance Bank',
  'HDFC Bank',
  'ICICI Bank',
];

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
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<ExpenseItem[]>([]);
  const [rowItems, setRowItems] = useState<Record<string, ExpenseItem[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    bankAccountApi.getAll().then(r => setBankAccounts(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    creditCardApi.getAll().then(r => setCards(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    categoryItemApi.getCategories().then(r => {
      const arr: ExpenseCategory[] = Array.isArray(r.data) ? r.data : [];
      const seen = new Set<string>();
      setCategories(arr.filter(c => seen.has(c.name) ? false : !!seen.add(c.name)));
    }).catch(() => {});
    categoryItemApi.getAll().then(r => {
      const arr: ExpenseItem[] = Array.isArray(r.data) ? r.data : [];
      setFavoriteItems(arr.filter(i => i.favorite));
    }).catch(() => {});
  }, []);

  const acceptMap: Record<FileType, string> = { PDF: '.pdf', CSV: '.csv', Excel: '.xlsx,.xls' };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleParse = async () => {
    if (!file) return;
    setParsing(true); setParseError('');
    try {
      let parsed: ParsedRow[] = [];
      if (bankFormat === 'Kotak Mahindra Bank') {
        if (fileType === 'PDF')   parsed = await parseKotakPDF(file);
        if (fileType === 'CSV')   parsed = await parseKotakCSV(file);
        if (fileType === 'Excel') parsed = await parseKotakExcel(file);
      } else if (bankFormat === 'Ujjivan Small Finance Bank') {
        if (fileType === 'PDF') parsed = await parseUjjivanPDF(file);
        else { setParseError('Ujjivan: only PDF format is supported.'); return; }
      } else if (bankFormat === 'State Bank of India') {
        if (fileType === 'PDF') parsed = await parseSBIPDF(file);
        else { setParseError('SBI: only PDF format is supported.'); return; }
      } else if (bankFormat === 'AU Small Finance Bank') {
        if (fileType === 'PDF') parsed = await parseAUPDF(file);
        else { setParseError('AU Small Finance Bank: only PDF format is supported.'); return; }
      } else if (bankFormat === 'HDFC Bank') {
        if (fileType === 'PDF') parsed = await parseHDFCPDF(file);
        else { setParseError('HDFC Bank: only PDF format is supported.'); return; }
      } else if (bankFormat === 'ICICI Bank') {
        if (fileType === 'PDF') parsed = await parseICICIPDF(file);
        else { setParseError('ICICI Bank: only PDF format is supported.'); return; }
      }
      if (!parsed.length) { setParseError('No transactions found. Make sure the file matches the selected bank format.'); return; }
      setRows(parsed.map((r, i) => ({ ...r, id: String(i), categoryId: '', category: '', itemName: '', notes: '', included: true, isTransfer: false, transferToAccountId: '' })));
      setRowItems({});
      setStep('review');
    } catch { setParseError('Failed to parse file. Please check the file and bank format.'); }
    finally { setParsing(false); }
  };

  const handleCategoryChange = (rowId: string, catId: string) => {
    const cat = categories.find(c => String(c.id) === catId);
    setRows(r => r.map(x => x.id === rowId ? { ...x, categoryId: catId, category: cat?.name || '', itemName: '' } : x));
    setRowItems(prev => ({ ...prev, [rowId]: [] }));
    if (catId) {
      categoryItemApi.getItems(parseInt(catId))
        .then(r => setRowItems(prev => ({ ...prev, [rowId]: Array.isArray(r.data) ? r.data : [] })))
        .catch(() => {});
    }
  };

  const handleFavPick = (rowId: string, item: ExpenseItem) => {
    const cat = categories.find(c => c.id === item.categoryId);
    setRows(r => r.map(x => x.id === rowId ? { ...x, categoryId: String(item.categoryId), category: cat?.name || item.categoryName, itemName: item.name } : x));
    categoryItemApi.getItems(item.categoryId)
      .then(r => setRowItems(prev => ({ ...prev, [rowId]: Array.isArray(r.data) ? r.data : [] })))
      .catch(() => {});
  };

  const toggleAll = (val: boolean) => setRows(r => r.map(x => ({ ...x, included: val })));
  const toggleRow = (id: string) => setRows(r => r.map(x => x.id === id ? { ...x, included: !x.included } : x));
  const deleteRow = (id: string) => setRows(r => r.filter(x => x.id !== id));
  const updateRow = (id: string, patch: Partial<ReviewRow>) => setRows(r => r.map(x => x.id === id ? { ...x, ...patch } : x));

  const includedRows = rows.filter(r => r.included);

  const handleImport = async () => {
    if (!includedRows.length) return;
    setSaving(true);
    try {
      const accountId = parseInt(selectedAccountId.split(':')[1]);
      await Promise.all(includedRows.flatMap(row => {
        const isTransfer = row.isTransfer && row.transferToAccountId;
        const category = isTransfer ? 'Transfer' : (row.category || 'Uncategorised');
        const description = row.notes.trim()
          || (isTransfer ? 'Transfer' : (row.category && row.itemName ? `${row.category} – ${row.itemName}` : row.category))
          || (row.type === 'EXPENSE' ? 'Expense' : 'Income');

        const mainPayload: any = {
          description, amount: row.amount, type: row.type, category,
          itemName: isTransfer ? undefined : (row.itemName || undefined),
          date: row.date,
          notes: row.notes.trim() || undefined,
          paymentSource: selectedAccountType === 'BANK' ? 'BANK' : 'CREDIT_CARD',
        };
        if (selectedAccountType === 'BANK') mainPayload.bankAccountId = accountId;
        else mainPayload.cardId = accountId;

        const ops = [transactionApi.create(mainPayload)];

        if (isTransfer) {
          const otherAccountId = parseInt(row.transferToAccountId.split(':')[1]);
          const mirrorPayload: any = {
            description, amount: row.amount,
            type: row.type === 'EXPENSE' ? 'INCOME' : 'EXPENSE',
            category: 'Transfer', date: row.date,
            notes: row.notes.trim() || undefined,
            paymentSource: 'BANK',
            bankAccountId: otherAccountId,
          };
          ops.push(transactionApi.create(mirrorPayload));
        }
        return ops;
      }));
      onSuccess(); onClose();
    } catch { alert('Some transactions failed to save. Please try again.'); }
    finally { setSaving(false); }
  };

  // ── Step 1: Setup ─────────────────────────────────────────────────────────
  const renderSetup = () => (
    <>
      <div className="modal-header">
        <h3 className="modal-title">Import Bank Statement</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="form-grid" style={{ gap: 16 }}>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>File Type</label>
          <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {(['PDF', 'CSV', 'Excel'] as FileType[]).map(t => (
              <button key={t} type="button" onClick={() => { setFileType(t); setFile(null); }}
                style={{ flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                  borderRight: t !== 'Excel' ? '1px solid var(--border)' : 'none',
                  background: fileType === t ? 'var(--primary)' : 'var(--bg-elevated)',
                  color: fileType === t ? '#fff' : 'var(--text-secondary)', transition: 'all 0.15s' }}>{t}</button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Bank Format</label>
          <select value={bankFormat} onChange={e => setBankFormat(e.target.value as BankFormat)} style={{ width: '100%' }}>
            {BANK_FORMATS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Source Account</label>
          <select value={selectedAccountId}
            onChange={e => {
              const val = e.target.value;
              setSelectedAccountId(val);
              setSelectedAccountType(val.startsWith('card:') ? 'CARD' : 'BANK');
            }} style={{ width: '100%' }}>
            <option value="">— Select account —</option>
            {bankAccounts.length > 0 && <optgroup label="Bank Accounts">
              {bankAccounts.map(a => <option key={`bank-${a.id}`} value={`bank:${a.id}`}>{a.name}{a.bankName ? ` · ${a.bankName}` : ''}</option>)}
            </optgroup>}
            {cards.length > 0 && <optgroup label="Credit Cards">
              {cards.map(c => <option key={`card-${c.id}`} value={`card:${c.id}`}>{c.name}{c.bank ? ` · ${c.bank}` : ''}</option>)}
            </optgroup>}
          </select>
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Statement File</label>
          <div onDrop={handleFileDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${file ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 12,
              padding: '24px 20px', textAlign: 'center', cursor: 'pointer',
              background: file ? 'var(--primary-dim)' : 'var(--bg-elevated)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{file ? '✅' : '📂'}</div>
            {file
              ? <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{file.name}</div>
              : <><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Drag & drop or click to browse</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Accepts {acceptMap[fileType]} files</div></>}
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
          <button className="btn btn-primary" style={{ flex: 2 }} disabled={!file || !selectedAccountId || parsing} onClick={handleParse}>
            {parsing ? 'Parsing…' : 'Parse & Preview →'}
          </button>
        </div>
      </div>
    </>
  );

  // ── Step 2: Review ────────────────────────────────────────────────────────
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

      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
        <button className="btn btn-sm btn-secondary" onClick={() => toggleAll(true)}>Select All</button>
        <button className="btn btn-sm btn-secondary" onClick={() => toggleAll(false)}>Deselect All</button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{file?.name}</span>
      </div>

      <div style={{ maxHeight: '48vh', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', position: 'sticky', top: 0, zIndex: 1 }}>
              <th style={th}>✓</th>
              <th style={th}>Date</th>
              <th style={th}>Amount</th>
              <th style={th}>Type</th>
              <th style={{ ...th, minWidth: 160 }}>Transfer ⇄</th>
              <th style={{ ...th, minWidth: 140 }}>Category</th>
              <th style={{ ...th, minWidth: 140 }}>Item</th>
              <th style={{ ...th, minWidth: 140 }}>Description</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const items = rowItems[row.id] || [];
              const favs = favoriteItems.filter(f => !row.categoryId || String(f.categoryId) === row.categoryId);
              return (
                <tr key={row.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--bg-elevated)', opacity: row.included ? 1 : 0.4 }}>
                  <td style={td}><input type="checkbox" checked={row.included} onChange={() => toggleRow(row.id)} style={{ cursor: 'pointer' }} /></td>
                  <td style={td}><span style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{row.date}</span></td>
                  <td style={td}>
                    <span style={{ fontWeight: 600, whiteSpace: 'nowrap', color: row.type === 'INCOME' ? 'var(--income)' : 'var(--expense)' }}>
                      {fmt(row.amount)}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: row.isTransfer ? 'var(--bg-elevated)' : row.type === 'INCOME' ? 'var(--income-dim)' : 'var(--expense-dim)',
                      color: row.isTransfer ? 'var(--text-muted)' : row.type === 'INCOME' ? 'var(--income)' : 'var(--expense)' }}>
                      {row.isTransfer ? 'TRANSFER' : row.type}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <input
                        type="checkbox"
                        checked={row.isTransfer}
                        title="Mark as internal transfer between your accounts"
                        onChange={() => updateRow(row.id, { isTransfer: !row.isTransfer, transferToAccountId: '' })}
                        style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                      {row.isTransfer && (
                        <select
                          value={row.transferToAccountId}
                          onChange={e => updateRow(row.id, { transferToAccountId: e.target.value })}
                          style={{ ...selectStyle, minWidth: 110, borderColor: row.transferToAccountId ? 'var(--primary)' : 'var(--expense)' }}>
                          <option value="">— to account —</option>
                          {bankAccounts
                            .filter(a => `bank:${a.id}` !== selectedAccountId)
                            .map(a => <option key={a.id} value={`bank:${a.id}`}>{a.name}{a.bankName ? ` · ${a.bankName}` : ''}</option>)}
                        </select>
                      )}
                    </div>
                  </td>
                  <td style={{ ...td, opacity: row.isTransfer ? 0.4 : 1, pointerEvents: row.isTransfer ? 'none' : 'auto' }}>
                    <select value={row.categoryId}
                      onChange={e => handleCategoryChange(row.id, e.target.value)}
                      style={selectStyle}>
                      <option value="">— category —</option>
                      {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                    </select>
                  </td>
                  <td style={{ ...td, opacity: row.isTransfer ? 0.4 : 1, pointerEvents: row.isTransfer ? 'none' : 'auto' }}>
                    <select value={row.itemName}
                      onChange={e => {
                        const val = e.target.value;
                        // If no category set and the chosen name matches a favourite, also set the category
                        if (!row.categoryId && val) {
                          const fav = favoriteItems.find(f => f.name === val);
                          if (fav) { handleFavPick(row.id, fav); return; }
                        }
                        updateRow(row.id, { itemName: val });
                      }}
                      style={selectStyle}>
                      <option value="">— item —</option>
                      {favs.filter(f => !items.some(i => i.id === f.id)).map(f => (
                        <option key={`fav-${f.id}`} value={f.name}>★ {f.name}</option>
                      ))}
                      {items.map(i => <option key={i.id} value={i.name}>{i.favorite ? '★ ' : ''}{i.name}</option>)}
                    </select>
                  </td>
                  <td style={td}>
                    <input value={row.notes} onChange={e => updateRow(row.id, { notes: e.target.value })}
                      placeholder="optional" style={inputStyle} />
                  </td>
                  <td style={td}>
                    <button type="button" onClick={() => deleteRow(row.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '2px 4px', borderRadius: 4 }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--expense)'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'}
                      title="Remove">🗑️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep('setup')}>← Back</button>
        <button className="btn btn-primary" style={{ flex: 2 }} disabled={!includedRows.length || saving} onClick={handleImport}>
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
  const td: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)', verticalAlign: 'middle' };
  const selectStyle: React.CSSProperties = { fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', width: '100%' };
  const inputStyle: React.CSSProperties = { fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', width: '100%' };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: step === 'review' ? 920 : 540, width: '96vw' }}>
        {step === 'setup' ? renderSetup() : renderReview()}
      </div>
    </div>
  );
};

export default ImportStatementModal;

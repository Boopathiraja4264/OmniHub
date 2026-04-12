import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { transactionApi, categoryItemApi, creditCardApi, bankAccountApi } from '../../services/api';
import FilterDropdown from '../../components/FilterDropdown';
import AddTransactionModal from '../../components/AddTransactionModal';
import { Transaction, BankAccount } from '../../types';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

const today = () => new Date().toISOString().split('T')[0];

const emptyTransfer = {
  amount: '', date: today(), fromAccountId: '', toAccountId: '', notes: '',
};

const PAGE_SIZE = 15;

type SortField = 'description' | 'category' | 'date' | 'type' | 'paymentSource' | 'amount';

// Columns that support value-based quick filter (checkboxes)
const VALUE_FILTER_COLS: SortField[] = ['category', 'type', 'paymentSource'];

// Funnel SVG icon
const FunnelIcon = ({ active, filtered }: { active: boolean; filtered: boolean }) => (
  <svg
    width="11" height="11" viewBox="0 0 12 12" fill="currentColor"
    style={{
      color: filtered ? 'var(--primary)' : active ? 'var(--text-secondary)' : 'var(--text-muted)',
      opacity: filtered || active ? 1 : 0.4,
      flexShrink: 0,
      transition: 'all 0.15s',
    }}
  >
    <path d="M1 2h10L7 6v4l-2-1V6L1 2z" />
  </svg>
);

const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [defaultBankId, setDefaultBankId] = useState<number | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [editing, setEditing] = useState<Transaction | null>(null);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({ ...emptyTransfer });
  const [transferLoading, setTransferLoading] = useState(false);

  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

  // Sort
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Column filters
  const [colFilters, setColFilters] = useState<Partial<Record<SortField, string[]>>>({});
  const [descSearch, setDescSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Popover
  const [openPopover, setOpenPopover] = useState<{ col: SortField; x: number; y: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Timestamp-based double-click detection (reliable across re-renders)
  const lastClickTs = useRef<Partial<Record<SortField, number>>>({});

  const [currentPage, setCurrentPage] = useState(1);

  const load = () => transactionApi.getAll().then(r => setTransactions(Array.isArray(r.data) ? r.data : []));

  useEffect(() => {
    load();
    creditCardApi.getAll().catch(() => {});
    bankAccountApi.getAll().then(r => {
      const arr: BankAccount[] = Array.isArray(r.data) ? r.data : [];
      setBankAccounts(arr);
      const def = arr.find((b: BankAccount) => b.isDefault);
      if (def) setDefaultBankId(def.id);
    }).catch(() => {});
    categoryItemApi.getCategories().catch(() => {});
  }, []);

  // Close popover when clicking outside.
  // Skip closing if a date input is focused — the browser's native date picker
  // (month selector, navigation arrows) fires events outside the DOM so we must
  // not dismiss the popover while the user is interacting with it.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (active?.getAttribute('type') === 'date') return;
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getColRawVal = useCallback((t: Transaction, col: SortField): string => {
    if (col === 'description') return t.description;
    if (col === 'category') return t.category;
    if (col === 'date') return t.date;
    if (col === 'type') return t.type;
    if (col === 'paymentSource') return t.paymentSource || '—';
    return String(t.amount);
  }, []);

  // Unique values for checkbox-filter columns (from ALL transactions)
  const uniqueVals = useMemo(() => {
    const result: Partial<Record<SortField, string[]>> = {};
    VALUE_FILTER_COLS.forEach(col => {
      const vals = new Set(transactions.map(t => getColRawVal(t, col)));
      result[col] = Array.from(vals).sort();
    });
    return result;
  }, [transactions, getColRawVal]);

  const filtered = useMemo(() => {
    let list = transactions.filter(t => typeFilter === 'ALL' || t.type === typeFilter);

    if (descSearch.trim()) {
      const q = descSearch.toLowerCase();
      list = list.filter(t => t.description.toLowerCase().includes(q));
    }

    (Object.entries(colFilters) as [SortField, string[]][]).forEach(([col, vals]) => {
      if (!vals || vals.length === 0) return;
      list = list.filter(t => vals.includes(getColRawVal(t, col)));
    });

    if (selectedDate) list = list.filter(t => t.date === selectedDate);

    return [...list].sort((a, b) => {
      let aVal: string | number, bVal: string | number;
      if (sortField === 'amount') { aVal = a.amount; bVal = b.amount; }
      else if (sortField === 'date') { aVal = a.date; bVal = b.date; }
      else { aVal = getColRawVal(a, sortField); bVal = getColRawVal(b, sortField); }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transactions, typeFilter, descSearch, colFilters, selectedDate, sortField, sortDir, getColRawVal]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [typeFilter, colFilters, descSearch, selectedDate, sortField]);

  const isColFiltered = (col: SortField) => {
    if (col === 'description') return !!descSearch.trim();
    if (col === 'date') return !!selectedDate;
    return (colFilters[col]?.length ?? 0) > 0;
  };

  const hasAnyFilter =
    Object.values(colFilters).some(v => v && v.length > 0) ||
    !!descSearch.trim() || !!selectedDate;

  const openFilter = (e: React.MouseEvent, col: SortField) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setOpenPopover(prev =>
      prev?.col === col ? null : { col, x: rect.left, y: rect.bottom + 6 }
    );
  };

  const toggleValueFilter = (col: SortField, val: string) => {
    setColFilters(prev => {
      const cur = prev[col] || [];
      const next = cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val];
      return { ...prev, [col]: next };
    });
    setCurrentPage(1);
  };

  const clearColFilter = (col: SortField) => {
    if (col === 'description') setDescSearch('');
    else if (col === 'date') setSelectedDate('');
    else setColFilters(prev => ({ ...prev, [col]: [] }));
  };

  // Single click on column name — detect double-click via timestamp (reliable across re-renders)
  const handleColNameClick = (col: SortField) => {
    const now = Date.now();
    const last = lastClickTs.current[col] ?? 0;
    if (now - last < 350) {
      // double-click: sort
      lastClickTs.current[col] = 0;
      if (sortField === col) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(col);
        setSortDir('asc');
      }
      setCurrentPage(1);
      setOpenPopover(null);
    } else {
      lastClickTs.current[col] = now;
    }
  };

  const resetAll = () => {
    setColFilters({});
    setDescSearch('');
    setSelectedDate('');
    setSortField('date');
    setSortDir('desc');
    setCurrentPage(1);
    setOpenPopover(null);
  };

  const handleOpen = (type: 'INCOME' | 'EXPENSE', t?: Transaction) => {
    setModalType(type);
    setEditing(t || null);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this transaction?')) return;
    await transactionApi.delete(id);
    load();
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.fromAccountId === transferForm.toAccountId) {
      alert('From and To accounts must be different.');
      return;
    }
    setTransferLoading(true);
    try {
      const amt = parseFloat(transferForm.amount);
      await transactionApi.create({
        description: 'Account Transfer Out', amount: amt, type: 'EXPENSE', category: 'Transfer Out',
        date: transferForm.date, notes: transferForm.notes || undefined,
        paymentSource: 'BANK', bankAccountId: parseInt(transferForm.fromAccountId),
      });
      await transactionApi.create({
        description: 'Account Transfer In', amount: amt, type: 'INCOME', category: 'Transfer In',
        date: transferForm.date, notes: transferForm.notes || undefined,
        paymentSource: 'BANK', bankAccountId: parseInt(transferForm.toAccountId),
      });
      setShowTransferModal(false);
      setTransferForm({ ...emptyTransfer });
      load();
    } catch {
      alert('Transfer failed. Please try again.');
    } finally {
      setTransferLoading(false);
    }
  };

  const bankName = (id: string) => {
    const b = bankAccounts.find(a => String(a.id) === id);
    return b ? `${b.name}${b.bankName ? ` (${b.bankName})` : ''}` : '';
  };

  // Rendered as a plain function call (not <ColHeader/>) to avoid remounting on re-render,
  // which would break the browser's double-click detection.
  const colTh = (
    col: SortField,
    label: string,
    { align = 'left' as 'left' | 'right', pl, pr, showFilter = true, width }:
    { align?: 'left' | 'right'; pl?: number; pr?: number; showFilter?: boolean; width?: string } = {}
  ) => {
    const active = sortField === col;
    const isFiltered = isColFiltered(col);
    return (
      <th style={{ paddingLeft: pl, paddingRight: pr, textAlign: align, userSelect: 'none', width }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
          <span
            onClick={() => handleColNameClick(col)}
            title="Double-click to sort"
            style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}
          >
            {label}
          </span>
          {active && (
            <span style={{ fontSize: 10, color: 'var(--primary)', lineHeight: 1 }}>
              {sortDir === 'asc' ? '↑' : '↓'}
            </span>
          )}
          {showFilter && (
            <span onClick={e => openFilter(e, col)} title="Click to filter"
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>
              <FunnelIcon active={openPopover?.col === col} filtered={isFiltered} />
            </span>
          )}
        </div>
      </th>
    );
  };

  // Called as renderPopover() not <Popover/> to avoid unmounting on re-render.
  // Unmounting destroys the native date picker — same fix as the colTh double-click issue.
  const renderPopover = () => {
    if (!openPopover) return null;
    const { col, x, y } = openPopover;
    const isDesc = col === 'description';
    const isDate = col === 'date';
    const hasValues = VALUE_FILTER_COLS.includes(col);
    const vals = uniqueVals[col] || [];
    const selected = colFilters[col] || [];
    const active = isColFiltered(col);

    const inputStyle: React.CSSProperties = {
      width: '100%', fontSize: 12, padding: '5px 8px', borderRadius: 5,
      border: '1px solid var(--border)', background: 'var(--bg-elevated)',
      color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
    };

    return (
      <div
        ref={popoverRef}
        style={{
          position: 'fixed', top: y, left: Math.min(x, window.innerWidth - 215),
          width: 210,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 9,
          boxShadow: '0 10px 36px rgba(0,0,0,0.35)',
          zIndex: 2000,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '8px 12px 10px', maxHeight: 340, overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {isDate && (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="2" width="14" height="13" rx="2"/>
                  <line x1="1" y1="6" x2="15" y2="6"/>
                  <line x1="5" y1="1" x2="5" y2="4"/>
                  <line x1="11" y1="1" x2="11" y2="4"/>
                </svg>
              )}
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Filter
              </span>
            </div>
            {active && (
              <button onClick={() => clearColFilter(col)}
                style={{ fontSize: 10, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Clear
              </button>
            )}
          </div>

          {/* Description: text search */}
          {isDesc && (
            <input
              autoFocus
              value={descSearch}
              onChange={e => { setDescSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search description..."
              style={inputStyle}
            />
          )}

          {/* Date: single date picker */}
          {isDate && (
            <input
              autoFocus
              type="date"
              value={selectedDate}
              onChange={e => { setSelectedDate(e.target.value); setCurrentPage(1); }}
              style={inputStyle}
            />
          )}

          {/* Checkbox filter for category / type / source */}
          {hasValues && vals.map(v => {
            const on = selected.includes(v);
            return (
              <div
                key={v}
                onClick={() => toggleValueFilter(col, v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 5px', borderRadius: 5, cursor: 'pointer',
                  background: on ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'transparent',
                  marginBottom: 1,
                }}
              >
                <div style={{
                  width: 13, height: 13, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
                  background: on ? 'var(--primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {on && <span style={{ color: '#fff', fontSize: 8, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, color: v === '—' ? 'var(--text-muted)' : 'var(--text-primary)', fontStyle: v === '—' ? 'italic' : 'normal' }}>
                  {v === '—' ? '(none)' : v}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Transactions</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-danger" onClick={() => handleOpen('EXPENSE')}>+ Expense</button>
          <button className="btn btn-income" onClick={() => handleOpen('INCOME')}>+ Income</button>
          <button className="btn btn-secondary" onClick={() => {
            setTransferForm({ ...emptyTransfer, date: today(), fromAccountId: defaultBankId ? String(defaultBankId) : '' });
            setShowTransferModal(true);
          }}>⇄ Transfer</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {(['ALL', 'INCOME', 'EXPENSE'] as const).map(f => (
            <button key={f} className={`btn btn-sm ${typeFilter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTypeFilter(f)}>{f}</button>
          ))}
          {hasAnyFilter && (
            <button className="btn btn-sm btn-secondary" onClick={resetAll}
              style={{ fontSize: 11, color: 'var(--primary)' }}>
              ✕ Clear filters
            </button>
          )}
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 13 }}>
            Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {colTh('description', 'Description', { pl: 24, width: '28%' })}
                {colTh('category', 'Category', { width: '18%' })}
                {colTh('date', 'Date', { width: '13%' })}
                {colTh('type', 'Type', { width: '10%' })}
                {colTh('paymentSource', 'Source', { width: '10%' })}
                {colTh('amount', 'Amount', { align: 'right', width: '13%', pr: 8, showFilter: false })}
                <th style={{ width: '10%', paddingRight: 24 }}></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                  No transactions found
                </td></tr>
              )}
              {paginated.map(t => (
                <tr key={t.id}>
                  <td style={{ color: 'var(--text-primary)', paddingLeft: 24 }}>
                    {t.description}
                    {t.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.notes}</div>}
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>{t.category}</div>
                    {t.itemName && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{t.itemName}</div>}
                  </td>
                  <td>{new Date(t.date).toLocaleDateString()}</td>
                  <td><span className={`badge ${t.type.toLowerCase()}`}>{t.type}</span></td>
                  <td>
                    {t.paymentSource && (
                      <span className="badge" style={{ fontSize: 10 }}>
                        {t.paymentSource === 'CREDIT_CARD' ? 'CC' : t.paymentSource}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`amount-${t.type.toLowerCase()}`}>
                      {t.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(t.amount)}
                    </span>
                  </td>
                  <td style={{ paddingRight: 24 }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleOpen(t.type, t)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '14px 24px', borderTop: '1px solid var(--border-subtle)',
        }}>
          <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</button>
          <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>‹</button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 160, textAlign: 'center' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>›</button>
          <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</button>
        </div>
      </div>

      {/* Filter popover — called as plain function to avoid unmounting native date picker */}
      {renderPopover()}

      {/* Add/Edit modal */}
      <AddTransactionModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSaved={load}
        initialType={modalType}
        editing={editing}
      />

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTransferModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Transfer Between Accounts</h3>
              <button className="close-btn" onClick={() => setShowTransferModal(false)}>×</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Creates a debit from the source and a credit to the destination account.
            </p>
            <form onSubmit={handleTransferSubmit}>
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input type="number" step="0.01" min="0" value={transferForm.amount}
                    onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={transferForm.date}
                    onChange={e => setTransferForm({ ...transferForm, date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>From Account</label>
                  <FilterDropdown
                    value={transferForm.fromAccountId}
                    options={bankAccounts.map(b => ({ label: b.name + (b.bankName ? ` (${b.bankName})` : ''), value: String(b.id) }))}
                    onChange={v => setTransferForm({ ...transferForm, fromAccountId: v as string })}
                    placeholder="Select account..." fullWidth
                  />
                </div>
                <div className="form-group">
                  <label>To Account</label>
                  <FilterDropdown
                    value={transferForm.toAccountId}
                    options={bankAccounts.map(b => ({ label: b.name + (b.bankName ? ` (${b.bankName})` : ''), value: String(b.id) }))}
                    onChange={v => setTransferForm({ ...transferForm, toAccountId: v as string })}
                    placeholder="Select account..." fullWidth
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input value={transferForm.notes}
                    onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })} />
                </div>
              </div>
              {transferForm.fromAccountId && transferForm.toAccountId && (
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {bankName(transferForm.fromAccountId)} → {bankName(transferForm.toAccountId)}
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTransferModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={transferLoading}>
                  {transferLoading ? 'Saving...' : 'Record Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;

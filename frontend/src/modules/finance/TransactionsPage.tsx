import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { transactionApi, categoryItemApi, creditCardApi, bankAccountApi } from '../../services/api';
import FilterDropdown from '../../components/FilterDropdown';
import AddTransactionModal from '../../components/AddTransactionModal';
import DatePicker from '../../components/DatePicker';
import ImportStatementModal from './ImportStatementModal';
import { Transaction, BankAccount } from '../../types';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

const today = () => new Date().toISOString().split('T')[0];

const emptyTransfer = {
  amount: '', date: today(), fromAccountId: '', toAccountId: '', notes: '',
};

const PAGE_SIZE = 20;

type SortField = 'description' | 'category' | 'date' | 'type' | 'paymentSource' | 'amount';
const VALUE_FILTER_COLS: SortField[] = ['category', 'type', 'paymentSource'];

const CAT_COLORS = [
  'var(--primary)', 'var(--income)', 'var(--warning)', 'var(--purple)',
  'var(--expense)', '#0ea5e9', '#f97316', '#ec4899',
];
const catColor = (cat: string) => {
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) & 0xffff;
  return CAT_COLORS[h % CAT_COLORS.length];
};

const formatDateLabel = (dateStr: string) => {
  const now = new Date();
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (dateStr === now.toISOString().split('T')[0]) return 'Today';
  if (dateStr === y.toISOString().split('T')[0]) return 'Yesterday';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
};

const Chip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px 3px 8px', borderRadius: 20,
    background: 'var(--primary-dim)', border: '1px solid var(--primary-glow)',
    fontSize: 11, color: 'var(--primary)', fontWeight: 600,
  }}>
    {label}
    <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 13, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center' }}>×</button>
  </span>
);

const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [defaultBankId, setDefaultBankId] = useState<number | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [editing, setEditing] = useState<Transaction | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({ ...emptyTransfer });
  const [transferLoading, setTransferLoading] = useState(false);

  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [colFilters, setColFilters] = useState<Partial<Record<SortField, string[]>>>({});
  const [descSearch, setDescSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
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

  const getColRawVal = useCallback((t: Transaction, col: SortField): string => {
    if (col === 'description') return t.description;
    if (col === 'category') return t.category;
    if (col === 'date') return t.date;
    if (col === 'type') return t.type;
    if (col === 'paymentSource') return t.paymentSource || '—';
    return String(t.amount);
  }, []);

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

  const filteredIncome = useMemo(() => filtered.reduce((s, t) => t.type === 'INCOME' ? s + t.amount : s, 0), [filtered]);
  const filteredExpense = useMemo(() => filtered.reduce((s, t) => t.type === 'EXPENSE' ? s + t.amount : s, 0), [filtered]);

  useEffect(() => { setCurrentPage(1); }, [typeFilter, colFilters, descSearch, selectedDate, sortField]);

  const hasAnyFilter =
    Object.values(colFilters).some(v => v && v.length > 0) || !!descSearch.trim() || !!selectedDate;
  const activeFilterCount = Object.values(colFilters).filter(v => v && v.length > 0).length +
    (descSearch.trim() ? 1 : 0) + (selectedDate ? 1 : 0);

  const toggleValueFilter = (col: SortField, val: string) => {
    setColFilters(prev => {
      const cur = prev[col] || [];
      const next = cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val];
      return { ...prev, [col]: next };
    });
    setCurrentPage(1);
  };

  const resetAll = () => {
    setColFilters({});
    setDescSearch('');
    setSelectedDate('');
    setSortField('date');
    setSortDir('desc');
    setCurrentPage(1);
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

  // Group paginated transactions by date preserving sort order
  const dateGroups = useMemo(() => {
    const groups: { date: string; txns: Transaction[] }[] = [];
    const seen = new Map<string, Transaction[]>();
    paginated.forEach(t => {
      if (!seen.has(t.date)) {
        const arr: Transaction[] = [];
        seen.set(t.date, arr);
        groups.push({ date: t.date, txns: arr });
      }
      seen.get(t.date)!.push(t);
    });
    return groups;
  }, [paginated]);

  const net = filteredIncome - filteredExpense;

  return (
    <div style={{ padding: '24px 28px', minHeight: '100%' }}>

      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Transactions</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2, marginBottom: 0 }}>
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            {hasAnyFilter ? ' · filtered' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => handleOpen('EXPENSE')} className="txn-action-btn txn-action-expense">
            <span className="txn-action-icon">−</span>
            <span>Expense</span>
          </button>
          <button onClick={() => handleOpen('INCOME')} className="txn-action-btn txn-action-income">
            <span className="txn-action-icon">+</span>
            <span>Income</span>
          </button>
          <button onClick={() => setShowImportModal(true)} className="txn-action-btn txn-action-transfer">
            <span className="txn-action-icon">↑</span>
            <span>Import</span>
          </button>
          <button onClick={() => {
            setTransferForm({ ...emptyTransfer, date: today(), fromAccountId: defaultBankId ? String(defaultBankId) : '' });
            setShowTransferModal(true);
          }} className="txn-action-btn txn-action-transfer">
            <span className="txn-action-icon">⇄</span>
            <span>Transfer</span>
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Income', value: filteredIncome, color: 'var(--income)', bg: 'var(--income-dim)', prefix: '+' },
          { label: 'Expense', value: filteredExpense, color: 'var(--expense)', bg: 'var(--expense-dim)', prefix: '-' },
          { label: 'Net', value: Math.abs(net), color: net >= 0 ? 'var(--income)' : 'var(--expense)', bg: net >= 0 ? 'var(--income-dim)' : 'var(--expense-dim)', prefix: net >= 0 ? '+' : '-' },
        ].map(s => (
          <div key={s.label} style={{ borderRadius: 14, padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>
              {s.prefix}{formatCurrency(s.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 15, pointerEvents: 'none' }}>⌕</span>
          <input
            value={descSearch}
            onChange={e => { setDescSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search by description…"
            style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        {/* Type toggle */}
        <div style={{ display: 'flex', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', overflow: 'hidden', flexShrink: 0 }}>
          {(['ALL', 'INCOME', 'EXPENSE'] as const).map(f => (
            <button key={f} onClick={() => setTypeFilter(f)} style={{
              padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
              background: typeFilter === f
                ? (f === 'INCOME' ? 'var(--income)' : f === 'EXPENSE' ? 'var(--expense)' : 'var(--primary)')
                : 'transparent',
              color: typeFilter === f ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}>{f}</button>
          ))}
        </div>

        {/* Date picker */}
        <DatePicker
          value={selectedDate}
          onChange={e => { setSelectedDate(e.target.value); setCurrentPage(1); }}
          placeholder="Filter by date"
          style={{ flexShrink: 0 }}
        />

        {/* Sort */}
        <select
          value={`${sortField}:${sortDir}`}
          onChange={e => {
            const [f, d] = e.target.value.split(':');
            setSortField(f as SortField);
            setSortDir(d as 'asc' | 'desc');
            setCurrentPage(1);
          }}
          style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}
        >
          <option value="date:desc">Date ↓</option>
          <option value="date:asc">Date ↑</option>
          <option value="amount:desc">Amount ↓</option>
          <option value="amount:asc">Amount ↑</option>
          <option value="description:asc">Name A–Z</option>
          <option value="description:desc">Name Z–A</option>
        </select>

        {/* Filters button */}
        <button
          onClick={() => setShowFilterPanel(v => !v)}
          style={{
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600,
            border: `1px solid ${showFilterPanel || activeFilterCount > 0 ? 'var(--primary)' : 'var(--border)'}`,
            background: showFilterPanel || activeFilterCount > 0 ? 'var(--primary-dim)' : 'var(--bg-card)',
            color: showFilterPanel || activeFilterCount > 0 ? 'var(--primary)' : 'var(--text-muted)',
            flexShrink: 0,
          }}
        >
          Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
        </button>

        {hasAnyFilter && (
          <button onClick={resetAll} style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Expandable filter panel */}
      {showFilterPanel && (
        <div style={{ marginBottom: 14, padding: '16px 20px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {VALUE_FILTER_COLS.map(col => {
            const vals = uniqueVals[col] || [];
            const selected = colFilters[col] || [];
            const colLabel = col === 'paymentSource' ? 'Source' : col.charAt(0).toUpperCase() + col.slice(1);
            return (
              <div key={col}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{colLabel}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {vals.map(v => {
                    const on = selected.includes(v);
                    return (
                      <button key={v} onClick={() => toggleValueFilter(col, v)} style={{
                        padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: on ? 700 : 500,
                        border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
                        background: on ? 'var(--primary-dim)' : 'var(--bg-elevated)',
                        color: on ? 'var(--primary)' : 'var(--text-secondary)',
                        transition: 'all 0.12s',
                      }}>
                        {v === '—' ? '(none)' : v}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active filter chips */}
      {hasAnyFilter && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 2 }}>Active:</span>
          {descSearch.trim() && <Chip label={`"${descSearch}"`} onRemove={() => setDescSearch('')} />}
          {selectedDate && <Chip label={selectedDate} onRemove={() => setSelectedDate('')} />}
          {(Object.entries(colFilters) as [SortField, string[]][]).flatMap(([col, vals]) =>
            (vals || []).map(v => (
              <Chip key={`${col}:${v}`} label={`${col === 'paymentSource' ? 'source' : col}: ${v}`} onRemove={() => toggleValueFilter(col, v)} />
            ))
          )}
        </div>
      )}

      {/* Count line */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
        Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
      </div>

      {/* Transaction feed */}
      <div style={{ borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.06)' }}>
        {paginated.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-muted)', fontSize: 14 }}>
            No transactions found
          </div>
        ) : (
          dateGroups.map(({ date, txns }, gi) => (
            <div key={date}>
              {/* Date separator */}
              <div style={{
                padding: '7px 20px', display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--bg-elevated)',
                borderTop: gi > 0 ? '1px solid var(--border-subtle)' : undefined,
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, flexShrink: 0 }}>
                  {formatDateLabel(date)}
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {txns.length} {txns.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              {/* Rows */}
              {txns.map((t, idx) => (
                <TxnRow
                  key={t.id}
                  t={t}
                  isLast={idx === txns.length - 1 && gi === dateGroups.length - 1}
                  onEdit={() => handleOpen(t.type, t)}
                  onDelete={() => handleDelete(t.id)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '18px 0 4px' }}>
          <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</button>
          <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>‹</button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 120, textAlign: 'center' }}>
            {currentPage} / {totalPages}
          </span>
          <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>›</button>
          <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</button>
        </div>
      )}

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
                  <DatePicker value={transferForm.date}
                    onChange={e => setTransferForm({ ...transferForm, date: e.target.value })} required fullWidth />
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

      {/* Import Statement Modal */}
      {showImportModal && (
        <ImportStatementModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => { load(); setShowImportModal(false); }}
        />
      )}
    </div>
  );
};

// Extracted to avoid re-defining inside map; hover handled via CSS class
const TxnRow: React.FC<{
  t: Transaction;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ t, isLast, onEdit, onDelete }) => {
  const color = catColor(t.category);
  const isIncome = t.type === 'INCOME';

  return (
    <div className="txn-row" style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '13px 20px',
      borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
      borderLeft: `3px solid ${isIncome ? 'var(--income)' : 'var(--expense)'}`,
    }}>
      {/* Category avatar */}
      <div style={{
        width: 38, height: 38, borderRadius: 11, flexShrink: 0,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 15, fontWeight: 800, color }}>{t.category.charAt(0).toUpperCase()}</span>
      </div>

      {/* Description + category */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
            {t.description}
          </span>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
            background: `${color}18`, color, fontWeight: 700,
          }}>
            {t.category}
          </span>
          {t.itemName && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.itemName}</span>
          )}
        </div>
        {t.notes && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.notes}</div>
        )}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {t.paymentSource && (
          <span style={{
            fontSize: 10, padding: '3px 8px', borderRadius: 20,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.3,
          }}>
            {t.paymentSource === 'CREDIT_CARD' ? 'CC' : t.paymentSource}
          </span>
        )}

        <span style={{
          fontSize: 15, fontWeight: 800, minWidth: 100, textAlign: 'right',
          color: isIncome ? 'var(--income)' : 'var(--expense)',
        }}>
          {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
        </span>

        <div style={{ display: 'flex', gap: 4 }} className="txn-actions">
          <button className="btn btn-sm btn-secondary" onClick={onEdit}>Edit</button>
          <button className="btn btn-sm btn-danger" onClick={onDelete}>Del</button>
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;

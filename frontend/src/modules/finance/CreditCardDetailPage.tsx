import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { transactionApi, creditCardApi, bankAccountApi } from '../../services/api';
import { Transaction, CreditCard, BankAccount } from '../../types';
import FilterDropdown from '../../components/FilterDropdown';
import DatePicker from '../../components/DatePicker';

const fmtDateInput = (d?: string) => d ? d.split('T')[0] : '';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

const fmtShort = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const fmtFull = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface TxWithOutstanding extends Transaction { runningOutstanding: number; }

interface BillingCycle {
  key: string;
  label: string;
  start: string;
  end: string;
  statementDate: string;
  expenses: number;
  payments: number;
  paymentDate?: string;
  txs: TxWithOutstanding[];
}

function getDateStr(y: number, m: number, day: number): string {
  const maxDay = new Date(y, m, 0).getDate(); // m is 1-indexed; new Date(y, m, 0) = last day of month m
  return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(day, maxDay)).padStart(2, '0')}`;
}

function computeCycles(billingDay: number, allTxs: TxWithOutstanding[]): BillingCycle[] {
  if (!billingDay || !allTxs.length) return [];
  const todayStr = new Date().toISOString().split('T')[0];
  const sorted = [...allTxs].sort((a, b) => a.date.localeCompare(b.date));
  const oldestDate = sorted[0].date;
  const [oy, om, od] = oldestDate.split('-').map(Number);

  let y = oy, m = om;
  if (od < billingDay) { m--; if (m === 0) { m = 12; y--; } }

  const cycles: BillingCycle[] = [];

  for (let i = 0; i < 120; i++) {
    const startStr = getDateStr(y, m, billingDay);
    if (startStr > todayStr) break;

    let ny = y, nm = m + 1;
    if (nm > 12) { nm = 1; ny++; }
    const nextBillingStr = getDateStr(ny, nm, billingDay);

    const nextBillingMs = new Date(nextBillingStr + 'T00:00:00').getTime();
    const endStr = new Date(nextBillingMs - 86400000).toISOString().split('T')[0];

    const cycleTxs = allTxs.filter(t => t.date >= startStr && t.date <= endStr);
    if (cycleTxs.length > 0) {
      const expenses = cycleTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      const payments = cycleTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);

      const payDeadline = new Date(new Date(endStr + 'T00:00:00').getTime() + 45 * 86400000)
        .toISOString().split('T')[0];
      const paymentTx = allTxs.find(t =>
        t.type === 'INCOME' && t.category === 'Credit Card Payment' &&
        t.date > endStr && t.date <= payDeadline
      );

      cycles.push({
        key: startStr,
        label: new Date(startStr + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        start: startStr, end: endStr, statementDate: nextBillingStr,
        expenses, payments, paymentDate: paymentTx?.date, txs: cycleTxs,
      });
    }

    y = ny; m = nm;
  }

  return cycles.reverse();
}

// ── Bill category breakdown (used inside bill detail modal) ───────────────────
const BillCategoryBreakdown: React.FC<{ cycle: BillingCycle }> = ({ cycle }) => {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const expenseTxs = cycle.txs.filter(t => t.type === 'EXPENSE');
  const byCategory: Record<string, { total: number; txs: TxWithOutstanding[] }> = {};
  for (const t of expenseTxs) {
    if (!byCategory[t.category]) byCategory[t.category] = { total: 0, txs: [] };
    byCategory[t.category].total += t.amount;
    byCategory[t.category].txs.push(t);
  }
  const entries = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total);
  const total = entries.reduce((s, [, v]) => s + v.total, 0);
  if (!entries.length) return <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '10px 0' }}>No expense transactions in this cycle.</div>;

  return (
    <div style={{ maxHeight: '52vh', overflowY: 'auto' }}>
      {entries.map(([cat, data]) => (
        <div key={cat} style={{ marginBottom: 2 }}>
          <div onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 12px', background: expandedCat === cat ? 'var(--bg-elevated)' : 'transparent',
              borderRadius: 8, cursor: 'pointer', userSelect: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{cat}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{data.txs.length} txn{data.txs.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--expense)' }}>{fmt(data.total)}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 28, textAlign: 'right' }}>{Math.round((data.total / total) * 100)}%</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{expandedCat === cat ? '▲' : '▼'}</span>
            </div>
          </div>
          {expandedCat === cat && (
            <div style={{ paddingLeft: 8, paddingBottom: 6 }}>
              {data.txs.sort((a, b) => b.amount - a.amount).map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 12px', borderLeft: '2px solid var(--border)', marginBottom: 1 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{t.description}</div>
                    {t.itemName && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.itemName}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--expense)' }}>{fmt(t.amount)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtShort(t.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const CreditCardDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<CreditCard | null>(null);
  const [txs, setTxs] = useState<TxWithOutstanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState<number | 'ALL'>('ALL');
  const [filterMonth, setFilterMonth] = useState<number | 'ALL'>('ALL');
  const [showEdit, setShowEdit] = useState(false);
  const [showPayBill, setShowPayBill] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [payForm, setPayForm] = useState({ bankAccountId: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', bank: '', cardType: '', lastFourDigits: '',
    creditLimit: '', billingDate: '', paymentDueDate: '',
    balanceDate: '', openingOutstanding: '',
  });

  const load = (cardId: number) => {
    bankAccountApi.getAll().then(r => setBankAccounts(Array.isArray(r.data) ? r.data : []));
    Promise.all([
      creditCardApi.getAll(),
      transactionApi.getByCard(cardId),
    ]).then(([cardRes, txRes]) => {
      const c = cardRes.data.find((x: CreditCard) => x.id === cardId);
      setCard(c || null);
      if (c) {
        setEditForm({
          name: c.name, bank: c.bank || '', cardType: c.cardType || '',
          lastFourDigits: c.lastFourDigits || '',
          creditLimit: c.creditLimit != null ? String(c.creditLimit) : '',
          billingDate: c.billingDate != null ? String(c.billingDate) : '',
          paymentDueDate: c.paymentDueDate != null ? String(c.paymentDueDate) : '',
          balanceDate: fmtDateInput(c.balanceDate),
          openingOutstanding: c.openingOutstanding != null ? String(c.openingOutstanding) : '',
        });
      }
      const list: Transaction[] = txRes.data;
      let outstanding = 0;
      const enriched: TxWithOutstanding[] = list.map(t => {
        outstanding += t.type === 'EXPENSE' ? t.amount : -t.amount;
        return { ...t, runningOutstanding: outstanding };
      });
      setTxs(enriched);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { if (!id) return; load(parseInt(id)); }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card) return;
    setSaving(true); setSaveError('');
    try {
      await creditCardApi.update(card.id, {
        name: editForm.name, bank: editForm.bank || undefined,
        cardType: editForm.cardType || undefined,
        lastFourDigits: editForm.lastFourDigits || undefined,
        creditLimit: editForm.creditLimit ? parseFloat(editForm.creditLimit) : undefined,
        billingDate: editForm.billingDate ? parseInt(editForm.billingDate) : undefined,
        paymentDueDate: editForm.paymentDueDate ? parseInt(editForm.paymentDueDate) : undefined,
        balanceDate: editForm.balanceDate || undefined,
        openingOutstanding: editForm.openingOutstanding ? parseFloat(editForm.openingOutstanding) : undefined,
      });
      setShowEdit(false);
      load(parseInt(id!));
    } catch (e: any) {
      setSaveError(e?.response?.data?.message || e?.response?.data?.error || 'Failed to save.');
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;
  if (!card) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Card not found.</div>;

  const todayStr = new Date().toISOString().split('T')[0];
  const cycles = card.billingDate ? computeCycles(card.billingDate, txs) : [];
  const lastCompletedCycle = cycles.find(c => c.end < todayStr);

  const now = new Date();
  const curY = now.getFullYear(), curM = now.getMonth() + 1;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const quickFilters = [
    { label: MONTHS[prevDate.getMonth()], year: prevDate.getFullYear(), month: prevDate.getMonth() + 1 },
    { label: `${MONTHS[curM - 1]} (Now)`, year: curY, month: curM },
    { label: MONTHS[nextDate.getMonth()], year: nextDate.getFullYear(), month: nextDate.getMonth() + 1 },
  ];

  const years = Array.from(new Set(txs.map(t => new Date(t.date).getFullYear()))).sort((a,b) => b-a);
  const filtered = txs.filter(t => {
    const d = new Date(t.date);
    if (filterYear !== 'ALL' && d.getFullYear() !== filterYear) return false;
    if (filterMonth !== 'ALL' && d.getMonth() + 1 !== filterMonth) return false;
    return true;
  });

  const groups: { label: string; year: number; month: number; txs: TxWithOutstanding[] }[] = [];
  const seen = new Set<string>();
  [...filtered].reverse().forEach(t => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!seen.has(key)) {
      seen.add(key);
      groups.push({ label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, year: d.getFullYear(), month: d.getMonth(), txs: [] });
    }
    groups.find(g => g.year === d.getFullYear() && g.month === d.getMonth())!.txs.push(t);
  });

  const displayName = card.lastFourDigits ? `${card.name} ••••${card.lastFourDigits}` : card.name;
  const outstandingColor = card.outstanding > 0 ? 'var(--expense)' : 'var(--income)';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/accounts?tab=cards')}>← Back</button>
          <div>
            <h2 className="page-title" style={{ marginBottom: 2 }}>{displayName}</h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Credit Card{card.bank ? ` · ${card.bank}` : ''}
              {card.creditLimit ? ` · Limit ${fmt(card.creditLimit)}` : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(true)}>Edit</button>
          <button className="btn btn-primary btn-sm"
            onClick={() => {
              const defaultAmt = lastCompletedCycle
                ? String(lastCompletedCycle.expenses)
                : String(card.outstanding || '');
              setPayForm({ bankAccountId: '', amount: defaultAmt, date: todayStr, notes: '' });
              setShowPayBill(true);
            }}>
            Pay Bill
          </button>
          <div style={{ textAlign: 'right', marginLeft: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Current Outstanding</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: outstandingColor }}>{fmt(card.outstanding)}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <FilterDropdown
            value={filterYear}
            options={[{ label: 'All Years', value: 'ALL' }, ...years.map(y => ({ label: String(y), value: y }))]}
            onChange={v => { setFilterYear(v as any); setFilterMonth('ALL'); }}
            placeholder="All Years" minWidth={120} />
          <FilterDropdown
            value={filterMonth}
            options={[{ label: 'All Months', value: 'ALL' }, ...MONTHS.map((m, i) => ({ label: m, value: i + 1 }))]}
            onChange={v => setFilterMonth(v as any)}
            placeholder="All Months" minWidth={130} />
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            {filtered.length} transactions
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5 }}>QUICK</span>
          {quickFilters.map(q => {
            const active = filterYear === q.year && filterMonth === q.month;
            return (
              <button key={q.label} className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setFilterYear(q.year); setFilterMonth(q.month); }}>
                {q.label}
              </button>
            );
          })}
          {(filterYear !== 'ALL' || filterMonth !== 'ALL') && (
            <button className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }}
              onClick={() => { setFilterYear('ALL'); setFilterMonth('ALL'); }}>✕ Clear</button>
          )}
        </div>
      </div>

      {/* Billing Cycles Strip */}
      {cycles.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: 1, marginBottom: 10, paddingLeft: 4 }}>
            Billing Cycles
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
            {cycles.map(cycle => {
              const isCurrent = cycle.start <= todayStr && cycle.end >= todayStr;
              return (
                <div key={cycle.key}
                  onClick={() => setSelectedCycle(cycle)}
                  style={{ flexShrink: 0, background: 'var(--bg-card)', cursor: 'pointer', minWidth: 150,
                    border: `1px solid ${isCurrent ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 12,
                    padding: '12px 14px', transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4,
                    color: isCurrent ? 'var(--primary)' : 'var(--text-muted)' }}>
                    {cycle.label}{isCurrent ? ' · Now' : ''}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--expense)', letterSpacing: -0.3 }}>
                    {fmt(cycle.expenses)}
                  </div>
                  {cycle.payments > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--income)', marginTop: 2 }}>
                      −{fmt(cycle.payments)} credits
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
                    Stmt: {fmtShort(cycle.statementDate)}
                  </div>
                  <div style={{ fontSize: 10, marginTop: 3 }}>
                    {cycle.paymentDate
                      ? <span style={{ color: 'var(--income)', fontWeight: 600 }}>✓ Paid {fmtShort(cycle.paymentDate)}</span>
                      : !isCurrent
                        ? <span style={{ color: 'var(--expense)', fontWeight: 600 }}>● Unpaid</span>
                        : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEdit(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Edit Credit Card</h3>
              <button className="close-btn" onClick={() => setShowEdit(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid" style={{ marginBottom: 24 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Card Name</label>
                  <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Card Type</label>
                  <FilterDropdown value={editForm.cardType}
                    options={[
                      { label: 'Visa', value: 'VISA' }, { label: 'Mastercard', value: 'MASTERCARD' },
                      { label: 'RuPay', value: 'RUPAY' }, { label: 'American Express', value: 'AMEX' },
                      { label: 'Discover', value: 'DISCOVER' }, { label: 'Other', value: 'OTHER' },
                    ]}
                    onChange={v => setEditForm({ ...editForm, cardType: v as string })}
                    placeholder="Select type..." fullWidth />
                </div>
                <div className="form-group">
                  <label>Last 4 Digits <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input value={editForm.lastFourDigits} maxLength={4}
                    onChange={e => setEditForm({ ...editForm, lastFourDigits: e.target.value.replace(/\D/g, '') })} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Issuing Bank <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input value={editForm.bank} onChange={e => setEditForm({ ...editForm, bank: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Credit Limit (₹) <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input type="number" value={editForm.creditLimit} onChange={e => setEditForm({ ...editForm, creditLimit: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Statement Date <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(day of month)</span></label>
                  <input type="number" min="1" max="31" value={editForm.billingDate} onChange={e => setEditForm({ ...editForm, billingDate: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Payment Due Date <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(day of month)</span></label>
                  <input type="number" min="1" max="31" value={editForm.paymentDueDate} onChange={e => setEditForm({ ...editForm, paymentDueDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Balance Date</label>
                  <DatePicker value={editForm.balanceDate} onChange={e => setEditForm({ ...editForm, balanceDate: e.target.value })} fullWidth />
                </div>
                <div className="form-group">
                  <label>
                    Outstanding as of {editForm.balanceDate ? fmtFull(editForm.balanceDate) : 'selected date'} (₹)
                  </label>
                  <input type="number" step="0.01" min="0" value={editForm.openingOutstanding}
                    onChange={e => setEditForm({ ...editForm, openingOutstanding: e.target.value })} />
                </div>
              </div>
              {saveError && <div style={{ color: 'var(--expense)', fontSize: 13, marginBottom: 12 }}>{saveError}</div>}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowEdit(false); setSaveError(''); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Bill Modal */}
      {showPayBill && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPayBill(false)}>
          <div className="modal" style={{ maxWidth: 460, width: '95vw' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Pay Bill</h3>
                {lastCompletedCycle && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {lastCompletedCycle.label} statement · Stmt date {fmtShort(lastCompletedCycle.statementDate)}
                  </div>
                )}
              </div>
              <button className="close-btn" onClick={() => setShowPayBill(false)}>✕</button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault();
              setSaving(true);
              try {
                const amt = parseFloat(payForm.amount);
                const desc = `CC Payment – ${card.name}`;
                await transactionApi.create({
                  description: desc, amount: amt, type: 'EXPENSE', category: 'Credit Card Payment',
                  date: payForm.date, paymentSource: 'BANK',
                  bankAccountId: payForm.bankAccountId ? parseInt(payForm.bankAccountId) : undefined,
                  notes: payForm.notes || undefined,
                });
                await transactionApi.create({
                  description: desc, amount: amt, type: 'INCOME', category: 'Credit Card Payment',
                  date: payForm.date, paymentSource: 'CREDIT_CARD', cardId: card.id,
                  notes: payForm.notes || undefined,
                });
                setShowPayBill(false);
                setPayForm({ bankAccountId: '', amount: '', date: todayStr, notes: '' });
                load(parseInt(id!));
              } catch {} finally { setSaving(false); }
            }}>
              <div className="form-grid" style={{ marginBottom: 24 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Pay from Bank Account</label>
                  <FilterDropdown value={payForm.bankAccountId}
                    options={bankAccounts.map(b => ({ label: b.name + (b.bankName ? ` (${b.bankName})` : ''), value: String(b.id) }))}
                    onChange={v => setPayForm({ ...payForm, bankAccountId: v as string })}
                    placeholder="Select bank account..." fullWidth />
                </div>
                <div className="form-group">
                  <label>Amount</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" step="0.01" min="1" value={payForm.amount}
                      onChange={e => setPayForm({ ...payForm, amount: e.target.value })} required placeholder="0.00" style={{ flex: 1 }} />
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', flexShrink: 0 }}>₹ INR</div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <DatePicker value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} required fullWidth />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} placeholder="e.g. CRED app, net banking..." />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayBill(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !payForm.bankAccountId || !payForm.amount}>
                  {saving ? 'Saving…' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Detail Modal */}
      {selectedCycle && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedCycle(null)}>
          <div className="modal" style={{ maxWidth: 640, width: '95vw' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{selectedCycle.label} Statement</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {fmtFull(selectedCycle.start)} → {fmtFull(selectedCycle.end)}
                  &nbsp;· Stmt: {fmtShort(selectedCycle.statementDate)}
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelectedCycle(null)}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              <div style={{ background: 'var(--expense-dim)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Total Charges</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--expense)' }}>{fmt(selectedCycle.expenses)}</div>
              </div>
              <div style={{ background: 'var(--income-dim)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Credits / Cashback</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--income)' }}>{fmt(selectedCycle.payments)}</div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Net Amount Due</div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{fmt(Math.max(0, selectedCycle.expenses - selectedCycle.payments))}</div>
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Spend by Category
            </div>
            <BillCategoryBreakdown cycle={selectedCycle} />

            {selectedCycle.paymentDate && (
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--income)', fontWeight: 600 }}>
                ✓ Bill paid on {fmtFull(selectedCycle.paymentDate)}
              </div>
            )}
            {!selectedCycle.paymentDate && selectedCycle.end < todayStr && (
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--expense)', fontWeight: 600 }}>
                ● Payment not recorded for this cycle
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setSelectedCycle(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => {
                setSelectedCycle(null);
                setPayForm({ bankAccountId: '', amount: String(selectedCycle.expenses), date: todayStr, notes: '' });
                setShowPayBill(true);
              }}>Pay this Bill</button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Groups */}
      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
          No transactions on this card.
        </div>
      )}
      {groups.map(g => (
        <div key={g.label} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>
            {g.label}
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 20, width: '32%' }}>Description</th>
                    <th style={{ width: '18%' }}>Category</th>
                    <th style={{ width: '13%' }}>Date</th>
                    <th style={{ textAlign: 'right', width: '17%' }}>Amount</th>
                    <th style={{ textAlign: 'right', width: '20%', paddingRight: 20 }}>Cumulative Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {g.txs.map(t => (
                    <tr key={t.id}>
                      <td style={{ paddingLeft: 20, color: 'var(--text-primary)' }}>
                        {t.description}
                        {t.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.notes}</div>}
                      </td>
                      <td>
                        <div style={{ fontSize: 13 }}>{t.category}</div>
                        {t.itemName && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.itemName}</div>}
                      </td>
                      <td style={{ fontSize: 13 }}>{new Date(t.date).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        {t.type === 'INCOME'
                          ? <span style={{ color: 'var(--income)', fontWeight: 600 }}>+{fmt(t.amount)}</span>
                          : <span style={{ color: 'var(--expense)', fontWeight: 600 }}>-{fmt(t.amount)}</span>}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: 20, fontWeight: 700,
                        color: t.runningOutstanding <= 0 ? 'var(--income)' : 'var(--expense)' }}>
                        {fmt(t.runningOutstanding)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CreditCardDetailPage;

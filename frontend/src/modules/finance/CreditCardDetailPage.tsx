import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { transactionApi, creditCardApi } from '../../services/api';
import { Transaction, CreditCard } from '../../types';
import FilterDropdown from '../../components/FilterDropdown';

const fmtDateInput = (d?: string) => d ? d.split('T')[0] : '';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface TxWithOutstanding extends Transaction { runningOutstanding: number; }

const CreditCardDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<CreditCard | null>(null);
  const [txs, setTxs] = useState<TxWithOutstanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState<number | 'ALL'>('ALL');
  const [filterMonth, setFilterMonth] = useState<number | 'ALL'>('ALL');
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [editForm, setEditForm] = useState({
    name: '', bank: '', cardType: '', lastFourDigits: '',
    creditLimit: '', billingDate: '', paymentDueDate: '',
    balanceDate: '', openingOutstanding: '',
  });

  const load = (cardId: number) => {
    Promise.all([
      creditCardApi.getAll(),
      transactionApi.getByCard(cardId),
    ]).then(([cardRes, txRes]) => {
      const c = cardRes.data.find((x: CreditCard) => x.id === cardId);
      setCard(c || null);
      if (c) {
        setEditForm({
          name: c.name,
          bank: c.bank || '',
          cardType: c.cardType || '',
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
        outstanding += t.amount;
        return { ...t, runningOutstanding: outstanding };
      });
      setTxs(enriched);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!id) return;
    load(parseInt(id));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card) return;
    setSaving(true);
    setSaveError('');
    try {
      await creditCardApi.update(card.id, {
        name: editForm.name,
        bank: editForm.bank || undefined,
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
      setSaveError(e?.response?.data?.message || e?.response?.data?.error || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;
  if (!card) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Card not found.</div>;

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

  // Group newest first
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
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/accounts')}>← Back</button>
          <div>
            <h2 className="page-title" style={{ marginBottom: 2 }}>{displayName}</h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Credit Card{card.bank ? ` · ${card.bank}` : ''}
              {card.creditLimit ? ` · Limit ${fmt(card.creditLimit)}` : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(true)}>Edit</button>
          <div style={{ textAlign: 'right' }}>
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
            placeholder="All Years"
            minWidth={120}
          />
          <FilterDropdown
            value={filterMonth}
            options={[{ label: 'All Months', value: 'ALL' }, ...MONTHS.map((m, i) => ({ label: m, value: i + 1 }))]}
            onChange={v => setFilterMonth(v as any)}
            placeholder="All Months"
            minWidth={130}
          />
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            {filtered.length} transactions
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5 }}>QUICK</span>
          {quickFilters.map(q => {
            const active = filterYear === q.year && filterMonth === q.month;
            return (
              <button key={q.label}
                className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
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
                  <FilterDropdown
                    value={editForm.cardType}
                    options={[
                      { label: 'Visa', value: 'VISA' },
                      { label: 'Mastercard', value: 'MASTERCARD' },
                      { label: 'RuPay', value: 'RUPAY' },
                      { label: 'American Express', value: 'AMEX' },
                      { label: 'Discover', value: 'DISCOVER' },
                      { label: 'Other', value: 'OTHER' },
                    ]}
                    onChange={v => setEditForm({ ...editForm, cardType: v as string })}
                    placeholder="Select type..."
                    fullWidth
                  />
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
                  <input type="date" value={editForm.balanceDate} onChange={e => setEditForm({ ...editForm, balanceDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>
                    Outstanding as of {editForm.balanceDate ? new Date(editForm.balanceDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'selected date'} (₹)
                  </label>
                  <input type="number" step="0.01" min="0" value={editForm.openingOutstanding}
                    onChange={e => setEditForm({ ...editForm, openingOutstanding: e.target.value })} />
                </div>
              </div>
              {saveError && (
                <div style={{ color: 'var(--expense)', fontSize: 13, marginBottom: 12 }}>{saveError}</div>
              )}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowEdit(false); setSaveError(''); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                        <span style={{ color: 'var(--expense)', fontWeight: 600 }}>-{fmt(t.amount)}</span>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: 20, fontWeight: 700, color: 'var(--expense)' }}>
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

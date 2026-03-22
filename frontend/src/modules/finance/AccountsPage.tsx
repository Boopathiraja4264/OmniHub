import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bankAccountApi, creditCardApi, transactionApi } from '../../services/api';
import FilterDropdown from '../../components/FilterDropdown';
import { BankAccount, CreditCard } from '../../types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

// ─── Card network logo badge ──────────────────────────────────────────────────
const NetworkLogo: React.FC<{ type?: string }> = ({ type }) => {
  if (!type || type === 'OTHER') return null;
  const styles: Record<string, React.CSSProperties> = {
    VISA: {
      background: '#1a1f71', color: 'white', padding: '2px 7px',
      borderRadius: 4, fontSize: 11, fontWeight: 900, fontStyle: 'italic',
      letterSpacing: -0.5, display: 'inline-block',
    },
    AMEX: {
      background: '#007bc1', color: 'white', padding: '2px 7px',
      borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
      display: 'inline-block',
    },
    RUPAY: {
      background: 'linear-gradient(135deg, #005b9f 0%, #e87722 100%)', color: 'white',
      padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
      display: 'inline-block',
    },
    DISCOVER: {
      background: '#f76f20', color: 'white', padding: '2px 7px',
      borderRadius: 4, fontSize: 10, fontWeight: 700, display: 'inline-block',
    },
  };
  if (type === 'MASTERCARD') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', position: 'relative', width: 30, height: 18 }}>
        <span style={{ position: 'absolute', left: 0, width: 18, height: 18, borderRadius: '50%', background: '#eb001b', opacity: 0.95 }} />
        <span style={{ position: 'absolute', right: 0, width: 18, height: 18, borderRadius: '50%', background: '#f79e1b', opacity: 0.85 }} />
      </span>
    );
  }
  const labels: Record<string, string> = { VISA: 'VISA', AMEX: 'AMEX', RUPAY: 'RuPay', DISCOVER: 'DISC' };
  return <span style={styles[type]}>{labels[type]}</span>;
};

// ─── Account type badge ───────────────────────────────────────────────────────
const AccTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const colors: Record<string, string> = {
    SAVINGS: 'rgba(138,159,74,0.15)',
    CURRENT: 'rgba(14,165,233,0.15)',
    SALARY:  'rgba(245,158,11,0.15)',
  };
  const textColors: Record<string, string> = {
    SAVINGS: 'var(--income)',
    CURRENT: '#0ea5e9',
    SALARY:  '#f59e0b',
  };
  return (
    <span style={{
      background: colors[type] || 'var(--bg-elevated)', color: textColors[type] || 'var(--text-muted)',
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
    }}>
      {type}
    </span>
  );
};

// ─── Bank Accounts Tab ────────────────────────────────────────────────────────
const BankTab: React.FC = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ name: '', bankName: '', accountType: 'SAVINGS', openingBalance: '', balanceDate: today, isDefault: false });

  const load = () => bankAccountApi.getAll().then(r => setAccounts(Array.isArray(r.data) ? r.data : []));
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await bankAccountApi.create({
        name: form.name,
        bankName: form.bankName || undefined,
        accountType: form.accountType,
        openingBalance: parseFloat(form.openingBalance) || 0,
        balanceDate: form.balanceDate || undefined,
        isDefault: form.isDefault,
      });
      setShowModal(false);
      setForm({ name: '', bankName: '', accountType: 'SAVINGS', openingBalance: '', balanceDate: today, isDefault: false });
      load();
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remove this bank account?')) return;
    await bankAccountApi.delete(id);
    load();
  };

  const handleSetDefault = async (id: number) => {
    try {
      await bankAccountApi.setDefault(id);
      load();
    } catch (e: any) {
      alert('Failed to set default: ' + (e.response?.data?.error || e.message || 'Unknown error'));
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Bank Account</button>
      </div>

      {accounts.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
          No bank accounts added yet. Click "+ Add Bank Account" to get started.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {accounts.map(acc => {
          const balanceColor = acc.currentBalance >= 0 ? 'var(--income)' : 'var(--expense)';
          return (
            <div key={acc.id} className="card" onClick={() => navigate(`/accounts/bank/${acc.id}`)}
              style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{acc.name}</span>
                    <AccTypeBadge type={acc.accountType} />
                    {acc.isDefault ? (
                      <span style={{ background: 'var(--primary)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>DEFAULT</span>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); handleSetDefault(acc.id); }} style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                        border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1.4,
                      }}>Set Default</button>
                    )}
                  </div>
                  {acc.bankName && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{acc.bankName}</div>
                  )}
                </div>
                <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); handleDelete(acc.id); }}>Delete</button>
              </div>

              {/* Balance */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: '16px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Current Balance</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: balanceColor, letterSpacing: -0.5 }}>
                  {fmt(acc.currentBalance)}
                </div>
                {acc.openingBalance > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {acc.balanceDate
                      ? `As of ${new Date(acc.balanceDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}: ${fmt(acc.openingBalance)}`
                      : `Opening: ${fmt(acc.openingBalance)}`}
                  </div>
                )}
              </div>

              {/* Inflow / Outflow */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'rgba(138,159,74,0.08)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Total Inflow</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--income)' }}>+{fmt(acc.totalInflow)}</div>
                </div>
                <div style={{ background: 'rgba(192,57,43,0.08)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Total Outflow</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--expense)' }}>-{fmt(acc.totalOutflow)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Add Bank Account</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid" style={{ marginBottom: 24 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Account Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    required placeholder="e.g. SBI Savings" />
                </div>
                <div className="form-group">
                  <label>Bank Name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })}
                    placeholder="e.g. SBI" />
                </div>
                <div className="form-group">
                  <label>Account Type</label>
                  <FilterDropdown
                    value={form.accountType}
                    options={[{ label: 'Savings', value: 'SAVINGS' }, { label: 'Current', value: 'CURRENT' }, { label: 'Salary', value: 'SALARY' }]}
                    onChange={v => setForm({ ...form, accountType: v as string })}
                    fullWidth
                  />
                </div>
                <div className="form-group">
                  <label>Balance Date</label>
                  <input type="date" value={form.balanceDate}
                    onChange={e => setForm({ ...form, balanceDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>
                    Balance as of {form.balanceDate ? new Date(form.balanceDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'selected date'} (₹)
                  </label>
                  <input type="number" step="0.01" min="0" value={form.openingBalance}
                    onChange={e => setForm({ ...form, openingBalance: e.target.value })}
                    placeholder="Your balance on this date" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })} />
                    <span>Set as default account (auto-selected for Bank/UPI payments)</span>
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Credit Cards Tab ─────────────────────────────────────────────────────────
const CardsTab: React.FC = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [payModal, setPayModal] = useState<CreditCard | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  const [categoryData, setCategoryData] = useState<Record<number, Record<string, number>>>({});
  const [loadingCategory, setLoadingCategory] = useState<Set<number>>(new Set());
  const [showDebtReport, setShowDebtReport] = useState(false);
  const cardToday = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    name: '', bank: '', cardType: '', lastFourDigits: '',
    creditLimit: '', billingDate: '', paymentDueDate: '',
    balanceDate: cardToday, openingOutstanding: '',
  });
  const [payForm, setPayForm] = useState({ bankAccountId: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });

  const load = () => {
    creditCardApi.getAll().then(r => setCards(Array.isArray(r.data) ? r.data : []));
    bankAccountApi.getAll().then(r => setBankAccounts(Array.isArray(r.data) ? r.data : []));
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await creditCardApi.create({
        name: form.name,
        bank: form.bank || undefined,
        cardType: form.cardType || undefined,
        lastFourDigits: form.lastFourDigits || undefined,
        creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : undefined,
        billingDate: form.billingDate ? parseInt(form.billingDate) : undefined,
        paymentDueDate: form.paymentDueDate ? parseInt(form.paymentDueDate) : undefined,
        balanceDate: form.balanceDate || undefined,
        openingOutstanding: form.openingOutstanding ? parseFloat(form.openingOutstanding) : undefined,
      });
      setShowAddModal(false);
      setForm({ name: '', bank: '', cardType: '', lastFourDigits: '', creditLimit: '', billingDate: '', paymentDueDate: '', balanceDate: cardToday, openingOutstanding: '' });
      load();
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this card?')) return;
    await creditCardApi.delete(id);
    load();
  };

  const handlePayBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal) return;
    setSaving(true);
    try {
      await transactionApi.create({
        description: `CC Payment – ${payModal.name}`,
        amount: parseFloat(payForm.amount),
        type: 'EXPENSE',
        category: 'EMI',
        date: payForm.date,
        paymentSource: 'BANK',
        bankAccountId: payForm.bankAccountId ? parseInt(payForm.bankAccountId) : undefined,
        notes: payForm.notes || undefined,
      });
      setPayModal(null);
      setPayForm({ bankAccountId: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
    } catch {} finally { setSaving(false); }
  };

  const displayName = (card: CreditCard) => {
    if (card.lastFourDigits) return `${card.name} ••••${card.lastFourDigits}`;
    return card.name;
  };

  const CAT_COLORS = ['#c9a84c','#4caf82','#e05c6a','#6a8fe8','#a874d4','#e09c5c','#5cc4e0','#e0d45c','#a8e05c','#e07a5c'];

  const totalDebt = cards.reduce((s, c) => s + (c.outstanding || 0), 0);
  const debtSorted = [...cards].sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0));

  const toggleDrilldown = async (cardId: number) => {
    if (expandedCardId === cardId) { setExpandedCardId(null); return; }
    setExpandedCardId(cardId);
    if (categoryData[cardId]) return;
    setLoadingCategory(prev => new Set(prev).add(cardId));
    try {
      const res = await transactionApi.getByCard(cardId);
      const totals: Record<string, number> = {};
      for (const t of res.data) {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
      }
      setCategoryData(prev => ({ ...prev, [cardId]: totals }));
    } finally {
      setLoadingCategory(prev => { const s = new Set(prev); s.delete(cardId); return s; });
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 16 }}>
        {cards.length > 0 && (
          <button className="btn btn-secondary" onClick={() => { setExpandedCardId(null); setShowDebtReport(true); }}>
            Debt Report
          </button>
        )}
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add Credit Card</button>
      </div>

      {cards.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
          No credit cards added yet.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {cards.map(card => {
          const pct = card.creditLimit && card.creditLimit > 0 ? (card.outstanding / card.creditLimit) * 100 : 0;
          const color = pct >= 90 ? 'var(--expense)' : pct >= 70 ? '#e0a030' : 'var(--income)';
          return (
            <div key={card.id} className="card" onClick={() => navigate(`/accounts/card/${card.id}`)}
              style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <NetworkLogo type={card.cardType} />
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{displayName(card)}</span>
                  </div>
                  {card.bank && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{card.bank}</div>}
                </div>
                <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); handleDelete(card.id); }}>Delete</button>
              </div>

              {/* Outstanding */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Current Outstanding</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: -0.5 }}>{fmt(card.outstanding)}</div>
                  </div>
                  {card.creditLimit && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Credit Limit</div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{fmt(card.creditLimit)}</div>
                    </div>
                  )}
                </div>
                {card.creditLimit && card.creditLimit > 0 && (
                  <>
                    <div style={{ background: 'var(--border)', borderRadius: 4, height: 5, marginTop: 10 }}>
                      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 4 }}>
                      {Math.round(pct)}% utilized — {fmt((card.creditLimit || 0) - card.outstanding)} available
                    </div>
                  </>
                )}
              </div>

              {/* Dates */}
              {(card.billingDate || card.paymentDueDate) && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  {card.billingDate && (
                    <span>Statement: <strong style={{ color: 'var(--text-secondary)' }}>{card.billingDate}th</strong></span>
                  )}
                  {card.paymentDueDate && (
                    <span>Due: <strong style={{ color: 'var(--text-secondary)' }}>{card.paymentDueDate}th</strong></span>
                  )}
                </div>
              )}

              {/* Pay bill button */}
              <button className="btn btn-sm btn-secondary" style={{ width: '100%' }}
                onClick={e => { e.stopPropagation(); setPayModal(card); setPayForm({ bankAccountId: '', amount: String(card.outstanding || ''), date: new Date().toISOString().split('T')[0], notes: '' }); }}>
                Record Bill Payment
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Debt Report Modal ── */}
      {showDebtReport && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDebtReport(false)}>
          <div className="modal" style={{ maxWidth: 720, width: '95vw' }}>
            {/* Header */}
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Credit Debt Report</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Total outstanding&nbsp;
                  <span style={{ fontWeight: 700, color: 'var(--expense)' }}>{fmt(totalDebt)}</span>
                  &nbsp;across {debtSorted.length} card{debtSorted.length !== 1 ? 's' : ''}
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowDebtReport(false)}>✕</button>
            </div>

            {/* Two-panel body */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, minHeight: 320 }}>

              {/* Left — card list */}
              <div style={{ borderRight: '1px solid var(--border)', paddingRight: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2,
                  color: 'var(--text-muted)', marginBottom: 12 }}>Cards</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {debtSorted.map((card, i) => {
                    const pct = totalDebt > 0 ? ((card.outstanding || 0) / totalDebt) * 100 : 0;
                    const isSelected = expandedCardId === card.id;
                    const color = CAT_COLORS[i % CAT_COLORS.length];
                    return (
                      <div key={card.id}
                        onClick={() => toggleDrilldown(card.id)}
                        style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                          background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                          border: isSelected ? `1px solid ${color}` : '1px solid transparent',
                          transition: 'all 0.12s' }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-elevated)'; }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <NetworkLogo type={card.cardType} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {displayName(card)}
                              </div>
                              {card.bank && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{card.bank}</div>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--expense)' }}>{fmt(card.outstanding || 0)}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Math.round(pct)}% of total</div>
                          </div>
                        </div>
                        <div style={{ background: 'var(--border)', borderRadius: 4, height: 4 }}>
                          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right — category breakdown */}
              <div style={{ paddingLeft: 20 }}>
                {expandedCardId === null ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                    Select a card to see<br />category breakdown
                  </div>
                ) : (() => {
                  const selCard = debtSorted.find(c => c.id === expandedCardId)!;
                  const selIdx = debtSorted.findIndex(c => c.id === expandedCardId);
                  const cats = categoryData[expandedCardId];
                  const isLoading = loadingCategory.has(expandedCardId);
                  const catEntries = cats ? Object.entries(cats).sort((a, b) => b[1] - a[1]) : [];
                  const catTotal = catEntries.reduce((s, [, v]) => s + v, 0);
                  return (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2,
                        color: 'var(--text-muted)', marginBottom: 4 }}>Spend by Category</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                        {displayName(selCard)} · <span style={{ color: 'var(--expense)', fontWeight: 600 }}>{fmt(selCard.outstanding || 0)}</span> outstanding
                      </div>
                      {isLoading ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
                      ) : catEntries.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No transactions found.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {catEntries.map(([cat, amt], ci) => {
                            const catPct = catTotal > 0 ? (amt / catTotal) * 100 : 0;
                            return (
                              <div key={cat}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{cat}</span>
                                  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(amt)}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 34, textAlign: 'right' }}>{Math.round(catPct)}%</span>
                                  </div>
                                </div>
                                <div style={{ background: 'var(--border)', borderRadius: 4, height: 5 }}>
                                  <div style={{ width: `${Math.min(catPct, 100)}%`, height: '100%',
                                    background: CAT_COLORS[(selIdx + ci) % CAT_COLORS.length], borderRadius: 4 }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Add Credit Card</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid" style={{ marginBottom: 24 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Card Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    required placeholder="e.g. Amazon Pay Card" />
                </div>
                <div className="form-group">
                  <label>Card Type</label>
                  <FilterDropdown
                    value={form.cardType}
                    options={[
                      { label: 'Visa', value: 'VISA' },
                      { label: 'Mastercard', value: 'MASTERCARD' },
                      { label: 'RuPay', value: 'RUPAY' },
                      { label: 'American Express', value: 'AMEX' },
                      { label: 'Discover', value: 'DISCOVER' },
                      { label: 'Other', value: 'OTHER' },
                    ]}
                    onChange={v => setForm({ ...form, cardType: v as string })}
                    placeholder="Select type..."
                    fullWidth
                  />
                </div>
                <div className="form-group">
                  <label>Last 4 Digits <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input value={form.lastFourDigits} maxLength={4}
                    onChange={e => setForm({ ...form, lastFourDigits: e.target.value.replace(/\D/g, '') })}
                    placeholder="e.g. 1234" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Issuing Bank <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })}
                    placeholder="e.g. HDFC, ICICI, Axis" />
                </div>
                <div className="form-group">
                  <label>Credit Limit (₹) <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input type="number" value={form.creditLimit}
                    onChange={e => setForm({ ...form, creditLimit: e.target.value })} placeholder="e.g. 150000" />
                </div>
                <div className="form-group">
                  <label>Statement Date <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(day of month)</span></label>
                  <input type="number" min="1" max="31" value={form.billingDate}
                    onChange={e => setForm({ ...form, billingDate: e.target.value })} placeholder="e.g. 18" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Payment Due Date <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(day of month)</span></label>
                  <input type="number" min="1" max="31" value={form.paymentDueDate}
                    onChange={e => setForm({ ...form, paymentDueDate: e.target.value })} placeholder="e.g. 5" />
                </div>
                <div className="form-group">
                  <label>Balance Date</label>
                  <input type="date" value={form.balanceDate}
                    onChange={e => setForm({ ...form, balanceDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>
                    Outstanding as of {form.balanceDate ? new Date(form.balanceDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'selected date'} (₹)
                  </label>
                  <input type="number" step="0.01" min="0" value={form.openingOutstanding}
                    onChange={e => setForm({ ...form, openingOutstanding: e.target.value })}
                    placeholder="Amount owed on this date" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Add Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Bill Modal */}
      {payModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPayModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Record Bill Payment</h3>
              <button className="close-btn" onClick={() => setPayModal(null)}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Records a bank deduction for paying the bill of <strong>{displayName(payModal)}</strong>.
            </p>
            <form onSubmit={handlePayBill}>
              <div className="form-grid" style={{ marginBottom: 24 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Pay from Bank Account</label>
                  <FilterDropdown
                    value={payForm.bankAccountId}
                    options={bankAccounts.map(b => ({ label: b.name + (b.bankName ? ` (${b.bankName})` : ''), value: String(b.id) }))}
                    onChange={v => setPayForm({ ...payForm, bankAccountId: v as string })}
                    placeholder="Select bank account..."
                    fullWidth
                  />
                </div>
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input type="number" step="0.01" min="1" value={payForm.amount}
                    onChange={e => setPayForm({ ...payForm, amount: e.target.value })} required placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={payForm.date}
                    onChange={e => setPayForm({ ...payForm, date: e.target.value })} required />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })}
                    placeholder="e.g. Full payment" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Combined Page ────────────────────────────────────────────────────────────
type Tab = 'bank' | 'cards';

const AccountsPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('bank');

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Accounts</h2>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        <button className={`btn ${tab === 'bank' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('bank')}>
          Bank Accounts
        </button>
        <button className={`btn ${tab === 'cards' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('cards')}>
          Credit Cards
        </button>
      </div>

      {tab === 'bank' ? <BankTab /> : <CardsTab />}
    </div>
  );
};

export default AccountsPage;

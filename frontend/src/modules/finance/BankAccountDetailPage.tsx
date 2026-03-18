import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { transactionApi, bankAccountApi } from '../../services/api';
import { Transaction, BankAccount } from '../../types';
import FilterDropdown from '../../components/FilterDropdown';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface TxWithBalance extends Transaction { runningBalance: number; }

const BankAccountDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [txWithBalance, setTxWithBalance] = useState<TxWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState<number | 'ALL'>('ALL');
  const [filterMonth, setFilterMonth] = useState<number | 'ALL'>('ALL');

  useEffect(() => {
    if (!id) return;
    const accountId = parseInt(id);
    Promise.all([
      bankAccountApi.getAll(),
      transactionApi.getByBankAccount(accountId),
    ]).then(([accRes, txRes]) => {
      const acc = accRes.data.find((a: BankAccount) => a.id === accountId);
      setAccount(acc || null);

      // Transactions come sorted oldest→newest; compute running balance
      const txs: Transaction[] = txRes.data;
      let balance = acc ? acc.openingBalance : 0;
      const enriched: TxWithBalance[] = txs.map(t => {
        balance += t.type === 'INCOME' ? t.amount : -t.amount;
        return { ...t, runningBalance: balance };
      });
      setTxWithBalance(enriched);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;
  if (!account) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Account not found.</div>;

  const now = new Date();
  const curY = now.getFullYear(), curM = now.getMonth() + 1;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const quickFilters = [
    { label: MONTHS[prevDate.getMonth()], year: prevDate.getFullYear(), month: prevDate.getMonth() + 1 },
    { label: `${MONTHS[curM - 1]} (Now)`, year: curY, month: curM },
    { label: MONTHS[nextDate.getMonth()], year: nextDate.getFullYear(), month: nextDate.getMonth() + 1 },
  ];

  const years = Array.from(new Set(txWithBalance.map(t => new Date(t.date).getFullYear()))).sort((a,b) => b-a);
  const filtered = txWithBalance.filter(t => {
    const d = new Date(t.date);
    if (filterYear !== 'ALL' && d.getFullYear() !== filterYear) return false;
    if (filterMonth !== 'ALL' && d.getMonth() + 1 !== filterMonth) return false;
    return true;
  });

  // Group newest first: reverse the array, group, then within each group newest first
  const groups: { label: string; year: number; month: number; txs: TxWithBalance[] }[] = [];
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

  const balanceColor = account.currentBalance >= 0 ? 'var(--income)' : 'var(--expense)';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/accounts')}>← Back</button>
          <div>
            <h2 className="page-title" style={{ marginBottom: 2 }}>{account.name}</h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {account.accountType}{account.bankName ? ` · ${account.bankName}` : ''}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Current Balance</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: balanceColor }}>{fmt(account.currentBalance)}</div>
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
        {/* Quick filters */}
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

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
          No transactions found for this account.
        </div>
      )}

      {/* Groups */}
      {groups.map(g => (
        <div key={g.label} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>
            {g.label}
          </div>
          <div className="card" style={{ padding: '0' }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 20, width: '30%' }}>Description</th>
                    <th style={{ width: '16%' }}>Category</th>
                    <th style={{ width: '12%' }}>Date</th>
                    <th style={{ width: '10%' }}>Type</th>
                    <th style={{ textAlign: 'right', width: '14%' }}>Amount</th>
                    <th style={{ textAlign: 'right', width: '18%', paddingRight: 20 }}>Balance After</th>
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
                      <td><span className={`badge ${t.type.toLowerCase()}`}>{t.type}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`amount-${t.type.toLowerCase()}`}>
                          {t.type === 'EXPENSE' ? '-' : '+'}{fmt(t.amount)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: 20, fontWeight: 700,
                        color: t.runningBalance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                        {fmt(t.runningBalance)}
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

export default BankAccountDetailPage;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionApi, debtApi, chitApi, investmentApi, bankAccountApi } from '../../services/api';
import { Summary, DebtDashboard, ChitGroup, InvestmentDashboard, BankAccount } from '../../types';

const fmt = (n?: number) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—';

const Card: React.FC<{ children: React.ReactNode; onClick?: () => void; accent?: string }> = ({ children, onClick, accent }) => (
  <div
    onClick={onClick}
    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.15s' }}
    onMouseEnter={e => { if (accent) e.currentTarget.style.borderColor = accent; }}
    onMouseLeave={e => { if (accent) e.currentTarget.style.borderColor = 'var(--border)'; }}
  >
    {children}
  </div>
);

const MetaRow: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 600, color }}>{value}</span>
  </div>
);

const FinanceOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [debt, setDebt] = useState<DebtDashboard | null>(null);
  const [chits, setChits] = useState<ChitGroup[]>([]);
  const [investments, setInvestments] = useState<InvestmentDashboard | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      transactionApi.getSummary().catch(() => ({ data: null })),
      debtApi.getDashboard().catch(() => ({ data: null })),
      chitApi.getAll().catch(() => ({ data: [] })),
      investmentApi.getDashboard().catch(() => ({ data: null })),
      bankAccountApi.getAll().catch(() => ({ data: [] })),
    ]).then(([s, d, c, inv, accs]) => {
      setSummary(s.data);
      setDebt(d.data);
      setChits(c.data || []);
      setInvestments(inv.data);
      setAccounts(Array.isArray(accs.data) ? accs.data : []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  const monthlyIncome = summary?.monthlyIncome || 0;
  const monthlyExpenses = summary?.monthlyExpenses || 0;
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

  const activeChits = chits.filter(c => c.status === 'ACTIVE');
  const completedChits = chits.filter(c => c.status === 'COMPLETED');
  const chitTotalPaid = chits.reduce((s, c) => s + (c.totalPaid || 0), 0);
  const chitTotalReceived = chits.reduce((s, c) => s + (c.totalReceived || 0), 0);
  const chitNetPosition = chitTotalReceived - chitTotalPaid;
  const chitMonthlyOutflow = activeChits.reduce((s, c) => s + (c.monthlyAmount || 0), 0);

  const totalDebt = debt?.totalOutstanding || 0;
  const monthlyEmi = debt?.monthlyEmiOutflow || 0;
  const activeEmi = (debt?.emiLoans || []).filter(l => l.status === 'ACTIVE').length;
  const activeAnnual = (debt?.annualLoans || []).filter(l => l.status === 'OUTSTANDING').length;
  const activeBorrowed = (debt?.borrowedLoans || []).filter(l => l.status === 'OUTSTANDING').length;

  // Investments
  const fdList = investments?.fdList || [];
  const rdList = investments?.rdList || [];
  const invTotal = investments?.totalInvested || 0;
  const invEfTotal = investments?.emergencyFundTotal || 0;
  const activeFds = fdList.filter(f => f.status === 'ACTIVE').length;
  const activeRds = rdList.filter(r => r.status === 'ACTIVE').length;
  const rdMonthlyOutflow = rdList.filter(r => r.status === 'ACTIVE').reduce((s, r) => s + r.amount, 0);

  // Emergency Fund
  const efAccounts = accounts.filter(a => a.emergencyFund);
  const efAccountsTotal = efAccounts.reduce((s, a) => s + (a.currentBalance || 0), 0);
  const totalEf = invEfTotal + efAccountsTotal;

  // Chit is an investment — group together
  const monthlyInvestmentCommitment = rdMonthlyOutflow + chitMonthlyOutflow;
  const totalInvestmentPrincipal = invTotal + chitTotalPaid;   // FD/RD invested + chit paid in
  const netPosition = (summary?.balance || 0) - totalDebt + invTotal + chitNetPosition;
  const monthlyTotalOutflow = monthlyEmi + monthlyInvestmentCommitment;

  const savingsColor = savingsRate >= 20 ? '#22c55e' : savingsRate >= 10 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Finance Overview</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Your complete financial snapshot</p>
      </div>

      {/* Monthly strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Monthly Income', value: fmt(monthlyIncome), color: '#22c55e', sub: 'this month' },
          { label: 'Monthly Expenses', value: fmt(monthlyExpenses), color: '#ef4444', sub: 'this month' },
          { label: 'Monthly Savings', value: fmt(monthlySavings), color: monthlySavings >= 0 ? '#3b82f6' : '#ef4444', sub: 'income − expenses' },
          { label: 'Savings Rate', value: `${savingsRate.toFixed(1)}%`, color: savingsColor, sub: 'of monthly income' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Section cards — 3 col: Debt | Investments (FD+RD+Chit) | Emergency Fund */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: 14, marginBottom: 24 }}>

        {/* Debt */}
        <Card onClick={() => navigate('/finance/debt')} accent="#ef4444">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Debt</div>
            <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>View →</span>
          </div>
          <MetaRow label="Total Outstanding" value={fmt(totalDebt)} color="#ef4444" />
          <MetaRow label="Monthly EMI" value={fmt(monthlyEmi)} color="#f59e0b" />
          <MetaRow label="Debt-Free Progress" value={`${Math.round((debt?.debtFreeProgress || 0) * 100)}%`} color="#22c55e" />
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            {activeEmi > 0 && `${activeEmi} EMI`}
            {activeAnnual > 0 && `  ·  ${activeAnnual} Annual`}
            {activeBorrowed > 0 && `  ·  ${activeBorrowed} Borrowed`}
            {activeEmi === 0 && activeAnnual === 0 && activeBorrowed === 0 && 'No active loans'}
          </div>
        </Card>

        {/* Investments — FD + RD + Chit combined */}
        <Card onClick={() => navigate('/finance/investments-dashboard')} accent="#3b82f6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Investments</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>FD · RD · Chit</div>
            </div>
            <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>View →</span>
          </div>
          {/* Sub-row: FD + RD */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
            <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--bg-elevated)' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>FD · {activeFds} active</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(fdList.filter(f => f.status === 'ACTIVE').reduce((s, f) => s + f.amount, 0))}
              </div>
            </div>
            <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--bg-elevated)' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>RD · {activeRds} active</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0ea5e9', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(rdMonthlyOutflow)}<span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span>
              </div>
            </div>
          </div>
          {/* Chit row */}
          <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--bg-elevated)', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>Chit · {activeChits.length} active</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#a855f7', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(chitMonthlyOutflow)}<span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>net position</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: chitNetPosition >= 0 ? '#22c55e' : '#ef4444', fontVariantNumeric: 'tabular-nums' }}>
                  {chitNetPosition >= 0 ? '+' : ''}{fmt(chitNetPosition)}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', paddingTop: 2 }}>
            <span>Total monthly commitment</span>
            <span style={{ fontWeight: 700, color: '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>{fmt(monthlyInvestmentCommitment)}</span>
          </div>
        </Card>

        {/* Emergency Fund */}
        <Card onClick={() => navigate('/finance/emergency-fund')} accent="#f59e0b">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Emergency Fund</div>
            <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>View →</span>
          </div>
          <MetaRow label="Total EF" value={fmt(totalEf)} color="#f59e0b" />
          <MetaRow label="FD / RD" value={fmt(invEfTotal)} color="#3b82f6" />
          <MetaRow label="Accounts" value={fmt(efAccountsTotal)} color="#22c55e" />
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            {efAccounts.length > 0 ? `${efAccounts.length} account${efAccounts.length > 1 ? 's' : ''} marked EF` : 'No EF accounts'}
          </div>
        </Card>
      </div>

      {/* Net Position card — full width */}
      <div style={{ marginBottom: 24 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Net Position</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: netPosition >= 0 ? '#22c55e' : '#ef4444', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(netPosition)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                Bank balance + Investments (FD/RD + Chit net) − Debt
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '5px 28px', fontSize: 12, marginTop: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Bank balance</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(summary?.balance)}</span>
              <span style={{ color: 'var(--text-muted)' }}>FD / RD invested</span>
              <span style={{ fontWeight: 600, color: '#3b82f6', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>+ {fmt(invTotal)}</span>
              <span style={{ color: 'var(--text-muted)' }}>Chit net</span>
              <span style={{ fontWeight: 600, color: chitNetPosition >= 0 ? '#22c55e' : '#ef4444', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {chitNetPosition >= 0 ? '+ ' : '− '}{fmt(Math.abs(chitNetPosition))}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>Debt outstanding</span>
              <span style={{ fontWeight: 600, color: '#ef4444', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>− {fmt(totalDebt)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly outflow row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Monthly Committed Outflow</div>

          {/* Debt bucket */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Debt</div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>EMI payments</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>{fmt(monthlyEmi)}</div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', marginBottom: 12 }} />

          {/* Investments bucket */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Investments</div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>RD</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0ea5e9', fontVariantNumeric: 'tabular-nums' }}>{fmt(rdMonthlyOutflow)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>Chit</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#a855f7', fontVariantNumeric: 'tabular-nums' }}>{fmt(chitMonthlyOutflow)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>Total investments</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>{fmt(monthlyInvestmentCommitment)}</div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', marginBottom: 10 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total committed / month</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>{fmt(monthlyTotalOutflow)}</span>
          </div>
          {monthlyIncome > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              {((monthlyTotalOutflow / monthlyIncome) * 100).toFixed(1)}% of monthly income committed
              {' · '}{((monthlyInvestmentCommitment / monthlyIncome) * 100).toFixed(1)}% goes to investments
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Total Picture</div>
          <MetaRow label="Total Income (all time)" value={fmt(summary?.totalIncome)} color="#22c55e" />
          <MetaRow label="Total Expenses (all time)" value={fmt(summary?.totalExpenses)} color="#ef4444" />
          <MetaRow label="Net Balance" value={fmt(summary?.balance)} color="var(--text-primary)" />
        </Card>
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Income & Expense', sub: 'Dashboard', path: '/finance/income-expense', color: '#22c55e' },
          { label: 'Transactions', sub: 'Income & expense log', path: '/transactions', color: '#3b82f6' },
          { label: 'Analytics', sub: 'Spending insights', path: '/analytics', color: '#f59e0b' },
          { label: 'Accounts', sub: 'Banks & cards', path: '/accounts', color: '#94a3b8' },
        ].map(c => (
          <div key={c.label} onClick={() => navigate(c.path)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = c.color)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{c.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FinanceOverviewPage;

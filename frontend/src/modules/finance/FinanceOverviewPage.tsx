import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionApi, debtApi, chitApi, investmentApi, bankAccountApi } from '../../services/api';
import { Summary, DebtDashboard, ChitGroup, InvestmentDashboard, BankAccount } from '../../types';
import { useMobile } from '../../hooks/useMobile';

const fmt = (n?: number) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—';

const Card: React.FC<{ children: React.ReactNode; onClick?: () => void; accent?: string }> = ({ children, onClick, accent }) => (
  <div
    className={`page-card${onClick ? ' clickable' : ''}`}
    onClick={onClick}
    style={{ padding: '18px 20px' }}
    onMouseEnter={e => { if (accent) e.currentTarget.style.borderColor = accent; }}
    onMouseLeave={e => { if (accent) e.currentTarget.style.borderColor = 'var(--border)'; }}
  >
    {children}
  </div>
);

const MetaRow: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className="kv-row">
    <span className="kv-label">{label}</span>
    <span className="kv-value" style={{ color }}>{value}</span>
  </div>
);

const FinanceOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useMobile();
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

  const savingsColor = savingsRate >= 20 ? 'var(--income)' : savingsRate >= 10 ? 'var(--warning)' : 'var(--expense)';

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h2 className="page-title">Finance Overview</h2>
          <p className="page-subtitle">Your complete financial snapshot</p>
        </div>
      </div>

      {/* Monthly strip */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card income">
          <div className="stat-label">Monthly Income</div>
          <div className="stat-value income" style={{ fontSize: 28 }}>{fmt(monthlyIncome)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>this month</div>
        </div>
        <div className="stat-card expense">
          <div className="stat-label">Monthly Expenses</div>
          <div className="stat-value expense" style={{ fontSize: 28 }}>{fmt(monthlyExpenses)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>this month</div>
        </div>
        <div className="stat-card monthly">
          <div className="stat-label">Monthly Savings</div>
          <div className="stat-value" style={{ fontSize: 28, color: monthlySavings >= 0 ? 'var(--sky-blue)' : 'var(--expense)' }}>{fmt(monthlySavings)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>income − expenses</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Savings Rate</div>
          <div className="stat-value" style={{ fontSize: 28, color: savingsColor }}>{savingsRate.toFixed(1)}%</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>of monthly income</div>
        </div>
      </div>

      {/* Section cards — 3 col: Debt | Investments (FD+RD+Chit) | Emergency Fund */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.4fr 1fr', gap: 14, marginBottom: 24 }}>

        {/* Debt */}
        <Card onClick={() => navigate('/finance/debt')} accent="var(--expense)">
          <div className="section-header">
            <span className="section-title">Debt</span>
            <button className="section-link danger">View →</button>
          </div>
          <MetaRow label="Total Outstanding" value={fmt(totalDebt)} color="var(--expense)" />
          <MetaRow label="Monthly EMI" value={fmt(monthlyEmi)} color="var(--warning)" />
          <MetaRow label="Debt-Free Progress" value={`${Math.round((debt?.debtFreeProgress || 0) * 100)}%`} color="var(--income)" />
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            {activeEmi > 0 && `${activeEmi} EMI`}
            {activeAnnual > 0 && `  ·  ${activeAnnual} Annual`}
            {activeBorrowed > 0 && `  ·  ${activeBorrowed} Borrowed`}
            {activeEmi === 0 && activeAnnual === 0 && activeBorrowed === 0 && 'No active loans'}
          </div>
        </Card>

        {/* Investments — FD + RD + Chit combined */}
        <Card onClick={() => navigate('/finance/investments-dashboard')} accent="var(--primary)">
          <div className="section-header">
            <div>
              <div className="section-title">Investments</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>FD · RD · Chit</div>
            </div>
            <button className="section-link">View →</button>
          </div>
          {/* Sub-row: FD + RD */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
            <div className="sub-panel">
              <div className="sub-panel-label">FD · {activeFds} active</div>
              <div className="sub-panel-value" style={{ color: 'var(--primary)' }}>
                {fmt(fdList.filter(f => f.status === 'ACTIVE').reduce((s, f) => s + f.amount, 0))}
              </div>
            </div>
            <div className="sub-panel">
              <div className="sub-panel-label">RD · {activeRds} active</div>
              <div className="sub-panel-value" style={{ color: 'var(--sky-blue)' }}>
                {fmt(rdMonthlyOutflow)}<span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span>
              </div>
            </div>
          </div>
          {/* Chit row */}
          <div className="sub-panel" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="sub-panel-label">Chit · {activeChits.length} active</div>
                <div className="sub-panel-value" style={{ color: 'var(--purple)' }}>
                  {fmt(chitMonthlyOutflow)}<span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="sub-panel-label">net position</div>
                <div className="sub-panel-value" style={{ color: chitNetPosition >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                  {chitNetPosition >= 0 ? '+' : ''}{fmt(chitNetPosition)}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', paddingTop: 2 }}>
            <span>Total monthly commitment</span>
            <span style={{ fontWeight: 700, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(monthlyInvestmentCommitment)}</span>
          </div>
        </Card>

        {/* Emergency Fund */}
        <Card onClick={() => navigate('/finance/emergency-fund')} accent="var(--warning)">
          <div className="section-header">
            <span className="section-title">Emergency Fund</span>
            <button className="section-link" style={{ color: 'var(--warning)' }}>View →</button>
          </div>
          <MetaRow label="Total EF" value={fmt(totalEf)} color="var(--warning)" />
          <MetaRow label="FD / RD" value={fmt(invEfTotal)} color="var(--primary)" />
          <MetaRow label="Accounts" value={fmt(efAccountsTotal)} color="var(--income)" />
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            {efAccounts.length > 0 ? `${efAccounts.length} account${efAccounts.length > 1 ? 's' : ''} marked EF` : 'No EF accounts'}
          </div>
        </Card>
      </div>

      {/* Net Position card — full width */}
      <div style={{ marginBottom: 24 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Net Position</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: netPosition >= 0 ? 'var(--income)' : 'var(--expense)', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(netPosition)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                Bank balance + Investments (FD/RD + Chit net) − Debt
              </div>
            </div>
            {!isMobile && (
              <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '5px 28px', fontSize: 12, marginTop: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Bank balance</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(summary?.balance)}</span>
                <span style={{ color: 'var(--text-muted)' }}>FD / RD invested</span>
                <span style={{ fontWeight: 600, color: 'var(--primary)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>+ {fmt(invTotal)}</span>
                <span style={{ color: 'var(--text-muted)' }}>Chit net</span>
                <span style={{ fontWeight: 600, color: chitNetPosition >= 0 ? 'var(--income)' : 'var(--expense)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {chitNetPosition >= 0 ? '+ ' : '− '}{fmt(Math.abs(chitNetPosition))}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>Debt outstanding</span>
                <span style={{ fontWeight: 600, color: 'var(--expense)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>− {fmt(totalDebt)}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Monthly outflow row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Monthly Committed Outflow</div>

          {/* Debt bucket */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--expense)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Debt</div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>EMI payments</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>{fmt(monthlyEmi)}</div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', marginBottom: 12 }} />

          {/* Investments bucket */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Investments</div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>RD</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--sky-blue)', fontVariantNumeric: 'tabular-nums' }}>{fmt(rdMonthlyOutflow)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>Chit</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--purple)', fontVariantNumeric: 'tabular-nums' }}>{fmt(chitMonthlyOutflow)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>Total investments</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(monthlyInvestmentCommitment)}</div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', marginBottom: 10 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total committed / month</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--expense)', fontVariantNumeric: 'tabular-nums' }}>{fmt(monthlyTotalOutflow)}</span>
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
          <MetaRow label="Total Income (all time)" value={fmt(summary?.totalIncome)} color="var(--income)" />
          <MetaRow label="Total Expenses (all time)" value={fmt(summary?.totalExpenses)} color="var(--expense)" />
          <MetaRow label="Net Balance" value={fmt(summary?.balance)} color="var(--text-primary)" />
        </Card>
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Income & Expense', sub: 'Dashboard', path: '/finance/income-expense', accent: 'var(--income)' },
          { label: 'Transactions', sub: 'Income & expense log', path: '/transactions', accent: 'var(--primary)' },
          { label: 'Analytics', sub: 'Spending insights', path: '/analytics', accent: 'var(--warning)' },
          { label: 'Accounts', sub: 'Banks & cards', path: '/accounts', accent: 'var(--text-muted)' },
        ].map(c => (
          <Card key={c.label} onClick={() => navigate(c.path)} accent={c.accent}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{c.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{c.sub}</div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FinanceOverviewPage;

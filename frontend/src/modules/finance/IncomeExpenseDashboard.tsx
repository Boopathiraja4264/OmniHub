import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionApi, budgetApi } from '../../services/api';
import { useMobile } from '../../hooks/useMobile';

const fmt  = (n?: number) => n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—';
const fmtK = (n: number)  => Math.abs(n) >= 100000 ? `₹${(n/100000).toFixed(1)}L` : Math.abs(n) >= 1000 ? `₹${(n/1000).toFixed(1)}K` : `₹${Math.round(n)}`;
const MOS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const now  = new Date();
const CY   = now.getFullYear();
const CM   = now.getMonth() + 1;

interface MonthPoint { month: number; total: number; }
interface CategoryPoint { category: string; total: number; }
interface Budget { category: string; limitAmount: number; spent: number; }

const IncomeExpenseDashboard: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [summary,    setSummary]    = useState<any>(null);
  const [incomeData, setIncomeData] = useState<MonthPoint[]>([]);
  const [expData,    setExpData]    = useState<MonthPoint[]>([]);
  const [categories, setCategories] = useState<CategoryPoint[]>([]);
  const [budgets,    setBudgets]    = useState<Budget[]>([]);
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [s, inc, exp, cats, bud] = await Promise.all([
        transactionApi.getSummary(),
        transactionApi.getMonthly('INCOME',  CY),
        transactionApi.getMonthly('EXPENSE', CY),
        transactionApi.getByCategory(CM, CY),
        budgetApi.getForMonth(CM, CY),
      ]);
      setSummary(s.data);
      setIncomeData(Array.isArray(inc.data) ? inc.data : []);
      setExpData(Array.isArray(exp.data) ? exp.data : []);
      setCategories(Array.isArray(cats.data) ? cats.data.sort((a: CategoryPoint, b: CategoryPoint) => b.total - a.total) : []);
      setBudgets(Array.isArray(bud.data) ? bud.data : []);
    } catch { /* handled */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;

  const monthlyIncome   = summary?.monthlyIncome   ?? 0;
  const monthlyExpenses = summary?.monthlyExpenses  ?? 0;
  const monthlySavings  = monthlyIncome - monthlyExpenses;
  const savingsRate     = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
  const savingsColor    = savingsRate >= 20 ? 'var(--income)' : savingsRate >= 10 ? 'var(--warning)' : 'var(--expense)';

  // Last 6 months for trend
  const last6: { label: string; income: number; expense: number; savings: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    let m = CM - i; let y = CY;
    if (m <= 0) { m += 12; y -= 1; }
    const inc = incomeData.find(p => p.month === m)?.total ?? 0;
    const exp = expData.find(p => p.month === m)?.total ?? 0;
    last6.push({ label: MOS[m - 1], income: inc, expense: exp, savings: inc - exp });
  }
  const maxVal = Math.max(...last6.map(m => Math.max(m.income, m.expense)), 1);

  // Budget summary
  const budgetTotal = budgets.reduce((s, b) => s + (b.limitAmount ?? 0), 0);
  const budgetUsed  = budgets.reduce((s, b) => s + (b.spent ?? 0), 0);
  const budgetPct   = budgetTotal > 0 ? (budgetUsed / budgetTotal) * 100 : 0;
  const overBudget  = budgets.filter(b => b.spent > b.limitAmount);

  // Top 6 categories
  const topCats = categories.slice(0, 6);
  const maxCat  = topCats[0]?.total ?? 1;

  const barColors = ['var(--expense)', 'var(--warning)', 'var(--primary)', 'var(--purple)', 'var(--income)', 'var(--sky-blue)'];

  const budgetBarColor = (pct: number) => pct > 100 ? 'var(--expense)' : pct > 80 ? 'var(--warning)' : 'var(--income)';

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 28px', maxWidth: 1200 }}>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 22 }}>
        <div>
          <h2 className="page-title">Income &amp; Expense</h2>
          <p className="page-subtitle">{MOS[CM - 1]} {CY} · your money in and out</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/transactions')} className="btn btn-primary" style={{ fontSize: 12 }}>+ Add Transaction</button>
          <button onClick={() => navigate('/budgets')} className="btn btn-secondary" style={{ fontSize: 12 }}>Budgets</button>
          <button onClick={() => navigate('/analytics')} className="btn btn-secondary" style={{ fontSize: 12 }}>Analytics</button>
        </div>
      </div>

      {/* This month stats */}
      <div className="stats-grid" style={{ marginBottom: 22 }}>
        <div className="stat-card income">
          <div className="stat-label">This Month Income</div>
          <div className="stat-value income" style={{ fontSize: 26 }}>{fmt(monthlyIncome)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>all income sources</div>
        </div>
        <div className="stat-card expense">
          <div className="stat-label">This Month Expenses</div>
          <div className="stat-value expense" style={{ fontSize: 26 }}>{fmt(monthlyExpenses)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>all categories</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Net Savings</div>
          <div className="stat-value" style={{ fontSize: 26, color: monthlySavings >= 0 ? 'var(--primary)' : 'var(--expense)' }}>{fmt(monthlySavings)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>income − expenses</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Savings Rate</div>
          <div className="stat-value" style={{ fontSize: 26, color: savingsColor }}>{savingsRate.toFixed(1)}%</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            {savingsRate >= 20 ? 'Great! Keep it up' : savingsRate >= 10 ? 'Decent, aim for 20%' : 'Low — review expenses'}
          </div>
        </div>
      </div>

      {/* Trend + Categories row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* 6-month trend */}
        <div className="page-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
            Last 6 Months
            <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 10 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--income)', marginRight: 4 }} />Income
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--expense)', marginLeft: 10, marginRight: 4 }} />Expense
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 120 }}>
            {last6.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 90, justifyContent: 'center' }}>
                  <div style={{ flex: 1, borderRadius: '3px 3px 0 0', background: 'var(--income)',
                    height: `${maxVal > 0 ? (m.income / maxVal) * 90 : 0}%`,
                    minHeight: m.income > 0 ? 3 : 0, transition: 'height 0.3s' }} />
                  <div style={{ flex: 1, borderRadius: '3px 3px 0 0', background: 'var(--expense)',
                    height: `${maxVal > 0 ? (m.expense / maxVal) * 90 : 0}%`,
                    minHeight: m.expense > 0 ? 3 : 0, transition: 'height 0.3s' }} />
                </div>
                <div style={{ fontSize: 9, fontWeight: i === 5 ? 700 : 400,
                  color: i === 5 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 10,
            display: 'flex', justifyContent: 'space-between' }}>
            {last6.slice(-1).map(m => (
              <React.Fragment key="cur">
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--income)', fontWeight: 600 }}>{fmtK(m.income)}</span> in
                  {' · '}<span style={{ color: 'var(--expense)', fontWeight: 600 }}>{fmtK(m.expense)}</span> out
                  {' · '}<span style={{ color: m.savings >= 0 ? 'var(--primary)' : 'var(--expense)', fontWeight: 600 }}>{fmtK(m.savings)} saved</span>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{MOS[CM-1]} {CY}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Top categories */}
        <div className="page-card" style={{ padding: '18px 20px' }}>
          <div className="section-header" style={{ marginBottom: 14 }}>
            <div className="section-title">Top Spend · {MOS[CM - 1]}</div>
            <button onClick={() => navigate('/analytics')} className="section-link">See all →</button>
          </div>
          {topCats.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 8 }}>No expenses this month.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {topCats.map((c, i) => {
                const pct = maxCat > 0 ? (c.total / maxCat) * 100 : 0;
                return (
                  <div key={c.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.category}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(c.total)}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 99 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: barColors[i % barColors.length], borderRadius: 99, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Budget utilization + All-time row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 16 }}>

        {/* Budget */}
        <div className="page-card" style={{ padding: '18px 20px' }}>
          <div className="section-header" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="section-title">Budget · {MOS[CM - 1]}</div>
              {overBudget.length > 0 && (
                <span className="badge expense">{overBudget.length} over budget</span>
              )}
            </div>
            <button onClick={() => navigate('/budgets')} className="section-link">Manage →</button>
          </div>
          {budgets.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              No budgets set for this month.{' '}
              <button onClick={() => navigate('/budgets')} className="section-link" style={{ fontSize: 12, padding: 0 }}>Set budgets →</button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Overall: {fmt(budgetUsed)} of {fmt(budgetTotal)}</span>
                  <span style={{ color: budgetBarColor(budgetPct), fontWeight: 700 }}>{budgetPct.toFixed(1)}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 99 }}>
                  <div style={{ height: '100%', width: `${Math.min(budgetPct, 100)}%`,
                    background: budgetBarColor(budgetPct),
                    borderRadius: 99, transition: 'width 0.3s' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {budgets.slice(0, 5).map(b => {
                  const pct = b.limitAmount > 0 ? (b.spent / b.limitAmount) * 100 : 0;
                  const color = budgetBarColor(pct);
                  return (
                    <div key={b.category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-primary)', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.category}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{fmt(b.spent)} / {fmt(b.limitAmount)}</span>
                      </div>
                      <div style={{ height: 3, background: 'var(--border)', borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })}
                {budgets.length > 5 && (
                  <button onClick={() => navigate('/budgets')} className="section-link" style={{ textAlign: 'left', padding: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                    +{budgets.length - 5} more categories →
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* All-time totals */}
        <div className="page-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>All-Time Picture</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Total Income',   value: fmt(summary?.totalIncome),  color: 'var(--income)' },
              { label: 'Total Expenses', value: fmt(summary?.totalExpenses), color: 'var(--expense)' },
              { label: 'Net Balance',    value: fmt(summary?.balance),       color: (summary?.balance ?? 0) >= 0 ? 'var(--text-primary)' : 'var(--expense)' },
            ].map(r => (
              <div key={r.label} className="data-row">
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: r.color, fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'Transactions', path: '/transactions', color: 'var(--primary)',  bg: 'var(--primary-dim)',          border: 'var(--primary-glow)' },
              { label: 'Analytics',    path: '/analytics',    color: 'var(--warning)',  bg: 'rgba(245,158,11,0.08)',        border: 'rgba(245,158,11,0.28)' },
              { label: 'Categories',   path: '/finance/categories', color: 'var(--purple)', bg: 'rgba(168,85,247,0.08)',   border: 'rgba(168,85,247,0.28)' },
            ].map(l => (
              <button key={l.path} onClick={() => navigate(l.path)}
                style={{ padding: '6px 10px', borderRadius: 'var(--radius-xs)', border: `1px solid ${l.border}`,
                  background: l.bg, color: l.color, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', textAlign: 'left' }}>
                {l.label} →
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeExpenseDashboard;

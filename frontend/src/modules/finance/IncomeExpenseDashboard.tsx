import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionApi, budgetApi } from '../../services/api';

const fmt  = (n?: number) => n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—';
const fmtK = (n: number)  => Math.abs(n) >= 100000 ? `₹${(n/100000).toFixed(1)}L` : Math.abs(n) >= 1000 ? `₹${(n/1000).toFixed(1)}K` : `₹${Math.round(n)}`;
const MOS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const now  = new Date();
const CY   = now.getFullYear();
const CM   = now.getMonth() + 1;

interface MonthPoint { month: number; total: number; }
interface CategoryPoint { category: string; total: number; }
interface Budget { category: string; limitAmount: number; spent: number; }

const StatCard: React.FC<{ label: string; value: string; sub?: string; color: string; big?: boolean }> = ({ label, value, sub, color, big }) => (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: big ? 24 : 20, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
  </div>
);

const IncomeExpenseDashboard: React.FC = () => {
  const navigate = useNavigate();
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
  const savingsColor    = savingsRate >= 20 ? '#22c55e' : savingsRate >= 10 ? '#f59e0b' : '#ef4444';

  // Last 6 months for trend
  const last6: { label: string; income: number; expense: number; savings: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    let m = CM - i; let y = CY;
    if (m <= 0) { m += 12; y -= 1; }
    const inc = incomeData.find(p => p.month === m)?.total ?? 0;
    const exp = expData.find(p => p.month === m)?.total ?? 0;
    last6.push({ label: MOS[m - 1], income: inc, expense: exp, savings: inc - exp });
  }
  const maxVal   = Math.max(...last6.map(m => Math.max(m.income, m.expense)), 1);

  // Budget summary
  const budgetTotal   = budgets.reduce((s, b) => s + (b.limitAmount ?? 0), 0);
  const budgetUsed    = budgets.reduce((s, b) => s + (b.spent ?? 0), 0);
  const budgetPct     = budgetTotal > 0 ? (budgetUsed / budgetTotal) * 100 : 0;
  const overBudget    = budgets.filter(b => b.spent > b.limitAmount);

  // Top 6 categories
  const topCats = categories.slice(0, 6);
  const maxCat  = topCats[0]?.total ?? 1;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200, minHeight: '100%',
      background: 'radial-gradient(ellipse 60% 35% at 5% 0%, rgba(34,197,94,0.05) 0%, transparent 55%)' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.4px' }}>Income & Expense</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
            {MOS[CM - 1]} {CY} · your money in and out
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/transactions')} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.07)', color: '#22c55e', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Add Transaction</button>
          <button onClick={() => navigate('/budgets')} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Budgets</button>
          <button onClick={() => navigate('/analytics')} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Analytics</button>
        </div>
      </div>

      {/* This month stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
        <StatCard label="This Month Income"   value={fmt(monthlyIncome)}   color="#22c55e" sub="all income sources" big />
        <StatCard label="This Month Expenses" value={fmt(monthlyExpenses)} color="#ef4444" sub="all categories"     big />
        <StatCard label="Net Savings"         value={fmt(monthlySavings)}  color={monthlySavings >= 0 ? '#3b82f6' : '#ef4444'} sub="income − expenses" big />
        <StatCard label="Savings Rate"        value={`${savingsRate.toFixed(1)}%`} color={savingsColor} sub={savingsRate >= 20 ? 'Great! Keep it up' : savingsRate >= 10 ? 'Decent, aim for 20%' : 'Low — review expenses'} big />
      </div>

      {/* Trend + Categories row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* 6-month trend */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
            Last 6 Months
            <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 10 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#22c55e', marginRight: 4 }} />Income
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#ef4444', marginLeft: 10, marginRight: 4 }} />Expense
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 120 }}>
            {last6.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                {/* Bars */}
                <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 90, justifyContent: 'center' }}>
                  <div style={{ flex: 1, borderRadius: '3px 3px 0 0', background: '#22c55e',
                    height: `${maxVal > 0 ? (m.income / maxVal) * 90 : 0}%`,
                    minHeight: m.income > 0 ? 3 : 0, transition: 'height 0.3s' }} />
                  <div style={{ flex: 1, borderRadius: '3px 3px 0 0', background: '#ef4444',
                    height: `${maxVal > 0 ? (m.expense / maxVal) * 90 : 0}%`,
                    minHeight: m.expense > 0 ? 3 : 0, transition: 'height 0.3s' }} />
                </div>
                {/* Month label */}
                <div style={{ fontSize: 9, fontWeight: i === 5 ? 700 : 400,
                  color: i === 5 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{m.label}</div>
              </div>
            ))}
          </div>
          {/* Values for current month */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 10,
            display: 'flex', justifyContent: 'space-between' }}>
            {last6.slice(-1).map(m => (
              <React.Fragment key="cur">
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  <span style={{ color: '#22c55e', fontWeight: 600 }}>{fmtK(m.income)}</span> in · <span style={{ color: '#ef4444', fontWeight: 600 }}>{fmtK(m.expense)}</span> out
                  {' · '}<span style={{ color: m.savings >= 0 ? '#3b82f6' : '#ef4444', fontWeight: 600 }}>{fmtK(m.savings)} saved</span>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{MOS[CM-1]} {CY}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Top categories */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Top Spend · {MOS[CM - 1]}</div>
            <button onClick={() => navigate('/analytics')} style={{ fontSize: 10, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>See all →</button>
          </div>
          {topCats.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 8 }}>No expenses this month.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {topCats.map((c, i) => {
                const pct = maxCat > 0 ? (c.total / maxCat) * 100 : 0;
                const barColors = ['#ef4444','#f59e0b','#3b82f6','#a855f7','#22c55e','#0ea5e9'];
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
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>

        {/* Budget */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Budget · {MOS[CM - 1]}
              {overBudget.length > 0 && (
                <span style={{ marginLeft: 10, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                  background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {overBudget.length} over budget
                </span>
              )}
            </div>
            <button onClick={() => navigate('/budgets')} style={{ fontSize: 10, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Manage →</button>
          </div>
          {budgets.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              No budgets set for this month.{' '}
              <button onClick={() => navigate('/budgets')} style={{ color: '#3b82f6', background: 'none', border: 'none', fontSize: 12, cursor: 'pointer', padding: 0, fontWeight: 600 }}>Set budgets →</button>
            </div>
          ) : (
            <>
              {/* Overall utilization bar */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Overall: {fmt(budgetUsed)} of {fmt(budgetTotal)}</span>
                  <span style={{ color: budgetPct > 100 ? '#ef4444' : budgetPct > 80 ? '#f59e0b' : '#22c55e', fontWeight: 700 }}>{budgetPct.toFixed(1)}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 99 }}>
                  <div style={{ height: '100%', width: `${Math.min(budgetPct, 100)}%`,
                    background: budgetPct > 100 ? '#ef4444' : budgetPct > 80 ? '#f59e0b' : '#22c55e',
                    borderRadius: 99, transition: 'width 0.3s' }} />
                </div>
              </div>
              {/* Per-category rows (top 5) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {budgets.slice(0, 5).map(b => {
                  const pct = b.limitAmount > 0 ? (b.spent / b.limitAmount) * 100 : 0;
                  const color = pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#22c55e';
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
                  <button onClick={() => navigate('/budgets')} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                    +{budgets.length - 5} more categories →
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* All-time totals */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>All-Time Picture</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Total Income',   value: fmt(summary?.totalIncome),   color: '#22c55e' },
              { label: 'Total Expenses', value: fmt(summary?.totalExpenses),  color: '#ef4444' },
              { label: 'Net Balance',    value: fmt(summary?.balance),        color: summary?.balance >= 0 ? 'var(--text-primary)' : '#ef4444' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-elevated)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: r.color, fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'Transactions', path: '/transactions', color: '#3b82f6' },
              { label: 'Analytics',    path: '/analytics',    color: '#f59e0b' },
              { label: 'Categories',   path: '/finance/categories', color: '#a855f7' },
            ].map(l => (
              <button key={l.path} onClick={() => navigate(l.path)}
                style={{ padding: '6px 10px', borderRadius: 7, border: `1px solid ${l.color}33`,
                  background: `${l.color}0d`, color: l.color, fontSize: 11, fontWeight: 600,
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

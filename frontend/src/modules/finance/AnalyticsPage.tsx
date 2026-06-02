import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale,
  LinearScale, BarElement, Title
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Doughnut, Bar } from 'react-chartjs-2';
import { transactionApi, investmentApi } from '../../services/api';
import { Transaction, InvestmentDashboard } from '../../types';
import { useMobile } from '../../hooks/useMobile';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, ChartDataLabels);

const COLORS = ['#c9a84c','#4caf82','#e05c6a','#6a8fe8','#a874d4','#e09c5c','#5cc4e0','#e0d45c','#a8e05c','#e07a5c'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TRANSFER_CATS = ['Transfer Out', 'Transfer In'];

type Period = 'THIS_MONTH' | 'LAST_MONTH' | '3M' | '6M' | '12M' | 'YTD';

const PERIODS: { key: Period; label: string; sectionLabel: string }[] = [
  { key: 'THIS_MONTH', label: 'This Month', sectionLabel: '1-MONTH' },
  { key: 'LAST_MONTH', label: 'Last Month', sectionLabel: '1-MONTH' },
  { key: '3M',         label: '3M',         sectionLabel: '3-MONTH' },
  { key: '6M',         label: '6M',         sectionLabel: '6-MONTH' },
  { key: '12M',        label: '12M',        sectionLabel: '12-MONTH' },
  { key: 'YTD',        label: 'YTD',        sectionLabel: 'YTD' },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

function getPeriodRange(p: Period): { start: Date; end: Date; months: number } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  switch (p) {
    case 'THIS_MONTH':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: today, months: 1 };
    case 'LAST_MONTH':
      return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 1), months: 1 };
    case '3M':
      return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: today, months: 3 };
    case '6M':
      return { start: new Date(now.getFullYear(), now.getMonth() - 5, 1), end: today, months: 6 };
    case '12M':
      return { start: new Date(now.getFullYear(), now.getMonth() - 11, 1), end: today, months: 12 };
    case 'YTD':
      return { start: new Date(now.getFullYear(), 0, 1), end: today, months: now.getMonth() + 1 };
  }
}

// ─── Mini sparkline bars ──────────────────────────────────────────────────────
const MiniSparkline: React.FC<{ points: number[]; color: string }> = ({ points, color }) => {
  const max = Math.max(...points, 1);
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 18 }}>
      {points.map((v, i) => (
        <div key={i} style={{ width: 5, borderRadius: 2, background: i === points.length - 1 ? color : `${color}60`, height: Math.max(2, (v / max) * 16) }} />
      ))}
    </div>
  );
};

// ─── Section label ────────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4, color: 'var(--text-muted)', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
      {title}
    </div>
    {children}
  </div>
);

// ─── Drill-down bar row ───────────────────────────────────────────────────────
interface BarRowProps { label: string; sublabel?: string; value: number; total: number; color: string; onClick?: () => void; }
const BarRow: React.FC<BarRowProps> = ({ label, sublabel, value, total, color, onClick }) => {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div onClick={onClick} style={{ marginBottom: 10, cursor: onClick ? 'pointer' : 'default', borderRadius: 8, padding: '6px 8px', transition: 'background 0.12s' }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-elevated)'; }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
          {sublabel && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{sublabel}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct.toFixed(1)}%</span>
          <span style={{ fontSize: 13, fontWeight: 700, color }}>{fmt(value)}</span>
          {onClick && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>›</span>}
        </div>
      </div>
      <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: 'width 0.5s cubic-bezier(0.34,1.56,0.64,1)' }} />
      </div>
    </div>
  );
};

type DrillDown = { type: 'category'; category: string; color: string } | { type: 'month'; monthKey: string };

// ─── Main page ────────────────────────────────────────────────────────────────
const AnalyticsPage: React.FC = () => {
  const isMobile = useMobile();
  const [period, setPeriod] = useState<Period>('THIS_MONTH');
  const [allTxns, setAllTxns] = useState<Transaction[]>([]);
  const [investDash, setInvestDash] = useState<InvestmentDashboard | null>(null);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);

  useEffect(() => {
    transactionApi.getAll().then(r => setAllTxns(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    investmentApi.getDashboard().then(r => setInvestDash(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { start, end, months } = useMemo(() => getPeriodRange(period), [period]);
  const sectionLabel = PERIODS.find(p => p.key === period)?.sectionLabel ?? '1-MONTH';

  // Transactions in period
  const periodTxns = useMemo(() =>
    allTxns.filter(t => { const d = new Date(t.date); return d >= start && d < end; }),
    [allTxns, start, end]);

  const periodExpenses = useMemo(() =>
    periodTxns.filter(t => t.type === 'EXPENSE' && !TRANSFER_CATS.includes(t.category)),
    [periodTxns]);

  const periodIncome = useMemo(() =>
    periodTxns.filter(t => t.type === 'INCOME'),
    [periodTxns]);

  // Available categories in period
  const availableCats = useMemo(() => {
    const s = new Set(periodExpenses.map(t => t.category));
    return Array.from(s).sort();
  }, [periodExpenses]);

  // Category-filtered expenses
  const expenses = useMemo(() =>
    selectedCats.length === 0 ? periodExpenses : periodExpenses.filter(t => selectedCats.includes(t.category)),
    [periodExpenses, selectedCats]);

  // ─── Summary values ───────────────────────────────────────────────────────
  const totalIncome    = useMemo(() => periodIncome.reduce((s, t) => s + t.amount, 0), [periodIncome]);
  const totalExpenses  = useMemo(() => expenses.reduce((s, t) => s + t.amount, 0), [expenses]);
  const monthlyAvgInc  = months > 0 ? totalIncome / months : totalIncome;
  const monthlyAvgExp  = months > 0 ? totalExpenses / months : totalExpenses;
  const totalInvested  = investDash?.totalInvested ?? 0;
  const monthlyRD      = useMemo(() =>
    investDash?.rdList.filter(r => r.status === 'ACTIVE').reduce((s, r) => s + (r.tenureMonths > 0 ? r.amount / r.tenureMonths : 0), 0) ?? 0,
    [investDash]);

  // Sparkline data (last 6 months)
  const incomeSparkline = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      let m = now.getMonth() - (5 - i), y = now.getFullYear();
      if (m < 0) { m += 12; y -= 1; }
      return allTxns.filter(t => t.type === 'INCOME' && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y)
        .reduce((s, t) => s + t.amount, 0);
    });
  }, [allTxns]);

  const expenseSparkline = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      let m = now.getMonth() - (5 - i), y = now.getFullYear();
      if (m < 0) { m += 12; y -= 1; }
      return allTxns.filter(t => t.type === 'EXPENSE' && !TRANSFER_CATS.includes(t.category) && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y)
        .reduce((s, t) => s + t.amount, 0);
    });
  }, [allTxns]);

  const investSparkline = useMemo(() => {
    if (!investDash) return [0, 0, 0, 0, 0, 0];
    const active = investDash.rdList.filter(r => r.status === 'ACTIVE').length;
    return Array.from({ length: 6 }, (_, i) => i < active ? totalInvested / 6 * (i + 1) : totalInvested);
  }, [investDash, totalInvested]);

  // Last expense date
  const lastExpenseDate = useMemo(() => {
    const exps = allTxns.filter(t => t.type === 'EXPENSE');
    if (!exps.length) return null;
    return new Date([...exps].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date);
  }, [allTxns]);

  // ─── Expenses by category ─────────────────────────────────────────────────
  const expByCat = useMemo(() => {
    const m: Record<string, number> = {};
    expenses.forEach(t => { m[t.category] = (m[t.category] || 0) + t.amount; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const catTotal = useMemo(() => expByCat.reduce((s, [, v]) => s + v, 0), [expByCat]);

  const donutData = useMemo(() => ({
    labels: expByCat.map(([c]) => c),
    datasets: [{ data: expByCat.map(([, v]) => v), backgroundColor: COLORS.concat(COLORS).slice(0, expByCat.length), borderWidth: 2, borderColor: 'var(--card-bg)' }]
  }), [expByCat]);

  const donutOptions = useMemo(() => ({
    responsive: true,
    cutout: '62%',
    onClick: (_: any, els: any[]) => {
      if (els.length) {
        const idx = els[0].index;
        const cat = expByCat[idx];
        if (cat) setDrillDown({ type: 'category', category: cat[0], color: COLORS[idx % COLORS.length] });
      }
    },
    onHover: (_: any, els: any[], chart: any) => { chart.canvas.style.cursor = els.length ? 'pointer' : 'default'; },
    plugins: {
      legend: { display: false },
      datalabels: { display: false },
      tooltip: { callbacks: { label: (ctx: any) => { const pct = catTotal > 0 ? ((ctx.parsed / catTotal) * 100).toFixed(1) : '0'; return ` ${ctx.label}: ${fmt(ctx.parsed)} (${pct}%)`; } } }
    }
  }), [catTotal, expByCat]);

  // ─── Monthly trend ────────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const points: { label: string; key: string; income: number; expense: number }[] = [];
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endCursor = new Date(end.getFullYear(), end.getMonth() + 1, 1);
    while (cursor < endCursor) {
      const m = cursor.getMonth(), y = cursor.getFullYear();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      const label = `${MONTHS[m]}${y !== new Date().getFullYear() ? ' ' + y : ''}`;
      const inc = periodTxns.filter(t => t.type === 'INCOME' && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y).reduce((s, t) => s + t.amount, 0);
      const exp = expenses.filter(t => new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y).reduce((s, t) => s + t.amount, 0);
      points.push({ label, key, income: inc, expense: exp });
      cursor = new Date(y, m + 1, 1);
    }
    return points;
  }, [start, end, periodTxns, expenses]);

  const trendChartData = useMemo(() => ({
    labels: trendData.map(p => p.label),
    datasets: [
      { label: 'Income',   data: trendData.map(p => p.income),  backgroundColor: 'rgba(76,175,130,0.75)', borderRadius: 4 },
      { label: 'Expenses', data: trendData.map(p => p.expense), backgroundColor: 'rgba(224,92,106,0.75)', borderRadius: 4 },
    ]
  }), [trendData]);

  const trendOptions = useMemo(() => ({
    responsive: true,
    onClick: (_: any, els: any[]) => {
      if (els.length) {
        const point = trendData[els[0].index];
        if (point) setDrillDown({ type: 'month', monthKey: point.key });
      }
    },
    onHover: (_: any, els: any[], chart: any) => { chart.canvas.style.cursor = els.length ? 'pointer' : 'default'; },
    plugins: {
      legend: { labels: { color: '#8c8a96', font: { family: 'DM Sans' } } },
      datalabels: { display: false }
    },
    scales: {
      x: { ticks: { color: '#8c8a96' }, grid: { display: false } },
      y: {
        ticks: {
          color: '#8c8a96',
          callback: (v: any) => {
            const n = Number(v);
            if (n >= 100000) return `${(n / 100000).toFixed(0)}L`;
            if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
            return n === 0 ? '0' : `${n}`;
          }
        },
        grid: { color: '#2a2a3a' }
      }
    }
  }), [trendData]);

  // ─── Recurring vs one-off ─────────────────────────────────────────────────
  const { recurringTotal, oneOffTotal } = useMemo(() => {
    const catMonths: Record<string, Set<string>> = {};
    expenses.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!catMonths[t.category]) catMonths[t.category] = new Set();
      catMonths[t.category].add(key);
    });
    const threshold = Math.max(2, Math.ceil(trendData.length / 2));
    const recurringCats = new Set(Object.entries(catMonths).filter(([, ms]) => ms.size >= threshold).map(([c]) => c));
    let rec = 0, oneOff = 0;
    expenses.forEach(t => { if (recurringCats.has(t.category)) rec += t.amount; else oneOff += t.amount; });
    return { recurringTotal: rec, oneOffTotal: oneOff };
  }, [expenses, trendData.length]);

  const recurringPct = totalExpenses > 0 ? (recurringTotal / totalExpenses) * 100 : 0;
  const oneOffPct    = totalExpenses > 0 ? (oneOffTotal   / totalExpenses) * 100 : 0;

  // ─── Biggest single expenses ──────────────────────────────────────────────
  const biggestExpenses = useMemo(() => [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5), [expenses]);

  // ─── Drill-down data ──────────────────────────────────────────────────────
  const allExpenses = useMemo(() => allTxns.filter(t => t.type === 'EXPENSE' && !TRANSFER_CATS.includes(t.category)), [allTxns]);

  const drillTxns = useMemo(() => {
    if (!drillDown) return [];
    if (drillDown.type === 'category') {
      return [...expenses.filter(t => t.category === drillDown.category)].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    const [y, m] = drillDown.monthKey.split('-').map(Number);
    return [...allExpenses.filter(t => { const d = new Date(t.date); return d.getFullYear() === y && d.getMonth() + 1 === m; })].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [drillDown, expenses, allExpenses]);

  const drillTotal = useMemo(() => drillTxns.reduce((s, t) => s + t.amount, 0), [drillTxns]);

  const drillByMonth = useMemo(() => {
    if (drillDown?.type !== 'category') return [] as [string, number, string][];
    const m: Record<string, { total: number; key: string }> = {};
    drillTxns.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      if (!m[key]) m[key] = { total: 0, key };
      m[key].total += t.amount;
      m[label] = m[key];
    });
    return Object.entries(
      drillTxns.reduce((acc, t) => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
        acc[key] = { total: (acc[key]?.total || 0) + t.amount, label };
        return acc;
      }, {} as Record<string, { total: number; label: string }>)
    ).sort((a, b) => b[0].localeCompare(a[0])).map(([key, { total, label }]) => [label, total, key] as [string, number, string]);
  }, [drillDown, drillTxns]);

  const drillByCat = useMemo(() => {
    if (drillDown?.type !== 'month') return [] as [string, number][];
    const cats: Record<string, number> = {};
    drillTxns.forEach(t => { cats[t.category] = (cats[t.category] || 0) + t.amount; });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [drillDown, drillTxns]);

  const drillByItem = useMemo(() => {
    const items: Record<string, { amount: number; category: string }> = {};
    drillTxns.forEach(t => {
      const k = t.itemName || '(General)';
      if (!items[k]) items[k] = { amount: 0, category: t.category };
      items[k].amount += t.amount;
    });
    return Object.entries(items).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.amount - a.amount);
  }, [drillTxns]);

  const drillAccent = drillDown?.type === 'category' ? drillDown.color : '#C0504D';
  const drillTitle  = !drillDown ? '' : drillDown.type === 'category'
    ? drillDown.category
    : (() => { const [y, m] = drillDown.monthKey.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; })();
  const isMonthDrill = drillDown?.type === 'month';

  const toggleCat = useCallback((cat: string) => {
    setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: 32 }}>

      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, padding: isMobile ? '10px 14px' : '10px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{ padding: '5px 11px', borderRadius: 6, border: 'none', background: period === p.key ? 'var(--text-primary)' : 'transparent', color: period === p.key ? 'var(--bg-main)' : 'var(--text-muted)', fontSize: 12, fontWeight: period === p.key ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
              {p.label}
            </button>
          ))}

          {/* Categories filter */}
          <div ref={catRef} style={{ position: 'relative', marginLeft: 6 }}>
            <button onClick={() => setCatOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: `1px solid ${catOpen || selectedCats.length > 0 ? 'var(--primary)' : 'var(--border)'}`, background: selectedCats.length > 0 ? 'var(--primary-dim)' : 'var(--bg-elevated)', color: selectedCats.length > 0 ? 'var(--primary)' : 'var(--text-muted)', fontSize: 12, fontWeight: selectedCats.length > 0 ? 600 : 400, cursor: 'pointer' }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M1 3h10M3 6h6M5 9h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Categories
              {selectedCats.length > 0 && (
                <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 99, padding: '1px 5px', fontSize: 10, fontWeight: 700, lineHeight: 1.4 }}>{selectedCats.length}</span>
              )}
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ transform: catOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            {catOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-float)', zIndex: 999, minWidth: 190, maxHeight: 260, overflowY: 'auto', padding: 6 }}>
                <div onClick={() => setSelectedCats([])} style={{ padding: '6px 10px', fontSize: 12, color: selectedCats.length === 0 ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', borderRadius: 6, fontWeight: selectedCats.length === 0 ? 600 : 400 }}>All categories</div>
                {availableCats.map(cat => {
                  const active = selectedCats.includes(cat);
                  return (
                    <div key={cat} onClick={() => toggleCat(cat)} style={{ padding: '6px 10px', fontSize: 12, cursor: 'pointer', borderRadius: 6, color: active ? 'var(--primary)' : 'var(--text-primary)', background: active ? 'var(--primary-dim)' : 'transparent', fontWeight: active ? 600 : 400, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {cat}
                      {active && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {lastExpenseDate && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Last expense {lastExpenseDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
          </span>
        )}
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 0, borderBottom: '1px solid var(--border-subtle)' }}>
        {[
          { label: 'Total Income',   value: totalIncome,   avg: monthlyAvgInc, sparkline: incomeSparkline,  color: '#4caf82', icon: <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M4 12l3-4 3 2 4-6" stroke="#4caf82" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, iconBg: 'rgba(76,175,130,0.12)' },
          { label: 'Total Expenses', value: totalExpenses, avg: monthlyAvgExp, sparkline: expenseSparkline, color: '#e05c6a', icon: <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M4 6l3 4 3-2 4 6" stroke="#e05c6a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, iconBg: 'rgba(224,92,106,0.12)' },
          { label: 'Total Invested', value: totalInvested, avg: monthlyRD,    sparkline: investSparkline,  color: '#6366f1', icon: <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="2" y="8" width="14" height="8" rx="2" stroke="#6366f1" strokeWidth="1.7"/><path d="M5 8V6a4 4 0 0 1 8 0v2" stroke="#6366f1" strokeWidth="1.7" strokeLinecap="round"/></svg>, iconBg: 'rgba(99,102,241,0.12)' },
        ].map((card, idx) => (
          <div key={card.label} style={{ padding: '16px 20px', borderRight: idx < 2 && !isMobile ? '1px solid var(--border-subtle)' : 'none', borderBottom: isMobile && idx < 2 ? '1px solid var(--border-subtle)' : 'none' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {card.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>{card.label}</div>
                <MiniSparkline points={card.sparkline} color={card.color} />
                <div style={{ fontSize: 18, fontWeight: 800, color: card.color, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{fmt(card.value)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{fmt(card.avg)}/mo</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Expenses by Category ── */}
      {expByCat.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--border-subtle)', padding: '14px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4, color: 'var(--text-muted)', marginBottom: 12 }}>
            Expenses by Category · {sectionLabel}
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* Donut */}
            <div style={{ position: 'relative', width: isMobile ? 90 : 110, flexShrink: 0 }}>
              <Doughnut data={donutData} options={donutOptions} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(catTotal)}</div>
              </div>
            </div>
            {/* Category rows */}
            <div style={{ flex: 1, alignSelf: 'center' }}>
              {expByCat.map(([cat, amt], i) => {
                const pct = catTotal > 0 ? (amt / catTotal) * 100 : 0;
                const color = COLORS[i % COLORS.length];
                return (
                  <div key={cat}
                    onClick={() => setDrillDown({ type: 'category', category: cat, color })}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', cursor: 'pointer', borderRadius: 4, transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-elevated)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: color, flexShrink: 0, display: 'block' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, minWidth: isMobile ? 80 : 120, flexShrink: 0 }}>{cat}</span>
                    <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', minWidth: 40 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s' }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 36, textAlign: 'right', flexShrink: 0 }}>{pct.toFixed(0)}%</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', minWidth: isMobile ? 64 : 76, textAlign: 'right', flexShrink: 0 }}>{fmt(amt)}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.3, flexShrink: 0 }}><circle cx="6" cy="2" r="1" fill="currentColor"/><circle cx="6" cy="6" r="1" fill="currentColor"/><circle cx="6" cy="10" r="1" fill="currentColor"/></svg>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Monthly Averages by Category ── */}
      {expByCat.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--border-subtle)', padding: '14px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4, color: 'var(--text-muted)', marginBottom: 10 }}>
            Monthly Averages by Category · {sectionLabel}
          </div>
          {expByCat.map(([cat, total], i) => {
            const avg = months > 0 ? total / months : total;
            return (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 4px' }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0, display: 'block' }} />
                <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, flex: 1 }}>{cat}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', marginRight: 8 }}>{fmt(avg)}/mo</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', minWidth: 76, textAlign: 'right' }}>{fmt(total)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Monthly Trend ── */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', padding: '14px 20px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4, color: 'var(--text-muted)', marginBottom: 12 }}>
          Monthly Trend · Income vs Expenses
        </div>
        {trendData.length > 0 ? (
          <Bar data={trendChartData} options={trendOptions} />
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '20px 0' }}>No data for this period.</div>
        )}
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>

        {/* Recurring vs One-off */}
        <div style={{ padding: '14px 20px', borderRight: !isMobile ? '1px solid var(--border-subtle)' : 'none', borderBottom: isMobile ? '1px solid var(--border-subtle)' : 'none' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4, color: 'var(--text-muted)', marginBottom: 12 }}>
            Recurring vs One-Off · {sectionLabel}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 7a5 5 0 0 0 8.66 2.5M12 7a5 5 0 0 0-8.66-2.5" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"/><path d="M10.5 9.5l.5 2.5 2-.5" stroke="#6366f1" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.5 4.5l-.5-2.5L1 2.5" stroke="#6366f1" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Recurring</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(recurringTotal)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{recurringPct.toFixed(0)}%</div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1.5l1.3 2.6 2.9.4-2.1 2.05.5 2.9L7 8.1 4.4 9.45l.5-2.9L2.8 4.5l2.9-.4L7 1.5z" stroke="#f59e0b" strokeWidth="1.2" strokeLinejoin="round" fill="rgba(245,158,11,0.15)"/></svg>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>One-off</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(oneOffTotal)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{oneOffPct.toFixed(0)}%</div>
            </div>
          </div>
        </div>

        {/* Biggest Single Expenses */}
        <div style={{ padding: '14px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4, color: 'var(--text-muted)', marginBottom: 10 }}>
            Biggest Single Expenses · {sectionLabel}
          </div>
          {biggestExpenses.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0' }}>No expenses in this period.</div>
          ) : (
            <div>
              {biggestExpenses.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < biggestExpenses.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, minWidth: 14, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.itemName || t.description || 'General'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '1px 6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {t.category}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.3, flexShrink: 0 }}><circle cx="3" cy="7" r="1.2" fill="currentColor"/><circle cx="7" cy="7" r="1.2" fill="currentColor"/><circle cx="11" cy="7" r="1.2" fill="currentColor"/></svg>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Drill-down panel ── */}
      {drillDown && (
        <>
          <div onClick={() => setDrillDown(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500, backdropFilter: 'blur(3px)', animation: 'fadeIn 0.15s' }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(560px, 100vw)', background: 'var(--bg-card)', borderLeft: `3px solid ${drillAccent}`, zIndex: 501, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 50px rgba(0,0,0,0.4)', animation: 'slideInRight 0.22s ease' }}>
            <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>
                    {isMonthDrill ? 'Month Drill-down' : 'Category Drill-down'}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>{drillTitle}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: drillAccent }}>{fmt(drillTotal)}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{drillTxns.length} transactions</span>
                  </div>
                </div>
                <button onClick={() => setDrillDown(null)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
              {drillTxns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>No transactions found.</div>
              ) : (
                <>
                  {drillDown.type === 'category' && drillByMonth.length > 0 && (
                    <Section title="By Month">
                      {drillByMonth.map(([label, val]) => (
                        <BarRow key={label} label={label} value={val} total={drillTotal} color={drillAccent} />
                      ))}
                    </Section>
                  )}
                  {isMonthDrill && drillByCat.length > 0 && (
                    <Section title="By Category — click to drill down">
                      {drillByCat.map(([cat, val], i) => {
                        const color = COLORS[i % COLORS.length];
                        return <BarRow key={cat} label={cat} value={val} total={drillTotal} color={color} onClick={() => setDrillDown({ type: 'category', category: cat, color })} />;
                      })}
                    </Section>
                  )}
                  {drillByItem.length > 0 && (
                    <Section title="By Item">
                      {drillByItem.map(({ name, amount, category }) => (
                        <BarRow key={name} label={name} sublabel={isMonthDrill ? category : undefined} value={amount} total={drillTotal} color="var(--primary)" />
                      ))}
                    </Section>
                  )}
                  <Section title={`All Transactions (${drillTxns.length})`}>
                    <div className="table-container">
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-elevated)' }}>
                            {(['Date', ...(isMonthDrill ? ['Category'] : []), 'Item', 'Src', 'Amount']).map(h => (
                              <th key={h} style={{ padding: '7px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, textAlign: h === 'Amount' ? 'right' : 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {drillTxns.map((t, idx) => (
                            <tr key={t.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                              <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                              {isMonthDrill && <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-primary)' }}>{t.category}</td>}
                              <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-primary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {t.itemName || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>General</span>}
                              </td>
                              <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                {t.paymentSource === 'CREDIT_CARD' ? 'CC' : t.paymentSource === 'CASH' ? 'Cash' : 'Bank'}
                              </td>
                              <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700, color: drillAccent, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(t.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid var(--border)' }}>
                            <td colSpan={isMonthDrill ? 4 : 3} style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Total</td>
                            <td style={{ padding: '8px 10px', fontSize: 14, fontWeight: 800, color: drillAccent, textAlign: 'right' }}>{fmt(drillTotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </Section>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;

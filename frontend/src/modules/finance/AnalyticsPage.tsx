import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale,
  LinearScale, BarElement, Title
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Doughnut, Bar } from 'react-chartjs-2';
import { transactionApi } from '../../services/api';
import FilterDropdown from '../../components/FilterDropdown';
import { PivotResponse, Transaction } from '../../types';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, ChartDataLabels);

const COLORS = ['#c9a84c','#4caf82','#e05c6a','#6a8fe8','#a874d4','#e09c5c','#5cc4e0','#e0d45c','#a8e05c','#e07a5c'];
const SALMON = '#C0504D';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TRANSFER_CATEGORIES = ['Transfer Out', 'Transfer In'];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { labels: { color: '#8c8a96', font: { family: 'DM Sans' } } },
    datalabels: { display: false }
  },
  scales: {
    x: { ticks: { color: '#8c8a96' }, grid: { color: '#2a2a3a' } },
    y: { ticks: { color: '#8c8a96' }, grid: { color: '#2a2a3a' } }
  }
};

type DrillDown =
  | { type: 'category'; category: string; color: string }
  | { type: 'month'; month: number };

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4, color: 'var(--text-muted)', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border-subtle)' }}>
      {title}
    </div>
    {children}
  </div>
);

// ─── Progress bar row with optional click-through ─────────────────────────────
interface BarRowProps {
  label: string;
  sublabel?: string;
  value: number;
  total: number;
  color: string;
  onClick?: () => void;
}
const BarRow: React.FC<BarRowProps> = ({ label, sublabel, value, total, color, onClick }) => {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div
      onClick={onClick}
      style={{ marginBottom: 10, cursor: onClick ? 'pointer' : 'default', borderRadius: 8, padding: '6px 8px', transition: 'background 0.12s' }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-elevated)'; }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
          {sublabel && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{sublabel}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct.toFixed(1)}%</span>
          <span style={{ fontSize: 13, fontWeight: 700, color }}>{fmt(value)}</span>
          {onClick && <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1 }}>›</span>}
        </div>
      </div>
      <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: 'width 0.5s cubic-bezier(0.34,1.56,0.64,1)' }} />
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const AnalyticsPage: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [monthlyIncome, setMonthlyIncome] = useState<Record<number, number>>({});
  const [monthlyExpenses, setMonthlyExpenses] = useState<Record<number, number>>({});
  const [topItems, setTopItems] = useState<Record<string, number>>({});
  const [pivot, setPivot] = useState<PivotResponse | null>(null);
  const [allTxns, setAllTxns] = useState<Transaction[]>([]);
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);

  useEffect(() => {
    transactionApi.getMonthly('INCOME', year).then(r => setMonthlyIncome(r.data));
    transactionApi.getMonthly('EXPENSE', year).then(r => setMonthlyExpenses(r.data));
    transactionApi.getTopItems(month, year).then(r => setTopItems(r.data));
  }, [month, year]);

  useEffect(() => {
    transactionApi.getPivot(year).then(r => setPivot(r.data)).catch(() => setPivot(null));
  }, [year]);

  useEffect(() => {
    transactionApi.getAll()
      .then(r => setAllTxns(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  // All expense transactions for the selected year, excluding transfers
  const yearExpenseTxns = useMemo(() =>
    allTxns.filter(t =>
      t.type === 'EXPENSE' &&
      new Date(t.date).getFullYear() === year &&
      !TRANSFER_CATEGORIES.includes(t.category)
    ),
    [allTxns, year]
  );

  // Exclude Transfer categories from both display and all calculations
  const filteredPivot = useMemo(() => {
    if (!pivot) return null;
    const categories = pivot.categories.filter(c => !TRANSFER_CATEGORIES.includes(c.name));
    const grandMonthlyTotals: Record<number, number> = {};
    categories.forEach(cat => {
      Object.entries(cat.monthlyTotals).forEach(([month, amt]) => {
        const m = Number(month);
        grandMonthlyTotals[m] = (grandMonthlyTotals[m] || 0) + (amt as number);
      });
    });
    const grandTotal = categories.reduce((s, c) => s + c.total, 0);
    return { ...pivot, categories, grandMonthlyTotals, grandTotal };
  }, [pivot]);

  // ─── Annual chart data ──────────────────────────────────────────────────────
  const annualCatLabels = useMemo(() => filteredPivot?.categories.map(c => c.name) ?? [], [filteredPivot]);
  const annualCatValues = useMemo(() => filteredPivot?.categories.map(c => c.total) ?? [], [filteredPivot]);
  const annualMonthVals = useMemo(() => MONTHS.map((_, i) => filteredPivot?.grandMonthlyTotals[i + 1] ?? 0), [filteredPivot]);
  const annualTotal = useMemo(() => filteredPivot?.grandTotal ?? 0, [filteredPivot]);

  const catColor = useCallback((idx: number) => (COLORS.concat(COLORS))[idx] ?? COLORS[0], []);

  const openCategoryDrill = useCallback((idx: number) => {
    const category = annualCatLabels[idx];
    if (category) setDrillDown({ type: 'category', category, color: catColor(idx) });
  }, [annualCatLabels, catColor]);

  const openMonthDrill = useCallback((idx: number) => {
    setDrillDown({ type: 'month', month: idx + 1 });
  }, []);

  const annualDonutData = useMemo(() => ({
    labels: annualCatLabels,
    datasets: [{
      data: annualCatValues,
      backgroundColor: COLORS.concat(COLORS).slice(0, annualCatLabels.length),
      borderWidth: 2,
      borderColor: 'var(--card-bg)',
    }]
  }), [annualCatLabels, annualCatValues]);

  const annualDonutOptions = useMemo(() => ({
    responsive: true,
    cutout: '52%',
    onClick: (_evt: any, elements: any[]) => {
      if (elements.length) openCategoryDrill(elements[0].index);
    },
    onHover: (_evt: any, elements: any[], chart: any) => {
      chart.canvas.style.cursor = elements.length ? 'pointer' : 'default';
    },
    plugins: {
      legend: { display: false },
      datalabels: {
        display: true,
        color: '#fff',
        font: { weight: 'bold' as const, size: 11 },
        formatter: (value: number) => {
          const pct = annualTotal > 0 ? ((value / annualTotal) * 100) : 0;
          return pct >= 4 ? `${pct.toFixed(1)}%` : '';
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const pct = annualTotal > 0 ? ((ctx.parsed / annualTotal) * 100).toFixed(1) : '0';
            return ` ${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')} (${pct}%) — click to drill down`;
          }
        }
      }
    }
  }), [annualTotal, openCategoryDrill]);

  const annualBarData = useMemo(() => ({
    labels: MONTHS,
    datasets: [{
      label: 'Expenses',
      data: annualMonthVals,
      backgroundColor: annualMonthVals.map((_, i) =>
        drillDown?.type === 'month' && drillDown.month === i + 1 ? '#e09c5c' : SALMON
      ),
      borderRadius: 3,
    }]
  }), [annualMonthVals, drillDown]);

  const annualBarOptions = useMemo(() => ({
    responsive: true,
    onClick: (_evt: any, elements: any[]) => {
      if (elements.length) openMonthDrill(elements[0].index);
    },
    onHover: (_evt: any, elements: any[], chart: any) => {
      chart.canvas.style.cursor = elements.length ? 'pointer' : 'default';
    },
    plugins: {
      legend: { display: false },
      datalabels: {
        display: true,
        anchor: 'end' as const,
        align: 'end' as const,
        color: '#8c8a96',
        font: { size: 10 },
        formatter: (value: number) => value > 0 ? `₹${Math.round(value / 1000)}k` : '',
      }
    },
    scales: {
      x: { ticks: { color: '#8c8a96' }, grid: { display: false } },
      y: { ticks: { color: '#8c8a96' }, grid: { color: '#2a2a3a' } }
    },
    layout: { padding: { top: 20 } }
  }), [openMonthDrill]);

  const barData = useMemo(() => ({
    labels: MONTHS,
    datasets: [
      {
        label: 'Income', data: MONTHS.map((_, i) => Number(monthlyIncome[i + 1] || 0)),
        backgroundColor: 'rgba(76, 175, 130, 0.7)', borderRadius: 4
      },
      {
        label: 'Expenses', data: MONTHS.map((_, i) => Number(monthlyExpenses[i + 1] || 0)),
        backgroundColor: 'rgba(224, 92, 106, 0.7)', borderRadius: 4
      }
    ]
  }), [monthlyIncome, monthlyExpenses]);

  // ─── Drill-down computed data ───────────────────────────────────────────────
  const drillTxns = useMemo(() => {
    if (!drillDown) return [];
    const filtered = drillDown.type === 'category'
      ? yearExpenseTxns.filter(t => t.category === drillDown.category)
      : yearExpenseTxns.filter(t => new Date(t.date).getMonth() + 1 === drillDown.month);
    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [drillDown, yearExpenseTxns]);

  const drillTotal = useMemo(() => drillTxns.reduce((s, t) => s + t.amount, 0), [drillTxns]);

  // Monthly totals for category drill-down
  const drillByMonth = useMemo(() => {
    if (drillDown?.type !== 'category') return [] as [string, number][];
    const m: Record<number, number> = {};
    drillTxns.forEach(t => {
      const mo = new Date(t.date).getMonth() + 1;
      m[mo] = (m[mo] || 0) + t.amount;
    });
    return MONTHS.map((name, i) => [name, m[i + 1] || 0] as [string, number]).filter(([, v]) => v > 0);
  }, [drillDown, drillTxns]);

  // Category totals for month drill-down
  const drillByCategory = useMemo(() => {
    if (drillDown?.type !== 'month') return [] as [string, number][];
    const cats: Record<string, number> = {};
    drillTxns.forEach(t => { cats[t.category] = (cats[t.category] || 0) + t.amount; });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [drillDown, drillTxns]);

  // Items (both drill types)
  const drillByItem = useMemo(() => {
    const items: Record<string, { amount: number; category: string }> = {};
    drillTxns.forEach(t => {
      const key = t.itemName || '(General)';
      if (!items[key]) items[key] = { amount: 0, category: t.category };
      items[key].amount += t.amount;
    });
    return Object.entries(items)
      .map(([name, v]) => ({ name, amount: v.amount, category: v.category }))
      .sort((a, b) => b.amount - a.amount);
  }, [drillTxns]);

  // Daily totals (both drill types)
  const drillByDate = useMemo(() => {
    const days: Record<string, number> = {};
    drillTxns.forEach(t => { days[t.date] = (days[t.date] || 0) + t.amount; });
    return Object.entries(days).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [drillTxns]);

  const drillAccent = drillDown?.type === 'category' ? drillDown.color : SALMON;
  const drillTitle = !drillDown ? '' : drillDown.type === 'category'
    ? `${drillDown.category} — ${year}`
    : `${MONTHS[drillDown.month - 1]} ${year}`;

  const isMonthDrill = drillDown?.type === 'month';
  const txnColCount = isMonthDrill ? 5 : 4; // Date, [Category], Item, Source, Amount

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Analytics</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <FilterDropdown
            value={month}
            options={MONTHS.map((m, i) => ({ label: m, value: i + 1 }))}
            onChange={v => setMonth(v as number)}
            minWidth={100}
          />
          <FilterDropdown
            value={year}
            options={[2023, 2024, 2025, 2026].map(y => ({ label: String(y), value: y }))}
            onChange={v => setYear(v as number)}
            minWidth={100}
          />
        </div>
      </div>

      {/* ── Expenses by Category + Expenses by Month ── */}
      {filteredPivot && filteredPivot.categories.length > 0 && (
        <div className="charts-grid">
          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 2 }}>Expenses by Category — {year}</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Click a slice or legend item to drill down</p>
            <Doughnut data={annualDonutData} options={annualDonutOptions} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 20, justifyContent: 'center' }}>
              {annualCatLabels.map((label, i) => {
                const pct = annualTotal > 0 ? ((annualCatValues[i] / annualTotal) * 100).toFixed(1) : '0';
                const color = catColor(i);
                const isActive = drillDown?.type === 'category' && drillDown.category === label;
                return (
                  <div
                    key={label}
                    onClick={() => openCategoryDrill(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontSize: 11, color: isActive ? color : '#8c8a96',
                      cursor: 'pointer', padding: '3px 7px', borderRadius: 6,
                      background: isActive ? `${color}22` : 'transparent',
                      fontWeight: isActive ? 700 : 400,
                      border: isActive ? `1px solid ${color}44` : '1px solid transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
                    {label}
                    <span style={{ color: isActive ? color : '#c0bccc', marginLeft: 2 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 2 }}>Expenses by Month — {year}</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Click a bar to drill down</p>
            <Bar data={annualBarData} options={annualBarOptions} />
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 20 }}>Income vs Expenses — {year}</h3>
        <Bar data={barData} options={chartOptions} />
      </div>

      {Object.keys(topItems).length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Top Items by Spend — {MONTHS[month-1]} {year}</h3>
          <Bar
            data={{
              labels: Object.keys(topItems),
              datasets: [{ label: 'Spent', data: Object.values(topItems).map(Number), backgroundColor: '#c9a84c' }]
            }}
            options={{ ...chartOptions, indexAxis: 'y' as const, plugins: { ...chartOptions.plugins, legend: { display: false } } }}
          />
        </div>
      )}

      {/* ─── Drill-down overlay + panel ──────────────────────────────────────── */}
      {drillDown && (
        <>
          <div
            onClick={() => setDrillDown(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500, backdropFilter: 'blur(3px)', animation: 'fadeIn 0.15s' }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 'min(560px, 100vw)',
            background: 'var(--bg-card)',
            borderLeft: `3px solid ${drillAccent}`,
            zIndex: 501,
            display: 'flex', flexDirection: 'column',
            boxShadow: '-10px 0 50px rgba(0,0,0,0.4)',
            animation: 'slideInRight 0.22s ease',
          }}>
            {/* ── Header ── */}
            <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>
                    {drillDown.type === 'category' ? '📊 Category Drill-down' : '📅 Month Drill-down'}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Fraunces', serif", lineHeight: 1.1 }}>
                    {drillTitle}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: drillAccent }}>{fmt(drillTotal)}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{drillTxns.length} transactions</span>
                  </div>
                </div>
                <button
                  onClick={() => setDrillDown(null)}
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                >×</button>
              </div>
            </div>

            {/* ── Scrollable body ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
              {drillTxns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>No transactions found.</div>
              ) : (
                <>
                  {/* Category drill-down → by month */}
                  {drillDown.type === 'category' && drillByMonth.length > 0 && (
                    <Section title="By Month — click to cross-drill">
                      {drillByMonth.map(([name, val]) => (
                        <BarRow
                          key={name}
                          label={name}
                          value={val}
                          total={drillTotal}
                          color={drillAccent}
                          onClick={() => setDrillDown({ type: 'month', month: MONTHS.indexOf(name) + 1 })}
                        />
                      ))}
                    </Section>
                  )}

                  {/* Month drill-down → by category */}
                  {drillDown.type === 'month' && drillByCategory.length > 0 && (
                    <Section title="By Category — click to cross-drill">
                      {drillByCategory.map(([cat, val], i) => {
                        const catIdx = annualCatLabels.indexOf(cat);
                        const color = catIdx >= 0 ? catColor(catIdx) : COLORS[i % COLORS.length];
                        return (
                          <BarRow
                            key={cat}
                            label={cat}
                            value={val}
                            total={drillTotal}
                            color={color}
                            onClick={() => setDrillDown({ type: 'category', category: cat, color })}
                          />
                        );
                      })}
                    </Section>
                  )}

                  {/* Items breakdown */}
                  {drillByItem.length > 0 && (
                    <Section title="By Item">
                      {drillByItem.map(({ name, amount, category }) => (
                        <BarRow
                          key={name}
                          label={name}
                          sublabel={drillDown.type === 'month' ? category : undefined}
                          value={amount}
                          total={drillTotal}
                          color="var(--primary)"
                        />
                      ))}
                    </Section>
                  )}

                  {/* Daily summary */}
                  {drillByDate.length > 1 && (
                    <Section title="By Date">
                      {drillByDate.map(([date, val]) => (
                        <BarRow
                          key={date}
                          label={new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                          value={val}
                          total={drillTotal}
                          color="var(--text-muted)"
                        />
                      ))}
                    </Section>
                  )}

                  {/* All transactions */}
                  <Section title={`All Transactions (${drillTxns.length})`}>
                    <div className="table-container">
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 340 }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-elevated)' }}>
                            {(['Date', ...(isMonthDrill ? ['Category'] : []), 'Item', 'Src', 'Amount'] as string[]).map(h => (
                              <th key={h} style={{ padding: '7px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, textAlign: h === 'Amount' ? 'right' : 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {drillTxns.map((t, idx) => (
                            <tr key={t.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                              <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </td>
                              {isMonthDrill && (
                                <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-primary)' }}>{t.category}</td>
                              )}
                              <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-primary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {t.itemName || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>General</span>}
                                {t.notes && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{t.notes}</div>}
                              </td>
                              <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                {t.paymentSource === 'CREDIT_CARD' ? 'CC' : t.paymentSource === 'CASH' ? 'Cash' : 'Bank'}
                              </td>
                              <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700, color: drillAccent, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                {fmt(t.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid var(--border)' }}>
                            <td colSpan={txnColCount - 1} style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Total</td>
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

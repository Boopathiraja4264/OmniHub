import React, { useEffect, useState, useMemo } from 'react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale,
  LinearScale, BarElement, LineElement, PointElement, Title
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { transactionApi } from '../../services/api';
import FilterDropdown from '../../components/FilterDropdown';
import { PivotResponse } from '../../types';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, ChartDataLabels);

const COLORS = ['#c9a84c','#4caf82','#e05c6a','#6a8fe8','#a874d4','#e09c5c','#5cc4e0','#e0d45c','#a8e05c','#e07a5c'];
const SALMON = '#C0504D';

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

const doughnutOptions = {
  responsive: true,
  plugins: {
    legend: { position: 'bottom' as const, labels: { color: '#8c8a96', padding: 16 } },
    datalabels: { display: false }
  }
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const AnalyticsPage: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [byCategory, setByCategory] = useState<Record<string, number>>({});
  const [monthlyIncome, setMonthlyIncome] = useState<Record<number, number>>({});
  const [monthlyExpenses, setMonthlyExpenses] = useState<Record<number, number>>({});
  const [topItems, setTopItems] = useState<Record<string, number>>({});
  const [pivot, setPivot] = useState<PivotResponse | null>(null);

  useEffect(() => {
    transactionApi.getByCategory(month, year).then(r => setByCategory(r.data));
    transactionApi.getMonthly('INCOME', year).then(r => setMonthlyIncome(r.data));
    transactionApi.getMonthly('EXPENSE', year).then(r => setMonthlyExpenses(r.data));
    transactionApi.getTopItems(month, year).then(r => setTopItems(r.data));
  }, [month, year]);

  useEffect(() => {
    transactionApi.getPivot(year).then(r => setPivot(r.data)).catch(() => setPivot(null));
  }, [year]);

  // Annual pivot charts
  const annualCatLabels  = useMemo(() => pivot?.categories.map(c => c.name) ?? [], [pivot]);
  const annualCatValues  = useMemo(() => pivot?.categories.map(c => c.total) ?? [], [pivot]);
  const annualMonthVals  = useMemo(() => MONTHS.map((_, i) => pivot?.grandMonthlyTotals[i + 1] ?? 0), [pivot]);

  const annualTotal = useMemo(() => annualCatValues.reduce((s, v) => s + v, 0), [annualCatValues]);

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
    cutout: '50%',
    plugins: {
      legend: { position: 'right' as const, labels: { color: '#8c8a96', padding: 12, font: { size: 11 } } },
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
            return ` ${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')} (${pct}%)`;
          }
        }
      }
    }
  }), [annualTotal]);

  const annualBarData = useMemo(() => ({
    labels: MONTHS,
    datasets: [{
      label: 'Expenses',
      data: annualMonthVals,
      backgroundColor: SALMON,
      borderRadius: 3,
    }]
  }), [annualMonthVals]);

  const annualBarOptions = useMemo(() => ({
    responsive: true,
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
  }), []);

  const categoryLabels = useMemo(() => Object.keys(byCategory), [byCategory]);
  const categoryValues = useMemo(() => Object.values(byCategory).map(Number), [byCategory]);

  const doughnutData = useMemo(() => ({
    labels: categoryLabels,
    datasets: [{ data: categoryValues, backgroundColor: COLORS, borderWidth: 0 }]
  }), [categoryLabels, categoryValues]);

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

  const lineData = useMemo(() => ({
    labels: MONTHS,
    datasets: [
      {
        label: 'Net Savings', fill: true,
        data: MONTHS.map((_, i) => Number(monthlyIncome[i + 1] || 0) - Number(monthlyExpenses[i + 1] || 0)),
        borderColor: '#c9a84c', backgroundColor: 'rgba(201, 168, 76, 0.1)', tension: 0.4
      }
    ]
  }), [monthlyIncome, monthlyExpenses]);

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

      <div className="charts-grid">
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 20 }}>Expenses by Category</h3>
          {categoryLabels.length > 0
            ? <Doughnut data={doughnutData} options={doughnutOptions} />
            : <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0' }}>No expense data</div>
          }
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 20 }}>Net Savings — {year}</h3>
          <Line data={lineData} options={chartOptions} />
        </div>
      </div>

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

      {/* ── Annual Summary Charts ── */}
      {pivot && pivot.categories.length > 0 && (
        <>
          <div style={{ margin: '32px 0 16px', borderTop: '1px solid var(--border)', paddingTop: 28 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Annual Summary — {year}
            </h3>
          </div>

          <div className="charts-grid">
            {/* Donut – Expenses by Category */}
            <div className="card">
              <h3 style={{ fontSize: 15, marginBottom: 20 }}>Expenses by Category</h3>
              <Doughnut data={annualDonutData} options={annualDonutOptions} />
            </div>

            {/* Column – Expenses by Month */}
            <div className="card">
              <h3 style={{ fontSize: 15, marginBottom: 20 }}>Expenses by Month</h3>
              <Bar data={annualBarData} options={annualBarOptions} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;

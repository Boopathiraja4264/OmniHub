import React, { useEffect, useState, useMemo } from 'react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale,
  LinearScale, BarElement, Title
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Doughnut, Bar } from 'react-chartjs-2';
import { transactionApi } from '../../services/api';
import FilterDropdown from '../../components/FilterDropdown';
import { PivotResponse } from '../../types';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, ChartDataLabels);

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


const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const AnalyticsPage: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [monthlyIncome, setMonthlyIncome] = useState<Record<number, number>>({});
  const [monthlyExpenses, setMonthlyExpenses] = useState<Record<number, number>>({});
  const [topItems, setTopItems] = useState<Record<string, number>>({});
  const [pivot, setPivot] = useState<PivotResponse | null>(null);

  useEffect(() => {
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
    cutout: '52%',
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

      {/* ── Expenses by Category + Expenses by Month – first ── */}
      {pivot && pivot.categories.length > 0 && (
        <div className="charts-grid">
          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 20 }}>Expenses by Category — {year}</h3>
            <Doughnut data={annualDonutData} options={annualDonutOptions} />
            {/* Custom flat legend below the tilted chart */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 20, justifyContent: 'center' }}>
              {annualCatLabels.map((label, i) => {
                const pct = annualTotal > 0 ? ((annualCatValues[i] / annualTotal) * 100).toFixed(1) : '0';
                const color = (COLORS.concat(COLORS))[i];
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#8c8a96' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
                    {label} <span style={{ color: '#c0bccc' }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 20 }}>Expenses by Month — {year}</h3>
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
    </div>
  );
};

export default AnalyticsPage;

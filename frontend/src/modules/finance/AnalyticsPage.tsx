import React, { useEffect, useState, useMemo } from 'react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale,
  LinearScale, BarElement, LineElement, PointElement, Title
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { transactionApi } from '../../services/api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title);

const COLORS = ['#c9a84c','#4caf82','#e05c6a','#6a8fe8','#a874d4','#e09c5c','#5cc4e0','#e0d45c','#a8e05c','#e07a5c'];

const chartOptions = {
  responsive: true,
  plugins: { legend: { labels: { color: '#8c8a96', font: { family: 'DM Sans' } } } },
  scales: {
    x: { ticks: { color: '#8c8a96' }, grid: { color: '#2a2a3a' } },
    y: { ticks: { color: '#8c8a96' }, grid: { color: '#2a2a3a' } }
  }
};

const doughnutOptions = {
  responsive: true,
  plugins: { legend: { position: 'bottom' as const, labels: { color: '#8c8a96', padding: 16 } } }
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const AnalyticsPage: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [byCategory, setByCategory] = useState<Record<string, number>>({});
  const [monthlyIncome, setMonthlyIncome] = useState<Record<number, number>>({});
  const [monthlyExpenses, setMonthlyExpenses] = useState<Record<number, number>>({});

  useEffect(() => {
    transactionApi.getByCategory(month, year).then(r => setByCategory(r.data));
    transactionApi.getMonthly('INCOME', year).then(r => setMonthlyIncome(r.data));
    transactionApi.getMonthly('EXPENSE', year).then(r => setMonthlyExpenses(r.data));
  }, [month, year]);

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
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: 'auto' }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 'auto' }}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
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
    </div>
  );
};

export default AnalyticsPage;

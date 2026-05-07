import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts';
import { debtApi } from '../../services/api';
import { DebtDashboard } from '../../types';
import { useMobile } from '../../hooks/useMobile';

const fmt = (n?: number) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (d?: string) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

const statusColor = (s: string) => {
  if (s === 'ACTIVE' || s === 'OUTSTANDING') return { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' };
  if (s === 'CLOSED' || s === 'REPAID') return { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' };
  if (s === 'FORECLOSED') return { bg: 'rgba(249,115,22,0.12)', color: '#f97316' };
  return { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' };
};

const CHART_COLORS = ['#ef4444', '#f59e0b', '#3b82f6'];

const DebtTrackerPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [data, setData] = useState<DebtDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [showYearlyTable, setShowYearlyTable] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await debtApi.getDashboard();
      setData(res.data);
    } catch { /* handled */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!data) return null;

  const progressPct = Math.round((data.debtFreeProgress || 0) * 100);
  const totalFutureInterest = (data.emiLoans || []).reduce((s, l) => s + (l.futureInterest || 0), 0);
  const trueCost = (data.totalOutstanding || 0) + totalFutureInterest;

  // Monthly interest estimate from active loans
  const monthlyEmiInterest = (data.emiLoans || [])
    .filter(l => l.status === 'ACTIVE')
    .reduce((sum, l) => sum + (l.outstandingPrincipal || 0) * (l.annualInterestRate / 12), 0);
  const monthlyAnnualInterest = (data.annualLoans || [])
    .filter(l => l.status === 'OUTSTANDING')
    .reduce((sum, l) => sum + (l.currentBalance || 0) * (l.annualInterestRate / 12), 0);
  const monthlyInterest = Math.round(monthlyEmiInterest + monthlyAnnualInterest);

  // Year-by-year interest history (derived from loan parameters)
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();
  const yrMap: Record<number, { emi: number; annual: number }> = {};

  // seed years from oldest loan to current year
  [...(data.emiLoans || []), ...(data.annualLoans || [])].forEach(l => {
    if (!l.startDate) return;
    const y = new Date(l.startDate).getFullYear();
    for (let yr = y; yr <= thisYear; yr++) {
      if (!yrMap[yr]) yrMap[yr] = { emi: 0, annual: 0 };
    }
  });
  if (!Object.keys(yrMap).length) { for (let y = thisYear - 1; y <= thisYear; y++) yrMap[y] = { emi: 0, annual: 0 }; }

  (data.emiLoans || []).forEach(loan => {
    if (!loan.startDate) return;
    const start = new Date(loan.startDate);
    const r = loan.annualInterestRate / 12;
    const n = loan.tenureMonths;
    const p = loan.initialPrincipal;
    const cutoff = loan.foreclosed && loan.foreclosureDate ? new Date(loan.foreclosureDate) : now;
    for (let k = 0; k < n; k++) {
      const d = new Date(start.getFullYear(), start.getMonth() + k);
      if (d > cutoff) break;
      const y = d.getFullYear();
      if (!yrMap[y]) continue;
      const outstanding = r > 0
        ? p * (Math.pow(1 + r, n) - Math.pow(1 + r, k)) / (Math.pow(1 + r, n) - 1)
        : p * (1 - k / n);
      yrMap[y].emi += outstanding * r;
    }
  });

  (data.annualLoans || []).forEach(loan => {
    if (!loan.startDate) return;
    const sy = new Date(loan.startDate).getFullYear();
    const ey = loan.endDate ? new Date(loan.endDate).getFullYear() : thisYear;
    const bal = loan.currentBalance || loan.initialPrincipal;
    for (let y = sy; y <= Math.min(ey, thisYear); y++) {
      if (yrMap[y]) yrMap[y].annual += bal * loan.annualInterestRate;
    }
  });

  const yearlyHistory = Object.keys(yrMap).map(Number).sort().map(y => ({
    year: String(y),
    'EMI': Math.round(yrMap[y].emi),
    'Annual Loans': Math.round(yrMap[y].annual),
  }));

  // Chart data
  const emiOutstanding = (data.emiLoans || []).filter(l => l.status === 'ACTIVE').reduce((s, l) => s + (l.outstandingPrincipal || 0), 0);
  const annualOutstanding = (data.annualLoans || []).filter(l => l.status === 'OUTSTANDING').reduce((s, l) => s + (l.currentBalance || 0), 0);
  const borrowedOutstanding = (data.borrowedLoans || []).filter(l => l.status === 'OUTSTANDING').reduce((s, l) => s + (l.outstandingBalance || 0), 0);

  const pieData = [
    { name: 'EMI Loans', value: Math.round(emiOutstanding) },
    { name: 'Annual Loans', value: Math.round(annualOutstanding) },
    { name: 'Borrowed', value: Math.round(borrowedOutstanding) },
  ].filter(d => d.value > 0);

  const barData = [
    ...(data.emiLoans || []).filter(l => l.status === 'ACTIVE').map(l => ({
      name: l.name.length > 14 ? l.name.slice(0, 13) + '…' : l.name,
      Outstanding: Math.round(l.outstandingPrincipal || 0),
      'Future Interest': Math.round(l.futureInterest || 0),
    })),
    ...(data.annualLoans || []).filter(l => l.status === 'OUTSTANDING').map(l => ({
      name: l.name.length > 14 ? l.name.slice(0, 13) + '…' : l.name,
      Outstanding: Math.round(l.currentBalance || 0),
      'Future Interest': Math.round(l.totalInterestAccrued || 0),
    })),
    ...(data.borrowedLoans || []).filter(l => l.status === 'OUTSTANDING').map(l => ({
      name: l.lenderName.length > 14 ? l.lenderName.slice(0, 13) + '…' : l.lenderName,
      Outstanding: Math.round(l.outstandingBalance || 0),
      'Future Interest': 0,
    })),
  ];

  const activeLoans = [
    ...(data.emiLoans || []).filter(l => l.status === 'ACTIVE').map(l => ({
      id: l.id, name: l.name, type: 'EMI', loanId: l.loanId, status: l.status,
      outstanding: l.outstandingPrincipal || 0, endDate: l.endDate, path: '/finance/debt/emi',
    })),
    ...(data.annualLoans || []).filter(l => l.status === 'OUTSTANDING').map(l => ({
      id: l.id, name: l.name, type: 'Annual', loanId: l.loanId, status: l.status,
      outstanding: l.currentBalance || 0, endDate: l.endDate, path: '/finance/debt/annual',
    })),
    ...(data.borrowedLoans || []).filter(l => l.status === 'OUTSTANDING').map(l => ({
      id: l.id, name: l.lenderName, type: 'Borrowed', loanId: l.loanId, status: l.status,
      outstanding: l.outstandingBalance || 0, endDate: undefined, path: '/finance/debt/borrowed',
    })),
  ];

  const cardS: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.15)',
  };
  const tblContainer: React.CSSProperties = {
    border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.12)',
  };

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 28px', maxWidth: 1200, background: 'radial-gradient(ellipse 65% 40% at 10% 0%, rgba(239,68,68,0.06) 0%, transparent 60%)', minHeight: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>Debt Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Overview of all EMIs, gold loans, and borrowed money</p>
      </div>

      {/* Summary Strip — unified panel */}
      <div style={{ display: 'flex', flexWrap: isMobile ? 'wrap' : 'nowrap', marginBottom: 24, borderRadius: 14, overflow: 'hidden', ...cardS }}>
        {/* Progress ring */}
        <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, borderRight: isMobile ? 'none' : '1px solid var(--border-subtle)', borderBottom: isMobile ? '1px solid var(--border-subtle)' : 'none', minWidth: isMobile ? '100%' : 110 }}>
          <svg width="56" height="56" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="var(--border)" strokeWidth="6"/>
            <circle cx="32" cy="32" r="26" fill="none" stroke="#22c55e" strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - progressPct / 100)}`}
              strokeLinecap="round" transform="rotate(-90 32 32)"/>
            <text x="32" y="37" textAnchor="middle" fontSize="13" fontWeight="700" fill="#22c55e">{progressPct}%</text>
          </svg>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase' }}>Debt-Free</div>
        </div>
        {[
          { label: 'OUTSTANDING', value: fmt(data.totalOutstanding), color: '#ef4444' },
          { label: 'MONTHLY EMI', value: fmt(data.monthlyEmiOutflow), color: '#f59e0b' },
          { label: 'TRUE COST', value: fmt(trueCost), sub: 'outstanding + future interest', color: '#a855f7' },
          { label: 'MONTHLY INTEREST', value: fmt(monthlyInterest), color: '#f97316' },
          { label: 'TOTAL INITIAL', value: fmt(data.totalInitialPrincipal), color: 'var(--text-secondary)' },
        ].map((c, i) => (
          <div key={c.label} style={{ flex: isMobile ? '1 1 40%' : 1, padding: '12px 14px', borderLeft: (!isMobile && i > 0) ? '1px solid var(--border-subtle)' : 'none', borderTop: (isMobile && i > 0) ? '1px solid var(--border-subtle)' : 'none' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 5 }}>{c.label}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: c.color, fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
            {c.sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      {pieData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: 14, marginBottom: 24 }}>
          <div style={{ ...cardS, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.1px' }}>Outstanding by Type</div>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ ...cardS, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Outstanding per Active Loan</div>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={barData} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Bar dataKey="Outstanding" fill="#ef4444" radius={[4,4,0,0]} />
                <Bar dataKey="Future Interest" fill="#a855f7" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Active Loans Table */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px', letterSpacing: '-0.1px' }}>Active / Outstanding Loans</h2>
        {activeLoans.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>No active loans.</div>
        ) : (
          <div style={{ ...tblContainer, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, background: 'var(--bg-card)', minWidth: 500 }}>
              <thead>
                <tr style={{ background: 'var(--bg-row-alt)' }}>
                  {['Loan ID', 'Name', 'Type', 'Outstanding', 'End Date', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Outstanding' ? 'right' : 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeLoans.map((l, i) => {
                  const sc = statusColor(l.status);
                  return (
                    <tr key={l.id} onClick={() => navigate(`${l.path}/${l.id}`)}
                      style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>{l.loanId}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>{l.name}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{l.type}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>{fmt(l.outstanding)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{fmtDate(l.endDate)}</td>
                      <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: sc.bg, color: sc.color, border: `1px solid ${sc.color}22`, letterSpacing: '0.04em' }}>{l.status}</span></td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-empty)', fontSize: 14 }}>›</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'EMI Based Loans', sub: `${data.emiLoans.length} loans`, path: '/finance/debt/emi', color: '#ef4444' },
          { label: 'Annual Interest Loans', sub: `${data.annualLoans.length} loans`, path: '/finance/debt/annual', color: '#f59e0b' },
          { label: 'Borrowed', sub: `${data.borrowedLoans.length} entries`, path: '/finance/debt/borrowed', color: '#3b82f6' },
        ].map(c => (
          <div key={c.label} onClick={() => navigate(c.path)}
            style={{ ...cardS, padding: '14px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${c.color}66`; e.currentTarget.style.boxShadow = `0 0 0 1px ${c.color}22, 0 8px 28px rgba(0,0,0,0.2)`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{c.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{c.sub}</div>
            </div>
            <span style={{ fontSize: 18, color: c.color, opacity: 0.7 }}>›</span>
          </div>
        ))}
      </div>

      {/* Interest Paid by Year — on demand */}
      {yearlyHistory.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <button onClick={() => setShowYearlyTable(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: showYearlyTable ? 12 : 0, transition: 'background 0.15s' }}>
            <span style={{ fontSize: 10 }}>{showYearlyTable ? '▼' : '▶'}</span>
            Interest Paid by Year
          </button>
          {showYearlyTable && (
            <div style={{ ...tblContainer, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, background: 'var(--bg-card)', minWidth: 380 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-row-alt)' }}>
                    {['Year', 'EMI Interest', 'Annual Loan Interest', 'Total'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Year' ? 'left' : 'right', color: 'var(--text-muted)', fontWeight: 700, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {yearlyHistory.map((row, i) => {
                    const total = row['EMI'] + row['Annual Loans'];
                    return (
                      <tr key={row.year} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-row-alt)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '9px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{row.year}</td>
                        <td style={{ padding: '9px 16px', textAlign: 'right', color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>{row['EMI'] > 0 ? fmt(row['EMI']) : '—'}</td>
                        <td style={{ padding: '9px 16px', textAlign: 'right', color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>{row['Annual Loans'] > 0 ? fmt(row['Annual Loans']) : '—'}</td>
                        <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-row-alt)', borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '9px 16px', fontWeight: 700, color: 'var(--text-primary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</td>
                    <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 700, color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>{fmt(yearlyHistory.reduce((s, r) => s + r['EMI'], 0))}</td>
                    <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 700, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>{fmt(yearlyHistory.reduce((s, r) => s + r['Annual Loans'], 0))}</td>
                    <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(yearlyHistory.reduce((s, r) => s + r['EMI'] + r['Annual Loans'], 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DebtTrackerPage;

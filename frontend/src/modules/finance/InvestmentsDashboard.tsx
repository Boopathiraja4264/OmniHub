import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { investmentApi, bankAccountApi, chitApi } from '../../services/api';
import { InvestmentDashboard, RdFdInvestment, BankAccount, ChitGroup } from '../../types';
import { useMobile } from '../../hooks/useMobile';

const fmt = (n?: number) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—';

const now = new Date();

function monthsLeft(maturityDate: string) {
  const mat = new Date(maturityDate);
  const diff = (mat.getFullYear() - now.getFullYear()) * 12 + (mat.getMonth() - now.getMonth());
  return Math.max(0, diff);
}

function rdProgress(inv: RdFdInvestment) {
  return inv.tenureMonths > 0 ? Math.round((inv.monthsPaid / inv.tenureMonths) * 100) : 0;
}

const EfBadge = () => (
  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--warning)', marginTop: 4, display: 'inline-block',
    padding: '1px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>EF</span>
);

const InvestmentsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [dash, setDash] = useState<InvestmentDashboard | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [chits, setChits] = useState<ChitGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      investmentApi.getDashboard().catch(() => ({ data: null })),
      bankAccountApi.getAll().catch(() => ({ data: [] })),
      chitApi.getAll().catch(() => ({ data: [] })),
    ]).then(([inv, accs, c]) => {
      setDash(inv.data);
      setAccounts(Array.isArray(accs.data) ? accs.data : []);
      setChits(Array.isArray(c.data) ? c.data : []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;

  const fdList = dash?.fdList || [];
  const rdList = dash?.rdList || [];
  const activeFds = fdList.filter(f => f.status === 'ACTIVE');
  const activeRds = rdList.filter(r => r.status === 'ACTIVE');
  const totalInvested = dash?.totalInvested || 0;
  const totalMaturity = dash?.totalMaturityValue || 0;
  const totalInterest = dash?.totalInterestEarned || 0;
  const efTotal = dash?.emergencyFundTotal || 0;
  const rdMonthly = activeRds.reduce((s, r) => s + r.amount, 0);

  const efAccounts = accounts.filter(a => a.emergencyFund);
  const efAccountsTotal = efAccounts.reduce((s, a) => s + (a.currentBalance || 0), 0);
  const totalEf = efTotal + efAccountsTotal;

  const activeChits = chits.filter(c => c.status === 'ACTIVE');
  const chitMonthly = activeChits.reduce((s, c) => s + (c.monthlyAmount || 0), 0);

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 28px', maxWidth: 1200 }}>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 22 }}>
        <div>
          <h2 className="page-title">Investments</h2>
          <p className="page-subtitle">FD · RD · Chit · Emergency Fund</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/finance/investments')} className="btn btn-primary" style={{ fontSize: 12 }}>
            + Add FD / RD
          </button>
          <button onClick={() => navigate('/finance/chit')} className="btn btn-secondary" style={{ fontSize: 12 }}>
            Chit
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="stats-grid" style={{ marginBottom: 22 }}>
        <div className="stat-card">
          <div className="stat-label">Total Invested</div>
          <div className="stat-value" style={{ fontSize: 26, color: 'var(--primary)' }}>{fmt(totalInvested)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{activeFds.length} FD · {activeRds.length} RD active</div>
        </div>
        <div className="stat-card income">
          <div className="stat-label">Maturity Value</div>
          <div className="stat-value income" style={{ fontSize: 26 }}>{fmt(totalMaturity)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>gain {fmt(totalInterest)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Monthly RD</div>
          <div className="stat-value" style={{ fontSize: 26, color: 'var(--sky-blue)' }}>{fmt(rdMonthly)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>committed every month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Emergency Fund</div>
          <div className="stat-value" style={{ fontSize: 26, color: 'var(--warning)' }}>{fmt(totalEf)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>FD/RD + accounts</div>
        </div>
      </div>

      {/* FD + RD row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* FD section */}
        <div className="page-card" style={{ padding: '18px 20px' }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <div>
              <div className="section-title">Fixed Deposits</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{activeFds.length} active</div>
            </div>
            <button onClick={() => navigate('/finance/investments')} className="section-link">View all →</button>
          </div>
          {activeFds.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No active FDs.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeFds.slice(0, 4).map(fd => {
                const ml = monthsLeft(fd.maturityDate);
                return (
                  <div key={fd.id} onClick={() => navigate('/finance/investments')}
                    style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{fd.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(fd.amount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                      <span>{fd.annualInterestRate}% · {fd.bankName || '—'}</span>
                      <span style={{ color: ml <= 3 ? 'var(--warning)' : 'var(--text-muted)' }}>
                        {ml === 0 ? 'Matures this month' : `${ml}mo left`}
                      </span>
                    </div>
                    {fd.emergencyFund && <EfBadge />}
                  </div>
                );
              })}
              {activeFds.length > 4 && (
                <button onClick={() => navigate('/finance/investments')} className="section-link" style={{ textAlign: 'left', padding: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                  +{activeFds.length - 4} more →
                </button>
              )}
            </div>
          )}
        </div>

        {/* RD section */}
        <div className="page-card" style={{ padding: '18px 20px' }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <div>
              <div className="section-title">Recurring Deposits</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{activeRds.length} active · {fmt(rdMonthly)}/mo</div>
            </div>
            <button onClick={() => navigate('/finance/investments')} className="section-link">View all →</button>
          </div>
          {activeRds.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No active RDs.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeRds.slice(0, 4).map(rd => {
                const pct = rdProgress(rd);
                return (
                  <div key={rd.id} onClick={() => navigate('/finance/investments')}
                    style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--sky-blue)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{rd.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--sky-blue)', fontVariantNumeric: 'tabular-nums' }}>{fmt(rd.amount)}/mo</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
                      <span>{rd.annualInterestRate}% · {rd.monthsPaid}/{rd.tenureMonths} months</span>
                      <span>{pct}%</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--border)', borderRadius: 99 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--sky-blue)', borderRadius: 99 }} />
                    </div>
                    {rd.emergencyFund && <EfBadge />}
                  </div>
                );
              })}
              {activeRds.length > 4 && (
                <button onClick={() => navigate('/finance/investments')} className="section-link" style={{ textAlign: 'left', padding: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                  +{activeRds.length - 4} more →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chit + Emergency Fund row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>

        {/* Chit */}
        <div className="page-card" style={{ padding: '18px 20px' }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <div>
              <div className="section-title">Chit Funds</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{activeChits.length} active · {fmt(chitMonthly)}/mo</div>
            </div>
            <button onClick={() => navigate('/finance/chit')} className="section-link" style={{ color: 'var(--purple)' }}>View all →</button>
          </div>
          {activeChits.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No active chit groups.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeChits.slice(0, 4).map(c => (
                <div key={c.id} onClick={() => navigate(`/finance/chit/${c.id}`)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--purple)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{fmt(c.monthlyAmount)}/mo</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple)', fontVariantNumeric: 'tabular-nums' }}>{fmt(c.totalPaid)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>paid in</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emergency Fund */}
        <div className="page-card" style={{ padding: '18px 20px' }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <div>
              <div className="section-title">Emergency Fund</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{fmt(totalEf)} total</div>
            </div>
            <button onClick={() => navigate('/finance/emergency-fund')} className="section-link" style={{ color: 'var(--warning)' }}>View →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'FD (emergency)', value: fdList.filter(f => f.emergencyFund && f.status === 'ACTIVE').reduce((s, f) => s + f.efPrincipal, 0), color: 'var(--primary)', count: fdList.filter(f => f.emergencyFund && f.status === 'ACTIVE').length },
              { label: 'RD (emergency)', value: rdList.filter(r => r.emergencyFund && r.status === 'ACTIVE').reduce((s, r) => s + r.efPrincipal, 0), color: 'var(--sky-blue)', count: rdList.filter(r => r.emergencyFund && r.status === 'ACTIVE').length },
              { label: 'EF Accounts', value: efAccountsTotal, color: 'var(--income)', count: efAccounts.length },
            ].map(row => (
              <div key={row.label} className="data-row">
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.label} {row.count > 0 && <span style={{ color: row.color, fontWeight: 600 }}>({row.count})</span>}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: row.color, fontVariantNumeric: 'tabular-nums' }}>{fmt(row.value)}</div>
              </div>
            ))}
            <div style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning)' }}>Total EF</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>{fmt(totalEf)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentsDashboard;

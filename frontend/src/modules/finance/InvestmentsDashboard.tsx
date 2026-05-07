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

const StatCard: React.FC<{ label: string; value: string; sub?: string; color: string }> = ({ label, value, sub, color }) => (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
  </div>
);

const SectionHeader: React.FC<{ title: string; sub?: string; onNav: () => void; color: string }> = ({ title, sub, onNav, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
    <button onClick={onNav} style={{ fontSize: 11, fontWeight: 600, color, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      View all →
    </button>
  </div>
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
    <div style={{ padding: isMobile ? '16px' : '24px 28px', maxWidth: 1200, minHeight: '100%',
      background: 'radial-gradient(ellipse 60% 35% at 5% 0%, rgba(59,130,246,0.05) 0%, transparent 55%)' }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.4px' }}>Investments</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, marginBottom: 0 }}>FD · RD · Chit · Emergency Fund</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/finance/investments')} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.07)', color: '#3b82f6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            + Add FD / RD
          </button>
          <button onClick={() => navigate('/finance/chit')} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Chit
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
        <StatCard label="Total Invested" value={fmt(totalInvested)} color="#3b82f6" sub={`${activeFds.length} FD · ${activeRds.length} RD active`} />
        <StatCard label="Maturity Value" value={fmt(totalMaturity)} color="#22c55e" sub={`gain ${fmt(totalInterest)}`} />
        <StatCard label="Monthly RD" value={fmt(rdMonthly)} color="#f59e0b" sub="committed every month" />
        <StatCard label="Emergency Fund" value={fmt(totalEf)} color="#f59e0b" sub="FD/RD + accounts" />
      </div>

      {/* FD + RD row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* FD section */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <SectionHeader title="Fixed Deposits" sub={`${activeFds.length} active`} onNav={() => navigate('/finance/investments')} color="#3b82f6" />
          {activeFds.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No active FDs.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeFds.slice(0, 4).map(fd => {
                const ml = monthsLeft(fd.maturityDate);
                return (
                  <div key={fd.id} onClick={() => navigate('/finance/investments')}
                    style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{fd.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>{fmt(fd.amount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                      <span>{fd.annualInterestRate}% · {fd.bankName || '—'}</span>
                      <span style={{ color: ml <= 3 ? '#f59e0b' : 'var(--text-muted)' }}>
                        {ml === 0 ? 'Matures this month' : `${ml}mo left`}
                      </span>
                    </div>
                    {fd.emergencyFund && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#f59e0b', marginTop: 4, display: 'inline-block',
                        padding: '1px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>EF</span>
                    )}
                  </div>
                );
              })}
              {activeFds.length > 4 && (
                <button onClick={() => navigate('/finance/investments')} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                  +{activeFds.length - 4} more →
                </button>
              )}
            </div>
          )}
        </div>

        {/* RD section */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <SectionHeader title="Recurring Deposits" sub={`${activeRds.length} active · ${fmt(rdMonthly)}/mo`} onNav={() => navigate('/finance/investments')} color="#0ea5e9" />
          {activeRds.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No active RDs.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeRds.slice(0, 4).map(rd => {
                const pct = rdProgress(rd);
                return (
                  <div key={rd.id} onClick={() => navigate('/finance/investments')}
                    style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#0ea5e9')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{rd.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0ea5e9', fontVariantNumeric: 'tabular-nums' }}>{fmt(rd.amount)}/mo</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
                      <span>{rd.annualInterestRate}% · {rd.monthsPaid}/{rd.tenureMonths} months</span>
                      <span>{pct}%</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--border)', borderRadius: 99 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#0ea5e9', borderRadius: 99 }} />
                    </div>
                    {rd.emergencyFund && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#f59e0b', marginTop: 4, display: 'inline-block',
                        padding: '1px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>EF</span>
                    )}
                  </div>
                );
              })}
              {activeRds.length > 4 && (
                <button onClick={() => navigate('/finance/investments')} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
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
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <SectionHeader title="Chit Funds" sub={`${activeChits.length} active · ${fmt(chitMonthly)}/mo`} onNav={() => navigate('/finance/chit')} color="#a855f7" />
          {activeChits.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No active chit groups.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeChits.slice(0, 4).map(c => (
                <div key={c.id} onClick={() => navigate(`/finance/chit/${c.id}`)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-elevated)', cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#a855f7')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{fmt(c.monthlyAmount)}/mo</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#a855f7', fontVariantNumeric: 'tabular-nums' }}>{fmt(c.totalPaid)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>paid in</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emergency Fund */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <SectionHeader title="Emergency Fund" sub={`${fmt(totalEf)} total`} onNav={() => navigate('/finance/emergency-fund')} color="#f59e0b" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'FD (emergency)', value: fdList.filter(f => f.emergencyFund && f.status === 'ACTIVE').reduce((s, f) => s + f.efPrincipal, 0), color: '#3b82f6', count: fdList.filter(f => f.emergencyFund && f.status === 'ACTIVE').length },
              { label: 'RD (emergency)', value: rdList.filter(r => r.emergencyFund && r.status === 'ACTIVE').reduce((s, r) => s + r.efPrincipal, 0), color: '#0ea5e9', count: rdList.filter(r => r.emergencyFund && r.status === 'ACTIVE').length },
              { label: 'EF Accounts', value: efAccountsTotal, color: '#22c55e', count: efAccounts.length },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-elevated)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.label} {row.count > 0 && <span style={{ color: row.color, fontWeight: 600 }}>({row.count})</span>}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: row.color, fontVariantNumeric: 'tabular-nums' }}>{fmt(row.value)}</div>
              </div>
            ))}
            <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>Total EF</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>{fmt(totalEf)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentsDashboard;

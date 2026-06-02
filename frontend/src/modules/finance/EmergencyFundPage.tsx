import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { investmentApi, bankAccountApi } from '../../services/api';
import { InvestmentDashboard, BankAccount } from '../../types';

const fmt = (n?: number) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—';
const fmtPct = (n?: number) => n != null ? `${n.toFixed(2)}%` : '—';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (d?: string) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

const statusColors: Record<string, string> = {
  ACTIVE: 'var(--income)', MATURED: 'var(--warning)', CLOSED: '#94a3b8',
  OUTSTANDING: 'var(--expense)', REPAID: 'var(--income)', SAVINGS: 'var(--income)', CURRENT: '#0ea5e9', SALARY: 'var(--warning)',
};

const StatusBadge: React.FC<{ s: string }> = ({ s }) => (
  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
    background: `${statusColors[s] ?? '#94a3b8'}22`,
    color: statusColors[s] ?? '#94a3b8',
    border: `1px solid ${statusColors[s] ?? '#94a3b8'}44`,
    letterSpacing: '0.05em' }}>{s}</span>
);

const Card: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({ children, onClick }) => (
  <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(245,158,11,0.18)',
    background: 'var(--bg-card)', boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
    transition: 'all 0.15s', cursor: onClick ? 'pointer' : 'default' }}
    onClick={onClick}
    onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(245,158,11,0.45)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(245,158,11,0.12)'; } }}
    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(245,158,11,0.18)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.18)'; }}>
    {children}
  </div>
);

const SectionLabel: React.FC<{ label: string; count: number; total: number }> = ({ label, count, total }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
    <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{label}</h2>
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: 'var(--warning)' }}>{count}</span>
    <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</span>
  </div>
);

// ─── FD EF Card ───────────────────────────────────────────────────────────────
const FdEfCard: React.FC<{ inv: any; onClick: () => void }> = ({ inv, onClick }) => {
  const elapsed = Math.max(0, Math.round((Date.now() - new Date(inv.startDate).getTime()) / (1000*60*60*24*30.44)));
  const progress = inv.tenureMonths > 0 ? Math.min(100, (elapsed / inv.tenureMonths) * 100) : 0;
  return (
    <Card onClick={onClick}>
      <div style={{ height: 3, background: 'var(--warning)' }} />
      <div style={{ padding: '11px 13px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{inv.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{inv.bankName || '—'}</div>
          </div>
          <StatusBadge s={inv.status} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EF Principal</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>{fmt(inv.efPrincipal)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>At Maturity</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--income)', fontVariantNumeric: 'tabular-nums' }}>{fmt(inv.maturityAmount)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 5 }}>
          <span>{fmtPct(inv.annualInterestRate)} p.a. · {inv.tenureMonths}mo</span>
          <span>Matures {fmtDate(inv.maturityDate)}</span>
        </div>
        <div style={{ height: 3, background: 'var(--border-subtle)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--warning)', borderRadius: 99 }} />
        </div>
      </div>
    </Card>
  );
};

// ─── RD EF Card ───────────────────────────────────────────────────────────────
const RdEfCard: React.FC<{ inv: any; onClick: () => void }> = ({ inv, onClick }) => {
  const progress = inv.tenureMonths > 0 ? Math.min(100, (inv.monthsPaid / inv.tenureMonths) * 100) : 0;
  return (
    <Card onClick={onClick}>
      <div style={{ height: 3, background: 'var(--warning)' }} />
      <div style={{ padding: '11px 13px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{inv.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{inv.bankName || '—'}</div>
          </div>
          <StatusBadge s={inv.status} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EF Invested</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>{fmt(inv.efPrincipal)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>At Maturity</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--income)', fontVariantNumeric: 'tabular-nums' }}>{fmt(inv.maturityAmount)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 5 }}>
          <span>{fmt(inv.amount)}/mo · {fmtPct(inv.annualInterestRate)} p.a.</span>
          <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{inv.monthsPaid}/{inv.tenureMonths} paid</span>
        </div>
        <div style={{ height: 3, background: 'var(--border-subtle)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--warning)', borderRadius: 99 }} />
        </div>
      </div>
    </Card>
  );
};

// ─── Account EF Card ──────────────────────────────────────────────────────────
const AccountEfCard: React.FC<{ acc: BankAccount; onClick: () => void }> = ({ acc, onClick }) => (
  <Card onClick={onClick}>
    <div style={{ height: 3, background: 'var(--warning)' }} />
    <div style={{ padding: '11px 13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{acc.name}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{acc.bankName || '—'}</div>
        </div>
        <StatusBadge s={acc.accountType} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Current Balance (EF)</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>{fmt(acc.currentBalance)}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Inflow</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--income)', fontVariantNumeric: 'tabular-nums' }}>+{fmt(acc.totalInflow)}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Outflow</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--expense)', fontVariantNumeric: 'tabular-nums' }}>-{fmt(acc.totalOutflow)}</div>
        </div>
      </div>
    </div>
  </Card>
);

// ─── Empty section placeholder ────────────────────────────────────────────────
const EmptySection: React.FC<{ label: string; hint: string }> = ({ label, hint }) => (
  <div style={{ padding: '18px', textAlign: 'center', borderRadius: 10,
    border: '1px dashed rgba(245,158,11,0.2)', color: 'var(--text-muted)', fontSize: 12 }}>
    No {label} marked as EF · {hint}
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
const EmergencyFundPage: React.FC = () => {
  const navigate = useNavigate();
  const [dash, setDash] = useState<InvestmentDashboard | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, accRes] = await Promise.all([
        investmentApi.getDashboard(),
        bankAccountApi.getAll(),
      ]);
      setDash(dashRes.data);
      setAccounts(Array.isArray(accRes.data) ? accRes.data : []);
    } catch { /* handled */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;

  const efFds    = (dash?.fdList ?? []).filter(i => i.emergencyFund);
  const efRds    = (dash?.rdList ?? []).filter(i => i.emergencyFund);
  const efAccs   = accounts.filter(a => a.emergencyFund);
  const fdTotal  = efFds.reduce((s, i) => s + (i.efPrincipal ?? 0), 0);
  const rdTotal  = efRds.reduce((s, i) => s + (i.efPrincipal ?? 0), 0);
  const accTotal = efAccs.reduce((s, a) => s + (a.currentBalance ?? 0), 0);
  const grandTotal = fdTotal + rdTotal + accTotal;
  const hasAny = efFds.length > 0 || efRds.length > 0 || efAccs.length > 0;

  return (
    <div style={{ padding: '24px 28px' }}>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h2 className="page-title">Emergency Fund</h2>
          <p className="page-subtitle">Principal-only view of all assets marked as emergency fund</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/finance/investments')} className="btn btn-secondary" style={{ fontSize: 12 }}>
            Manage FD / RD
          </button>
          <button onClick={() => navigate('/accounts')} className="btn btn-secondary" style={{ fontSize: 12 }}>
            Manage Accounts
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', marginBottom: 24, borderRadius: 14, overflow: 'hidden',
        border: '1px solid rgba(245,158,11,0.25)', background: 'var(--bg-card)',
        boxShadow: '0 2px 12px rgba(245,158,11,0.08)' }}>
        {[
          { label: 'TOTAL EF',         value: fmt(grandTotal),               color: 'var(--warning)', big: true },
          { label: 'FIXED DEPOSITS',   value: fmt(fdTotal),                  color: 'var(--text-primary)', count: efFds.length },
          { label: 'RECURRING DEP.',   value: fmt(rdTotal),                  color: 'var(--text-primary)', count: efRds.length },
          { label: 'BANK ACCOUNTS',    value: fmt(accTotal),                 color: 'var(--text-primary)', count: efAccs.length },
        ].map((c, i) => (
          <div key={c.label} style={{ flex: c.big ? 1.4 : 1, padding: '14px 18px', borderLeft: i > 0 ? '1px solid rgba(245,158,11,0.12)' : 'none',
            background: i === 0 ? 'rgba(245,158,11,0.04)' : 'transparent' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)' }}>{c.label}</div>
              {'count' in c && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                background: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}>{c.count}</span>}
            </div>
            <div style={{ fontSize: c.big ? 22 : 15, fontWeight: c.big ? 800 : 700, color: c.color, fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {!hasAny ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', borderRadius: 16,
          border: '1px dashed rgba(245,158,11,0.25)', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🛡</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No emergency fund assets yet</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Mark FDs, RDs, or bank accounts as Emergency Fund to track them here.</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => navigate('/finance/investments')} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Go to Investments
            </button>
            <button onClick={() => navigate('/accounts')} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Go to Accounts
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Fixed Deposits */}
          <div>
            <SectionLabel label="Fixed Deposits" count={efFds.length} total={fdTotal} />
            {efFds.length === 0 ? (
              <EmptySection label="fixed deposits" hint="open an FD and mark it as EF in Investments" />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {efFds.map(inv => (
                  <FdEfCard key={inv.id} inv={inv} onClick={() => navigate('/finance/investments')} />
                ))}
              </div>
            )}
          </div>

          {/* Recurring Deposits */}
          <div>
            <SectionLabel label="Recurring Deposits" count={efRds.length} total={rdTotal} />
            {efRds.length === 0 ? (
              <EmptySection label="recurring deposits" hint="open an RD and mark it as EF in Investments" />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {efRds.map(inv => (
                  <RdEfCard key={inv.id} inv={inv} onClick={() => navigate('/finance/investments')} />
                ))}
              </div>
            )}
          </div>

          {/* Bank Accounts */}
          <div>
            <SectionLabel label="Bank Accounts" count={efAccs.length} total={accTotal} />
            {efAccs.length === 0 ? (
              <EmptySection label="bank accounts" hint="toggle 🛡 EF on any account in Accounts" />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {efAccs.map(acc => (
                  <AccountEfCard key={acc.id} acc={acc} onClick={() => navigate('/accounts')} />
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default EmergencyFundPage;

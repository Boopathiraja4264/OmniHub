import React, { useState, useEffect, useCallback } from 'react';
import { investmentApi, bankAccountApi, transactionApi } from '../../services/api';
import { InvestmentDashboard, RdFdInvestment, RdFdRequest, BankAccount } from '../../types';
import { useMobile } from '../../hooks/useMobile';


const fmt = (n?: number) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—';
const fmtPct = (n?: number) => n != null ? `${n.toFixed(2)}%` : '—';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (d?: string | Date) => {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

const inputS: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box',
};

const statusColors: Record<string, { bg: string; color: string; border: string }> = {
  ACTIVE:  { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e', border: 'rgba(34,197,94,0.25)' },
  MATURED: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  CLOSED:  { bg: 'rgba(148,163,184,0.10)', color: '#94a3b8', border: 'rgba(148,163,184,0.20)' },
};

const StatusBadge: React.FC<{ s: string }> = ({ s }) => {
  const c = statusColors[s] ?? statusColors.CLOSED;
  return <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: c.bg, color: c.color, border: `1px solid ${c.border}`, letterSpacing: '0.05em' }}>{s}</span>;
};

const EfTag: React.FC = () => (
  <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 4,
    background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)',
    letterSpacing: '0.05em' }}>EF</span>
);

// ─── Monthly interest breakdown for RD ────────────────────────────────────────
function calcRdMonthly(inv: RdFdInvestment) {
  const q = inv.annualInterestRate / 400;
  const n = inv.tenureMonths;
  const P = inv.amount;
  return Array.from({ length: n }, (_, i) => {
    const m = i + 1;
    const rem = n - m;
    const matVal = P * Math.pow(1 + q, rem / 3);
    const interest = matVal - P;
    const date = new Date(inv.startDate);
    date.setMonth(date.getMonth() + i);
    const paidEntry = inv.payments.find(p => p.monthNumber === m);
    return { month: m, date, deposit: P, interest, matVal, paid: !!paidEntry, paidEntry };
  });
}

// ─── FD growth projection (quarterly compounding steps) ──────────────────────
function calcFdProjection(inv: RdFdInvestment) {
  const q = inv.annualInterestRate / 400;
  const step = inv.tenureMonths <= 12 ? 3 : inv.tenureMonths <= 48 ? 6 : 12;
  const rows: { label: string; months: number; value: number; interest: number }[] = [];
  for (let m = step; m < inv.tenureMonths; m += step) {
    const value = inv.amount * Math.pow(1 + q, m / 3);
    const yr = m / 12;
    rows.push({ label: yr >= 1 && m % 12 === 0 ? `Year ${yr}` : `${m}mo`, months: m, value, interest: value - inv.amount });
  }
  const matVal = inv.amount * Math.pow(1 + q, inv.tenureMonths / 3);
  rows.push({ label: 'Maturity', months: inv.tenureMonths, value: matVal, interest: matVal - inv.amount });
  return rows;
}

// ─── FD Mini Card (click opens detail modal) ──────────────────────────────────
const FdMiniCard: React.FC<{ inv: RdFdInvestment; onClick: () => void }> = ({ inv, onClick }) => {
  const elapsed = Math.max(0, Math.round((Date.now() - new Date(inv.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
  const progress = inv.tenureMonths > 0 ? Math.min(100, (elapsed / inv.tenureMonths) * 100) : 0;
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-card)', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'all 0.15s', cursor: 'pointer' }}
      onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(34,197,94,0.35)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(34,197,94,0.1)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.border = '1px solid var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)'; }}>
      <div style={{ height: 3, background: inv.status === 'ACTIVE' ? 'linear-gradient(90deg, #16a34a, #22c55e)' : inv.status === 'MATURED' ? 'linear-gradient(90deg, #d97706, #f59e0b)' : 'rgba(148,163,184,0.3)' }} />
      <div style={{ padding: '11px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{inv.name}</span>
              {inv.emergencyFund && <EfTag />}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{inv.bankName || 'Bank not set'}</div>
          </div>
          <StatusBadge s={inv.status} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Principal</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(inv.amount)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>At Maturity</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>{fmt(inv.maturityAmount)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
          <span>{fmtPct(inv.annualInterestRate)} p.a. · {inv.tenureMonths}mo</span>
          <span>Matures {fmtDate(inv.maturityDate)}</span>
        </div>
        <div style={{ height: 3, background: 'var(--border-subtle)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #16a34a, #22c55e)', borderRadius: 99 }} />
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(34,197,94,0.7)', textAlign: 'right', fontWeight: 600 }}>View details →</div>
      </div>
    </div>
  );
};

// ─── FD Detail Modal ──────────────────────────────────────────────────────────
const FdDetailModal: React.FC<{
  inv: RdFdInvestment;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ inv, onClose, onEdit, onDelete }) => {
  const rows = calcFdProjection(inv);
  const elapsed = Math.max(0, Math.round((Date.now() - new Date(inv.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
  const progress = inv.tenureMonths > 0 ? Math.min(100, (elapsed / inv.tenureMonths) * 100) : 0;

  const thS: React.CSSProperties = {
    padding: '7px 10px', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'left',
    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  };
  const tdS: React.CSSProperties = {
    padding: '7px 10px', fontSize: 12, color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid var(--border-subtle)',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1010, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 680, border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{inv.name}</h2>
                {inv.emergencyFund && <EfTag />}
                <StatusBadge s={inv.status} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {inv.bankName || 'Bank not set'} · Fixed Deposit · {fmtPct(inv.annualInterestRate)} p.a.
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ overflowX: 'auto', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(110px, 1fr))' }}>
            {[
              { label: 'Principal',     value: fmt(inv.amount),          color: 'var(--text-primary)' },
              { label: 'At Maturity',   value: fmt(inv.maturityAmount),   color: '#22c55e' },
              { label: 'Interest',      value: fmt(inv.interestEarned),   color: '#a855f7' },
              { label: 'Current Value', value: fmt(inv.currentValue),     color: '#3b82f6' },
              { label: 'Elapsed',       value: `${elapsed}/${inv.tenureMonths}mo`, color: 'var(--text-muted)' },
            ].map((s, i) => (
              <div key={s.label} style={{ padding: '12px 14px', borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
            <span>{fmtDate(inv.startDate)}</span>
            {elapsed < inv.tenureMonths && <span style={{ color: '#22c55e' }}>Today ({Math.round(progress)}% elapsed)</span>}
            <span style={{ color: inv.status === 'MATURED' ? '#f59e0b' : 'var(--text-muted)' }}>{fmtDate(inv.maturityDate)}</span>
          </div>
          <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #16a34a, #22c55e)', borderRadius: 99, transition: 'width 0.3s' }} />
          </div>
          {inv.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>{inv.notes}</div>}
          {inv.emergencyFund && (
            <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <span style={{ fontSize: 10, color: '#f59e0b' }}>🛡 EF Principal</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>{fmt(inv.efPrincipal)}</span>
            </div>
          )}
        </div>

        {/* Interest growth projection */}
        <div style={{ padding: '16px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Interest Growth Projection
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 360 }}>
              <thead style={{ background: 'var(--bg-card)' }}>
                <tr>
                  <th style={thS}>Period</th>
                  <th style={{ ...thS, textAlign: 'right' }}>FD Value</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Interest Earned</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Growth %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.months} style={{ background: r.label === 'Maturity' ? 'rgba(34,197,94,0.04)' : 'transparent' }}>
                    <td style={{ ...tdS, fontWeight: r.label === 'Maturity' ? 700 : 400, color: r.label === 'Maturity' ? '#22c55e' : 'var(--text-muted)' }}>{r.label}</td>
                    <td style={{ ...tdS, textAlign: 'right', fontWeight: 600 }}>{fmt(r.value)}</td>
                    <td style={{ ...tdS, textAlign: 'right', color: '#a855f7' }}>{fmt(r.interest)}</td>
                    <td style={{ ...tdS, textAlign: 'right', color: 'var(--text-muted)' }}>
                      {inv.amount > 0 ? `+${((r.interest / inv.amount) * 100).toFixed(2)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '0 22px 18px' }}>
          <button onClick={onEdit} style={{ padding: '7px 18px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-row-hover)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
          <button onClick={onDelete} style={{ padding: '7px 18px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
        </div>
      </div>
    </div>
  );
};

// ─── RD Mini Card (click opens detail modal) ──────────────────────────────────
const RdMiniCard: React.FC<{
  inv: RdFdInvestment;
  onClick: () => void;
}> = ({ inv, onClick }) => {
  const progress = inv.tenureMonths > 0 ? Math.min(100, (inv.monthsPaid / inv.tenureMonths) * 100) : 0;
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-card)', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'all 0.15s', cursor: 'pointer' }}
      onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(59,130,246,0.3)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(59,130,246,0.1)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.border = '1px solid var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)'; }}>
      <div style={{ height: 3, background: inv.status === 'ACTIVE' ? 'linear-gradient(90deg, #2563eb, #60a5fa)' : inv.status === 'MATURED' ? 'linear-gradient(90deg, #d97706, #f59e0b)' : 'rgba(148,163,184,0.3)' }} />
      <div style={{ padding: '11px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{inv.name}</span>
              {inv.emergencyFund && <EfTag />}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{inv.bankName || 'Bank not set'}</div>
          </div>
          <StatusBadge s={inv.status} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>/Month</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(inv.amount)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>At Maturity</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>{fmt(inv.maturityAmount)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
          <span>{fmtPct(inv.annualInterestRate)} p.a. · {inv.tenureMonths}mo</span>
          <span style={{ color: '#3b82f6', fontWeight: 600 }}>{inv.monthsPaid}/{inv.tenureMonths} paid</span>
        </div>
        <div style={{ height: 3, background: 'var(--border-subtle)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #2563eb, #60a5fa)', borderRadius: 99 }} />
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(59,130,246,0.7)', textAlign: 'right', fontWeight: 600 }}>View details →</div>
      </div>
    </div>
  );
};

// ─── RD Detail Modal ──────────────────────────────────────────────────────────
const RdDetailModal: React.FC<{
  inv: RdFdInvestment;
  accounts: BankAccount[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSavePayment: (data: { monthNumber: number; paymentDate?: string; amountPaid?: number; notes?: string; bankAccountId?: string }) => Promise<void>;
  onDeletePayment: (id: number) => Promise<void>;
}> = ({ inv, accounts, onClose, onEdit, onDelete, onSavePayment, onDeletePayment }) => {
  const [addingPayment, setAddingPayment] = useState(false);
  const [payForm, setPayForm] = useState({ monthNumber: inv.monthsPaid + 1, paymentDate: new Date().toISOString().slice(0,10), amountPaid: String(inv.amount), notes: '', bankAccountId: '' });
  const [saving, setSaving] = useState(false);
  const rows = calcRdMonthly(inv);
  const totalInterest = rows.reduce((s, r) => s + r.interest, 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSavePayment({
        monthNumber: payForm.monthNumber,
        paymentDate: payForm.paymentDate || undefined,
        amountPaid: payForm.amountPaid ? parseFloat(payForm.amountPaid) : undefined,
        notes: payForm.notes || undefined,
        bankAccountId: payForm.bankAccountId || undefined,
      });
      setAddingPayment(false);
    } finally { setSaving(false); }
  };

  const thS: React.CSSProperties = {
    padding: '7px 10px', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'left',
    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  };
  const tdS: React.CSSProperties = {
    padding: '7px 10px', fontSize: 12, color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid var(--border-subtle)',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1010, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 760, border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{inv.name}</h2>
                {inv.emergencyFund && <EfTag />}
                <StatusBadge s={inv.status} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {inv.bankName || 'Bank not set'} · Recurring Deposit · {fmtPct(inv.annualInterestRate)} p.a.
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ overflowX: 'auto', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(110px, 1fr))' }}>
            {[
              { label: '/Month',        value: fmt(inv.amount),          color: 'var(--text-primary)' },
              { label: 'Total Invested', value: fmt(inv.totalInvested),   color: 'var(--text-primary)' },
              { label: 'At Maturity',   value: fmt(inv.maturityAmount),   color: '#22c55e' },
              { label: 'Interest',      value: fmt(inv.interestEarned),   color: '#a855f7' },
              { label: 'Paid',          value: `${inv.monthsPaid}/${inv.tenureMonths}`, color: '#3b82f6' },
            ].map((s, i) => (
              <div key={s.label} style={{ padding: '12px 14px', borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly interest table */}
        <div style={{ padding: '16px 22px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Monthly Interest Accumulation
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflowX: 'auto', maxHeight: 300, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 380 }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                <tr>
                  <th style={thS}>#</th>
                  <th style={thS}>Due Date</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Deposit</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Interest Earned</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Matures At</th>
                  <th style={{ ...thS, textAlign: 'center' }}>Paid</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.month} style={{ background: r.paid ? 'rgba(34,197,94,0.03)' : 'transparent' }}>
                    <td style={{ ...tdS, color: 'var(--text-muted)', fontWeight: 700 }}>{r.month}</td>
                    <td style={{ ...tdS, color: 'var(--text-muted)' }}>{fmtDate(r.date)}</td>
                    <td style={{ ...tdS, textAlign: 'right' }}>{fmt(r.deposit)}</td>
                    <td style={{ ...tdS, textAlign: 'right', color: '#a855f7' }}>{fmt(r.interest)}</td>
                    <td style={{ ...tdS, textAlign: 'right', color: '#22c55e', fontWeight: 600 }}>{fmt(r.matVal)}</td>
                    <td style={{ ...tdS, textAlign: 'center' }}>
                      {r.paid
                        ? <span style={{ fontSize: 10, fontWeight: 700, color: '#22c55e' }}>✓</span>
                        : <span style={{ fontSize: 10, color: 'var(--text-empty)' }}>—</span>
                      }
                    </td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--bg-row-alt)' }}>
                  <td colSpan={2} style={{ ...tdS, fontWeight: 700, color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</td>
                  <td style={{ ...tdS, textAlign: 'right', fontWeight: 700 }}>{fmt(inv.amount * inv.tenureMonths)}</td>
                  <td style={{ ...tdS, textAlign: 'right', fontWeight: 700, color: '#a855f7' }}>{fmt(totalInterest)}</td>
                  <td style={{ ...tdS, textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>{fmt(inv.maturityAmount)}</td>
                  <td style={{ ...tdS, textAlign: 'center', color: '#3b82f6', fontWeight: 700, fontSize: 10 }}>{inv.monthsPaid}/{inv.tenureMonths}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment log */}
        <div style={{ padding: '16px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Payment Log</span>
            {!addingPayment && (
              <button onClick={() => { setAddingPayment(true); setPayForm({ monthNumber: inv.monthsPaid + 1, paymentDate: new Date().toISOString().slice(0,10), amountPaid: String(inv.amount), notes: '', bankAccountId: '' }); }}
                style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                + Log Payment
              </button>
            )}
          </div>

          {addingPayment && (
            <div style={{ marginBottom: 12, padding: '12px', borderRadius: 8, background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 3 }}>Mo #</div>
                  <input type="number" min={1} max={inv.tenureMonths} value={payForm.monthNumber}
                    onChange={e => setPayForm(f => ({ ...f, monthNumber: parseInt(e.target.value) }))}
                    style={{ ...inputS, fontSize: 12, padding: '6px 8px' }} />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 3 }}>Date</div>
                  <input type="date" value={payForm.paymentDate}
                    onChange={e => setPayForm(f => ({ ...f, paymentDate: e.target.value }))}
                    style={{ ...inputS, fontSize: 12, padding: '6px 8px' }} />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 3 }}>Amount (₹)</div>
                  <input type="number" value={payForm.amountPaid}
                    onChange={e => setPayForm(f => ({ ...f, amountPaid: e.target.value }))}
                    style={{ ...inputS, fontSize: 12, padding: '6px 8px' }} />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 3 }}>Notes</div>
                  <input value={payForm.notes}
                    onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
                    style={{ ...inputS, fontSize: 12, padding: '6px 8px' }} placeholder="Optional" />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 3 }}>Debit from bank account <span style={{ color: 'rgba(59,130,246,0.6)' }}>(creates expense transaction)</span></div>
                  <select value={payForm.bankAccountId}
                    onChange={e => setPayForm(f => ({ ...f, bankAccountId: e.target.value }))}
                    style={{ ...inputS, fontSize: 12, padding: '6px 8px' }}>
                    <option value="">— No bank linkage —</option>
                    {accounts.map(a => (
                      <option key={a.id} value={String(a.id)}>{a.name}{a.bankName ? ` (${a.bankName})` : ''}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', borderRadius: 6, background: '#3b82f6', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>{saving ? 'Saving…' : '✓ Save'}</button>
                <button onClick={() => setAddingPayment(false)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          )}

          {inv.payments.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 0' }}>No payments logged yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {inv.payments.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 7, background: 'var(--bg-row-alt)', border: '1px solid var(--border-subtle)', fontSize: 12 }}>
                  <span style={{ color: '#3b82f6', fontWeight: 700, minWidth: 28 }}>#{p.monthNumber}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{fmtDate(p.paymentDate)}</span>
                  <span style={{ color: '#22c55e', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginLeft: 'auto' }}>{fmt(p.amountPaid)}</span>
                  {p.notes && <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.notes}</span>}
                  <button onClick={() => onDeletePayment(p.id)} style={{ padding: '2px 7px', borderRadius: 4, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: 'rgba(239,68,68,0.6)', fontSize: 10, cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '0 22px 18px' }}>
          <button onClick={onEdit} style={{ padding: '7px 18px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-row-hover)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
          <button onClick={onDelete} style={{ padding: '7px 18px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
        </div>
      </div>
    </div>
  );
};

// ─── Empty Form Helper ────────────────────────────────────────────────────────
const emptyForm = (): RdFdRequest => ({
  type: 'FD', name: '', bankName: '', amount: 0,
  annualInterestRate: 0, tenureMonths: 12,
  startDate: new Date().toISOString().slice(0, 10),
  emergencyFund: false, status: 'ACTIVE', notes: '',
});

// ─── Main Page ────────────────────────────────────────────────────────────────
const InvestmentsPage: React.FC = () => {
  const isMobile = useMobile();
  const [dash, setDash] = useState<InvestmentDashboard | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<RdFdInvestment | null>(null);
  const [form, setForm] = useState<RdFdRequest>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [fdDetail, setFdDetail] = useState<RdFdInvestment | null>(null);
  const [rdDetail, setRdDetail] = useState<RdFdInvestment | null>(null);
  const [txBankAccountId, setTxBankAccountId] = useState<string>('');

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

  // Keep detail modals in sync with latest data after reload
  useEffect(() => {
    if (!dash) return;
    if (fdDetail) {
      const updated = dash.fdList.find(i => i.id === fdDetail.id);
      if (updated) setFdDetail(updated);
    }
    if (rdDetail) {
      const updated = dash.rdList.find(i => i.id === rdDetail.id);
      if (updated) setRdDetail(updated);
    }
  }, [dash]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = (type: 'FD' | 'RD') => {
    setEditItem(null);
    setForm({ ...emptyForm(), type });
    setTxBankAccountId('');
    setShowModal(true);
  };

  const openEdit = (item: RdFdInvestment) => {
    setEditItem(item);
    setForm({
      type: item.type, name: item.name, bankName: item.bankName ?? '',
      amount: item.amount, annualInterestRate: item.annualInterestRate,
      tenureMonths: item.tenureMonths,
      startDate: item.startDate?.slice(0, 10) ?? '',
      emergencyFund: item.emergencyFund,
      status: item.status, notes: item.notes ?? '',
    });
    setTxBankAccountId('');
    setFdDetail(null);
    setRdDetail(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await investmentApi.update(editItem.id, form);
      } else {
        await investmentApi.create(form);
        // Debit the source bank account if selected (only on create, not edit)
        if (txBankAccountId) {
          await transactionApi.create({
            description: `${form.type === 'FD' ? 'FD Deposit' : 'RD Opened'} – ${form.name}`,
            amount: form.type === 'FD' ? form.amount : form.amount,
            type: 'EXPENSE',
            category: 'Investments',
            date: form.startDate,
            paymentSource: 'BANK',
            bankAccountId: parseInt(txBankAccountId),
            notes: form.notes || undefined,
          });
        }
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this investment?')) return;
    await investmentApi.delete(id);
    setFdDetail(null);
    setRdDetail(null);
    load();
  };

  const handleSavePayment = async (invId: number, data: any) => {
    const { bankAccountId, ...paymentData } = data;
    await investmentApi.addPayment(invId, paymentData);
    if (bankAccountId) {
      const inv = dash?.rdList.find(i => i.id === invId);
      await transactionApi.create({
        description: `RD – ${inv?.name ?? 'RD Payment'} (Month ${data.monthNumber})`,
        amount: parseFloat(data.amountPaid) || inv?.amount || 0,
        type: 'EXPENSE',
        category: 'Investments',
        date: data.paymentDate || new Date().toISOString().slice(0, 10),
        paymentSource: 'BANK',
        bankAccountId: parseInt(bankAccountId),
        notes: data.notes || undefined,
      });
    }
    await load();
  };

  const handleDeletePayment = async (paymentId: number) => {
    await investmentApi.deletePayment(paymentId);
    await load();
  };

  const sf = (k: keyof RdFdRequest) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked
      : e.target.type === 'number' ? parseFloat(e.target.value) || 0
      : e.target.value;
    setForm(f => ({ ...f, [k]: val }));
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;

  const efInvTotal = (dash?.emergencyFundTotal ?? 0);

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 28px', maxWidth: 1400, minHeight: '100%', background: 'radial-gradient(ellipse 65% 40% at 10% 0%, rgba(34,197,94,0.06) 0%, transparent 60%)' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.4px' }}>Investments</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, marginBottom: 0 }}>Fixed deposits, recurring deposits, emergency fund</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => openAdd('FD')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(34,197,94,0.3)' }}>+ Add FD</button>
          <button onClick={() => openAdd('RD')} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #0369a1, #3b82f6)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}>+ Add RD</button>
        </div>
      </div>

      {/* Summary strip */}
      {dash && (
        <div style={{ display: 'flex', flexWrap: isMobile ? 'wrap' : 'nowrap', marginBottom: 20, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
          {[
            { label: 'TOTAL INVESTED',  value: fmt(dash.totalInvested),      color: 'var(--text-primary)' },
            { label: 'MATURITY VALUE',  value: fmt(dash.totalMaturityValue),  color: '#22c55e' },
            { label: 'INTEREST EARNED', value: fmt(dash.totalInterestEarned), color: '#a855f7' },
            { label: 'EMERGENCY FUND',  value: fmt(efInvTotal),               color: '#f59e0b' },
            { label: 'ACTIVE',          value: String(dash.activeCount),      color: 'var(--text-primary)' },
          ].map((c, i) => (
            <div key={c.label} style={{ flex: isMobile ? '1 1 100%' : 1, padding: '12px 16px', borderLeft: (!isMobile && i > 0) ? '1px solid var(--border-subtle)' : 'none', borderTop: (isMobile && i > 0) ? '1px solid var(--border-subtle)' : 'none' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: c.color, fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* FD | RD side-by-side columns — stack on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* FD column — responsive grid, click opens detail modal */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Fixed Deposits</h2>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}>{dash?.fdList.length ?? 0}</span>
          </div>
          {!dash?.fdList.length ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '24px', textAlign: 'center', borderRadius: 12, border: '1px dashed var(--border)' }}>
              No fixed deposits yet.
              <br />
              <button onClick={() => openAdd('FD')} style={{ marginTop: 8, padding: '6px 14px', borderRadius: 6, border: 'none', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Add FD</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {dash.fdList.map(inv => (
                <FdMiniCard key={inv.id} inv={inv} onClick={() => setFdDetail(inv)} />
              ))}
            </div>
          )}
        </div>

        {/* RD column — responsive multi-col grid, click opens modal */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Recurring Deposits</h2>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6' }}>{dash?.rdList.length ?? 0}</span>
          </div>
          {!dash?.rdList.length ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '24px', textAlign: 'center', borderRadius: 12, border: '1px dashed var(--border)' }}>
              No recurring deposits yet.
              <br />
              <button onClick={() => openAdd('RD')} style={{ marginTop: 8, padding: '6px 14px', borderRadius: 6, border: 'none', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Add RD</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {dash.rdList.map(inv => (
                <RdMiniCard key={inv.id} inv={inv} onClick={() => setRdDetail(inv)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FD Detail Modal */}
      {fdDetail && (
        <FdDetailModal
          inv={fdDetail}
          onClose={() => setFdDetail(null)}
          onEdit={() => openEdit(fdDetail)}
          onDelete={() => handleDelete(fdDetail.id)} />
      )}

      {/* RD Detail Modal */}
      {rdDetail && (
        <RdDetailModal
          inv={rdDetail}
          accounts={accounts}
          onClose={() => setRdDetail(null)}
          onEdit={() => openEdit(rdDetail)}
          onDelete={() => handleDelete(rdDetail.id)}
          onSavePayment={data => handleSavePayment(rdDetail.id, data)}
          onDeletePayment={handleDeletePayment} />
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{editItem ? `Edit ${editItem.type}` : `Add ${form.type}`}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Type</label>
                  <select value={form.type} onChange={sf('type')} style={inputS} required>
                    <option value="FD">Fixed Deposit (FD)</option>
                    <option value="RD">Recurring Deposit (RD)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Name *</label>
                  <input style={inputS} value={form.name} onChange={sf('name')} required placeholder="e.g. SBI FD 2025" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Bank</label>
                  <input style={inputS} value={form.bankName} onChange={sf('bankName')} placeholder="e.g. SBI, HDFC…" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{form.type === 'FD' ? 'Principal (₹) *' : 'Monthly Amount (₹) *'}</label>
                  <input style={inputS} type="number" value={form.amount || ''} onChange={sf('amount')} required />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Annual Interest Rate (%) *</label>
                  <input style={inputS} type="number" step="0.01" value={form.annualInterestRate || ''} onChange={sf('annualInterestRate')} required placeholder="e.g. 6.5" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Tenure (months) *</label>
                  <input style={inputS} type="number" value={form.tenureMonths || ''} onChange={sf('tenureMonths')} required />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Start Date *</label>
                  <input style={inputS} type="date" value={form.startDate} onChange={sf('startDate')} required />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Status</label>
                  <select value={form.status} onChange={sf('status')} style={inputS}>
                    <option value="ACTIVE">Active</option>
                    <option value="MATURED">Matured</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes</label>
                  <input style={inputS} value={form.notes} onChange={sf('notes')} placeholder="Optional" />
                </div>
                <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="ef" checked={form.emergencyFund}
                    onChange={e => setForm(f => ({ ...f, emergencyFund: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: '#f59e0b', cursor: 'pointer' }} />
                  <label htmlFor="ef" style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>🛡 Mark as Emergency Fund</label>
                </div>
                {/* Bank debit — only shown when creating, not editing */}
                {!editItem && (
                  <div style={{ gridColumn: '1/-1', padding: '12px 14px', borderRadius: 8, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', marginBottom: 8 }}>
                      Debit from savings account
                      {txBankAccountId && form.amount > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                          → creates <strong style={{ color: '#ef4444' }}>−{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(form.type === 'FD' ? form.amount : form.amount)}</strong> expense transaction
                        </span>
                      )}
                    </div>
                    <select value={txBankAccountId} onChange={e => setTxBankAccountId(e.target.value)} style={inputS}>
                      <option value="">— No bank debit —</option>
                      {accounts.map(a => (
                        <option key={a.id} value={String(a.id)}>{a.name}{a.bankName ? ` (${a.bankName})` : ''}</option>
                      ))}
                    </select>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5 }}>
                      {form.type === 'FD'
                        ? 'One-time debit of the full principal on the start date.'
                        : 'Debits the opening setup; log each monthly payment separately in the RD detail.'}
                    </div>
                  </div>
                )}
              </div>

              {/* Live preview */}
              {form.amount > 0 && form.annualInterestRate > 0 && form.tenureMonths > 0 && (() => {
                const P = form.amount, r = form.annualInterestRate, n = form.tenureMonths, q = r / 400;
                let maturity = 0;
                if (form.type === 'FD') { maturity = P * Math.pow(1 + q, n / 3); }
                else { for (let m = 1; m <= n; m++) maturity += P * Math.pow(1 + q, (n - m) / 3); }
                const invested = form.type === 'FD' ? P : P * n;
                return (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                    <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Preview</div>
                    <div style={{ display: 'flex', gap: 20 }}>
                      {[
                        { label: 'Invested',   value: fmt(invested) },
                        { label: 'At Maturity',value: fmt(maturity),           color: '#22c55e' },
                        { label: 'Interest',   value: fmt(maturity - invested), color: '#a855f7' },
                      ].map(s => (
                        <div key={s.label}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: s.color ?? 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                  {saving ? 'Saving…' : editItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentsPage;

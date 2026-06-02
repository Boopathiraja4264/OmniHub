import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  bankAccountApi, creditCardApi, investmentApi, chitApi, debtApi,
} from '../../services/api';
import {
  BankAccount, CreditCard, InvestmentDashboard, ChitGroup, DebtDashboard,
} from '../../types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const fmtShort = (n: number) => {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`;
  if (n >= 1_00_000)  return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1000)      return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
};

// ─── Section card (asset or liability group) ─────────────────────────────────
interface SectionProps {
  icon: string;
  label: string;
  amount: number;
  total: number;           // total assets or total liabilities (for bar)
  color: string;
  items: { label: string; sub?: string; amount: number; to?: string }[];
  onNavigate?: (to: string) => void;
}

const SectionCard: React.FC<SectionProps> = ({ icon, label, amount, total, color, items, onNavigate }) => {
  const [expanded, setExpanded] = useState(true);
  const pct = total > 0 ? Math.min((amount / total) * 100, 100) : 0;

  if (amount <= 0) return null;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden', marginBottom: 12,
    }}>
      {/* Header */}
      <button type="button" onClick={() => setExpanded(e => !e)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <span style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17,
        }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, marginTop: 5 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s' }} />
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color }}>{fmtShort(amount)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{Math.round(pct)}% of total</div>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.4, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Items */}
      {expanded && items.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '6px 8px 8px' }}>
          {items.map((item, i) => (
            <div key={i}
              onClick={() => item.to && onNavigate?.(item.to)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 10px', borderRadius: 8,
                cursor: item.to ? 'pointer' : 'default',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (item.to) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{item.label}</div>
                {item.sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{item.sub}</div>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color, flexShrink: 0, marginLeft: 16 }}>{fmt(item.amount)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const WealthPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [investments, setInvestments] = useState<InvestmentDashboard | null>(null);
  const [chits, setChits] = useState<ChitGroup[]>([]);
  const [debt, setDebt] = useState<DebtDashboard | null>(null);

  useEffect(() => {
    Promise.all([
      bankAccountApi.getAll(),
      creditCardApi.getAll(),
      investmentApi.getDashboard(),
      chitApi.getAll(),
      debtApi.getDashboard(),
    ]).then(([banksRes, cardsRes, invRes, chitsRes, debtRes]) => {
      setBankAccounts(Array.isArray(banksRes.data) ? banksRes.data : []);
      setCards(Array.isArray(cardsRes.data) ? cardsRes.data : []);
      setInvestments(invRes.data);
      setChits(Array.isArray(chitsRes.data) ? chitsRes.data : []);
      setDebt(debtRes.data);
    }).finally(() => setLoading(false));
  }, []);

  // ── Assets ──────────────────────────────────────────────────────────────────
  const BANK_TYPES = ['SAVINGS', 'CURRENT', 'SALARY', 'CASH', 'WALLET', 'OTHER'];
  const bankAccArr = bankAccounts.filter(a => BANK_TYPES.includes(a.accountType));
  const bankBalance = bankAccArr.reduce((s, a) => s + Math.max(0, a.currentBalance), 0);
  const investmentValue = investments?.totalInvested ?? 0;

  // Chit: money paid in that hasn't been received back yet (receivable)
  const chitAsset = chits.reduce((s, c) => s + Math.max(0, c.totalPaid - c.totalReceived), 0);

  const totalAssets = bankBalance + investmentValue + chitAsset;

  // ── Liabilities ─────────────────────────────────────────────────────────────
  const creditCardDebt = cards.reduce((s, c) => s + (c.outstanding || 0), 0);
  const emiLoans = (debt?.emiLoans ?? []).filter(l => l.status === 'ACTIVE');
  const emiDebt = emiLoans.reduce((s, l) => s + (l.outstandingPrincipal || 0), 0);
  const annualLoans = (debt?.annualLoans ?? []).filter(l => l.status === 'OUTSTANDING');
  const annualDebt = annualLoans.reduce((s, l) => s + (l.currentBalance || 0), 0);
  const borrowedLoans = (debt?.borrowedLoans ?? []).filter(l => l.status === 'OUTSTANDING');
  const borrowedDebt = borrowedLoans.reduce((s, l) => s + (l.outstandingBalance || 0), 0);
  // Chit: received more than paid (still owe future contributions)
  const chitLiability = chits.reduce((s, c) => s + Math.max(0, c.totalReceived - c.totalPaid), 0);

  const totalLiabilities = creditCardDebt + emiDebt + annualDebt + borrowedDebt + chitLiability;

  const netWorth = totalAssets - totalLiabilities;
  const netPositive = netWorth >= 0;
  const grandTotal = totalAssets + totalLiabilities;
  const assetBarPct = grandTotal > 0 ? (totalAssets / grandTotal) * 100 : 50;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--text-muted)' }}>
        Loading your wealth snapshot…
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Wealth</h2>
      </div>

      {/* ── Net Worth Hero ─────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24, padding: '24px 28px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text-muted)', marginBottom: 8 }}>
          Net Worth
        </div>
        <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1.5, color: netPositive ? 'var(--income)' : 'var(--expense)', marginBottom: 20, lineHeight: 1 }}>
          {netPositive ? '' : '−'}{fmt(Math.abs(netWorth))}
        </div>

        {/* Split bar */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ height: 10, borderRadius: 10, background: 'var(--expense-dim)', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${assetBarPct}%`, background: 'var(--income)', borderRadius: '10px 0 0 10px', transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--income)', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Assets</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--income)' }}>{fmtShort(totalAssets)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--expense)' }}>{fmtShort(totalLiabilities)}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Liabilities</span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--expense)', display: 'inline-block', flexShrink: 0 }} />
            </div>
          </div>
        </div>

        {/* 3 stat pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 4 }}>
          {[
            { label: 'Total Assets',      value: fmt(totalAssets),      color: 'var(--income)',  bg: 'var(--income-dim)'  },
            { label: 'Total Liabilities', value: fmt(totalLiabilities), color: 'var(--expense)', bg: 'var(--expense-dim)' },
            { label: 'Asset/Debt Ratio',  value: totalLiabilities > 0 ? `${(totalAssets / totalLiabilities).toFixed(2)}x` : '∞', color: 'var(--primary)', bg: 'var(--primary-dim)' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.8 }}>{s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Assets + Liabilities columns ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* ASSETS */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text-muted)', marginBottom: 12 }}>
            Assets · {fmtShort(totalAssets)}
          </div>

          <SectionCard
            icon="🏦"
            label="Cash & Bank Accounts"
            amount={bankBalance}
            total={totalAssets}
            color="var(--income)"
            onNavigate={navigate}
            items={bankAccArr
              .filter(a => a.currentBalance > 0)
              .sort((a, b) => b.currentBalance - a.currentBalance)
              .map(a => ({
                label: a.name,
                sub: a.bankName || undefined,
                amount: a.currentBalance,
                to: `/accounts/bank/${a.id}`,
              }))}
          />

          <SectionCard
            icon="📈"
            label="Investments (RD & FD)"
            amount={investmentValue}
            total={totalAssets}
            color="#6366f1"
            onNavigate={navigate}
            items={[
              ...(investments?.fdList ?? []).filter(i => i.status === 'ACTIVE').map(i => ({
                label: i.name,
                sub: `FD · ${i.bankName || ''}`,
                amount: i.totalInvested,
                to: '/finance/investments',
              })),
              ...(investments?.rdList ?? []).filter(i => i.status === 'ACTIVE').map(i => ({
                label: i.name,
                sub: `RD · ${i.bankName || ''}`,
                amount: i.totalInvested,
                to: '/finance/investments',
              })),
            ]}
          />

          <SectionCard
            icon="🔄"
            label="Chit Groups (Receivable)"
            amount={chitAsset}
            total={totalAssets}
            color="#f59e0b"
            onNavigate={navigate}
            items={chits
              .filter(c => c.totalPaid > c.totalReceived)
              .map(c => ({
                label: c.name,
                sub: `${c.groupLabel} · Paid ${fmtShort(c.totalPaid)}`,
                amount: c.totalPaid - c.totalReceived,
                to: `/finance/chit/${c.id}`,
              }))}
          />
        </div>

        {/* LIABILITIES */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text-muted)', marginBottom: 12 }}>
            Liabilities · {fmtShort(totalLiabilities)}
          </div>

          <SectionCard
            icon="💳"
            label="Credit Cards"
            amount={creditCardDebt}
            total={totalLiabilities}
            color="var(--expense)"
            onNavigate={navigate}
            items={cards
              .filter(c => (c.outstanding || 0) > 0)
              .sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0))
              .map(c => ({
                label: c.lastFourDigits ? `${c.name} ••••${c.lastFourDigits}` : c.name,
                sub: c.bank || undefined,
                amount: c.outstanding || 0,
                to: `/accounts/card/${c.id}`,
              }))}
          />

          <SectionCard
            icon="🏧"
            label="EMI Loans"
            amount={emiDebt}
            total={totalLiabilities}
            color="#e05c6a"
            onNavigate={navigate}
            items={emiLoans
              .sort((a, b) => b.outstandingPrincipal - a.outstandingPrincipal)
              .map(l => ({
                label: l.name,
                sub: `${l.annualInterestRate}% · ${l.loanId}`,
                amount: l.outstandingPrincipal,
                to: `/finance/debt/emi/${l.id}`,
              }))}
          />

          <SectionCard
            icon="📅"
            label="Annual Interest Loans"
            amount={annualDebt}
            total={totalLiabilities}
            color="#f97316"
            onNavigate={navigate}
            items={annualLoans
              .sort((a, b) => (b.currentBalance || 0) - (a.currentBalance || 0))
              .map(l => ({
                label: l.name,
                sub: `${l.annualInterestRate}% annual · ${l.loanId}`,
                amount: l.currentBalance || 0,
                to: `/finance/debt/annual/${l.id}`,
              }))}
          />

          <SectionCard
            icon="🤝"
            label="Borrowed Loans"
            amount={borrowedDebt}
            total={totalLiabilities}
            color="#a855f7"
            onNavigate={navigate}
            items={borrowedLoans
              .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
              .map(l => ({
                label: l.lenderName,
                sub: `Borrowed ${fmtShort(l.amountBorrowed)}`,
                amount: l.outstandingBalance,
                to: `/finance/debt/borrowed/${l.id}`,
              }))}
          />

          <SectionCard
            icon="🔄"
            label="Chit Groups (Liability)"
            amount={chitLiability}
            total={totalLiabilities}
            color="#f59e0b"
            onNavigate={navigate}
            items={chits
              .filter(c => c.totalReceived > c.totalPaid)
              .map(c => ({
                label: c.name,
                sub: `${c.groupLabel} · Received ${fmtShort(c.totalReceived)}`,
                amount: c.totalReceived - c.totalPaid,
                to: `/finance/chit/${c.id}`,
              }))}
          />
        </div>
      </div>

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {totalAssets === 0 && totalLiabilities === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', marginTop: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>No data yet</div>
          <div style={{ fontSize: 13 }}>Add bank accounts, investments, or loans to see your net worth.</div>
        </div>
      )}
    </div>
  );
};

export default WealthPage;

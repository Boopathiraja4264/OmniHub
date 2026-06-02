import React, { useState } from 'react';
import AddWealthItemModal, {
  LocalWealthItem, loadWealthItems, removeWealthItem,
} from './AddWealthItemModal';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const fmtShort = (n: number) => {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`;
  if (n >= 1_00_000)  return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1000)      return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
};

// ─── Section card ─────────────────────────────────────────────────────────────
interface SectionProps {
  icon: string;
  label: string;
  amount: number;
  total: number;
  color: string;
  items: { label: string; sub?: string; amount: number; id?: string }[];
  onRemove?: (id: string) => void;
}

const SectionCard: React.FC<SectionProps> = ({ icon, label, amount, total, color, items, onRemove }) => {
  const [expanded, setExpanded] = useState(true);
  const pct = total > 0 ? Math.min((amount / total) * 100, 100) : 0;

  if (amount <= 0) return null;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden', marginBottom: 12,
    }}>
      <button type="button" onClick={() => setExpanded(e => !e)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <span style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
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

      {expanded && items.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '6px 8px 8px' }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '7px 10px', borderRadius: 8,
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{item.label}</div>
                {item.sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{item.sub}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color }}>{fmt(item.amount)}</div>
                {item.id && onRemove && (
                  <button type="button" onClick={() => onRemove(item.id!)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                    color: 'var(--text-muted)', fontSize: 12, borderRadius: 4, lineHeight: 1,
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--expense)'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'}
                    title="Remove">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Category icon map ────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  'Equity': '📈', 'Debt': '🏛️', 'Real Estate': '🏠', 'Commodities': '🥇',
  'Cash & Savings': '🏦', 'Crypto': '₿', 'Alternatives': '🔄', 'Other': '➕',
  'Home Loan': '🏠', 'Vehicle Loan': '🚗', 'Personal Loan': '👤',
  'Education Loan': '🎓', 'Credit Card': '💳', 'Gold Loan': '🥇',
  'Business Loan': '💼', 'Friends / Family': '🤝',
};

const ASSET_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#14b8a6', '#a855f7', '#f97316', '#6b7280'];
const LIABILITY_COLORS = ['#ef4444', '#e05c6a', '#f97316', '#ec4899', '#a855f7', '#f59e0b', '#6366f1', '#6b7280'];

// ─── Main page ────────────────────────────────────────────────────────────────
const WealthPage: React.FC = () => {
  const [addModal, setAddModal] = useState<'ASSET' | 'LIABILITY' | null>(null);
  const [items, setItems] = useState<LocalWealthItem[]>(() => loadWealthItems());

  const reload = () => setItems(loadWealthItems());
  const handleRemove = (id: string) => { removeWealthItem(id); reload(); };

  const assets      = items.filter(i => i.mode === 'ASSET');
  const liabilities = items.filter(i => i.mode === 'LIABILITY');
  const totalAssets      = assets.reduce((s, i) => s + i.currentValue, 0);
  const totalLiabilities = liabilities.reduce((s, i) => s + i.currentValue, 0);
  const netWorth    = totalAssets - totalLiabilities;
  const netPositive = netWorth >= 0;
  const grandTotal  = totalAssets + totalLiabilities;
  const assetBarPct = grandTotal > 0 ? (totalAssets / grandTotal) * 100 : 50;

  // Group by category
  const assetGroups = assets.reduce<Record<string, LocalWealthItem[]>>((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});
  const liabilityGroups = liabilities.reduce<Record<string, LocalWealthItem[]>>((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="page-title">Wealth</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ color: 'var(--expense)', borderColor: 'var(--expense)' }}
            onClick={() => setAddModal('LIABILITY')}>+ Add Liability</button>
          <button className="btn btn-primary" onClick={() => setAddModal('ASSET')}>+ Add Asset</button>
        </div>
      </div>

      {/* ── Net Worth Hero ──────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24, padding: '24px 28px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text-muted)', marginBottom: 8 }}>
          Net Worth
        </div>
        <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1.5, color: netPositive ? 'var(--income)' : 'var(--expense)', marginBottom: 20, lineHeight: 1 }}>
          {netPositive ? '' : '−'}{fmt(Math.abs(netWorth))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ height: 10, borderRadius: 10, background: 'var(--expense-dim)', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${assetBarPct}%`, background: 'var(--income)', borderRadius: '10px 0 0 10px', transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--income)', display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Assets</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--income)' }}>{fmtShort(totalAssets)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--expense)' }}>{fmtShort(totalLiabilities)}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Liabilities</span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--expense)', display: 'inline-block' }} />
            </div>
          </div>
        </div>

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

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {items.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>No entries yet</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Add your assets and liabilities to see your net worth.</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => setAddModal('ASSET')}>+ Add Asset</button>
            <button className="btn btn-secondary" onClick={() => setAddModal('LIABILITY')}>+ Add Liability</button>
          </div>
        </div>
      )}

      {/* ── Assets + Liabilities columns ────────────────────────────────────── */}
      {items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

          {/* ASSETS */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text-muted)', marginBottom: 12 }}>
              Assets · {fmtShort(totalAssets)}
            </div>
            {assets.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0' }}>No assets added yet.</div>
            )}
            {Object.entries(assetGroups).map(([cat, catItems], idx) => {
              const total = catItems.reduce((s, i) => s + i.currentValue, 0);
              const color = ASSET_COLORS[idx % ASSET_COLORS.length];
              return (
                <SectionCard key={cat}
                  icon={CATEGORY_ICONS[cat] || '📌'}
                  label={cat}
                  amount={total}
                  total={totalAssets}
                  color={color}
                  items={catItems.map(i => ({
                    id: i.id,
                    label: i.name,
                    sub: i.typeLabel + (i.notes ? ` · ${i.notes}` : ''),
                    amount: i.currentValue,
                  }))}
                  onRemove={handleRemove}
                />
              );
            })}
            {assets.length > 0 && (
              <button className="btn btn-secondary" style={{ width: '100%', marginTop: 4, fontSize: 12 }}
                onClick={() => setAddModal('ASSET')}>+ Add Asset</button>
            )}
          </div>

          {/* LIABILITIES */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text-muted)', marginBottom: 12 }}>
              Liabilities · {fmtShort(totalLiabilities)}
            </div>
            {liabilities.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0' }}>No liabilities added yet.</div>
            )}
            {Object.entries(liabilityGroups).map(([cat, catItems], idx) => {
              const total = catItems.reduce((s, i) => s + i.currentValue, 0);
              const color = LIABILITY_COLORS[idx % LIABILITY_COLORS.length];
              return (
                <SectionCard key={cat}
                  icon={CATEGORY_ICONS[cat] || '📌'}
                  label={cat}
                  amount={total}
                  total={totalLiabilities}
                  color={color}
                  items={catItems.map(i => ({
                    id: i.id,
                    label: i.name,
                    sub: i.typeLabel !== cat ? i.typeLabel + (i.notes ? ` · ${i.notes}` : '') : (i.notes || undefined),
                    amount: i.currentValue,
                  }))}
                  onRemove={handleRemove}
                />
              );
            })}
            {liabilities.length > 0 && (
              <button className="btn btn-secondary" style={{ width: '100%', marginTop: 4, fontSize: 12, color: 'var(--expense)', borderColor: 'var(--expense)' }}
                onClick={() => setAddModal('LIABILITY')}>+ Add Liability</button>
            )}
          </div>
        </div>
      )}

      {addModal && (
        <AddWealthItemModal
          defaultMode={addModal}
          onClose={() => setAddModal(null)}
          onSuccess={reload}
        />
      )}
    </div>
  );
};

export default WealthPage;

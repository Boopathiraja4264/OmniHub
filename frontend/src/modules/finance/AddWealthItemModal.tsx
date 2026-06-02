import React, { useState } from 'react';

// ─── Data model ───────────────────────────────────────────────────────────────
export interface LocalWealthItem {
  id: string;
  mode: 'ASSET' | 'LIABILITY';
  category: string;
  typeLabel: string;
  name: string;
  currentValue: number;
  amountInvested?: number;
  notes?: string;
  createdAt: string;
}

const STORAGE_KEY = 'omnihub_wealth_items';

export function loadWealthItems(): LocalWealthItem[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
export function saveWealthItem(item: LocalWealthItem) {
  const items = loadWealthItems();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...items, item]));
}
export function removeWealthItem(id: string) {
  const items = loadWealthItems().filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ─── Asset taxonomy ───────────────────────────────────────────────────────────
type AssetEntry = { id: string; label: string };
type SubCat     = { id: string; label: string; types: AssetEntry[] };
type Category   = {
  id: string; label: string; icon: string; count: number;
  subcats?: SubCat[];
  types?: AssetEntry[];
};

const ASSET_CATEGORIES: Category[] = [
  {
    id: 'equity', label: 'Equity', icon: '📈', count: 10,
    types: [
      { id: 'direct_stock',    label: 'Direct Stock' },
      { id: 'equity_mf',       label: 'Equity Mutual Fund' },
      { id: 'hybrid_mf',       label: 'Hybrid Mutual Fund' },
      { id: 'arbitrage_fund',  label: 'Arbitrage Fund' },
      { id: 'etf_eq',          label: 'ETF' },
      { id: 'esop_rsu',        label: 'ESOP / RSU' },
      { id: 'unlisted_equity', label: 'Unlisted Equity' },
      { id: 'nps_eq',          label: 'NPS' },
      { id: 'ulip_eq',         label: 'ULIP' },
      { id: 'pms_aif',         label: 'PMS / AIF' },
    ],
  },
  {
    id: 'debt', label: 'Debt', icon: '🏛️', count: 17,
    subcats: [
      {
        id: 'fd_rd', label: 'FD / RD',
        types: [
          { id: 'bank_fd',      label: 'Bank FD' },
          { id: 'corporate_fd', label: 'Corporate FD' },
          { id: 'rd',           label: 'Recurring Deposit' },
        ],
      },
      {
        id: 'bonds', label: 'Bonds',
        types: [{ id: 'bonds', label: 'Bonds' }],
      },
      {
        id: 'govt_schemes', label: 'Govt. Schemes',
        types: [
          { id: 'ppf',          label: 'PPF' },
          { id: 'epf_vpf',      label: 'EPF / VPF' },
          { id: 'nps',          label: 'NPS' },
          { id: 'ssy',          label: 'SSY' },
          { id: 'govt_savings', label: 'Govt. Savings Scheme' },
        ],
      },
      {
        id: 'insurance', label: 'Insurance',
        types: [
          { id: 'ulip_ins',   label: 'ULIP' },
          { id: 'endowment',  label: 'Endowment' },
          { id: 'moneyback',  label: 'Moneyback' },
          { id: 'annuity',    label: 'Annuity' },
        ],
      },
      {
        id: 'mf_etf', label: 'MF / ETF',
        types: [
          { id: 'mutual_fund', label: 'Mutual Fund' },
          { id: 'etf_debt',    label: 'ETF' },
        ],
      },
    ],
  },
  {
    id: 'real_estate', label: 'Real Estate', icon: '🏠', count: 2,
    types: [
      { id: 'property',   label: 'Property' },
      { id: 'reit_invit', label: 'REIT / InvIT' },
    ],
  },
  {
    id: 'commodities', label: 'Commodities', icon: '🥇', count: 4,
    types: [
      { id: 'physical_gold',    label: 'Physical Gold' },
      { id: 'digital_gold',     label: 'Digital Gold (ETF / SGB / MF)' },
      { id: 'silver',           label: 'Physical Silver' },
      { id: 'other_commodity',  label: 'Other Commodity' },
    ],
  },
  {
    id: 'cash_savings', label: 'Cash & Savings', icon: '🏦', count: 4,
    types: [
      { id: 'savings_account', label: 'Savings Account' },
      { id: 'current_account', label: 'Current Account' },
      { id: 'cash',            label: 'Cash' },
      { id: 'wallet',          label: 'Wallet' },
    ],
  },
  {
    id: 'crypto', label: 'Crypto', icon: '₿', count: 2,
    types: [
      { id: 'crypto_token', label: 'Crypto Token' },
      { id: 'crypto_etf',   label: 'Crypto ETF' },
    ],
  },
  {
    id: 'alternatives', label: 'Alternatives', icon: '🔄', count: 2,
    types: [
      { id: 'angel_investing', label: 'Angel Investing' },
      { id: 'p2p_lending',     label: 'P2P Lending' },
    ],
  },
  {
    id: 'other_asset', label: 'Other', icon: '➕', count: 1,
    types: [{ id: 'other_asset', label: 'Other Asset' }],
  },
];

type LiabilityEntry = { id: string; label: string; icon: string };

const LIABILITY_TYPES: LiabilityEntry[] = [
  { id: 'home_loan',       label: 'Home Loan',       icon: '🏠' },
  { id: 'vehicle_loan',    label: 'Vehicle Loan',    icon: '🚗' },
  { id: 'personal_loan',   label: 'Personal Loan',   icon: '👤' },
  { id: 'education_loan',  label: 'Education Loan',  icon: '🎓' },
  { id: 'credit_card',     label: 'Credit Card',     icon: '💳' },
  { id: 'gold_loan',       label: 'Gold Loan',       icon: '🥇' },
  { id: 'business_loan',   label: 'Business Loan',   icon: '💼' },
  { id: 'friends_family',  label: 'Friends / Family', icon: '🤝' },
  { id: 'other_liability', label: 'Other',           icon: '📦' },
];

// ─── Navigation stack steps ───────────────────────────────────────────────────
type Step =
  | { kind: 'asset_categories' }
  | { kind: 'asset_subcats'; cat: Category }
  | { kind: 'asset_types'; catLabel: string; types: AssetEntry[] }
  | { kind: 'liability_types' }
  | { kind: 'form'; mode: 'ASSET' | 'LIABILITY'; category: string; typeLabel: string };

// ─── Grid button ─────────────────────────────────────────────────────────────
const GridBtn: React.FC<{ icon?: string; label: string; sub?: string; onClick: () => void }> = ({ icon, label, sub, onClick }) => (
  <button type="button" onClick={onClick} style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: '14px 8px', borderRadius: 12,
    border: '1px solid var(--border)', background: 'var(--bg-elevated)',
    cursor: 'pointer', textAlign: 'center', transition: 'all 0.12s',
    minHeight: 80,
  }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLButtonElement).style.border = '1.5px solid var(--primary)';
      (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-dim)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLButtonElement).style.border = '1px solid var(--border)';
      (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)';
    }}
  >
    {icon && <span style={{ fontSize: 22 }}>{icon}</span>}
    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{label}</span>
    {sub && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{sub}</span>}
  </button>
);

// ─── Main modal ───────────────────────────────────────────────────────────────
interface Props {
  defaultMode?: 'ASSET' | 'LIABILITY';
  onClose: () => void;
  onSuccess: () => void;
}

const AddWealthItemModal: React.FC<Props> = ({ defaultMode = 'ASSET', onClose, onSuccess }) => {
  const [stack, setStack] = useState<Step[]>([
    defaultMode === 'ASSET'
      ? { kind: 'asset_categories' }
      : { kind: 'liability_types' },
  ]);

  const current = stack[stack.length - 1];
  const push = (s: Step) => setStack(p => [...p, s]);
  const pop  = () => setStack(p => p.slice(0, -1));

  const [name, setName]               = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [amountInvested, setAmtInv]   = useState('');
  const [notes, setNotes]             = useState('');

  const handleSave = (mode: 'ASSET' | 'LIABILITY', category: string, typeLabel: string) => {
    if (!name.trim() || !currentValue) return;
    saveWealthItem({
      id: Date.now().toString(),
      mode, category, typeLabel,
      name: name.trim(),
      currentValue: parseFloat(currentValue),
      amountInvested: amountInvested ? parseFloat(amountInvested) : undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    onSuccess();
    onClose();
  };

  const renderStep = () => {
    if (current.kind === 'asset_categories') {
      return (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Select Asset Type
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {ASSET_CATEGORIES.map(cat => (
              <GridBtn key={cat.id} icon={cat.icon} label={cat.label}
                sub={`${cat.count} type${cat.count !== 1 ? 's' : ''}`}
                onClick={() => {
                  if (cat.subcats) {
                    push({ kind: 'asset_subcats', cat });
                  } else if (cat.types?.length === 1) {
                    push({ kind: 'form', mode: 'ASSET', category: cat.label, typeLabel: cat.types[0].label });
                  } else {
                    push({ kind: 'asset_types', catLabel: cat.label, types: cat.types || [] });
                  }
                }}
              />
            ))}
          </div>
        </>
      );
    }

    if (current.kind === 'asset_subcats') {
      return (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            {current.cat.label}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {current.cat.subcats!.map(sc => (
              <GridBtn key={sc.id} label={sc.label}
                sub={`${sc.types.length} type${sc.types.length !== 1 ? 's' : ''}`}
                onClick={() => push({ kind: 'asset_types', catLabel: `${current.cat.label} › ${sc.label}`, types: sc.types })}
              />
            ))}
          </div>
        </>
      );
    }

    if (current.kind === 'asset_types') {
      return (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            {current.catLabel}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {current.types.map(t => (
              <GridBtn key={t.id} label={t.label}
                onClick={() => push({ kind: 'form', mode: 'ASSET', category: current.catLabel.split(' › ')[0], typeLabel: t.label })}
              />
            ))}
          </div>
        </>
      );
    }

    if (current.kind === 'liability_types') {
      return (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Select Loan / Liability Type
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {LIABILITY_TYPES.map(t => (
              <GridBtn key={t.id} icon={t.icon} label={t.label}
                onClick={() => push({ kind: 'form', mode: 'LIABILITY', category: t.label, typeLabel: t.label })}
              />
            ))}
          </div>
        </>
      );
    }

    if (current.kind === 'form') {
      return (
        <>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
              {current.mode === 'ASSET' ? 'Asset Details' : 'Liability Details'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{current.typeLabel}</div>
          </div>

          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Name *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder={`e.g. My ${current.typeLabel}`} required autoFocus />
            </div>

            <div className="form-group">
              <label>Current Value *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" step="0.01" min="0" value={currentValue}
                  onChange={e => setCurrentValue(e.target.value)}
                  placeholder="0.00" style={{ flex: 1 }} required />
                <div style={{
                  display: 'flex', alignItems: 'center', padding: '0 10px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', flexShrink: 0,
                }}>INR ₹</div>
              </div>
            </div>

            <div className="form-group">
              <label>
                {current.mode === 'LIABILITY' ? 'Amount Borrowed' : 'Amount Invested'}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (optional)</span>
              </label>
              <input type="number" step="0.01" min="0" value={amountInvested}
                onChange={e => setAmtInv(e.target.value)} placeholder="0.00" />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Bank name, account number, tags…" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} type="button" onClick={pop}>← Back</button>
            <button className="btn btn-primary" style={{ flex: 2 }} type="button"
              disabled={!name.trim() || !currentValue}
              onClick={() => handleSave(current.mode, current.category, current.typeLabel)}>
              Save
            </button>
          </div>
        </>
      );
    }

    return null;
  };

  const isRootStep = current.kind === 'asset_categories' || current.kind === 'liability_types';
  const currentMode: 'ASSET' | 'LIABILITY' = current.kind === 'liability_types' ? 'LIABILITY' : 'ASSET';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500, width: '95vw' }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              {current.kind === 'form'
                ? `Add ${current.mode === 'ASSET' ? 'Asset' : 'Liability'}`
                : 'Add Asset / Liability'}
            </h3>
            {!isRootStep && current.kind !== 'form' && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {current.kind === 'asset_subcats' ? current.cat.label :
                 current.kind === 'asset_types' ? current.catLabel : ''}
              </div>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Asset / Liability toggle — root step only */}
        {isRootStep && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginBottom: 20, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <button type="button"
              onClick={() => setStack([{ kind: 'asset_categories' }])}
              style={{
                padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: currentMode === 'ASSET' ? 'var(--primary)' : 'var(--bg-elevated)',
                color: currentMode === 'ASSET' ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}>
              📦 Asset
            </button>
            <button type="button"
              onClick={() => setStack([{ kind: 'liability_types' }])}
              style={{
                padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                borderLeft: '1px solid var(--border)',
                background: currentMode === 'LIABILITY' ? 'var(--expense)' : 'var(--bg-elevated)',
                color: currentMode === 'LIABILITY' ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}>
              📉 Liability
            </button>
          </div>
        )}

        {/* Back button for drill-down steps */}
        {!isRootStep && current.kind !== 'form' && (
          <button type="button" onClick={pop} style={{
            display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: 'var(--primary)', fontWeight: 600, padding: 0,
          }}>
            ← All categories
          </button>
        )}

        <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 2 }}>
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default AddWealthItemModal;

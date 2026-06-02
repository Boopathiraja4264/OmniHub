import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bankAccountApi, creditCardApi, transactionApi } from '../../services/api';
import FilterDropdown from '../../components/FilterDropdown';
import DatePicker from '../../components/DatePicker';
import { BankAccount, CreditCard } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────
const INDIA_BANKS = [
  'State Bank of India', 'Bank of Baroda', 'Bank of India', 'Bank of Maharashtra',
  'Canara Bank', 'Central Bank of India', 'Indian Bank', 'Indian Overseas Bank',
  'Punjab & Sind Bank', 'Punjab National Bank', 'UCO Bank', 'Union Bank of India',
  'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Yes Bank',
  'IDFC First Bank', 'IndusInd Bank', 'Bandhan Bank', 'Federal Bank', 'IDBI Bank',
  'RBL Bank', 'South Indian Bank', 'Karur Vysya Bank', 'Karnataka Bank',
  'City Union Bank', 'Tamilnad Mercantile Bank', 'Catholic Syrian Bank',
  'DCB Bank', 'CSB Bank', 'Dhanlaxmi Bank', 'Jammu & Kashmir Bank',
  'Nainital Bank', 'Lakshmi Vilas Bank',
  'AU Small Finance Bank', 'Equitas Small Finance Bank', 'Ujjivan Small Finance Bank',
  'Jana Small Finance Bank', 'ESAF Small Finance Bank', 'Suryoday Small Finance Bank',
  'Fincare Small Finance Bank', 'Capital Small Finance Bank', 'Utkarsh Small Finance Bank',
  'North East Small Finance Bank', 'Shivalik Small Finance Bank', 'Unity Small Finance Bank',
  'Airtel Payments Bank', 'India Post Payments Bank', 'FINO Payments Bank',
  'Jio Payments Bank', 'NSDL Payments Bank', 'Paytm Payments Bank',
  'DBS Bank', 'HSBC', 'Standard Chartered', 'Citibank', 'Deutsche Bank',
  'Barclays', 'BNP Paribas',
];

const ACCOUNT_COLOURS = ['#6b7280', '#3b82f6', '#22c55e', '#f97316', '#ec4899', '#a855f7'];
const ACCOUNT_ICONS = ['🏦', '🏪', '💳', '💸', '📱', '💰', '🏧', '🌐', '🔄', '📦', '🎁'];

function getStoredColour(key: string) { return localStorage.getItem(`acc_colour_${key}`) || ACCOUNT_COLOURS[1]; }
function getStoredIcon(key: string) { return localStorage.getItem(`acc_icon_${key}`) || ACCOUNT_ICONS[0]; }
function saveColour(key: string, c: string) { localStorage.setItem(`acc_colour_${key}`, c); }
function saveIcon(key: string, ic: string) { localStorage.setItem(`acc_icon_${key}`, ic); }

// ─── Shared helpers ───────────────────────────────────────────────────────────
const EfBadge: React.FC = () => (
  <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
    background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.3)',
    letterSpacing: '0.05em' }}>EF</span>
);

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

const NetworkLogo: React.FC<{ type?: string }> = ({ type }) => {
  if (!type || type === 'OTHER') return null;
  const styles: Record<string, React.CSSProperties> = {
    VISA: { background: '#1a1f71', color: 'white', padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 900, fontStyle: 'italic', letterSpacing: -0.5, display: 'inline-block' },
    AMEX: { background: '#007bc1', color: 'white', padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, display: 'inline-block' },
    RUPAY: { background: 'linear-gradient(135deg, #005b9f 0%, #e87722 100%)', color: 'white', padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, display: 'inline-block' },
    DISCOVER: { background: '#f76f20', color: 'white', padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, display: 'inline-block' },
  };
  if (type === 'MASTERCARD') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', position: 'relative', width: 30, height: 18 }}>
        <span style={{ position: 'absolute', left: 0, width: 18, height: 18, borderRadius: '50%', background: '#eb001b', opacity: 0.95 }} />
        <span style={{ position: 'absolute', right: 0, width: 18, height: 18, borderRadius: '50%', background: '#f79e1b', opacity: 0.85 }} />
      </span>
    );
  }
  const labels: Record<string, string> = { VISA: 'VISA', AMEX: 'AMEX', RUPAY: 'RuPay', DISCOVER: 'DISC' };
  return <span style={styles[type]}>{labels[type]}</span>;
};

const AccTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const colors: Record<string, string> = { SAVINGS: 'var(--income-dim)', CURRENT: 'rgba(14,165,233,0.15)', SALARY: 'rgba(245,158,11,0.15)' };
  const textColors: Record<string, string> = { SAVINGS: 'var(--income)', CURRENT: 'var(--sky-blue)', SALARY: 'var(--warning)' };
  return (
    <span style={{
      background: colors[type] || 'var(--bg-elevated)', color: textColors[type] || 'var(--text-muted)',
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
    }}>
      {type}
    </span>
  );
};

// ─── Colour + Icon pickers (shared UI) ───────────────────────────────────────
const ColourPicker: React.FC<{ value: string; onChange: (c: string) => void }> = ({ value, onChange }) => (
  <div className="form-group">
    <label>Colour</label>
    <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
      {ACCOUNT_COLOURS.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)} style={{
          width: 26, height: 26, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', flexShrink: 0,
          outline: value === c ? '3px solid var(--primary)' : '3px solid transparent',
          outlineOffset: 2, transition: 'outline 0.1s',
        }} />
      ))}
    </div>
  </div>
);

const IconPicker: React.FC<{ value: string; onChange: (ic: string) => void }> = ({ value, onChange }) => (
  <div className="form-group">
    <label>Icon</label>
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 4 }}>
      {ACCOUNT_ICONS.map(ic => (
        <button key={ic} type="button" onClick={() => onChange(ic)} style={{
          width: 34, height: 34, borderRadius: 8,
          border: `1.5px solid ${value === ic ? 'var(--primary)' : 'var(--border)'}`,
          background: value === ic ? 'var(--primary-dim)' : 'var(--bg-elevated)',
          fontSize: 16, cursor: 'pointer', transition: 'all 0.1s',
        }}>
          {ic}
        </button>
      ))}
    </div>
  </div>
);

// ─── Unified Add Account Modal ────────────────────────────────────────────────
type AccountKind = 'BANK' | 'CREDIT_CARD' | 'CASH' | 'WALLET' | 'OTHER';

const KIND_OPTIONS: { kind: AccountKind; label: string; icon: string }[] = [
  { kind: 'BANK',        label: 'Bank account', icon: '🏦' },
  { kind: 'CREDIT_CARD', label: 'Credit card',  icon: '💳' },
  { kind: 'CASH',        label: 'Cash',          icon: '💵' },
  { kind: 'WALLET',      label: 'Wallet',        icon: '👛' },
  { kind: 'OTHER',       label: 'Other',          icon: '📦' },
];

interface AddAccountModalProps {
  defaultKind?: AccountKind;
  onClose: () => void;
  onSuccess: () => void;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ defaultKind = 'BANK', onClose, onSuccess }) => {
  const [kind, setKind] = useState<AccountKind>(defaultKind);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const [name, setName]                   = useState('');
  const [bank, setBank]                   = useState('');
  const [lastFour, setLastFour]           = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [balanceDate, setBalanceDate]     = useState(today);
  const [colour, setColour]               = useState(ACCOUNT_COLOURS[1]);
  const [icon, setIcon]                   = useState(ACCOUNT_ICONS[0]);
  const [isDefault, setIsDefault]         = useState(false);
  const [emergencyFund, setEmergencyFund] = useState(false);
  const [accountSubtype, setAccountSubtype] = useState('SAVINGS');
  const [cardType, setCardType]           = useState('');
  const [creditLimit, setCreditLimit]     = useState('');
  const [billingDate, setBillingDate]     = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');

  const bankOptions = INDIA_BANKS.map(b => ({ label: b, value: b }));
  const showBank = kind === 'BANK' || kind === 'CREDIT_CARD';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (kind === 'CREDIT_CARD') {
        const res = await creditCardApi.create({
          name, bank: bank || undefined, cardType: cardType || undefined,
          lastFourDigits: lastFour || undefined,
          creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
          billingDate: billingDate ? parseInt(billingDate) : undefined,
          paymentDueDate: paymentDueDate ? parseInt(paymentDueDate) : undefined,
          balanceDate: balanceDate || undefined,
          openingOutstanding: openingBalance ? parseFloat(openingBalance) : undefined,
        });
        if (res.data?.id) { saveColour(`card_${res.data.id}`, colour); saveIcon(`card_${res.data.id}`, icon); }
      } else {
        const accountType = kind === 'BANK' ? accountSubtype : kind;
        const res = await bankAccountApi.create({
          name, bankName: bank || undefined, accountType,
          openingBalance: parseFloat(openingBalance) || 0,
          balanceDate: balanceDate || undefined, isDefault, emergencyFund,
        });
        if (res.data?.id) { saveColour(`bank_${res.data.id}`, colour); saveIcon(`bank_${res.data.id}`, icon); }
      }
      onSuccess();
      onClose();
    } catch {} finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480, width: '95vw' }}>
        <div className="modal-header">
          <h3 className="modal-title">Add Account</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {KIND_OPTIONS.map(opt => (
            <button key={opt.kind} type="button" onClick={() => setKind(opt.kind)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${kind === opt.kind ? 'var(--primary)' : 'var(--border)'}`,
              background: kind === opt.kind ? 'var(--primary-dim)' : 'var(--bg-elevated)',
              color: kind === opt.kind ? 'var(--primary)' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}>
              <span>{opt.icon}</span><span>{opt.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ marginBottom: 20 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Account Name</label>
              <input value={name} onChange={e => setName(e.target.value)} required
                placeholder={kind === 'CREDIT_CARD' ? 'e.g. Amazon Pay Card' : kind === 'CASH' ? 'e.g. Wallet Cash' : 'e.g. SBI Savings'} />
            </div>

            {showBank && (
              <>
                <div className="form-group">
                  <label>{kind === 'CREDIT_CARD' ? 'Issuing Bank' : 'Bank'} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <FilterDropdown value={bank} options={bankOptions} onChange={v => setBank(v as string)} placeholder="Select bank..." fullWidth />
                </div>
                <div className="form-group">
                  <label>Last 4 Digits <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input value={lastFour} maxLength={4}
                    onChange={e => setLastFour(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 1234" />
                </div>
              </>
            )}

            {kind === 'BANK' && (
              <div className="form-group">
                <label>Account Type</label>
                <FilterDropdown value={accountSubtype}
                  options={[{ label: 'Savings', value: 'SAVINGS' }, { label: 'Current', value: 'CURRENT' }, { label: 'Salary', value: 'SALARY' }]}
                  onChange={v => setAccountSubtype(v as string)} fullWidth />
              </div>
            )}

            {kind === 'CREDIT_CARD' && (
              <>
                <div className="form-group">
                  <label>Card Network</label>
                  <FilterDropdown value={cardType}
                    options={[
                      { label: 'Visa', value: 'VISA' }, { label: 'Mastercard', value: 'MASTERCARD' },
                      { label: 'RuPay', value: 'RUPAY' }, { label: 'American Express', value: 'AMEX' },
                      { label: 'Discover', value: 'DISCOVER' }, { label: 'Other', value: 'OTHER' },
                    ]}
                    onChange={v => setCardType(v as string)} placeholder="Select network..." fullWidth />
                </div>
                <div className="form-group">
                  <label>Credit Limit (₹)</label>
                  <input type="number" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} placeholder="e.g. 150000" />
                </div>
                <div className="form-group">
                  <label>Statement Date <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(day)</span></label>
                  <input type="number" min="1" max="31" value={billingDate} onChange={e => setBillingDate(e.target.value)} placeholder="e.g. 18" />
                </div>
                <div className="form-group">
                  <label>Payment Due Date <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(day)</span></label>
                  <input type="number" min="1" max="31" value={paymentDueDate} onChange={e => setPaymentDueDate(e.target.value)} placeholder="e.g. 5" />
                </div>
              </>
            )}

            <div className="form-group">
              <label>{kind === 'CREDIT_CARD' ? 'Opening Outstanding' : 'Opening Balance'}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" step="0.01" min="0" value={openingBalance}
                  onChange={e => setOpeningBalance(e.target.value)} placeholder="0.00" style={{ flex: 1 }} />
                <div style={{
                  display: 'flex', alignItems: 'center', padding: '0 12px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', flexShrink: 0,
                }}>₹ INR</div>
              </div>
            </div>

            <div className="form-group">
              <label>Balance as of</label>
              <DatePicker value={balanceDate} onChange={e => setBalanceDate(e.target.value)} fullWidth />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Your balance on this date.</div>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <ColourPicker value={colour} onChange={setColour} />
              <IconPicker value={icon} onChange={setIcon} />
            </div>

            {kind !== 'CREDIT_CARD' && (
              <>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <input type="checkbox" checked={emergencyFund} onChange={e => setEmergencyFund(e.target.checked)}
                        style={{ accentColor: 'var(--warning)', marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>Part of emergency fund</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Counts toward your runway in Essentials.</div>
                      </div>
                    </div>
                  </label>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)}
                        style={{ accentColor: 'var(--primary)', marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>Set as default account</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Pre-selected when adding expenses or income.</div>
                      </div>
                    </div>
                  </label>
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add Account'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Edit Bank Account Modal ──────────────────────────────────────────────────
interface EditBankModalProps {
  account: BankAccount;
  onClose: () => void;
  onSuccess: () => void;
}

const EditBankModal: React.FC<EditBankModalProps> = ({ account, onClose, onSuccess }) => {
  const [saving, setSaving] = useState(false);
  const storeKey = `bank_${account.id}`;
  const isBankType = ['SAVINGS', 'CURRENT', 'SALARY'].includes(account.accountType);

  const [name, setName]                   = useState(account.name);
  const [bankName, setBankName]           = useState(account.bankName || '');
  const [lastFour, setLastFour]           = useState(localStorage.getItem(`bank_last4_${account.id}`) || '');
  const [accountType, setAccountType]     = useState(account.accountType);
  const [openingBalance, setOpeningBalance] = useState(String(account.openingBalance || ''));
  const [balanceDate, setBalanceDate]     = useState(account.balanceDate || new Date().toISOString().split('T')[0]);
  const [isDefault, setIsDefault]         = useState(account.isDefault);
  const [emergencyFund, setEmergencyFund] = useState(account.emergencyFund || false);
  const [colour, setColour]               = useState(getStoredColour(storeKey));
  const [icon, setIcon]                   = useState(getStoredIcon(storeKey));

  const bankOptions = INDIA_BANKS.map(b => ({ label: b, value: b }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await bankAccountApi.update(account.id, {
        name, bankName: bankName || undefined, accountType,
        openingBalance: parseFloat(openingBalance) || 0,
        balanceDate: balanceDate || undefined, isDefault, emergencyFund,
      });
      saveColour(storeKey, colour);
      saveIcon(storeKey, icon);
      if (lastFour) localStorage.setItem(`bank_last4_${account.id}`, lastFour);
      onSuccess();
      onClose();
    } catch {} finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480, width: '95vw' }}>
        <div className="modal-header">
          <h3 className="modal-title">Edit Account</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ marginBottom: 20 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Account Name</label>
              <input value={name} onChange={e => setName(e.target.value)} required />
            </div>

            {isBankType && (
              <>
                <div className="form-group">
                  <label>Bank <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <FilterDropdown value={bankName} options={bankOptions} onChange={v => setBankName(v as string)} placeholder="Select bank..." fullWidth />
                </div>
                <div className="form-group">
                  <label>Last 4 Digits <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input value={lastFour} maxLength={4}
                    onChange={e => setLastFour(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 1234" />
                </div>
                <div className="form-group">
                  <label>Account Type</label>
                  <FilterDropdown value={accountType}
                    options={[{ label: 'Savings', value: 'SAVINGS' }, { label: 'Current', value: 'CURRENT' }, { label: 'Salary', value: 'SALARY' }]}
                    onChange={v => setAccountType(v as string)} fullWidth />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Opening Balance (₹)</label>
              <input type="number" step="0.01" value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Balance as of</label>
              <DatePicker value={balanceDate} onChange={e => setBalanceDate(e.target.value)} fullWidth />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <ColourPicker value={colour} onChange={setColour} />
              <IconPicker value={icon} onChange={setIcon} />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label style={{ cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <input type="checkbox" checked={emergencyFund} onChange={e => setEmergencyFund(e.target.checked)}
                    style={{ accentColor: 'var(--warning)', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Part of emergency fund</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Counts toward your runway in Essentials.</div>
                  </div>
                </div>
              </label>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label style={{ cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)}
                    style={{ accentColor: 'var(--primary)', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Set as default account</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Pre-selected when adding expenses or income.</div>
                  </div>
                </div>
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Edit Credit Card Modal ───────────────────────────────────────────────────
interface EditCardModalProps {
  card: CreditCard;
  onClose: () => void;
  onSuccess: () => void;
}

const EditCardModal: React.FC<EditCardModalProps> = ({ card, onClose, onSuccess }) => {
  const [saving, setSaving] = useState(false);
  const storeKey = `card_${card.id}`;

  const [name, setName]                   = useState(card.name);
  const [bank, setBank]                   = useState(card.bank || '');
  const [cardType, setCardType]           = useState(card.cardType || '');
  const [lastFourDigits, setLastFour]     = useState(card.lastFourDigits || '');
  const [creditLimit, setCreditLimit]     = useState(String(card.creditLimit || ''));
  const [billingDate, setBillingDate]     = useState(String(card.billingDate || ''));
  const [paymentDueDate, setPaymentDueDate] = useState(String(card.paymentDueDate || ''));
  const [balanceDate, setBalanceDate]     = useState(card.balanceDate || new Date().toISOString().split('T')[0]);
  const [openingOutstanding, setOutstanding] = useState(String(card.openingOutstanding || ''));
  const [colour, setColour]               = useState(getStoredColour(storeKey));
  const [icon, setIcon]                   = useState(getStoredIcon(storeKey));

  const bankOptions = INDIA_BANKS.map(b => ({ label: b, value: b }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await creditCardApi.update(card.id, {
        name, bank: bank || undefined, cardType: cardType || undefined,
        lastFourDigits: lastFourDigits || undefined,
        creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
        billingDate: billingDate ? parseInt(billingDate) : undefined,
        paymentDueDate: paymentDueDate ? parseInt(paymentDueDate) : undefined,
        balanceDate: balanceDate || undefined,
        openingOutstanding: openingOutstanding ? parseFloat(openingOutstanding) : undefined,
      });
      saveColour(storeKey, colour);
      saveIcon(storeKey, icon);
      onSuccess();
      onClose();
    } catch {} finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480, width: '95vw' }}>
        <div className="modal-header">
          <h3 className="modal-title">Edit Credit Card</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ marginBottom: 20 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Card Name</label>
              <input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Issuing Bank <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <FilterDropdown value={bank} options={bankOptions} onChange={v => setBank(v as string)} placeholder="Select bank..." fullWidth />
            </div>
            <div className="form-group">
              <label>Last 4 Digits <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input value={lastFourDigits} maxLength={4}
                onChange={e => setLastFour(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 1234" />
            </div>
            <div className="form-group">
              <label>Card Network</label>
              <FilterDropdown value={cardType}
                options={[
                  { label: 'Visa', value: 'VISA' }, { label: 'Mastercard', value: 'MASTERCARD' },
                  { label: 'RuPay', value: 'RUPAY' }, { label: 'American Express', value: 'AMEX' },
                  { label: 'Discover', value: 'DISCOVER' }, { label: 'Other', value: 'OTHER' },
                ]}
                onChange={v => setCardType(v as string)} placeholder="Select network..." fullWidth />
            </div>
            <div className="form-group">
              <label>Credit Limit (₹)</label>
              <input type="number" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} placeholder="e.g. 150000" />
            </div>
            <div className="form-group">
              <label>Statement Date <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(day)</span></label>
              <input type="number" min="1" max="31" value={billingDate} onChange={e => setBillingDate(e.target.value)} placeholder="e.g. 18" />
            </div>
            <div className="form-group">
              <label>Payment Due Date <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(day)</span></label>
              <input type="number" min="1" max="31" value={paymentDueDate} onChange={e => setPaymentDueDate(e.target.value)} placeholder="e.g. 5" />
            </div>
            <div className="form-group">
              <label>Balance as of</label>
              <DatePicker value={balanceDate} onChange={e => setBalanceDate(e.target.value)} fullWidth />
            </div>
            <div className="form-group">
              <label>Outstanding as of that date (₹)</label>
              <input type="number" step="0.01" value={openingOutstanding} onChange={e => setOutstanding(e.target.value)} placeholder="0.00" />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <ColourPicker value={colour} onChange={setColour} />
              <IconPicker value={icon} onChange={setIcon} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Bank Accounts Tab ────────────────────────────────────────────────────────
const BankTab: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [editTarget, setEditTarget] = useState<BankAccount | null>(null);
  const BANK_TYPES = ['SAVINGS', 'CURRENT', 'SALARY'];

  const load = () => bankAccountApi.getAll().then(r => {
    const all = Array.isArray(r.data) ? r.data : [];
    setAccounts(all.filter(a => BANK_TYPES.includes(a.accountType)));
  });
  useEffect(() => { load(); }, [refreshKey]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remove this bank account?')) return;
    await bankAccountApi.delete(id);
    load();
  };

  const handleSetDefault = async (id: number) => {
    try { await bankAccountApi.setDefault(id); load(); }
    catch (e: any) { alert('Failed: ' + (e.response?.data?.error || e.message)); }
  };

  const handleToggleEf = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await bankAccountApi.toggleEmergencyFund(id);
    load();
  };

  return (
    <>
      {accounts.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
          No bank accounts added yet.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {accounts.map(acc => {
          const balanceColor = acc.currentBalance >= 0 ? 'var(--income)' : 'var(--expense)';
          return (
            <div key={acc.id} className="card" onClick={() => navigate(`/accounts/bank/${acc.id}`)}
              style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{acc.name}</span>
                    <AccTypeBadge type={acc.accountType} />
                    {acc.emergencyFund && <EfBadge />}
                    {acc.isDefault ? (
                      <span style={{ background: 'var(--primary)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>DEFAULT</span>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); handleSetDefault(acc.id); }} style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                        border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1.4,
                      }}>Set Default</button>
                    )}
                    <button onClick={e => handleToggleEf(e, acc.id)} style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                      border: acc.emergencyFund ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border)',
                      background: acc.emergencyFund ? 'rgba(245,158,11,0.1)' : 'transparent',
                      color: acc.emergencyFund ? 'var(--warning)' : 'var(--text-muted)', cursor: 'pointer', lineHeight: 1.4,
                    }}>🛡 EF</button>
                  </div>
                  {acc.bankName && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{acc.bankName}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); setEditTarget(acc); }}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); handleDelete(acc.id); }}>Delete</button>
                </div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: '16px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Current Balance</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: balanceColor, letterSpacing: -0.5 }}>{fmt(acc.currentBalance)}</div>
                {acc.openingBalance > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {acc.balanceDate
                      ? `As of ${new Date(acc.balanceDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}: ${fmt(acc.openingBalance)}`
                      : `Opening: ${fmt(acc.openingBalance)}`}
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'var(--income-dim)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Total Inflow</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--income)' }}>+{fmt(acc.totalInflow)}</div>
                </div>
                <div style={{ background: 'var(--expense-dim)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Total Outflow</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--expense)' }}>-{fmt(acc.totalOutflow)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {editTarget && (
        <EditBankModal account={editTarget} onClose={() => setEditTarget(null)} onSuccess={load} />
      )}
    </>
  );
};

// ─── Simple Account Tab (Cash / Wallet / Other) ───────────────────────────────
const SimpleAccountTab: React.FC<{ type: 'CASH' | 'WALLET' | 'OTHER'; refreshKey: number }> = ({ type, refreshKey }) => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [editTarget, setEditTarget] = useState<BankAccount | null>(null);

  const load = () => bankAccountApi.getAll().then(r => {
    const all = Array.isArray(r.data) ? r.data : [];
    setAccounts(all.filter(a => a.accountType === type));
  });
  useEffect(() => { load(); }, [refreshKey, type]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remove this account?')) return;
    await bankAccountApi.delete(id);
    load();
  };

  const handleToggleEf = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await bankAccountApi.toggleEmergencyFund(id);
    load();
  };

  const KIND_ICON: Record<string, string> = { CASH: '💵', WALLET: '👛', OTHER: '📦' };

  return (
    <>
      {accounts.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
          No {type.toLowerCase()} accounts added yet.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {accounts.map(acc => {
          const balanceColor = acc.currentBalance >= 0 ? 'var(--income)' : 'var(--expense)';
          return (
            <div key={acc.id} className="card" onClick={() => navigate(`/accounts/bank/${acc.id}`)}
              style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{KIND_ICON[acc.accountType] || '📦'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{acc.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {acc.accountType.charAt(0) + acc.accountType.slice(1).toLowerCase()}
                      {acc.emergencyFund && <span style={{ marginLeft: 6 }}><EfBadge /></span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={e => handleToggleEf(e, acc.id)} style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                    border: acc.emergencyFund ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border)',
                    background: acc.emergencyFund ? 'rgba(245,158,11,0.1)' : 'transparent',
                    color: acc.emergencyFund ? 'var(--warning)' : 'var(--text-muted)', cursor: 'pointer', lineHeight: 1.4,
                  }}>🛡 EF</button>
                  <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); setEditTarget(acc); }}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); handleDelete(acc.id); }}>Delete</button>
                </div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: '14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Balance</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: balanceColor, letterSpacing: -0.5 }}>{fmt(acc.currentBalance)}</div>
              </div>
            </div>
          );
        })}
      </div>
      {editTarget && (
        <EditBankModal account={editTarget} onClose={() => setEditTarget(null)} onSuccess={load} />
      )}
    </>
  );
};

// ─── Credit Cards Tab ─────────────────────────────────────────────────────────
const CardsTab: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [payModal, setPayModal] = useState<CreditCard | null>(null);
  const [editTarget, setEditTarget] = useState<CreditCard | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  const [categoryData, setCategoryData] = useState<Record<number, Record<string, number>>>({});
  const [loadingCategory, setLoadingCategory] = useState<Set<number>>(new Set());
  const [showDebtReport, setShowDebtReport] = useState(false);
  const [payForm, setPayForm] = useState({ bankAccountId: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });

  const load = () => {
    creditCardApi.getAll().then(r => setCards(Array.isArray(r.data) ? r.data : []));
    bankAccountApi.getAll().then(r => setBankAccounts(Array.isArray(r.data) ? r.data : []));
  };
  useEffect(() => { load(); }, [refreshKey]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this card?')) return;
    await creditCardApi.delete(id);
    load();
  };

  const handlePayBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal) return;
    setSaving(true);
    try {
      await transactionApi.create({
        description: `CC Payment – ${payModal.name}`,
        amount: parseFloat(payForm.amount),
        type: 'EXPENSE', category: 'EMI', date: payForm.date,
        paymentSource: 'BANK',
        bankAccountId: payForm.bankAccountId ? parseInt(payForm.bankAccountId) : undefined,
        notes: payForm.notes || undefined,
      });
      setPayModal(null);
      setPayForm({ bankAccountId: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
    } catch {} finally { setSaving(false); }
  };

  const displayName = (card: CreditCard) => card.lastFourDigits ? `${card.name} ••••${card.lastFourDigits}` : card.name;
  const CAT_COLORS = ['#c9a84c','#4caf82','#e05c6a','#6a8fe8','#a874d4','#e09c5c','#5cc4e0','#e0d45c','#a8e05c','#e07a5c'];
  const totalDebt = cards.reduce((s, c) => s + (c.outstanding || 0), 0);
  const debtSorted = [...cards].sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0));

  const toggleDrilldown = async (cardId: number) => {
    if (expandedCardId === cardId) { setExpandedCardId(null); return; }
    setExpandedCardId(cardId);
    if (categoryData[cardId]) return;
    setLoadingCategory(prev => new Set(prev).add(cardId));
    try {
      const res = await transactionApi.getByCard(cardId);
      const totals: Record<string, number> = {};
      for (const t of res.data) totals[t.category] = (totals[t.category] || 0) + t.amount;
      setCategoryData(prev => ({ ...prev, [cardId]: totals }));
    } finally {
      setLoadingCategory(prev => { const s = new Set(prev); s.delete(cardId); return s; });
    }
  };

  return (
    <>
      {cards.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="btn btn-secondary" onClick={() => { setExpandedCardId(null); setShowDebtReport(true); }}>
            Debt Report
          </button>
        </div>
      )}

      {cards.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
          No credit cards added yet.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {cards.map(card => {
          const pct = card.creditLimit && card.creditLimit > 0 ? (card.outstanding / card.creditLimit) * 100 : 0;
          const color = pct >= 90 ? 'var(--expense)' : pct >= 70 ? '#e0a030' : 'var(--income)';
          return (
            <div key={card.id} className="card" onClick={() => navigate(`/accounts/card/${card.id}`)}
              style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <NetworkLogo type={card.cardType} />
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{displayName(card)}</span>
                  </div>
                  {card.bank && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{card.bank}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); setEditTarget(card); }}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); handleDelete(card.id); }}>Delete</button>
                </div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Current Outstanding</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: -0.5 }}>{fmt(card.outstanding)}</div>
                  </div>
                  {card.creditLimit && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Credit Limit</div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{fmt(card.creditLimit)}</div>
                    </div>
                  )}
                </div>
                {card.creditLimit && card.creditLimit > 0 && (
                  <>
                    <div style={{ background: 'var(--border)', borderRadius: 4, height: 5, marginTop: 10 }}>
                      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 4 }}>
                      {Math.round(pct)}% utilized — {fmt((card.creditLimit || 0) - card.outstanding)} available
                    </div>
                  </>
                )}
              </div>
              {(card.billingDate || card.paymentDueDate) && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  {card.billingDate && <span>Statement: <strong style={{ color: 'var(--text-secondary)' }}>{card.billingDate}th</strong></span>}
                  {card.paymentDueDate && <span>Due: <strong style={{ color: 'var(--text-secondary)' }}>{card.paymentDueDate}th</strong></span>}
                </div>
              )}
              <button className="btn btn-sm btn-secondary" style={{ width: '100%' }}
                onClick={e => { e.stopPropagation(); setPayModal(card); setPayForm({ bankAccountId: '', amount: String(card.outstanding || ''), date: new Date().toISOString().split('T')[0], notes: '' }); }}>
                Record Bill Payment
              </button>
            </div>
          );
        })}
      </div>

      {/* Debt Report */}
      {showDebtReport && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDebtReport(false)}>
          <div className="modal" style={{ maxWidth: 720, width: '95vw' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Credit Debt Report</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Total outstanding <span style={{ fontWeight: 700, color: 'var(--expense)' }}>{fmt(totalDebt)}</span> across {debtSorted.length} card{debtSorted.length !== 1 ? 's' : ''}
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowDebtReport(false)}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, minHeight: 320 }}>
              <div style={{ borderRight: '1px solid var(--border)', paddingRight: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text-muted)', marginBottom: 12 }}>Cards</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {debtSorted.map((card, i) => {
                    const pct = totalDebt > 0 ? ((card.outstanding || 0) / totalDebt) * 100 : 0;
                    const isSelected = expandedCardId === card.id;
                    const color = CAT_COLORS[i % CAT_COLORS.length];
                    return (
                      <div key={card.id} onClick={() => toggleDrilldown(card.id)}
                        style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                          background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                          border: isSelected ? `1px solid ${color}` : '1px solid transparent', transition: 'all 0.12s' }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-elevated)'; }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <NetworkLogo type={card.cardType} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName(card)}</div>
                              {card.bank && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{card.bank}</div>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--expense)' }}>{fmt(card.outstanding || 0)}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Math.round(pct)}% of total</div>
                          </div>
                        </div>
                        <div style={{ background: 'var(--border)', borderRadius: 4, height: 4 }}>
                          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ paddingLeft: 20 }}>
                {expandedCardId === null ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                    Select a card to see<br />category breakdown
                  </div>
                ) : (() => {
                  const selCard = debtSorted.find(c => c.id === expandedCardId)!;
                  const selIdx = debtSorted.findIndex(c => c.id === expandedCardId);
                  const cats = categoryData[expandedCardId];
                  const isLoading = loadingCategory.has(expandedCardId);
                  const catEntries = cats ? Object.entries(cats).sort((a, b) => b[1] - a[1]) : [];
                  const catTotal = catEntries.reduce((s, [, v]) => s + v, 0);
                  return (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--text-muted)', marginBottom: 4 }}>Spend by Category</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                        {displayName(selCard)} · <span style={{ color: 'var(--expense)', fontWeight: 600 }}>{fmt(selCard.outstanding || 0)}</span> outstanding
                      </div>
                      {isLoading ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
                      ) : catEntries.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No transactions found.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {catEntries.map(([cat, amt], ci) => {
                            const catPct = catTotal > 0 ? (amt / catTotal) * 100 : 0;
                            return (
                              <div key={cat}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{cat}</span>
                                  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(amt)}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 34, textAlign: 'right' }}>{Math.round(catPct)}%</span>
                                  </div>
                                </div>
                                <div style={{ background: 'var(--border)', borderRadius: 4, height: 5 }}>
                                  <div style={{ width: `${Math.min(catPct, 100)}%`, height: '100%', background: CAT_COLORS[(selIdx + ci) % CAT_COLORS.length], borderRadius: 4 }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit card modal */}
      {editTarget && (
        <EditCardModal card={editTarget} onClose={() => setEditTarget(null)} onSuccess={load} />
      )}

      {/* Pay Bill Modal */}
      {payModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPayModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Record Bill Payment</h3>
              <button className="close-btn" onClick={() => setPayModal(null)}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Records a bank deduction for paying the bill of <strong>{displayName(payModal)}</strong>.
            </p>
            <form onSubmit={handlePayBill}>
              <div className="form-grid" style={{ marginBottom: 24 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Pay from Bank Account</label>
                  <FilterDropdown value={payForm.bankAccountId}
                    options={bankAccounts.map(b => ({ label: b.name + (b.bankName ? ` (${b.bankName})` : ''), value: String(b.id) }))}
                    onChange={v => setPayForm({ ...payForm, bankAccountId: v as string })}
                    placeholder="Select bank account..." fullWidth />
                </div>
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input type="number" step="0.01" min="1" value={payForm.amount}
                    onChange={e => setPayForm({ ...payForm, amount: e.target.value })} required placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <DatePicker value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} required fullWidth />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} placeholder="e.g. Full payment" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Combined Page ────────────────────────────────────────────────────────────
type Tab = 'bank' | 'cards' | 'cash' | 'wallet' | 'other';

const TAB_KIND: Record<Tab, AccountKind> = {
  bank: 'BANK', cards: 'CREDIT_CARD', cash: 'CASH', wallet: 'WALLET', other: 'OTHER',
};

const AccountsPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('bank');
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => setRefreshKey(k => k + 1);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="page-title">Accounts</h2>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add Account</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {([
          { key: 'bank',   label: 'Bank Accounts' },
          { key: 'cards',  label: 'Credit Cards' },
          { key: 'cash',   label: 'Cash' },
          { key: 'wallet', label: 'Wallet' },
          { key: 'other',  label: 'Other' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'bank'   && <BankTab refreshKey={refreshKey} />}
      {tab === 'cards'  && <CardsTab refreshKey={refreshKey} />}
      {tab === 'cash'   && <SimpleAccountTab type="CASH"   refreshKey={refreshKey} />}
      {tab === 'wallet' && <SimpleAccountTab type="WALLET" refreshKey={refreshKey} />}
      {tab === 'other'  && <SimpleAccountTab type="OTHER"  refreshKey={refreshKey} />}

      {showAddModal && (
        <AddAccountModal
          defaultKind={TAB_KIND[tab]}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default AccountsPage;

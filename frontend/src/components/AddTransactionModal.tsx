import React, { useEffect, useState } from 'react';
import { transactionApi, categoryItemApi, creditCardApi, bankAccountApi } from '../services/api';
import FilterDropdown from './FilterDropdown';
import { Transaction, CreditCard, BankAccount, ExpenseCategory, ExpenseItem, INCOME_CATEGORIES } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialType?: 'INCOME' | 'EXPENSE';
  editing?: Transaction | null;
}

const today = () => new Date().toISOString().split('T')[0];

const emptyForm = {
  amount: '', type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
  category: '', categoryId: '', itemName: '',
  date: today(), notes: '',
  paymentSource: 'BANK', cardId: '', bankAccountId: '',
};

type FormState = typeof emptyForm;

interface PendingExpense extends FormState { _id: number; }

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const AddTransactionModal: React.FC<Props> = ({ open, onClose, onSaved, initialType = 'EXPENSE', editing = null }) => {
  const [form, setForm] = useState({ ...emptyForm, type: initialType });
  const [loading, setLoading] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [defaultBankId, setDefaultBankId] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingExpense[]>([]);
  const [nextId, setNextId] = useState(0);

  useEffect(() => {
    categoryItemApi.getCategories().then(r => {
      const arr = Array.isArray(r.data) ? r.data : [];
      const seen = new Set<string>();
      setExpenseCategories(arr.filter((c: ExpenseCategory) => seen.has(c.name) ? false : !!seen.add(c.name)));
    }).catch(() => {});
    creditCardApi.getAll().then(r => setCards(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    bankAccountApi.getAll().then(r => {
      const arr: BankAccount[] = Array.isArray(r.data) ? r.data : [];
      setBankAccounts(arr);
      const def = arr.find((b: BankAccount) => b.isDefault);
      if (def) setDefaultBankId(def.id);
    }).catch(() => {});
  }, []);

  // Reset / populate form when modal opens
  useEffect(() => {
    if (!open) return;
    setItems([]);
    if (!editing) setPending([]);
    if (editing) {
      setForm({
        amount: String(editing.amount), type: editing.type,
        category: editing.category, categoryId: '', itemName: editing.itemName || '',
        date: editing.date, notes: editing.notes || '',
        paymentSource: editing.paymentSource || 'BANK',
        cardId: editing.cardId ? String(editing.cardId) : '',
        bankAccountId: editing.bankAccountId ? String(editing.bankAccountId) : '',
      });
    } else {
      setForm({
        ...emptyForm,
        type: initialType,
        bankAccountId: defaultBankId ? String(defaultBankId) : '',
      });
    }
  }, [open, editing, initialType, defaultBankId]);

  // When editing and categories load, resolve category id
  useEffect(() => {
    if (!editing || !expenseCategories.length) return;
    const cat = expenseCategories.find(c => c.name === editing.category);
    if (cat) {
      setForm(f => ({ ...f, categoryId: String(cat.id) }));
      categoryItemApi.getItems(cat.id).then(r => setItems(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }
  }, [editing, expenseCategories]);

  const handleCategoryChange = (catId: string) => {
    const cat = expenseCategories.find(c => String(c.id) === catId);
    setForm(f => ({ ...f, category: cat?.name || '', categoryId: catId, itemName: '' }));
    setItems([]);
    if (catId) categoryItemApi.getItems(parseInt(catId)).then(r => setItems(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  };

  const isExpenseAdd = form.type === 'EXPENSE' && !editing;

  const handleAddToList = () => {
    if (!form.category || !form.amount) return;
    if (pending.length >= 50) return;
    setPending(p => [...p, { ...form, _id: nextId }]);
    setNextId(n => n + 1);
    // Reset fields but keep date, payment info
    setForm(f => ({
      ...emptyForm,
      type: 'EXPENSE',
      date: f.date,
      paymentSource: f.paymentSource,
      cardId: f.cardId,
      bankAccountId: f.bankAccountId,
    }));
    setItems([]);
  };

  const buildPayload = (f: FormState) => ({
    ...f,
    description: f.itemName ? `${f.category} – ${f.itemName}` : f.category,
    amount: parseFloat(f.amount),
    itemName: f.itemName || undefined,
    paymentSource: f.type === 'INCOME' ? 'BANK' : (f.paymentSource || undefined),
    cardId: f.cardId ? parseInt(f.cardId) : undefined,
    bankAccountId: f.bankAccountId ? parseInt(f.bankAccountId) : undefined,
  });

  const handleSaveAll = async () => {
    if (pending.length === 0) return;
    setLoading(true);
    try {
      await Promise.all(pending.map(p => transactionApi.create(buildPayload(p))));
      onSaved();
      onClose();
    } catch {
      alert('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Single submit for income or edit modes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) { alert('Please select a category.'); return; }
    setLoading(true);
    try {
      const payload = buildPayload(form);
      if (editing) await transactionApi.update(editing.id, payload);
      else await transactionApi.create(payload);
      onSaved();
      onClose();
    } catch {
      alert('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const pendingTotal = pending.reduce((s, p) => s + parseFloat(p.amount || '0'), 0);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: form.type === 'INCOME' ? 'var(--income)' : 'var(--expense)' }}>
            {editing ? 'Edit' : 'New'} {form.type === 'INCOME' ? 'Income' : 'Expense'}
          </h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={isExpenseAdd ? e => e.preventDefault() : handleSubmit}>
          <div className="form-grid" style={{ marginBottom: 16 }}>

            {/* Amount | Date */}
            <div className="form-group">
              <label>Amount (₹)</label>
              <input type="number" step="0.01" min="0"
                value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>

            {/* EXPENSE: Category | Item */}
            {form.type === 'EXPENSE' && (<>
              <div className="form-group">
                <label>Category <span style={{ color: 'var(--expense)' }}>*</span></label>
                <FilterDropdown
                  value={form.categoryId}
                  options={expenseCategories.map(c => ({ label: c.name, value: String(c.id) }))}
                  onChange={v => handleCategoryChange(v as string)}
                  placeholder="Select category..."
                  fullWidth
                />
              </div>
              <div className="form-group">
                <label>Item <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <FilterDropdown
                  value={form.itemName}
                  options={items.map(i => ({ label: i.name, value: i.name }))}
                  onChange={v => setForm(f => ({ ...f, itemName: v as string }))}
                  placeholder="Select item..."
                  disabled={!form.categoryId || items.length === 0}
                  fullWidth
                />
              </div>
            </>)}

            {/* INCOME: Category | Bank Account */}
            {form.type === 'INCOME' && (<>
              <div className="form-group">
                <label>Category <span style={{ color: 'var(--expense)' }}>*</span></label>
                <FilterDropdown
                  value={form.category}
                  options={INCOME_CATEGORIES.map(c => ({ label: c, value: c }))}
                  onChange={v => setForm(f => ({ ...f, category: v as string }))}
                  placeholder="Select category..."
                  fullWidth
                />
              </div>
              <div className="form-group">
                <label>Deposit to Account</label>
                <FilterDropdown
                  value={form.bankAccountId}
                  options={bankAccounts.map(b => ({ label: b.name + (b.bankName ? ` (${b.bankName})` : ''), value: String(b.id) }))}
                  onChange={v => setForm(f => ({ ...f, bankAccountId: v as string }))}
                  placeholder="Select account..."
                  fullWidth
                />
              </div>
            </>)}

            {/* EXPENSE: Payment Source | Account or Card */}
            {form.type === 'EXPENSE' && (<>
              <div className="form-group">
                <label>Payment Source</label>
                <FilterDropdown
                  value={form.paymentSource}
                  options={[{ label: 'Cash', value: 'CASH' }, { label: 'Bank / UPI', value: 'BANK' }, { label: 'Credit Card', value: 'CREDIT_CARD' }]}
                  onChange={v => {
                    const src = v as string;
                    setForm(f => ({
                      ...f, paymentSource: src, cardId: '',
                      bankAccountId: src === 'BANK' ? String(defaultBankId || '') : '',
                    }));
                  }}
                  fullWidth
                />
              </div>

              {form.paymentSource === 'BANK' && (
                <div className="form-group">
                  <label>Bank Account</label>
                  <FilterDropdown
                    value={form.bankAccountId}
                    options={bankAccounts.map(b => ({ label: b.name + (b.bankName ? ` (${b.bankName})` : ''), value: String(b.id) }))}
                    onChange={v => setForm({ ...form, bankAccountId: v as string })}
                    placeholder="Select account..."
                    fullWidth
                  />
                </div>
              )}

              {form.paymentSource === 'CREDIT_CARD' && (
                <div className="form-group">
                  <label>Credit Card</label>
                  <FilterDropdown
                    value={form.cardId}
                    options={cards.map(c => ({ label: c.lastFourDigits ? `${c.name} ••••${c.lastFourDigits}` : c.name, value: String(c.id) }))}
                    onChange={v => setForm({ ...form, cardId: v as string })}
                    placeholder="Select card..."
                    fullWidth
                  />
                </div>
              )}

              {form.paymentSource === 'CASH' && <div />}
            </>)}

            {/* Notes */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>

          </div>

          {/* Pending list — expense add mode only */}
          {isExpenseAdd && pending.length > 0 && (
            <div style={{ marginBottom: 16, background: 'var(--bg-secondary)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                  Queued ({pending.length}/50)
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--expense)' }}>
                  Total {fmt(pendingTotal)}
                </span>
              </div>
              {pending.map((p, idx) => (
                <div key={p._id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 8px', borderRadius: 6, fontSize: 12,
                  background: idx % 2 === 0 ? 'var(--bg-card)' : 'transparent',
                }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {p.category}{p.itemName ? ` / ${p.itemName}` : ''}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{p.date}</span>
                    <span style={{ fontWeight: 700, color: 'var(--expense)' }}>{fmt(parseFloat(p.amount))}</span>
                    <button type="button" onClick={() => setPending(prev => prev.filter(x => x._id !== p._id))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>

            {isExpenseAdd ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddToList}
                  disabled={!form.category || !form.amount || pending.length >= 50}
                >
                  {pending.length >= 50 ? 'Max 50 reached' : '+ Add to List'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loading || pending.length === 0}
                  onClick={handleSaveAll}
                >
                  {loading ? 'Saving...' : `Save All (${pending.length})`}
                </button>
              </>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : editing ? 'Update' : 'Add Income'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;

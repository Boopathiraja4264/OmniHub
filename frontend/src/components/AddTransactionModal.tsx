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

const AddTransactionModal: React.FC<Props> = ({ open, onClose, onSaved, initialType = 'EXPENSE', editing = null }) => {
  const [form, setForm] = useState({ ...emptyForm, type: initialType });
  const [loading, setLoading] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [defaultBankId, setDefaultBankId] = useState<number | null>(null);

  useEffect(() => {
    categoryItemApi.getCategories().then(r => {
      const seen = new Set<string>();
      setExpenseCategories(r.data.filter((c: ExpenseCategory) => seen.has(c.name) ? false : !!seen.add(c.name)));
    }).catch(() => {});
    creditCardApi.getAll().then(r => setCards(r.data)).catch(() => {});
    bankAccountApi.getAll().then(r => {
      setBankAccounts(r.data);
      const def = r.data.find((b: BankAccount) => b.isDefault);
      if (def) setDefaultBankId(def.id);
    }).catch(() => {});
  }, []);

  // Reset / populate form when modal opens
  useEffect(() => {
    if (!open) return;
    setItems([]);
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
      categoryItemApi.getItems(cat.id).then(r => setItems(r.data)).catch(() => {});
    }
  }, [editing, expenseCategories]);

  const handleCategoryChange = (catId: string) => {
    const cat = expenseCategories.find(c => String(c.id) === catId);
    setForm(f => ({ ...f, category: cat?.name || '', categoryId: catId, itemName: '' }));
    setItems([]);
    if (catId) categoryItemApi.getItems(parseInt(catId)).then(r => setItems(r.data)).catch(() => {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) { alert('Please select a category.'); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        description: form.itemName ? `${form.category} – ${form.itemName}` : form.category,
        amount: parseFloat(form.amount),
        itemName: form.itemName || undefined,
        paymentSource: form.type === 'INCOME' ? 'BANK' : (form.paymentSource || undefined),
        cardId: form.cardId ? parseInt(form.cardId) : undefined,
        bankAccountId: form.bankAccountId ? parseInt(form.bankAccountId) : undefined,
      };
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

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: form.type === 'INCOME' ? 'var(--income)' : 'var(--expense)' }}>
            {editing ? 'Edit' : 'New'} {form.type === 'INCOME' ? 'Income' : 'Expense'}
          </h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
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
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : editing ? 'Update' : (form.type === 'INCOME' ? 'Add Income' : 'Add Expense')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;

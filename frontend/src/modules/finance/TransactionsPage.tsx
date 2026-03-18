import React, { useEffect, useState, useMemo } from 'react';
import { transactionApi, categoryItemApi, creditCardApi, bankAccountApi } from '../../services/api';
import FilterDropdown from '../../components/FilterDropdown';
import { Transaction, CreditCard, BankAccount, ExpenseCategory, ExpenseItem, INCOME_CATEGORIES } from '../../types';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

const today = () => new Date().toISOString().split('T')[0];

const emptyForm = {
  amount: '', type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
  category: '', categoryId: '', itemName: '',
  date: today(), notes: '',
  paymentSource: 'BANK', cardId: '', bankAccountId: ''
};

const emptyTransfer = {
  amount: '', date: today(), fromAccountId: '', toAccountId: '', notes: ''
};

const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [defaultBankId, setDefaultBankId] = useState<number | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(false);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({ ...emptyTransfer });
  const [transferLoading, setTransferLoading] = useState(false);

  const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

  const load = () => transactionApi.getAll().then(r => setTransactions(r.data));

  useEffect(() => {
    load();
    categoryItemApi.getCategories().then(r => {
      const seen = new Set<string>();
      setExpenseCategories(r.data.filter((c: ExpenseCategory) => seen.has(c.name) ? false : !!seen.add(c.name)));
    });
    creditCardApi.getAll().then(r => setCards(r.data));
    bankAccountApi.getAll().then(r => {
      setBankAccounts(r.data);
      const def = r.data.find((b: BankAccount) => b.isDefault);
      if (def) setDefaultBankId(def.id);
    });
  }, []);

  const handleOpen = (type: 'INCOME' | 'EXPENSE', t?: Transaction) => {
    setItems([]);
    if (t) {
      setEditing(t);
      const cat = expenseCategories.find(c => c.name === t.category);
      const catId = cat ? String(cat.id) : '';
      if (catId) categoryItemApi.getItems(parseInt(catId)).then(r => setItems(r.data));
      setForm({
        amount: String(t.amount), type: t.type,
        category: t.category, categoryId: catId, itemName: t.itemName || '',
        date: t.date, notes: t.notes || '',
        paymentSource: t.paymentSource || 'BANK',
        cardId: t.cardId ? String(t.cardId) : '',
        bankAccountId: t.bankAccountId ? String(t.bankAccountId) : ''
      });
    } else {
      setEditing(null);
      setForm({
        ...emptyForm,
        type,
        paymentSource: type === 'INCOME' ? 'BANK' : 'BANK',
        bankAccountId: defaultBankId ? String(defaultBankId) : '',
      });
    }
    setShowModal(true);
  };

  const handleCategoryChange = (catId: string) => {
    const cat = expenseCategories.find(c => String(c.id) === catId);
    setForm(f => ({ ...f, category: cat?.name || '', categoryId: catId, itemName: '' }));
    setItems([]);
    if (catId) categoryItemApi.getItems(parseInt(catId)).then(r => setItems(r.data));
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
      setShowModal(false);
      load();
    } catch {
      alert('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.fromAccountId === transferForm.toAccountId) {
      alert('From and To accounts must be different.');
      return;
    }
    setTransferLoading(true);
    try {
      const amt = parseFloat(transferForm.amount);
      // Debit from source
      await transactionApi.create({
        description: 'Account Transfer Out',
        amount: amt, type: 'EXPENSE', category: 'Transfer Out',
        date: transferForm.date, notes: transferForm.notes || undefined,
        paymentSource: 'BANK',
        bankAccountId: parseInt(transferForm.fromAccountId),
      });
      // Credit to destination
      await transactionApi.create({
        description: 'Account Transfer In',
        amount: amt, type: 'INCOME', category: 'Transfer In',
        date: transferForm.date, notes: transferForm.notes || undefined,
        paymentSource: 'BANK',
        bankAccountId: parseInt(transferForm.toAccountId),
      });
      setShowTransferModal(false);
      setTransferForm({ ...emptyTransfer });
      load();
    } catch {
      alert('Transfer failed. Please try again.');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this transaction?')) return;
    await transactionApi.delete(id);
    load();
  };

  const filtered = useMemo(
    () => transactions.filter(t => filter === 'ALL' || t.type === filter),
    [transactions, filter]
  );

  const bankName = (id: string) => {
    const b = bankAccounts.find(a => String(a.id) === id);
    return b ? `${b.name}${b.bankName ? ` (${b.bankName})` : ''}` : '';
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Transactions</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-danger" onClick={() => handleOpen('EXPENSE')}>+ Expense</button>
          <button className="btn btn-income" onClick={() => handleOpen('INCOME')}>+ Income</button>
          <button className="btn btn-secondary" onClick={() => { setTransferForm({ ...emptyTransfer, date: today(), fromAccountId: defaultBankId ? String(defaultBankId) : '' }); setShowTransferModal(true); }}>⇄ Transfer</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['ALL', 'INCOME', 'EXPENSE'] as const).map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}>{f}</button>
          ))}
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 13, alignSelf: 'center' }}>
            {filtered.length} records
          </span>
        </div>
      </div>

      <div className="card" style={{ padding: '24px 0' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 24, width: '28%' }}>Description</th>
                <th style={{ width: '18%' }}>Category</th>
                <th style={{ width: '13%' }}>Date</th>
                <th style={{ width: '10%' }}>Type</th>
                <th style={{ width: '10%' }}>Source</th>
                <th style={{ textAlign: 'right', width: '13%' }}>Amount</th>
                <th style={{ width: '10%', paddingRight: 24 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                  No transactions found
                </td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id}>
                  <td style={{ color: 'var(--text-primary)', paddingLeft: 24 }}>
                    {t.description}
                    {t.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.notes}</div>}
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>{t.category}</div>
                    {t.itemName && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{t.itemName}</div>}
                  </td>
                  <td>{new Date(t.date).toLocaleDateString()}</td>
                  <td><span className={`badge ${t.type.toLowerCase()}`}>{t.type}</span></td>
                  <td>
                    {t.paymentSource && (
                      <span className="badge" style={{ fontSize: 10 }}>
                        {t.paymentSource === 'CREDIT_CARD' ? 'CC' : t.paymentSource}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`amount-${t.type.toLowerCase()}`}>
                      {t.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(t.amount)}
                    </span>
                  </td>
                  <td style={{ paddingRight: 24 }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleOpen(t.type, t)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Expense / Income Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: form.type === 'INCOME' ? 'var(--income)' : 'var(--expense)' }}>
                {editing ? 'Edit' : 'New'} {form.type === 'INCOME' ? 'Income' : 'Expense'}
              </h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
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

                {/* INCOME: Category | Bank Account (side by side) */}
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
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editing ? 'Update' : (form.type === 'INCOME' ? 'Add Income' : 'Add Expense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Transfer Modal ── */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTransferModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Transfer Between Accounts</h3>
              <button className="close-btn" onClick={() => setShowTransferModal(false)}>×</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Creates a debit from the source and a credit to the destination account.
            </p>
            <form onSubmit={handleTransferSubmit}>
              <div className="form-grid" style={{ marginBottom: 16 }}>

                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input type="number" step="0.01" min="0"
                    value={transferForm.amount}
                    onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={transferForm.date}
                    onChange={e => setTransferForm({ ...transferForm, date: e.target.value })} required />
                </div>

                <div className="form-group">
                  <label>From Account</label>
                  <FilterDropdown
                    value={transferForm.fromAccountId}
                    options={bankAccounts.map(b => ({ label: b.name + (b.bankName ? ` (${b.bankName})` : ''), value: String(b.id) }))}
                    onChange={v => setTransferForm({ ...transferForm, fromAccountId: v as string })}
                    placeholder="Select account..."
                    fullWidth
                  />
                </div>
                <div className="form-group">
                  <label>To Account</label>
                  <FilterDropdown
                    value={transferForm.toAccountId}
                    options={bankAccounts.map(b => ({ label: b.name + (b.bankName ? ` (${b.bankName})` : ''), value: String(b.id) }))}
                    onChange={v => setTransferForm({ ...transferForm, toAccountId: v as string })}
                    placeholder="Select account..."
                    fullWidth
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input value={transferForm.notes}
                    onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })} />
                </div>

              </div>

              {transferForm.fromAccountId && transferForm.toAccountId && (
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {bankName(transferForm.fromAccountId)} → {bankName(transferForm.toAccountId)}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTransferModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={transferLoading}>
                  {transferLoading ? 'Saving...' : 'Record Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;

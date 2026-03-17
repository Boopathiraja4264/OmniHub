import React, { useEffect, useState, useMemo } from 'react';
import { transactionApi } from '../../services/api';
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../types';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

const emptyForm = {
  description: '', amount: '', type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
  category: '', date: new Date().toISOString().split('T')[0], notes: ''
};

const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [loading, setLoading] = useState(false);

  const load = () => transactionApi.getAll().then(r => setTransactions(r.data));

  useEffect(() => { load(); }, []);

  const categories = form.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleOpen = (t?: Transaction) => {
    if (t) {
      setEditing(t);
      setForm({ description: t.description, amount: String(t.amount), type: t.type, category: t.category, date: t.date, notes: t.notes || '' });
    } else {
      setEditing(null);
      setForm({ ...emptyForm });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (editing) await transactionApi.update(editing.id, payload);
      else await transactionApi.create(payload);
      setShowModal(false);
      load();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Transactions</h2>
        <button className="btn btn-primary" onClick={() => handleOpen()}>+ Add Transaction</button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['ALL', 'INCOME', 'EXPENSE'] as const).map(f => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
            >{f}</button>
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
                <th style={{ paddingLeft: 24, width: '30%' }}>Description</th>
                <th style={{ width: '15%' }}>Category</th>
                <th style={{ width: '15%' }}>Date</th>
                <th style={{ width: '15%' }}>Type</th>
                <th style={{ textAlign: 'right', width: '15%' }}>Amount</th>
                <th style={{ width: '10%', paddingRight: 24 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                  No transactions found
                </td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id}>
                  <td style={{ color: 'var(--text-primary)', paddingLeft: 24 }}>
                    {t.description}
                    {t.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.notes}</div>}
                  </td>
                  <td>{t.category}</td>
                  <td>{new Date(t.date).toLocaleDateString()}</td>
                  <td><span className={`badge ${t.type.toLowerCase()}`}>{t.type}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`amount-${t.type.toLowerCase()}`}>
                      {t.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(t.amount)}
                    </span>
                  </td>
                  <td style={{ paddingRight: 24 }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleOpen(t)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit' : 'New'} Transaction</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Description</label>
                  <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Amount</label>
                  <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any, category: '' })}>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required>
                    <option value="">Select...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Notes (optional)</label>
                  <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editing ? 'Update' : 'Add Transaction'}
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

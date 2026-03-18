import React, { useEffect, useState, useRef } from 'react';
import { budgetApi, categoryItemApi } from '../../services/api';
import { AnnualBudgetResponse, AnnualCategoryRow, ExpenseCategory } from '../../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const pctColor = (pct: number): string => {
  if (pct >= 100) return 'var(--expense)';
  if (pct >= 80) return '#e0a030';
  return 'var(--income)';
};

const pctBg = (pct: number): string => {
  if (pct >= 100) return 'rgba(224,92,106,0.08)';
  if (pct >= 80) return 'rgba(224,160,48,0.08)';
  return '';
};

interface EditBudgetState {
  category: string;
  monthlyBudget: string;
}

const AnnualBudgetPage: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<AnnualBudgetResponse | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState<EditBudgetState>({ category: '', monthlyBudget: '' });
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<{ category: string; value: string } | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const load = (y: number) =>
    budgetApi.getAnnual(y).then(r => setData(r.data)).catch(() => setData(null));

  useEffect(() => { load(year); }, [year]);
  useEffect(() => { categoryItemApi.getCategories().then(r => setCategories(r.data)); }, []);
  useEffect(() => {
    if (editingCell) editInputRef.current?.focus();
  }, [editingCell]);

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await budgetApi.setAnnual({
        category: modalForm.category,
        monthlyBudget: parseFloat(modalForm.monthlyBudget),
        year
      });
      setShowModal(false);
      setModalForm({ category: '', monthlyBudget: '' });
      load(year);
    } catch {
      // save failed
    } finally {
      setSaving(false);
    }
  };

  const handleInlineEdit = (row: AnnualCategoryRow) => {
    const rep = getRepBudget(row);
    setEditingCell({ category: row.category, value: rep > 0 ? String(rep) : '' });
  };

  const handleInlineSave = async (row: AnnualCategoryRow) => {
    if (!editingCell) return;
    const val = parseFloat(editingCell.value);
    if (!val || val <= 0) { setEditingCell(null); return; }
    try {
      await budgetApi.setAnnual({ category: row.category, monthlyBudget: val, year });
      load(year);
    } catch {
      // update failed
    } finally {
      setEditingCell(null);
    }
  };

  const getRepBudget = (row: AnnualCategoryRow): number => {
    for (let m = 1; m <= 12; m++) {
      if (row.monthlyBudgets[m] !== undefined) return row.monthlyBudgets[m];
    }
    return 0;
  };

  const thStyle: React.CSSProperties = {
    padding: '8px 10px',
    textAlign: 'right',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
    background: 'var(--card-bg)'
  };

  const tdStyle: React.CSSProperties = {
    padding: '8px 10px',
    fontSize: 12,
    textAlign: 'right',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap'
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Annual Budget</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 'auto' }}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Set Budget</button>
        </div>
      </div>

      {(!data || data.categories.length === 0) && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          No budgets set for {year}. Click "+ Set Budget" to get started.
        </div>
      )}

      {data && data.categories.length > 0 && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1400 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left', position: 'sticky', left: 0, zIndex: 2, minWidth: 160 }}>
                  Category
                </th>
                <th style={{ ...thStyle, minWidth: 110, cursor: 'default' }}>
                  Monthly Budget
                </th>
                {MONTHS.map((m, i) => (
                  <React.Fragment key={m}>
                    <th style={{ ...thStyle, minWidth: 82 }}>{m} Util</th>
                    <th style={{ ...thStyle, minWidth: 82 }}>{m} Rem</th>
                    <th style={{ ...thStyle, minWidth: 60 }}>{m} %</th>
                  </React.Fragment>
                ))}
                <th style={{ ...thStyle, minWidth: 110, color: 'var(--text-primary)' }}>Total Budgeted</th>
                <th style={{ ...thStyle, minWidth: 110, color: 'var(--text-primary)' }}>Total Utilised</th>
                <th style={{ ...thStyle, minWidth: 80, color: 'var(--text-primary)' }}>Overall %</th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map(row => {
                const repBudget = getRepBudget(row);
                const isEditing = editingCell?.category === row.category;
                return (
                  <tr key={row.category}>
                    <td style={{
                      ...tdStyle,
                      textAlign: 'left',
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      background: 'var(--card-bg)',
                      fontWeight: 500,
                      color: 'var(--text-primary)'
                    }}>
                      {row.category}
                    </td>
                    <td style={{ ...tdStyle, cursor: 'pointer' }} onClick={() => !isEditing && handleInlineEdit(row)}>
                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          type="number"
                          value={editingCell.value}
                          onChange={e => setEditingCell({ ...editingCell, value: e.target.value })}
                          onBlur={() => handleInlineSave(row)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleInlineSave(row);
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          style={{ width: 80, textAlign: 'right', fontSize: 12 }}
                        />
                      ) : (
                        <span style={{ color: 'var(--text-primary)', textDecoration: 'underline dotted', cursor: 'pointer' }}>
                          {repBudget > 0 ? fmt(repBudget) : '—'}
                        </span>
                      )}
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                      const md = row.months[m];
                      if (!md) {
                        return (
                          <React.Fragment key={m}>
                            <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>—</td>
                            <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>—</td>
                            <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>—</td>
                          </React.Fragment>
                        );
                      }
                      const bg = pctBg(md.pct);
                      return (
                        <React.Fragment key={m}>
                          <td style={{ ...tdStyle, background: bg }}>{fmt(md.utilised)}</td>
                          <td style={{ ...tdStyle, background: bg, color: md.remaining < 0 ? 'var(--expense)' : undefined }}>
                            {fmt(md.remaining)}
                          </td>
                          <td style={{ ...tdStyle, background: bg, color: pctColor(md.pct), fontWeight: 600 }}>
                            {Math.round(md.pct)}%
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {fmt(row.totalBudgeted)}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(row.totalUtilised)}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: pctColor(row.ytdPct) }}>
                      {row.ytdPct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
              {/* Grand total row */}
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <td style={{ ...tdStyle, textAlign: 'left', position: 'sticky', left: 0, zIndex: 1, background: 'var(--bg-secondary)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  TOTAL
                </td>
                <td style={tdStyle}></td>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                  const util = data.categories.reduce((s, r) => s + (r.months[m]?.utilised || 0), 0);
                  const budg = data.categories.reduce((s, r) => s + (r.monthlyBudgets[m] || 0), 0);
                  const rem = budg - util;
                  const pct = budg > 0 ? (util / budg) * 100 : 0;
                  const bg = pctBg(pct);
                  return (
                    <React.Fragment key={m}>
                      <td style={{ ...tdStyle, background: bg, fontWeight: 600 }}>{fmt(util)}</td>
                      <td style={{ ...tdStyle, background: bg, fontWeight: 600, color: rem < 0 ? 'var(--expense)' : undefined }}>
                        {fmt(rem)}
                      </td>
                      <td style={{ ...tdStyle, background: bg, fontWeight: 700, color: pctColor(pct) }}>
                        {Math.round(pct)}%
                      </td>
                    </React.Fragment>
                  );
                })}
                <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {fmt(data.grandTotalBudgeted)}
                </td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(data.grandTotalUtilised)}</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: pctColor(data.overallPct) }}>
                  {data.overallPct.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Set Annual Budget</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Sets the same monthly budget for all 12 months of {year}.
            </p>
            <form onSubmit={handleSetBudget}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
                <div className="form-group">
                  <label>Category</label>
                  <select value={modalForm.category}
                    onChange={e => setModalForm({ ...modalForm, category: e.target.value })} required>
                    <option value="">Select category...</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Monthly Budget (₹)</label>
                  <input type="number" step="0.01" min="1" value={modalForm.monthlyBudget}
                    onChange={e => setModalForm({ ...modalForm, monthlyBudget: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Set Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnualBudgetPage;

import React, { useEffect, useState, useRef } from 'react';
import { budgetApi, categoryItemApi } from '../../services/api';
import { AnnualBudgetResponse, AnnualCategoryRow, ExpenseCategory } from '../../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PALETTE = [
  'var(--primary)', 'var(--income)', 'var(--warning)', 'var(--purple)',
  'var(--expense)', '#0ea5e9', '#f97316', '#ec4899',
  '#14b8a6', '#8b5cf6', '#84cc16', '#e11d48',
];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const fmtK = (n: number) => {
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${Math.round(n)}`;
};

const pctColor = (pct: number) =>
  pct >= 100 ? 'var(--expense)' : pct >= 80 ? '#e0a030' : 'var(--income)';

const barBg = (pct: number) =>
  pct >= 100 ? 'rgba(224,92,106,0.12)' : pct >= 80 ? 'rgba(224,160,48,0.12)' : 'rgba(34,197,94,0.10)';

interface EditBudgetState { category: string; monthlyBudget: string; }

const AnnualBudgetPage: React.FC = () => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
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
  useEffect(() => { categoryItemApi.getCategories().then(r => setCategories(Array.isArray(r.data) ? r.data : [])); }, []);
  useEffect(() => { if (editingCell) editInputRef.current?.focus(); }, [editingCell]);

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await budgetApi.setAnnual({ category: modalForm.category, monthlyBudget: parseFloat(modalForm.monthlyBudget), year });
      setShowModal(false);
      setModalForm({ category: '', monthlyBudget: '' });
      load(year);
    } catch { } finally { setSaving(false); }
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
    } catch { } finally { setEditingCell(null); }
  };

  const getRepBudget = (row: AnnualCategoryRow): number => {
    for (let m = 1; m <= 12; m++) {
      if (row.monthlyBudgets[m] !== undefined) return row.monthlyBudgets[m];
    }
    return 0;
  };

  const isCurrentYear = year === now.getFullYear();

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 className="page-title">Annual Budget {year}</h2>
          {data && <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 3 }}>
            {data.categories.length} categories · click budget to edit
          </p>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Set Budget</button>
        </div>
      </div>

      {/* Summary strip */}
      {data && data.categories.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Budgeted', value: fmt(data.grandTotalBudgeted), color: 'var(--text-primary)' },
            { label: 'Total Spent', value: fmt(data.grandTotalUtilised), color: data.overallPct >= 100 ? 'var(--expense)' : 'var(--warning)' },
            { label: 'Remaining', value: fmt(data.grandTotalBudgeted - data.grandTotalUtilised), color: (data.grandTotalBudgeted - data.grandTotalUtilised) < 0 ? 'var(--expense)' : 'var(--income)' },
            { label: 'Overall Used', value: `${data.overallPct.toFixed(1)}%`, color: pctColor(data.overallPct) },
          ].map(c => (
            <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {(!data || data.categories.length === 0) && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          No budgets set for {year}. Click "+ Set Budget" to get started.
        </div>
      )}

      {/* Card grid */}
      {data && data.categories.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {data.categories.map((row, idx) => {
            const repBudget = getRepBudget(row);
            const isEditing = editingCell?.category === row.category;
            const accent = PALETTE[idx % PALETTE.length];

            return (
              <div key={row.category} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
                overflow: 'hidden', display: 'flex', flexDirection: 'column',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}>
                {/* Accent top bar */}
                <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}66)` }} />

                {/* Card header */}
                <div style={{ padding: '12px 14px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.category}
                      </span>
                    </div>
                    {/* YTD badge */}
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                      color: pctColor(row.ytdPct), background: barBg(row.ytdPct),
                    }}>
                      {row.ytdPct.toFixed(0)}%
                    </span>
                  </div>

                  {/* Budget + spent */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ cursor: 'pointer' }} onClick={() => !isEditing && handleInlineEdit(row)}>
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
                          style={{ width: 80, fontSize: 12, padding: '2px 6px', borderRadius: 5, border: `1px solid ${accent}`, background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                        />
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'underline dotted', cursor: 'pointer' }}>
                          {repBudget > 0 ? `${fmt(repBudget)}/mo` : '— set budget'}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {fmt(row.totalUtilised)} spent
                    </span>
                  </div>

                  {/* YTD progress bar */}
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 99 }}>
                    <div style={{
                      height: '100%', width: `${Math.min(100, row.ytdPct)}%`,
                      background: pctColor(row.ytdPct), borderRadius: 99, transition: 'width 0.4s',
                    }} />
                  </div>
                </div>

                {/* Monthly bar chart */}
                <div style={{ padding: '8px 14px 12px', flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3, alignItems: 'flex-end', height: 48 }}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => {
                      const md = row.months[m];
                      const pct = md ? Math.min(100, md.pct) : 0;
                      const isCur = isCurrentYear && m === currentMonth;
                      const tip = md
                        ? `${MONTHS[m-1]}\nBudget: ${fmt(row.monthlyBudgets[m] || 0)}\nSpent: ${fmt(md.utilised)}\nRemaining: ${fmt(md.remaining)}\n${md.pct.toFixed(0)}% used`
                        : `${MONTHS[m-1]}: no budget`;
                      return (
                        <div key={m} title={tip} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                          <div style={{
                            height: md ? `${Math.max(pct, 4)}%` : '4%',
                            borderRadius: '2px 2px 0 0',
                            background: md
                              ? isCur ? accent : pctColor(md.pct)
                              : 'var(--border)',
                            opacity: md ? (isCur ? 1 : 0.75) : 0.3,
                            boxShadow: isCur ? `0 0 0 1px ${accent}` : undefined,
                            transition: 'height 0.3s',
                          }} />
                        </div>
                      );
                    })}
                  </div>
                  {/* Month labels */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3, marginTop: 4 }}>
                    {MONTHS.map((m, i) => {
                      const isCur = isCurrentYear && (i + 1) === currentMonth;
                      return (
                        <div key={m} style={{ textAlign: 'center', fontSize: 8, fontWeight: isCur ? 800 : 400, color: isCur ? accent : 'var(--text-muted)' }}>
                          {m[0]}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Grand total card */}
          <div style={{
            background: 'var(--bg-main)', border: '2px solid var(--border)', borderRadius: 14,
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, var(--text-muted), transparent)' }} />
            <div style={{ padding: '12px 14px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>All Categories</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  color: pctColor(data.overallPct), background: barBg(data.overallPct),
                }}>
                  {data.overallPct.toFixed(0)}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtK(data.grandTotalBudgeted)}/yr budget</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(data.grandTotalUtilised)} spent</span>
              </div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 99 }}>
                <div style={{
                  height: '100%', width: `${Math.min(100, data.overallPct)}%`,
                  background: pctColor(data.overallPct), borderRadius: 99,
                }} />
              </div>
            </div>
            <div style={{ padding: '8px 14px 12px', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3, alignItems: 'flex-end', height: 48 }}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => {
                  const util = data.categories.reduce((s, r) => s + (r.months[m]?.utilised || 0), 0);
                  const budg = data.categories.reduce((s, r) => s + (r.monthlyBudgets[m] || 0), 0);
                  const pct = budg > 0 ? Math.min(100, (util / budg) * 100) : 0;
                  const hasBudget = budg > 0;
                  const isCur = isCurrentYear && m === currentMonth;
                  return (
                    <div key={m} title={hasBudget ? `${MONTHS[m-1]}: ${fmt(util)} of ${fmt(budg)}` : `${MONTHS[m-1]}: no budget`}
                      style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <div style={{
                        height: hasBudget ? `${Math.max(pct, 4)}%` : '4%',
                        borderRadius: '2px 2px 0 0',
                        background: hasBudget ? pctColor((util / budg) * 100) : 'var(--border)',
                        opacity: hasBudget ? (isCur ? 1 : 0.75) : 0.3,
                        boxShadow: isCur ? '0 0 0 1px var(--primary)' : undefined,
                      }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3, marginTop: 4 }}>
                {MONTHS.map((m, i) => {
                  const isCur = isCurrentYear && (i + 1) === currentMonth;
                  return (
                    <div key={m} style={{ textAlign: 'center', fontSize: 8, fontWeight: isCur ? 800 : 400, color: isCur ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {m[0]}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set budget modal */}
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

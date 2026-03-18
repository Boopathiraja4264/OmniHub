import React, { useCallback, useEffect, useState } from 'react';
import { budgetApi, categoryItemApi, transactionApi } from '../../services/api';
import FilterDropdown from '../../components/FilterDropdown';
import { Budget, ExpenseCategory, PivotResponse, PivotCategoryRow } from '../../types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const fmtFull = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

const statusColor = (pct: number) =>
  pct >= 100 ? 'var(--expense)' : pct >= 80 ? '#e0a030' : 'var(--income)';

const pctBg = (pct: number) =>
  pct >= 100 ? 'rgba(224,92,106,0.08)' : pct >= 80 ? 'rgba(224,160,48,0.08)' : '';

// ─── Monthly Tab ──────────────────────────────────────────────────────────────

interface MonthlyTabProps {
  year: number;
  categories: ExpenseCategory[];
}

const MonthlyTab: React.FC<MonthlyTabProps> = ({ year, categories }) => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: '', limitAmount: '' });
  const [loading, setLoading] = useState(false);

  const load = useCallback(() =>
    budgetApi.getForMonth(month, year).then(r => setBudgets(r.data)),
    [month, year]
  );
  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await budgetApi.create({ ...form, limitAmount: parseFloat(form.limitAmount), month, year });
      setShowModal(false);
      setForm({ category: '', limitAmount: '' });
      load();
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remove this budget?')) return;
    await budgetApi.delete(id);
    load();
  };

  const totalPlanned   = budgets.reduce((s, b) => s + b.limitAmount, 0);
  const totalUtilized  = budgets.reduce((s, b) => s + b.spent, 0);
  const totalRemaining = totalPlanned - totalUtilized;
  const totalPct       = totalPlanned > 0 ? (totalUtilized / totalPlanned) * 100 : 0;

  return (
    <>
      {/* Month selector */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 2 }}>Month:</span>
          {MONTHS.map((m, i) => (
            <button
              key={m}
              className={`btn btn-sm ${month === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMonth(i + 1)}
            >{m}</button>
          ))}
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowModal(true)}>
            + Set Budget
          </button>
        </div>
      </div>

      {/* Summary */}
      {budgets.length > 0 && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {[
            { label: 'Planned', value: fmtFull(totalPlanned), color: 'var(--text-primary)' },
            { label: 'Utilized', value: fmtFull(totalUtilized), color: statusColor(totalPct) },
            { label: 'Remaining', value: fmtFull(totalRemaining), color: totalRemaining < 0 ? 'var(--expense)' : 'var(--income)' },
            { label: 'Overall', value: `${Math.round(totalPct)}%`, color: statusColor(totalPct) },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {budgets.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 20px' }}>
            No budgets for {MONTHS[month - 1]} {year}. Click "+ Set Budget" to start.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {['Category', 'Planned', 'Utilized', 'Remaining', 'Progress', '%', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '12px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border)',
                    textAlign: i === 0 ? 'left' : i === 4 ? 'center' : i === 6 ? 'center' : 'right',
                    ...(i === 0 && { paddingLeft: 20 }),
                    ...(i === 4 && { minWidth: 140 }),
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {budgets.map(b => {
                const pct = b.limitAmount > 0 ? (b.spent / b.limitAmount) * 100 : 0;
                const rem = b.limitAmount - b.spent;
                const color = statusColor(pct);
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '13px 16px 13px 20px', fontWeight: 500, fontSize: 13 }}>{b.category}</td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', fontSize: 13 }}>{fmtFull(b.limitAmount)}</td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', fontSize: 13, color }}>{fmtFull(b.spent)}</td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', fontSize: 13, color: rem < 0 ? 'var(--expense)' : undefined }}>{fmtFull(rem)}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ background: 'var(--border)', borderRadius: 4, height: 6 }}>
                        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 700, fontSize: 13, color }}>
                      {Math.round(pct)}%{pct >= 100 && <span style={{ marginLeft: 4, fontSize: 11 }}>⚠</span>}
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(b.id)}>Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg-secondary)', borderTop: '2px solid var(--border)' }}>
                <td style={{ padding: '12px 16px 12px 20px', fontWeight: 700, fontSize: 13 }}>Total</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: 13 }}>{fmtFull(totalPlanned)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: statusColor(totalPct) }}>{fmtFull(totalUtilized)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: totalRemaining < 0 ? 'var(--expense)' : 'var(--income)' }}>{fmtFull(totalRemaining)}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ background: 'var(--border)', borderRadius: 4, height: 6 }}>
                    <div style={{ width: `${Math.min(totalPct, 100)}%`, height: '100%', background: statusColor(totalPct), borderRadius: 4 }} />
                  </div>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: statusColor(totalPct) }}>{Math.round(totalPct)}%</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Set Budget Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Set Budget — {MONTHS[month - 1]} {year}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid" style={{ marginBottom: 24 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Category</label>
                  <FilterDropdown
                    value={form.category}
                    options={categories.map(c => ({ label: c.name, value: c.name }))}
                    onChange={v => setForm({ ...form, category: v as string })}
                    placeholder="Select category..."
                    fullWidth
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Monthly Planned Amount (₹)</label>
                  <input type="number" step="0.01" min="1" value={form.limitAmount}
                    onChange={e => setForm({ ...form, limitAmount: e.target.value })} required placeholder="e.g. 5000" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Set Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Annual Pivot Tab ─────────────────────────────────────────────────────────

interface AnnualTabProps {
  year: number;
  categories: ExpenseCategory[];
}

const ALL_MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];
const curMonth = new Date().getMonth() + 1;

const AnnualTab: React.FC<AnnualTabProps> = ({ year }) => {
  const [data, setData] = useState<PivotResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // Per-month collapse: all months except current start collapsed
  const [collapsedMonths, setCollapsedMonths] = useState<Set<number>>(
    () => new Set(ALL_MONTHS.filter(m => m !== curMonth))
  );

  const load = useCallback(() => {
    setLoading(true);
    transactionApi.getPivot(year)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const toggleCollapse = (cat: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });

  const toggleMonth = (m: number) =>
    setCollapsedMonths(prev => {
      const next = new Set(prev);
      next.has(m) ? next.delete(m) : next.add(m);
      return next;
    });

  const thBase: React.CSSProperties = {
    padding: '9px 10px', fontSize: 11, fontWeight: 700,
    background: 'var(--bg-elevated)', color: 'var(--text-primary)',
    border: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'right',
  };
  const td = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: '7px 10px', fontSize: 12, border: '1px solid var(--border)',
    whiteSpace: 'nowrap', textAlign: 'right', ...extra,
  });
  const tdCollapsed: React.CSSProperties = {
    width: 26, maxWidth: 26, padding: 0,
    border: '1px solid var(--border)', background: 'var(--bg-elevated)',
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>Loading...</div>
  );

  if (!data || data.categories.length === 0) return (
    <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
      No expense data for {year}.
    </div>
  );

  const expandedCount = ALL_MONTHS.length - collapsedMonths.size;
  const minWidth = 160 + 160 + expandedCount * 80 + collapsedMonths.size * 26 + 110;

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: Math.max(520, minWidth) }}>
        <thead>
          <tr>
            <th style={{ ...thBase, textAlign: 'left', minWidth: 160, position: 'sticky', left: 0, zIndex: 3 }}>
              Category
            </th>
            <th style={{ ...thBase, minWidth: 160, textAlign: 'left' }}>Item</th>
            {ALL_MONTHS.map(m => {
              const isCol = collapsedMonths.has(m);
              return (
                <th key={m} onClick={() => toggleMonth(m)}
                  style={{
                    ...thBase,
                    cursor: 'pointer', userSelect: 'none', textAlign: 'center',
                    ...(isCol
                      ? { width: 26, maxWidth: 26, padding: '9px 2px' }
                      : { minWidth: 80 }),
                  }}
                >
                  {isCol ? (
                    <span style={{ background: 'var(--primary-dim)', color: 'var(--primary)', borderRadius: 4, padding: '1px 5px', fontWeight: 800, fontSize: 11 }}>+</span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {MONTHS[m - 1]}
                      <span style={{ background: 'var(--primary-dim)', color: 'var(--primary)', borderRadius: 4, padding: '0 4px', fontWeight: 800, fontSize: 11 }}>−</span>
                    </span>
                  )}
                </th>
              );
            })}
            <th style={{ ...thBase, minWidth: 110 }}>Grand Total</th>
          </tr>
        </thead>
        <tbody>
          {data.categories.map((cat: PivotCategoryRow) => {
            const isCollapsed = collapsed.has(cat.name);
            const showItems = cat.items.length > 1 || (cat.items.length === 1 && cat.items[0].name !== '(General)');
            return (
              <React.Fragment key={cat.name}>
                {/* Category row */}
                <tr style={{ cursor: showItems ? 'pointer' : 'default', background: 'var(--bg-secondary)' }}
                  onClick={() => showItems && toggleCollapse(cat.name)}>
                  <td style={td({ textAlign: 'left', fontWeight: 700, color: 'var(--text-primary)', background: 'var(--bg-secondary)', position: 'sticky', left: 0, zIndex: 1 })}>
                    {showItems && (
                      <span style={{ marginRight: 8, background: 'var(--primary-dim)', color: 'var(--primary)', borderRadius: 4, padding: '1px 6px', fontWeight: 800, fontSize: 12, lineHeight: 1.6 }}>
                        {isCollapsed ? '+' : '−'}
                      </span>
                    )}
                    {cat.name}
                  </td>
                  <td style={td({ textAlign: 'left', background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: 11 })}></td>
                  {ALL_MONTHS.map(m => collapsedMonths.has(m)
                    ? <td key={m} style={{ ...tdCollapsed, background: 'var(--bg-secondary)' }} />
                    : <td key={m} style={td({ background: 'var(--bg-secondary)', fontWeight: 600, color: 'var(--text-primary)' })}>
                        {cat.monthlyTotals[m] ? fmt(cat.monthlyTotals[m]) : ''}
                      </td>
                  )}
                  <td style={td({ background: 'var(--bg-secondary)', fontWeight: 700, color: 'var(--text-primary)' })}>{fmt(cat.total)}</td>
                </tr>

                {/* Item rows */}
                {showItems && !isCollapsed && cat.items.map(item => (
                  <tr key={item.name} style={{ background: 'var(--bg-card)' }}>
                    <td style={td({ textAlign: 'left', background: 'var(--bg-card)', position: 'sticky', left: 0, zIndex: 1, color: 'var(--text-muted)' })}></td>
                    <td style={td({ textAlign: 'left', paddingLeft: 20, color: 'var(--text-primary)' })}>{item.name}</td>
                    {ALL_MONTHS.map(m => collapsedMonths.has(m)
                      ? <td key={m} style={tdCollapsed} />
                      : <td key={m} style={td({ color: 'var(--text-primary)' })}>
                          {item.months[m] ? fmt(item.months[m]) : ''}
                        </td>
                    )}
                    <td style={td({ fontWeight: 600, color: 'var(--text-primary)' })}>{fmt(item.total)}</td>
                  </tr>
                ))}

                {/* Category total row */}
                {showItems && (
                  <tr style={{ background: 'var(--primary-dim)' }}>
                    <td style={td({ textAlign: 'left', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-dim)', position: 'sticky', left: 0, zIndex: 1, fontSize: 11 })}>
                      {cat.name} Total
                    </td>
                    <td style={td({ background: 'var(--primary-dim)', color: 'var(--text-primary)' })}></td>
                    {ALL_MONTHS.map(m => collapsedMonths.has(m)
                      ? <td key={m} style={{ ...tdCollapsed, background: 'var(--primary-dim)' }} />
                      : <td key={m} style={td({ background: 'var(--primary-dim)', fontWeight: 600, color: 'var(--text-primary)' })}>
                          {cat.monthlyTotals[m] ? fmt(cat.monthlyTotals[m]) : ''}
                        </td>
                    )}
                    <td style={td({ background: 'var(--primary-dim)', fontWeight: 700, color: 'var(--primary)' })}>{fmt(cat.total)}</td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}

          {/* Grand Total row */}
          <tr style={{ background: 'var(--bg-elevated)', borderTop: '2px solid var(--primary)' }}>
            <td style={td({ textAlign: 'left', fontWeight: 700, background: 'var(--bg-elevated)', color: 'var(--text-primary)', position: 'sticky', left: 0, zIndex: 1, borderTop: '2px solid var(--primary)' })}>
              Grand Total
            </td>
            <td style={td({ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderTop: '2px solid var(--primary)' })}></td>
            {ALL_MONTHS.map(m => collapsedMonths.has(m)
              ? <td key={m} style={{ ...tdCollapsed, borderTop: '2px solid var(--primary)' }} />
              : <td key={m} style={td({ background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontWeight: 600, borderTop: '2px solid var(--primary)' })}>
                  {data.grandMonthlyTotals[m] ? fmt(data.grandMonthlyTotals[m]) : ''}
                </td>
            )}
            <td style={td({ background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontWeight: 700, borderTop: '2px solid var(--primary)' })}>{fmt(data.grandTotal)}</td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  );
};

// ─── Combined Page ────────────────────────────────────────────────────────────

type Tab = 'monthly' | 'annual';

const BudgetsPage: React.FC = () => {
  const now = new Date();
  const [tab, setTab] = useState<Tab>('monthly');
  const [year, setYear] = useState(now.getFullYear());
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  useEffect(() => {
    categoryItemApi.getCategories().then(r => setCategories(r.data));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Budget & Spend</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <FilterDropdown
            value={year}
            options={[2024, 2025, 2026, 2027].map(y => ({ label: String(y), value: y }))}
            onChange={v => setYear(v as number)}
            minWidth={100}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['monthly', 'annual'] as Tab[]).map(t => (
          <button
            key={t}
            className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t)}
            style={{ textTransform: 'capitalize' }}
          >
            {t === 'monthly' ? 'Monthly View' : 'Annual View'}
          </button>
        ))}
      </div>

      {tab === 'monthly'
        ? <MonthlyTab year={year} categories={categories} />
        : <AnnualTab year={year} categories={categories} />
      }
    </div>
  );
};

export default BudgetsPage;

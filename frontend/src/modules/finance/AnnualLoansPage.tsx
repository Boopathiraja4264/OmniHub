import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { debtApi } from '../../services/api';
import { AnnualLoanSummary } from '../../types';
import { useMobile } from '../../hooks/useMobile';
import DatePicker from '../../components/DatePicker';

const fmt = (n?: number) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—';
const pct = (n?: number) => n != null ? `${(n * 100).toFixed(2)}%` : '—';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (d?: string) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

const emptyForm = {
  loanId: '', name: '', initialPrincipal: '', annualInterestRate: '', startDate: '', endDate: '',
  currentBalance: '', totalInterestAccrued: '', interestPaid: '', status: 'OUTSTANDING', notes: '',
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{label}</label>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)',
  background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box',
};

const tblWrap: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.12)', background: 'var(--bg-card)',
};
const thStyle = (right?: boolean): React.CSSProperties => ({
  padding: '10px 12px', textAlign: right ? 'right' : 'left',
  color: 'var(--text-muted)', fontWeight: 700, fontSize: 10,
  letterSpacing: '0.07em', textTransform: 'uppercase',
  borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap',
  background: 'var(--bg-row-alt)',
});

const AnnualLoansPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [loans, setLoans] = useState<AnnualLoanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editLoan, setEditLoan] = useState<AnnualLoanSummary | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await debtApi.getDashboard();
      setLoans(res.data.annualLoans || []);
    } catch { /* handled */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditLoan(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (l: AnnualLoanSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditLoan(l);
    setForm({
      loanId: l.loanId, name: l.name,
      initialPrincipal: String(l.initialPrincipal),
      annualInterestRate: String(l.annualInterestRate),
      startDate: l.startDate ? l.startDate.slice(0, 10) : '',
      endDate: l.endDate ? l.endDate.slice(0, 10) : '',
      currentBalance: l.currentBalance != null ? String(l.currentBalance) : '',
      totalInterestAccrued: l.totalInterestAccrued != null ? String(l.totalInterestAccrued) : '',
      interestPaid: l.interestPaid != null ? String(l.interestPaid) : '',
      status: l.status,
      notes: l.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        loanId: form.loanId,
        name: form.name,
        initialPrincipal: parseFloat(form.initialPrincipal),
        annualInterestRate: parseFloat(form.annualInterestRate),
        startDate: form.startDate,
        endDate: form.endDate || null,
        currentBalance: form.currentBalance ? parseFloat(form.currentBalance) : parseFloat(form.initialPrincipal),
        totalInterestAccrued: form.totalInterestAccrued ? parseFloat(form.totalInterestAccrued) : 0,
        interestPaid: form.interestPaid ? parseFloat(form.interestPaid) : 0,
        status: form.status,
        notes: form.notes || null,
      };
      if (editLoan) {
        await debtApi.updateAnnual(editLoan.id, payload);
      } else {
        await debtApi.createAnnual(payload);
      }
      setShowModal(false);
      load();
    } catch { /* handled */ } finally { setSaving(false); }
  };

  const set = (k: string) => (e: { target: { value: string } }) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const active = loans.filter(l => l.status === 'OUTSTANDING');
  const repaid = loans.filter(l => l.status !== 'OUTSTANDING');

  const LoanTable: React.FC<{ items: AnnualLoanSummary[]; title: string }> = ({ items, title }) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>{title}</h2>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'var(--bg-row-hover)', border: '1px solid var(--border)', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>No entries.</div>
      ) : (
        <div style={{ ...tblWrap, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontVariantNumeric: 'tabular-nums', minWidth: 750 }}>
            <thead>
              <tr>
                <th style={thStyle()}>Loan ID</th>
                <th style={thStyle()}>Name</th>
                <th style={thStyle(true)}>Principal</th>
                <th style={thStyle()}>Rate</th>
                <th style={thStyle(true)}>Balance</th>
                <th style={thStyle(true)}>Interest Accrued</th>
                <th style={thStyle(true)}>Interest Paid</th>
                <th style={thStyle()}>Start</th>
                <th style={thStyle()}>End</th>
                <th style={thStyle()}>Status</th>
                <th style={thStyle()}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(l => {
                const sc = l.status === 'OUTSTANDING' ? { bg: 'var(--income-dim)', color: 'var(--income)', border: 'rgba(16,185,129,0.25)' } : { bg: 'rgba(148,163,184,0.10)', color: '#94a3b8', border: 'rgba(148,163,184,0.20)' };
                return (
                  <tr key={l.id} onClick={() => navigate(`/finance/debt/annual/${l.id}`)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>{l.loanId}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{l.name}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-primary)' }}>{fmt(l.initialPrincipal)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{pct(l.annualInterestRate)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--expense)', fontWeight: 700 }}>{fmt(l.currentBalance)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--purple)' }}>{fmt(l.totalInterestAccrued)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--income)' }}>{fmt(l.interestPaid)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(l.startDate)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(l.endDate)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, letterSpacing: '0.04em' }}>{l.status}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={e => openEdit(l, e)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)'; e.currentTarget.style.color = 'var(--warning)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h2 className="page-title">Annual Interest Loans</h2>
          <p className="page-subtitle">Gold loans and other annual-interest loans with prepayment tracking</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary">+ Add Annual Loan</button>
      </div>

      <LoanTable items={active} title="Outstanding" />
      <LoanTable items={repaid} title="Repaid" />

      {repaid.length > 0 && (() => {
        const totalPrincipal = repaid.reduce((s, l) => s + (l.initialPrincipal || 0), 0);
        const totalInterest = repaid.reduce((s, l) => s + (l.interestPaid || 0), 0);
        const interestPct = totalPrincipal > 0 ? ((totalInterest / (totalPrincipal + totalInterest)) * 100).toFixed(1) : '0';
        const chartData = repaid.map(l => ({
          name: l.name.length > 14 ? l.name.slice(0, 13) + '…' : l.name,
          'Principal': Math.round(l.initialPrincipal || 0),
          'Interest Paid': Math.round(l.interestPaid || 0),
        }));
        return (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Repaid Loan Analysis</h2>
              <button onClick={() => setShowAnalysis(v => !v)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>
                {showAnalysis ? 'Hide' : 'View Analysis'}
              </button>
            </div>
            {showAnalysis && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', marginBottom: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.12)' }}>
                  {[
                    { label: 'Total Principal', value: fmt(totalPrincipal), color: 'var(--warning)' },
                    { label: 'Total Interest Paid', value: fmt(totalInterest), color: 'var(--expense)' },
                    { label: 'Interest % of Total Cost', value: `${interestPct}%`, color: 'var(--purple)' },
                  ].map((c, i) => (
                    <div key={c.label} style={{ padding: '14px 20px', borderLeft: (!isMobile && i > 0) ? '1px solid var(--border-subtle)' : 'none', borderTop: (isMobile && i > 0) ? '1px solid var(--border-subtle)' : 'none' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{c.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: c.color, fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Loan principal vs total interest paid</div>
                  <ResponsiveContainer width="100%" height={Math.max(180, repaid.length * 52)}>
                    <BarChart data={chartData} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => fmt(v)} />
                      <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v}</span>} />
                      <Bar dataKey="Principal" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Interest Paid" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {showModal && (
        <Modal title={editLoan ? `Edit — ${editLoan.name}` : 'New Annual Loan'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
              <Field label="Loan ID *"><input style={inputStyle} value={form.loanId} onChange={set('loanId')} required placeholder="GL001" /></Field>
              <Field label="Name *"><input style={inputStyle} value={form.name} onChange={set('name')} required placeholder="TMB Gold Loan" /></Field>
              <Field label="Initial Principal (₹) *"><input style={inputStyle} type="number" value={form.initialPrincipal} onChange={set('initialPrincipal')} required /></Field>
              <Field label="Annual Interest Rate (e.g. 0.099 for 9.9%) *"><input style={inputStyle} type="number" step="0.0001" value={form.annualInterestRate} onChange={set('annualInterestRate')} required /></Field>
              <Field label="Start Date *"><DatePicker value={form.startDate} onChange={set('startDate')} required fullWidth /></Field>
              <Field label="End Date (due date)"><DatePicker value={form.endDate} onChange={set('endDate')} fullWidth /></Field>
              <Field label="Current Balance (₹)"><input style={inputStyle} type="number" value={form.currentBalance} onChange={set('currentBalance')} placeholder="Leave blank = full principal" /></Field>
              <Field label="Interest Paid (₹)"><input style={inputStyle} type="number" value={form.interestPaid} onChange={set('interestPaid')} placeholder="0" /></Field>
              <Field label="Status">
                <select style={inputStyle} value={form.status} onChange={set('status')}>
                  <option value="OUTSTANDING">Outstanding</option>
                  <option value="REPAID">Repaid</option>
                </select>
              </Field>
            </div>
            <Field label="Notes"><textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} value={form.notes} onChange={set('notes')} /></Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : editLoan ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AnnualLoansPage;

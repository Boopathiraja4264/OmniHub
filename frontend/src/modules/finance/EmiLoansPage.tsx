import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { debtApi } from '../../services/api';
import { EmiLoanSummary } from '../../types';
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

const statusColor = (s: string) => {
  if (s === 'ACTIVE') return { bg: 'var(--income-dim)', color: 'var(--income)' };
  if (s === 'FORECLOSED') return { bg: 'rgba(249,115,22,0.12)', color: 'var(--warning)' };
  return { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' };
};

const emptyForm = {
  loanId: '', name: '', initialPrincipal: '', annualInterestRate: '', tenureMonths: '',
  gstRate: '', processingCharge: '', startDate: '', status: 'ACTIVE', notes: '',
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
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

const EmiLoansPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [loans, setLoans] = useState<EmiLoanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editLoan, setEditLoan] = useState<EmiLoanSummary | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await debtApi.getDashboard();
      setLoans(res.data.emiLoans || []);
    } catch { /* handled */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditLoan(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (l: EmiLoanSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditLoan(l);
    setForm({
      loanId: l.loanId, name: l.name,
      initialPrincipal: String(l.initialPrincipal),
      annualInterestRate: String(l.annualInterestRate),
      tenureMonths: String(l.tenureMonths),
      gstRate: l.gstRate != null ? String(l.gstRate) : '',
      processingCharge: l.processingCharge != null && l.processingCharge > 0 ? String(l.processingCharge) : '',
      startDate: l.startDate ? l.startDate.slice(0, 10) : '',
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
        tenureMonths: parseInt(form.tenureMonths),
        gstRate: form.gstRate ? parseFloat(form.gstRate) : 0,
        processingCharge: form.processingCharge ? parseFloat(form.processingCharge) : 0,
        startDate: form.startDate,
        status: form.status,
        notes: form.notes || null,
        foreclosed: false,
      };
      if (editLoan) {
        await debtApi.updateEmi(editLoan.id, payload);
      } else {
        await debtApi.createEmi(payload);
      }
      setShowModal(false);
      load();
    } catch { /* handled */ } finally { setSaving(false); }
  };

  const set = (k: string) => (e: { target: { value: string } }) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const activeLoans = loans.filter(l => l.status === 'ACTIVE');
  const closedLoans = loans.filter(l => l.status !== 'ACTIVE');

  const tblWrap: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.12)', background: 'var(--bg-card)' };
  const thStyle = (right?: boolean): React.CSSProperties => ({ padding: '10px 12px', textAlign: right ? 'right' : 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' });

  const LoanTable: React.FC<{ items: EmiLoanSummary[]; title: string }> = ({ items, title }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.1px' }}>{title}</h2>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: 'var(--border-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>No entries.</div>
      ) : (
        <div style={{ ...tblWrap, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 700 }}>
            <thead>
              <tr style={{ background: 'var(--bg-row-alt)' }}>
                {['Loan ID','Name','Principal','Rate','Tenure','Base EMI (excl. GST)','Outstanding','Start','Status',''].map(h => (
                  <th key={h} style={thStyle(['Principal','Outstanding','Base EMI (excl. GST)'].includes(h))}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((l, i) => {
                const sc = statusColor(l.status);
                return (
                  <tr key={l.id} onClick={() => navigate(`/finance/debt/emi/${l.id}`)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>{l.loanId}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{l.name}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(l.initialPrincipal)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{pct(l.annualInterestRate)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{l.tenureMonths}M</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--warning)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(l.baseEmi)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--expense)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(l.outstandingPrincipal)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(l.startDate)}</td>
                    <td style={{ padding: '10px 12px' }}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: sc.bg, color: sc.color, border: `1px solid ${sc.color}25`, letterSpacing: '0.04em' }}>{l.status}</span></td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={e => openEdit(l, e)} style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', transition: 'background 0.12s' }}>Edit</button>
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
    <div style={{ padding: isMobile ? '16px' : '24px 28px', maxWidth: 1200 }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h2 className="page-title">EMI Based Loans</h2>
          <p className="page-subtitle">Monthly installment loans with amortization schedule</p>
        </div>
        <button onClick={openAdd} className="btn btn-danger">+ Add EMI Loan</button>
      </div>

      <LoanTable items={activeLoans} title="Active Loans" />
      <LoanTable items={closedLoans} title="Closed / Foreclosed" />

      {closedLoans.length > 0 && (() => {
        const totalPrincipal = closedLoans.reduce((s, l) => s + (l.principalPaid || 0), 0);
        const totalInterest = closedLoans.reduce((s, l) => s + (l.interestPaid || 0), 0);
        const interestPct = totalPrincipal + totalInterest > 0 ? ((totalInterest / (totalPrincipal + totalInterest)) * 100).toFixed(1) : '0';
        const chartData = closedLoans.map(l => ({
          name: l.name.length > 14 ? l.name.slice(0, 13) + '…' : l.name,
          'Principal Paid': Math.round(l.principalPaid || 0),
          'Interest Paid': Math.round(l.interestPaid || 0),
        }));
        return (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Closed Loan Analysis</h2>
              <button onClick={() => setShowAnalysis(v => !v)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>
                {showAnalysis ? 'Hide' : 'View Analysis'}
              </button>
            </div>
            {showAnalysis && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                  {[
                    { label: 'Total Principal Paid', value: fmt(totalPrincipal), color: 'var(--income)' },
                    { label: 'Total Interest Paid', value: fmt(totalInterest), color: 'var(--expense)' },
                    { label: 'Interest as % of Total Cost', value: `${interestPct}%`, color: 'var(--purple)' },
                  ].map(c => (
                    <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Principal paid vs interest paid per closed loan</div>
                  <ResponsiveContainer width="100%" height={Math.max(180, closedLoans.length * 52)}>
                    <BarChart data={chartData} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => fmt(v)} />
                      <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v}</span>} />
                      <Bar dataKey="Principal Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
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
        <Modal title={editLoan ? `Edit — ${editLoan.name}` : 'New EMI Loan'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
              <Field label="Loan ID *"><input style={inputStyle} value={form.loanId} onChange={set('loanId')} required placeholder="GA001" /></Field>
              <Field label="Name *"><input style={inputStyle} value={form.name} onChange={set('name')} required placeholder="Macbook EMI" /></Field>
              <Field label="Amount Financed (₹) *"><input style={inputStyle} type="number" value={form.initialPrincipal} onChange={set('initialPrincipal')} required placeholder="93531" /></Field>
              <Field label="Annual Interest Rate (e.g. 0.1599 for 15.99%) *"><input style={inputStyle} type="number" step="0.0001" value={form.annualInterestRate} onChange={set('annualInterestRate')} required placeholder="0.1599" /></Field>
              <Field label="Tenure (Months) *"><input style={inputStyle} type="number" value={form.tenureMonths} onChange={set('tenureMonths')} required placeholder="24" /></Field>
              <Field label="GST Rate (e.g. 0.18 for 18%)"><input style={inputStyle} type="number" step="0.01" value={form.gstRate} onChange={set('gstRate')} placeholder="0.18" /></Field>
              <Field label="Processing Charge (₹)"><input style={inputStyle} type="number" step="0.01" value={form.processingCharge} onChange={set('processingCharge')} placeholder="0" /></Field>
              <Field label="Start Date *"><DatePicker value={form.startDate} onChange={set('startDate')} required fullWidth /></Field>
              <Field label="Status">
                <select style={inputStyle} value={form.status} onChange={set('status')}>
                  <option value="ACTIVE">Active</option>
                  <option value="CLOSED">Closed</option>
                  <option value="FORECLOSED">Foreclosed</option>
                </select>
              </Field>
            </div>
            <Field label="Notes"><textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} value={form.notes} onChange={set('notes')} /></Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-danger">{saving ? 'Saving…' : editLoan ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default EmiLoansPage;

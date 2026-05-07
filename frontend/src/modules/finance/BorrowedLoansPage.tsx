import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { debtApi } from '../../services/api';
import { BorrowedLoanSummary } from '../../types';

const fmt = (n?: number) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (d?: string) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

const emptyForm = { loanId: '', lenderName: '', dateBorrowed: '', amountBorrowed: '', amountRepaid: '', status: 'OUTSTANDING', notes: '' };

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
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

const BorrowedLoansPage: React.FC = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<BorrowedLoanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editLoan, setEditLoan] = useState<BorrowedLoanSummary | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await debtApi.getDashboard();
      setLoans(res.data.borrowedLoans || []);
    } catch { /* handled */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditLoan(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (l: BorrowedLoanSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditLoan(l);
    setForm({
      loanId: l.loanId, lenderName: l.lenderName,
      dateBorrowed: l.dateBorrowed ? l.dateBorrowed.slice(0, 10) : '',
      amountBorrowed: String(l.amountBorrowed),
      amountRepaid: String(l.amountRepaid),
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
        lenderName: form.lenderName,
        dateBorrowed: form.dateBorrowed,
        amountBorrowed: parseFloat(form.amountBorrowed),
        amountRepaid: form.amountRepaid ? parseFloat(form.amountRepaid) : 0,
        status: form.status,
        notes: form.notes || null,
      };
      if (editLoan) {
        await debtApi.updateBorrowed(editLoan.id, payload);
      } else {
        await debtApi.createBorrowed(payload);
      }
      setShowModal(false);
      load();
    } catch { /* handled */ } finally { setSaving(false); }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const outstanding = loans.filter(l => l.status === 'OUTSTANDING');
  const repaid = loans.filter(l => l.status !== 'OUTSTANDING');

  const LoanTable: React.FC<{ items: BorrowedLoanSummary[]; title: string }> = ({ items, title }) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>{title}</h2>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'var(--bg-row-hover)', border: '1px solid var(--border)', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>No entries.</div>
      ) : (
        <div style={tblWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr>
                <th style={thStyle()}>Loan ID</th>
                <th style={thStyle()}>Lender</th>
                <th style={thStyle()}>Date Borrowed</th>
                <th style={thStyle(true)}>Borrowed</th>
                <th style={thStyle(true)}>Repaid</th>
                <th style={thStyle(true)}>Outstanding</th>
                <th style={thStyle()}>Status</th>
                <th style={thStyle()}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(l => {
                const sc = l.status === 'OUTSTANDING' ? { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', border: 'rgba(34,197,94,0.25)' } : { bg: 'rgba(148,163,184,0.10)', color: '#94a3b8', border: 'rgba(148,163,184,0.20)' };
                const progress = l.amountBorrowed > 0 ? Math.min(100, (l.amountRepaid / l.amountBorrowed) * 100) : 0;
                return (
                  <tr key={l.id} onClick={() => navigate(`/finance/debt/borrowed/${l.id}`)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>{l.loanId}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{l.lenderName}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(l.dateBorrowed)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-primary)' }}>{fmt(l.amountBorrowed)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#22c55e' }}>{fmt(l.amountRepaid)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: l.outstandingBalance > 0 ? '#ef4444' : '#94a3b8' }}>{fmt(l.outstandingBalance)}</div>
                      {l.amountBorrowed > 0 && (
                        <div style={{ height: 3, background: 'var(--border-subtle)', borderRadius: 99, marginTop: 4, width: 60, marginLeft: 'auto' }}>
                          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #2563eb, #60a5fa)', borderRadius: 99 }} />
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, letterSpacing: '0.04em' }}>{l.status}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={e => openEdit(l, e)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; e.currentTarget.style.color = '#60a5fa'; }}
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
    <div style={{ padding: '24px 28px', maxWidth: 1100, minHeight: '100%', background: 'radial-gradient(ellipse 65% 40% at 10% 0%, rgba(59,130,246,0.07) 0%, transparent 60%)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.4px' }}>Borrowed</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Money borrowed from friends and family</p>
        </div>
        <button onClick={openAdd} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}>
          + Add Borrowed
        </button>
      </div>

      <LoanTable items={outstanding} title="Outstanding" />
      <LoanTable items={repaid} title="Repaid" />

      {showModal && (
        <Modal title={editLoan ? `Edit — ${editLoan.lenderName}` : 'New Borrowed Entry'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Loan ID *"><input style={inputStyle} value={form.loanId} onChange={set('loanId')} required placeholder="BR001" /></Field>
              <Field label="Lender Name *"><input style={inputStyle} value={form.lenderName} onChange={set('lenderName')} required placeholder="Name" /></Field>
              <Field label="Date Borrowed *"><input style={inputStyle} type="date" value={form.dateBorrowed} onChange={set('dateBorrowed')} required /></Field>
              <Field label="Amount Borrowed (₹) *"><input style={inputStyle} type="number" value={form.amountBorrowed} onChange={set('amountBorrowed')} required /></Field>
              <Field label="Amount Repaid (₹)"><input style={inputStyle} type="number" value={form.amountRepaid} onChange={set('amountRepaid')} placeholder="0" /></Field>
              <Field label="Status">
                <select style={inputStyle} value={form.status} onChange={set('status')}>
                  <option value="OUTSTANDING">Outstanding</option>
                  <option value="REPAID">Repaid</option>
                </select>
              </Field>
            </div>
            <Field label="Notes"><textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} value={form.notes} onChange={set('notes')} /></Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{saving ? 'Saving…' : editLoan ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default BorrowedLoansPage;

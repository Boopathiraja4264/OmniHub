import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { debtApi } from '../../services/api';
import { EmiLoanDetail } from '../../types';

const fmt = (n?: number) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—';
const fmtD = (n?: number, dec = 0) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n) : '—';
const pct = (n?: number) => n != null ? `${(n * 100).toFixed(2)}%` : '—';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (d?: string) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)',
  background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box',
};

const EmiLoanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<EmiLoanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showForeclose, setShowForeclose] = useState(false);
  const [editForm, setEditForm] = useState({ loanId: '', name: '', initialPrincipal: '', annualInterestRate: '', tenureMonths: '', gstRate: '', startDate: '', status: 'ACTIVE', notes: '' });
  const [fcForm, setFcForm] = useState({ foreclosureDate: '', foreclosureAmount: '', foreclosurePrincipal: '', foreclosureInterest: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await debtApi.getEmi(parseInt(id));
      setDetail(res.data);
    } catch { navigate('/finance/debt'); } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (instId: number) => {
    setToggling(instId);
    try {
      await debtApi.toggleInstallment(instId);
      load();
    } catch { /* handled */ } finally { setToggling(null); }
  };

  const handleDelete = async () => {
    if (!id || !detail) return;
    if (!window.confirm(`Delete "${detail.summary.name}"? This cannot be undone.`)) return;
    try {
      await debtApi.deleteEmi(parseInt(id));
      navigate('/finance/debt/emi');
    } catch { /* handled */ }
  };

  const openEdit = () => {
    if (!detail) return;
    const s = detail.summary;
    setEditForm({
      loanId: s.loanId, name: s.name,
      initialPrincipal: String(s.initialPrincipal),
      annualInterestRate: String(s.annualInterestRate),
      tenureMonths: String(s.tenureMonths),
      gstRate: s.gstRate != null ? String(s.gstRate) : '',
      startDate: s.startDate ? s.startDate.slice(0, 10) : '',
      status: s.status,
      notes: s.notes || '',
    });
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await debtApi.updateEmi(parseInt(id), {
        loanId: editForm.loanId, name: editForm.name,
        initialPrincipal: parseFloat(editForm.initialPrincipal),
        annualInterestRate: parseFloat(editForm.annualInterestRate),
        tenureMonths: parseInt(editForm.tenureMonths),
        gstRate: editForm.gstRate ? parseFloat(editForm.gstRate) : 0,
        startDate: editForm.startDate, status: editForm.status, notes: editForm.notes || null,
        foreclosed: detail?.summary.foreclosed || false,
      });
      setShowEdit(false);
      load();
    } catch { /* handled */ } finally { setSaving(false); }
  };

  const handleForeclose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !detail) return;
    setSaving(true);
    const s = detail.summary;
    try {
      await debtApi.updateEmi(parseInt(id), {
        loanId: s.loanId, name: s.name,
        initialPrincipal: s.initialPrincipal,
        annualInterestRate: s.annualInterestRate,
        tenureMonths: s.tenureMonths,
        gstRate: s.gstRate || 0,
        startDate: s.startDate, status: 'FORECLOSED', notes: s.notes || null,
        foreclosed: true,
        foreclosureDate: fcForm.foreclosureDate,
        foreclosureAmount: parseFloat(fcForm.foreclosureAmount),
        foreclosurePrincipal: parseFloat(fcForm.foreclosurePrincipal),
        foreclosureInterest: parseFloat(fcForm.foreclosureInterest),
      });
      setShowForeclose(false);
      load();
    } catch { /* handled */ } finally { setSaving(false); }
  };

  const setE = (k: string) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setEditForm(f => ({ ...f, [k]: ev.target.value }));
  const setF = (k: string) => (ev: React.ChangeEvent<HTMLInputElement>) =>
    setFcForm(f => ({ ...f, [k]: ev.target.value }));

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!detail) return null;

  const { summary: s, installments } = detail;
  const totalEmi = s.baseEmi * (1 + (s.gstRate || 0));
  const paidCount = installments.filter(i => i.paid).length;
  const progress = s.initialPrincipal > 0 ? Math.min(100, ((s.principalPaid || 0) / s.initialPrincipal) * 100) : 0;
  const statusColor = s.status === 'ACTIVE' ? '#22c55e' : s.status === 'FORECLOSED' ? '#f97316' : '#94a3b8';

  return (
    <>
    <div style={{ padding: '24px 28px', maxWidth: 1200 }}>
      <button onClick={() => navigate('/finance/debt/emi')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>
        ← Back to EMI Loans
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{s.name}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {s.loanId} · {s.tenureMonths} months @ {pct(s.annualInterestRate)} p.a.
            {s.gstRate ? ` + ${pct(s.gstRate)} GST` : ''} · Started {fmtDate(s.startDate)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 20, background: `${statusColor}20`, color: statusColor }}>{s.status}</span>
          <button onClick={openEdit} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
          {s.status === 'ACTIVE' && (
            <button onClick={() => setShowForeclose(true)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(249,115,22,0.4)', background: 'rgba(249,115,22,0.08)', color: '#f97316', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Foreclose</button>
          )}
          <button onClick={handleDelete} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Amount Financed', value: fmt(s.initialPrincipal), color: 'var(--text-primary)' },
          { label: 'Base EMI', value: fmt(s.baseEmi), color: 'var(--text-primary)' },
          { label: 'Total EMI (incl GST)', value: fmt(totalEmi), color: '#f59e0b' },
          { label: 'Installments Paid', value: `${paidCount} / ${s.tenureMonths}`, color: '#22c55e' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>{c.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Principal Paid', value: fmt(s.principalPaid), color: '#22c55e' },
          { label: 'Interest Paid', value: fmt(s.interestPaid), color: '#f59e0b' },
          { label: 'Outstanding Principal', value: fmt(s.outstandingPrincipal), color: '#ef4444' },
          { label: 'Future Interest', value: fmt(s.futureInterest), color: '#a855f7' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
          <span>Principal repayment progress</span>
          <span>{Math.round(progress)}% paid off</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg-main)', borderRadius: 99 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#22c55e', borderRadius: 99, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Foreclosure info */}
      {s.foreclosed && (
        <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div><div style={{ fontSize: 11, color: '#f97316', marginBottom: 3 }}>Foreclosed On</div><div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmtDate(s.foreclosureDate)}</div></div>
          <div><div style={{ fontSize: 11, color: '#f97316', marginBottom: 3 }}>Total Paid</div><div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(s.foreclosureAmount)}</div></div>
          <div><div style={{ fontSize: 11, color: '#f97316', marginBottom: 3 }}>Principal</div><div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(s.foreclosurePrincipal)}</div></div>
          <div><div style={{ fontSize: 11, color: '#f97316', marginBottom: 3 }}>Interest at Closure</div><div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(s.foreclosureInterest)}</div></div>
        </div>
      )}

      {/* Amortization Table */}
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
        Amortization Schedule
        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 10 }}>Click any row to mark paid/unpaid</span>
      </div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-main)' }}>
              {['#', 'Due Date', 'Opening', 'EMI', 'Principal', 'Interest', 'GST', 'Closing', ''].map(h => (
                <th key={h} style={{ padding: '9px 12px', textAlign: h === '#' ? 'center' : 'right', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {installments.map((inst, i) => {
              const isCurrent = !inst.paid && (i === 0 || installments[i - 1].paid);
              return (
                <tr key={inst.id}
                  onClick={() => handleToggle(inst.id)}
                  style={{
                    background: inst.paid ? 'rgba(34,197,94,0.06)' : isCurrent ? 'rgba(245,158,11,0.08)' : i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                    cursor: 'pointer', transition: 'background 0.15s',
                    borderLeft: isCurrent ? '3px solid #f59e0b' : inst.paid ? '3px solid #22c55e' : '3px solid transparent',
                    opacity: toggling === inst.id ? 0.5 : 1,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = inst.paid ? 'rgba(34,197,94,0.06)' : isCurrent ? 'rgba(245,158,11,0.08)' : i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)')}
                >
                  <td style={{ padding: '7px 12px', textAlign: 'center', color: inst.paid ? '#22c55e' : 'var(--text-muted)', fontWeight: inst.paid ? 700 : 400 }}>{inst.installmentNumber}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: inst.paid ? '#22c55e' : isCurrent ? '#f59e0b' : 'var(--text-muted)', fontWeight: isCurrent ? 700 : 400, whiteSpace: 'nowrap' }}>{fmtDate(inst.dueDate)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>{fmtD(inst.openingPrincipal, 0)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>{fmtD(inst.emiAmount, 0)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: '#22c55e' }}>{fmtD(inst.principalPart, 0)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: '#f59e0b' }}>{fmtD(inst.interestPart, 0)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: '#a855f7' }}>{fmtD(inst.gstPart, 0)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>{fmtD(inst.closingPrincipal, 0)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                    {inst.paid
                      ? <span style={{ color: '#22c55e', fontSize: 14 }}>✓</span>
                      : isCurrent
                      ? <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 600 }}>DUE</span>
                      : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--bg-main)', borderTop: '2px solid var(--border)' }}>
              <td colSpan={2} style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-primary)' }}>Total</td>
              <td />
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                {fmt(installments.reduce((s, i) => s + i.emiAmount, 0))}
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>
                {fmt(installments.reduce((s, i) => s + i.principalPart, 0))}
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>
                {fmt(installments.reduce((s, i) => s + i.interestPart, 0))}
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#a855f7' }}>
                {fmt(installments.reduce((s, i) => s + i.gstPart, 0))}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

      {/* Edit Modal */}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Edit — {s.name}</h2>
              <button onClick={() => setShowEdit(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Loan ID *', key: 'loanId', type: 'text' },
                  { label: 'Name *', key: 'name', type: 'text' },
                  { label: 'Amount Financed (₹) *', key: 'initialPrincipal', type: 'number' },
                  { label: 'Annual Rate (e.g. 0.1599) *', key: 'annualInterestRate', type: 'number' },
                  { label: 'Tenure (Months) *', key: 'tenureMonths', type: 'number' },
                  { label: 'GST Rate (e.g. 0.18)', key: 'gstRate', type: 'number' },
                  { label: 'Start Date *', key: 'startDate', type: 'date' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <input type={f.type} style={inputStyle} value={(editForm as any)[f.key]} onChange={setE(f.key)} required={f.label.includes('*')} step={f.type === 'number' ? '0.0001' : undefined} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Status</label>
                  <select style={inputStyle} value={editForm.status} onChange={setE('status')}>
                    <option value="ACTIVE">Active</option><option value="CLOSED">Closed</option><option value="FORECLOSED">Foreclosed</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} value={editForm.notes} onChange={setE('notes')} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowEdit(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Foreclose Modal */}
      {showForeclose && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 420, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f97316', margin: 0 }}>Foreclose Loan</h2>
              <button onClick={() => setShowForeclose(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Enter the details from your bank's pre-closure statement.</p>
            <form onSubmit={handleForeclose} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Pre-closure Date *', key: 'foreclosureDate', type: 'date' },
                { label: 'Total Amount Paid (₹) *', key: 'foreclosureAmount', type: 'number' },
                { label: 'Principal Component (₹) *', key: 'foreclosurePrincipal', type: 'number' },
                { label: 'Interest Component (₹) *', key: 'foreclosureInterest', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input type={f.type} required style={inputStyle} value={(fcForm as any)[f.key]} onChange={setF(f.key)} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setShowForeclose(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{saving ? 'Processing…' : 'Confirm Foreclose'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default EmiLoanDetailPage;

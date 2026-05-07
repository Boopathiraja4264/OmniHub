import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { debtApi } from '../../services/api';
import { AnnualLoanDetail } from '../../types';

const fmt = (n?: number) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—';
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

const AnnualLoanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AnnualLoanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ paymentDate: '', amount: '', interestAccrued: '' });
  const [saving, setSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ loanId: '', name: '', initialPrincipal: '', annualInterestRate: '', startDate: '', endDate: '', currentBalance: '', totalInterestAccrued: '', interestPaid: '', status: 'OUTSTANDING', notes: '' });
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await debtApi.getAnnual(parseInt(id));
      setDetail(res.data);
    } catch { navigate('/finance/debt/annual'); } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleAddPrepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await debtApi.addPrepayment(parseInt(id), {
        paymentDate: form.paymentDate,
        amount: parseFloat(form.amount),
        interestAccrued: form.interestAccrued ? parseFloat(form.interestAccrued) : null,
      });
      setForm({ paymentDate: '', amount: '', interestAccrued: '' });
      setShowAdd(false);
      load();
    } catch { /* handled */ } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!id || !detail) return;
    if (!window.confirm(`Delete "${detail.summary.name}"?`)) return;
    try { await debtApi.deleteAnnual(parseInt(id)); navigate('/finance/debt/annual'); } catch { /* handled */ }
  };

  const handleDeletePrepayment = async (prepId: number) => {
    if (!window.confirm('Delete this prepayment?')) return;
    try { await debtApi.deletePrepayment(prepId); load(); } catch { /* handled */ }
  };

  const openEdit = () => {
    if (!detail) return;
    const s = detail.summary;
    setEditForm({
      loanId: s.loanId, name: s.name,
      initialPrincipal: String(s.initialPrincipal),
      annualInterestRate: String(s.annualInterestRate),
      startDate: s.startDate ? s.startDate.slice(0, 10) : '',
      endDate: s.endDate ? s.endDate.slice(0, 10) : '',
      currentBalance: s.currentBalance != null ? String(s.currentBalance) : '',
      totalInterestAccrued: s.totalInterestAccrued != null ? String(s.totalInterestAccrued) : '',
      interestPaid: s.interestPaid != null ? String(s.interestPaid) : '',
      status: s.status, notes: s.notes || '',
    });
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setEditSaving(true);
    try {
      await debtApi.updateAnnual(parseInt(id), {
        loanId: editForm.loanId, name: editForm.name,
        initialPrincipal: parseFloat(editForm.initialPrincipal),
        annualInterestRate: parseFloat(editForm.annualInterestRate),
        startDate: editForm.startDate, endDate: editForm.endDate || null,
        currentBalance: editForm.currentBalance ? parseFloat(editForm.currentBalance) : parseFloat(editForm.initialPrincipal),
        totalInterestAccrued: editForm.totalInterestAccrued ? parseFloat(editForm.totalInterestAccrued) : 0,
        interestPaid: editForm.interestPaid ? parseFloat(editForm.interestPaid) : 0,
        status: editForm.status, notes: editForm.notes || null,
      });
      setShowEdit(false);
      load();
    } catch { /* handled */ } finally { setEditSaving(false); }
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!detail) return null;

  const { summary: s, prepayments } = detail;
  const progress = s.initialPrincipal > 0 ? Math.min(100, (1 - (s.currentBalance || 0) / s.initialPrincipal) * 100) : 0;
  const totalPrepaid = prepayments.reduce((sum, p) => sum + p.amount, 0);
  const statusColor = s.status === 'OUTSTANDING' ? '#22c55e' : '#94a3b8';

  return (
    <>
    <div style={{ padding: '24px 28px', maxWidth: 960 }}>
      <button onClick={() => navigate('/finance/debt/annual')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>
        ← Back to Annual Loans
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{s.name}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {s.loanId} · {pct(s.annualInterestRate)} annual interest · {fmtDate(s.startDate)} → {fmtDate(s.endDate)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 20, background: `${statusColor}20`, color: statusColor }}>{s.status}</span>
          <button onClick={openEdit} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
          <button onClick={handleDelete} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Initial Principal', value: fmt(s.initialPrincipal), color: 'var(--text-primary)' },
          { label: 'Outstanding', value: fmt(s.currentBalance), color: '#ef4444' },
          { label: 'Interest Accrued', value: fmt(s.totalInterestAccrued), color: '#a855f7' },
          { label: 'Interest Paid', value: fmt(s.interestPaid), color: '#22c55e' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
          <span>Repayment progress</span><span>{Math.round(progress)}% repaid</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg-main)', borderRadius: 99 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#f59e0b', borderRadius: 99 }} />
        </div>
      </div>

      {/* Prepayments */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Prepayment History</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 10 }}>
            {prepayments.length} entries · Total {fmt(totalPrepaid)}
          </span>
        </div>
        <button onClick={() => setShowAdd(v => !v)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {showAdd ? 'Cancel' : '+ Add Prepayment'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAddPrepayment} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[
            { label: 'Date', key: 'paymentDate', type: 'date', required: true },
            { label: 'Amount (₹)', key: 'amount', type: 'number', required: true },
            { label: 'Interest Accrued (₹)', key: 'interestAccrued', type: 'number', required: false },
          ].map(f => (
            <div key={f.key} style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
              <input type={f.type} required={f.required}
                value={(form as any)[f.key]}
                onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box' }} />
            </div>
          ))}
          <button type="submit" disabled={saving} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}

      {prepayments.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>No prepayments recorded.</div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 460 }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)' }}>
                {['Date', 'Amount', 'Interest Accrued', 'Running Balance', ''].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: h === '' ? 'center' : 'right', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prepayments.reduce((acc, p) => {
                const prev = acc.length > 0 ? acc[acc.length - 1].runningBalance : (s.initialPrincipal || 0);
                acc.push({ ...p, runningBalance: Math.max(0, prev - p.amount) });
                return acc;
              }, [] as any[]).map((p: any, i: number) => (
                <tr key={p.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                  <td style={{ padding: '8px 14px', textAlign: 'right', color: 'var(--text-primary)' }}>{fmtDate(p.paymentDate)}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>{fmt(p.amount)}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', color: '#a855f7' }}>{p.interestAccrued ? fmt(p.interestAccrued) : '—'}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', color: '#ef4444' }}>{fmt(p.runningBalance)}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                    <button onClick={() => handleDeletePrepayment(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

    {/* Edit Modal */}
    {showEdit && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Edit — {s.name}</h2>
            <button onClick={() => setShowEdit(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>×</button>
          </div>
          <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Loan ID *', key: 'loanId', type: 'text' },
                { label: 'Name *', key: 'name', type: 'text' },
                { label: 'Initial Principal (₹) *', key: 'initialPrincipal', type: 'number' },
                { label: 'Annual Interest Rate (e.g. 0.099) *', key: 'annualInterestRate', type: 'number' },
                { label: 'Start Date *', key: 'startDate', type: 'date' },
                { label: 'End Date', key: 'endDate', type: 'date' },
                { label: 'Current Balance (₹)', key: 'currentBalance', type: 'number' },
                { label: 'Interest Paid (₹)', key: 'interestPaid', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input type={f.type} style={inputStyle} value={(editForm as any)[f.key]} onChange={e => setEditForm(fm => ({ ...fm, [f.key]: e.target.value }))} required={f.label.includes('*')} step={f.type === 'number' ? '0.0001' : undefined} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Status</label>
                <select style={inputStyle} value={editForm.status} onChange={e => setEditForm(fm => ({ ...fm, status: e.target.value }))}>
                  <option value="OUTSTANDING">Outstanding</option>
                  <option value="REPAID">Repaid</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes</label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} value={editForm.notes} onChange={e => setEditForm(fm => ({ ...fm, notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowEdit(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={editSaving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{editSaving ? 'Saving…' : 'Update'}</button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
};

export default AnnualLoanDetailPage;

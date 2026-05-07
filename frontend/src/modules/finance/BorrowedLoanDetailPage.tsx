import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { debtApi } from '../../services/api';
import { BorrowedLoanDetail } from '../../types';

const fmt = (n?: number) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—';
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

const BorrowedLoanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<BorrowedLoanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ paymentDate: '', amount: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ loanId: '', lenderName: '', dateBorrowed: '', amountBorrowed: '', amountRepaid: '', status: 'OUTSTANDING', notes: '' });
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await debtApi.getBorrowed(parseInt(id));
      setDetail(res.data);
    } catch { navigate('/finance/debt/borrowed'); } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleAddRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await debtApi.addRepayment(parseInt(id), {
        paymentDate: form.paymentDate,
        amount: parseFloat(form.amount),
        note: form.note || null,
      });
      setForm({ paymentDate: '', amount: '', note: '' });
      setShowAdd(false);
      load();
    } catch { /* handled */ } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!id || !detail) return;
    if (!window.confirm(`Delete loan from "${detail.summary.lenderName}"?`)) return;
    try { await debtApi.deleteBorrowed(parseInt(id)); navigate('/finance/debt/borrowed'); } catch { /* handled */ }
  };

  const handleDeleteRepayment = async (repId: number) => {
    if (!window.confirm('Delete this repayment?')) return;
    try { await debtApi.deleteRepayment(repId); load(); } catch { /* handled */ }
  };

  const openEdit = () => {
    if (!detail) return;
    const s = detail.summary;
    setEditForm({
      loanId: s.loanId, lenderName: s.lenderName,
      dateBorrowed: s.dateBorrowed ? s.dateBorrowed.slice(0, 10) : '',
      amountBorrowed: String(s.amountBorrowed),
      amountRepaid: String(s.amountRepaid),
      status: s.status, notes: s.notes || '',
    });
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setEditSaving(true);
    try {
      await debtApi.updateBorrowed(parseInt(id), {
        loanId: editForm.loanId, lenderName: editForm.lenderName,
        dateBorrowed: editForm.dateBorrowed,
        amountBorrowed: parseFloat(editForm.amountBorrowed),
        amountRepaid: editForm.amountRepaid ? parseFloat(editForm.amountRepaid) : 0,
        status: editForm.status, notes: editForm.notes || null,
      });
      setShowEdit(false);
      load();
    } catch { /* handled */ } finally { setEditSaving(false); }
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!detail) return null;

  const { summary: s, repayments } = detail;
  const totalRepaid = repayments.reduce((sum, r) => sum + r.amount, 0);
  const outstanding = Math.max(0, s.amountBorrowed - totalRepaid);
  const progress = s.amountBorrowed > 0 ? Math.min(100, (totalRepaid / s.amountBorrowed) * 100) : 0;
  const statusColor = s.status === 'OUTSTANDING' ? '#22c55e' : '#94a3b8';

  return (
    <>
    <div style={{ padding: '24px 28px', maxWidth: 800 }}>
      <button onClick={() => navigate('/finance/debt/borrowed')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>
        ← Back to Borrowed
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{s.lenderName}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {s.loanId} · Borrowed on {fmtDate(s.dateBorrowed)}
            {s.notes ? ` · ${s.notes}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 20, background: `${statusColor}20`, color: statusColor }}>{s.status}</span>
          <button onClick={openEdit} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
          <button onClick={handleDelete} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Amount Borrowed', value: fmt(s.amountBorrowed), color: 'var(--text-primary)' },
          { label: 'Total Repaid', value: fmt(totalRepaid), color: '#22c55e' },
          { label: 'Still Owed', value: fmt(outstanding), color: outstanding > 0 ? '#ef4444' : '#94a3b8' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
          <span>Repayment progress</span><span>{Math.round(progress)}% returned</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg-main)', borderRadius: 99 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#3b82f6', borderRadius: 99 }} />
        </div>
      </div>

      {/* Repayment log */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Repayment Log</span>
        <button onClick={() => setShowAdd(v => !v)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {showAdd ? 'Cancel' : '+ Add Repayment'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAddRepayment} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[
            { label: 'Date', key: 'paymentDate', type: 'date', required: true },
            { label: 'Amount (₹)', key: 'amount', type: 'number', required: true },
            { label: 'Note (optional)', key: 'note', type: 'text', required: false },
          ].map(f => (
            <div key={f.key} style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
              <input type={f.type} required={f.required}
                value={(form as any)[f.key]}
                onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box' }} />
            </div>
          ))}
          <button type="submit" disabled={saving} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}

      {repayments.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>No repayments recorded yet.</div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 400 }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)' }}>
                {['Date', 'Amount', 'Note', 'Running Balance', ''].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: h === '' ? 'center' : 'right', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {repayments.reduce((acc, r) => {
                const prev = acc.length > 0 ? acc[acc.length - 1].runningBalance : (s.amountBorrowed || 0);
                acc.push({ ...r, runningBalance: Math.max(0, prev - r.amount) });
                return acc;
              }, [] as any[]).map((r: any, i: number) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                  <td style={{ padding: '8px 14px', textAlign: 'right', color: 'var(--text-primary)' }}>{fmtDate(r.paymentDate)}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>{fmt(r.amount)}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', color: 'var(--text-muted)' }}>{r.note || '—'}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', color: r.runningBalance > 0 ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>{fmt(r.runningBalance)}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                    <button onClick={() => handleDeleteRepayment(r.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg-main)', borderTop: '2px solid var(--border)' }}>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>Total</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>{fmt(totalRepaid)}</td>
                <td />
                <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: outstanding > 0 ? '#ef4444' : '#94a3b8' }}>{fmt(outstanding)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>

    {/* Edit Modal */}
    {showEdit && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Edit — {s.lenderName}</h2>
            <button onClick={() => setShowEdit(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>×</button>
          </div>
          <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Loan ID *', key: 'loanId', type: 'text' },
                { label: 'Lender Name *', key: 'lenderName', type: 'text' },
                { label: 'Date Borrowed *', key: 'dateBorrowed', type: 'date' },
                { label: 'Amount Borrowed (₹) *', key: 'amountBorrowed', type: 'number' },
                { label: 'Amount Repaid (₹)', key: 'amountRepaid', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input type={f.type} style={inputStyle} value={(editForm as any)[f.key]} onChange={e => setEditForm(fm => ({ ...fm, [f.key]: e.target.value }))} required={f.label.includes('*')} />
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
              <button type="submit" disabled={editSaving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{editSaving ? 'Saving…' : 'Update'}</button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
};

export default BorrowedLoanDetailPage;

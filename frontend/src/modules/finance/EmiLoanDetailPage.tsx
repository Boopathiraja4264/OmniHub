import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { debtApi } from '../../services/api';
import { EmiLoanDetail } from '../../types';

const fmt = (n?: number) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—';
const fmtD = (n?: number, dec = 0) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n) : '—';
const pct = (n?: number) => n != null ? `${(n * 100).toFixed(2)}%` : '—';
const n2 = (s: string) => Math.round(parseFloat(s) * 100) / 100 || 0;

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

const roStyle: React.CSSProperties = {
  ...inputStyle, background: 'var(--bg-row-alt)', color: 'var(--text-muted)', cursor: 'default',
};

interface FcForm {
  foreclosureDate: string;
  foreclosurePrincipal: string;
  foreclosureCharges: string;
  foreclosureChargesGst: string;
  foreclosureInterest: string;
  foreclosureInterestGst: string;
}

const computeTotal = (f: FcForm) =>
  n2(f.foreclosurePrincipal) + n2(f.foreclosureCharges) + n2(f.foreclosureChargesGst) +
  n2(f.foreclosureInterest) + n2(f.foreclosureInterestGst);

const EmiLoanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<EmiLoanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showForeclose, setShowForeclose] = useState(false);
  const [editForm, setEditForm] = useState({ loanId: '', name: '', initialPrincipal: '', annualInterestRate: '', tenureMonths: '', gstRate: '', processingCharge: '', startDate: '', status: 'ACTIVE', notes: '' });
  const [fcForm, setFcForm] = useState<FcForm>({ foreclosureDate: '', foreclosurePrincipal: '', foreclosureCharges: '', foreclosureChargesGst: '', foreclosureInterest: '', foreclosureInterestGst: '' });
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
      processingCharge: s.processingCharge != null && s.processingCharge > 0 ? String(s.processingCharge) : '',
      startDate: s.startDate ? s.startDate.slice(0, 10) : '',
      status: s.status,
      notes: s.notes || '',
    });
    setShowEdit(true);
  };

  const openForeclose = () => {
    if (!detail) return;
    const s = detail.summary;
    const outstanding = s.outstandingPrincipal ?? 0;
    const charges = Math.round(outstanding * 0.03 * 100) / 100;
    const chargesGst = Math.round(charges * 0.18 * 100) / 100;
    const nextInst = detail.installments.find(i => !i.paid);
    const upcomingInterest = nextInst ? Math.round((nextInst.interestPart ?? 0) * 100) / 100 : 0;
    const upcomingInterestGst = nextInst ? Math.round((nextInst.gstPart ?? 0) * 100) / 100 : 0;
    const today = new Date().toISOString().slice(0, 10);
    setFcForm({
      foreclosureDate: today,
      foreclosurePrincipal: String(outstanding),
      foreclosureCharges: String(charges),
      foreclosureChargesGst: String(chargesGst),
      foreclosureInterest: String(upcomingInterest),
      foreclosureInterestGst: String(upcomingInterestGst),
    });
    setShowForeclose(true);
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
        processingCharge: editForm.processingCharge ? parseFloat(editForm.processingCharge) : 0,
        startDate: editForm.startDate, status: editForm.status, notes: editForm.notes || null,
        foreclosed: editForm.status === 'FORECLOSED',
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
    const total = computeTotal(fcForm);
    try {
      await debtApi.updateEmi(parseInt(id), {
        loanId: s.loanId, name: s.name,
        initialPrincipal: s.initialPrincipal,
        annualInterestRate: s.annualInterestRate,
        tenureMonths: s.tenureMonths,
        gstRate: s.gstRate || 0,
        processingCharge: s.processingCharge || 0,
        startDate: s.startDate, status: 'FORECLOSED', notes: s.notes || null,
        foreclosed: true,
        foreclosureDate: fcForm.foreclosureDate,
        foreclosureAmount: total,
        foreclosurePrincipal: n2(fcForm.foreclosurePrincipal),
        foreclosureInterest: n2(fcForm.foreclosureInterest),
        foreclosureCharges: n2(fcForm.foreclosureCharges),
        foreclosureChargesGst: n2(fcForm.foreclosureChargesGst),
        foreclosureInterestGst: n2(fcForm.foreclosureInterestGst),
      });
      setShowForeclose(false);
      load();
    } catch { /* handled */ } finally { setSaving(false); }
  };

  const setE = (k: string) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setEditForm(f => ({ ...f, [k]: ev.target.value }));

  const setF = (k: keyof FcForm) => (ev: React.ChangeEvent<HTMLInputElement>) =>
    setFcForm(f => ({ ...f, [k]: ev.target.value }));

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!detail) return null;

  const { summary: s, installments } = detail;
  const paidCount = installments.filter(i => i.paid).length;
  const progress = s.initialPrincipal > 0 ? Math.min(100, ((s.principalPaid || 0) / s.initialPrincipal) * 100) : 0;
  const statusColor = s.status === 'ACTIVE' ? 'var(--income)' : s.status === 'FORECLOSED' ? '#f97316' : '#94a3b8';

  // Foreclosure report totals
  const fcTotalPrincipal = (s.principalPaid || 0) + (s.foreclosurePrincipal || 0);
  const fcTotalInterest = (s.interestPaid || 0) + (s.foreclosureInterest || 0);
  const fcTotalGst = (s.gstPaid || 0) + (s.foreclosureInterestGst || 0);
  const fcGrandTotal = fcTotalPrincipal + fcTotalInterest + fcTotalGst + (s.foreclosureCharges || 0) + (s.foreclosureChargesGst || 0);

  return (
    <>
    <div style={{ padding: '24px 28px', maxWidth: 1200 }}>
      <button onClick={() => navigate('/finance/debt/emi')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>
        ← Back to EMI Loans
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 className="page-title">{s.name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {s.loanId} · {s.tenureMonths} months @ {pct(s.annualInterestRate)} p.a.
            {s.gstRate ? ` + ${pct(s.gstRate)} GST` : ''} · Started {fmtDate(s.startDate)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 20, background: `${statusColor}20`, color: statusColor }}>{s.status}</span>
          <button onClick={openEdit} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
          {s.status === 'ACTIVE' && (
            <button onClick={openForeclose} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(249,115,22,0.4)', background: 'rgba(249,115,22,0.08)', color: '#f97316', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Foreclose</button>
          )}
          <button onClick={handleDelete} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: 'var(--expense)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Amount Financed', value: fmt(s.initialPrincipal), color: 'var(--text-primary)' },
          { label: 'Base EMI', value: fmt(s.baseEmi), color: 'var(--warning)' },
          { label: 'GST Rate', value: s.gstRate ? pct(s.gstRate) : 'None', color: 'var(--text-muted)' },
          { label: 'Installments Paid', value: `${paidCount} / ${s.tenureMonths}`, color: 'var(--income)' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>{c.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: (s.processingCharge ?? 0) > 0 ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Principal Paid', value: fmt(s.principalPaid), color: 'var(--income)' },
          { label: 'Interest Paid', value: fmt(s.interestPaid), color: 'var(--warning)' },
          { label: 'Outstanding Principal', value: fmt(s.outstandingPrincipal), color: 'var(--expense)' },
          { label: 'Future Interest', value: fmt(s.futureInterest), color: 'var(--purple)' },
          ...((s.processingCharge ?? 0) > 0 ? [{ label: 'Processing Charge', value: fmt(s.processingCharge), color: '#64748b', sub: (s.processingChargePaid ?? 0) > 0 ? 'paid' : 'due with 1st EMI' }] : []),
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.value}</div>
            {(c as any).sub && <div style={{ fontSize: 10, color: (s.processingChargePaid ?? 0) > 0 ? 'var(--income)' : 'var(--warning)', marginTop: 3 }}>{(c as any).sub}</div>}
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
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--income)', borderRadius: 99, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Foreclosure Report */}
      {s.foreclosed && (
        <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 12, padding: '18px 20px', marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f97316', marginBottom: 14 }}>
            Closure Report — Foreclosed on {fmtDate(s.foreclosureDate)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
            {/* Principal column */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 9, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Principal</div>
              <Row label="Paid via EMIs" value={fmt(s.principalPaid)} color="var(--income)" />
              <Row label="Paid at closure" value={fmt(s.foreclosurePrincipal)} color="var(--income)" />
              <Divider />
              <Row label="Total principal" value={fmt(fcTotalPrincipal)} color="var(--income)" bold />
            </div>
            {/* Interest + GST column */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 9, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Interest & GST</div>
              <Row label="Interest paid (EMIs)" value={fmt(s.interestPaid)} color="var(--warning)" />
              <Row label="Interest at closure" value={fmt(s.foreclosureInterest)} color="var(--warning)" />
              <Row label="GST paid (EMIs)" value={fmt(s.gstPaid)} color="var(--purple)" />
              <Row label="GST on closure interest" value={fmt(s.foreclosureInterestGst)} color="var(--purple)" />
              <Divider />
              <Row label="Total interest" value={fmt(fcTotalInterest)} color="var(--warning)" bold />
              <Row label="Total GST" value={fmt(fcTotalGst)} color="var(--purple)" bold />
            </div>
            {/* Foreclosure charges column */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 9, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Foreclosure Charges</div>
              <Row label="Charge (3% of principal)" value={fmt(s.foreclosureCharges)} color="#f97316" />
              <Row label="GST on charge (18%)" value={fmt(s.foreclosureChargesGst)} color="#f97316" />
              <Divider />
              <Row label="Total charges" value={fmt((s.foreclosureCharges || 0) + (s.foreclosureChargesGst || 0))} color="#f97316" bold />
            </div>
          </div>
          {/* Grand total bar */}
          <div style={{ background: 'rgba(249,115,22,0.12)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: '#f97316', marginBottom: 2 }}>Amount Financed</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(s.initialPrincipal)}</div>
            </div>
            <div style={{ fontSize: 18, color: 'var(--text-muted)' }}>→</div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#f97316', marginBottom: 2 }}>Total Outgo (Principal + Interest + GST + Charges)</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f97316' }}>{fmt(fcGrandTotal)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Amortization Table */}
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
        Amortization Schedule
        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 10 }}>Click any row to mark paid/unpaid</span>
      </div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 660 }}>
          <thead>
            <tr style={{ background: 'var(--bg-main)' }}>
              {['#', 'Due Date', 'Opening', 'EMI with GST', 'Principal', 'Interest', 'GST', 'Closing', ''].map(h => (
                <th key={h} style={{ padding: '9px 12px', textAlign: h === '#' ? 'center' : 'right', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {installments.map((inst, i) => {
              const isCurrent = !inst.paid && (i === 0 || installments[i - 1].paid);
              const pc = inst.processingCharge ?? 0;
              const baseEmiAmount = pc > 0 ? inst.emiAmount - pc : inst.emiAmount;
              return (
                <tr key={inst.id}
                  onClick={() => handleToggle(inst.id)}
                  style={{
                    background: inst.paid ? 'rgba(34,197,94,0.06)' : isCurrent ? 'rgba(245,158,11,0.08)' : i % 2 === 0 ? 'transparent' : 'var(--bg-row-alt)',
                    cursor: 'pointer', transition: 'background 0.15s',
                    borderLeft: isCurrent ? '3px solid var(--warning)' : inst.paid ? '3px solid var(--income)' : '3px solid transparent',
                    opacity: toggling === inst.id ? 0.5 : 1,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = inst.paid ? 'rgba(34,197,94,0.06)' : isCurrent ? 'rgba(245,158,11,0.08)' : i % 2 === 0 ? 'transparent' : 'var(--bg-row-alt)')}
                >
                  <td style={{ padding: '7px 12px', textAlign: 'center', color: inst.paid ? 'var(--income)' : 'var(--text-muted)', fontWeight: inst.paid ? 700 : 400 }}>{inst.installmentNumber}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: inst.paid ? 'var(--income)' : isCurrent ? 'var(--warning)' : 'var(--text-muted)', fontWeight: isCurrent ? 700 : 400, whiteSpace: 'nowrap' }}>{fmtDate(inst.dueDate)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>{fmtD(inst.openingPrincipal, 0)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {fmtD(inst.emiAmount, 0)}
                    {pc > 0 && (
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 400, marginTop: 2 }}>
                        {fmtD(baseEmiAmount, 0)} + {fmtD(pc, 0)} proc.
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--income)' }}>{fmtD(inst.principalPart, 0)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--warning)' }}>{fmtD(inst.interestPart, 0)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--purple)' }}>{fmtD(inst.gstPart, 0)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>{fmtD(inst.closingPrincipal, 0)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                    {inst.paid
                      ? <span style={{ color: 'var(--income)', fontSize: 14 }}>✓</span>
                      : isCurrent
                      ? <span style={{ color: 'var(--warning)', fontSize: 11, fontWeight: 600 }}>DUE</span>
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
                {fmt(installments.reduce((sum, i) => sum + i.emiAmount, 0))}
                {(s.processingCharge ?? 0) > 0 && (
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 400, marginTop: 2 }}>
                    incl. {fmtD(s.processingCharge, 0)} proc. fee
                  </div>
                )}
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--income)' }}>
                {fmt(installments.reduce((sum, i) => sum + i.principalPart, 0))}
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--warning)' }}>
                {fmt(installments.reduce((sum, i) => sum + i.interestPart, 0))}
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--purple)' }}>
                {fmt(installments.reduce((sum, i) => sum + i.gstPart, 0))}
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
                  { label: 'Processing Charge (₹)', key: 'processingCharge', type: 'number' },
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
                <button type="submit" disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--expense)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Foreclose Modal */}
      {showForeclose && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f97316', margin: 0 }}>Foreclose Loan</h2>
              <button onClick={() => setShowForeclose(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Auto-calculated from current balance. Edit if your bank statement differs.
            </p>
            <form onSubmit={handleForeclose} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Pre-closure Date *</label>
                <input type="date" required style={inputStyle} value={fcForm.foreclosureDate} onChange={setF('foreclosureDate')} />
              </div>

              {/* Principal */}
              <SectionLabel>Outstanding Principal</SectionLabel>
              <FcRow label="Principal (₹)" field="foreclosurePrincipal" form={fcForm} setF={setF} inputStyle={inputStyle} color="var(--income)" />

              {/* Foreclosure charges */}
              <SectionLabel>Foreclosure Charges</SectionLabel>
              <FcRow label="Charge (3% of principal) (₹)" field="foreclosureCharges" form={fcForm} setF={setF} inputStyle={inputStyle} color="#f97316" />
              <FcRow label="GST on charge (18%) (₹)" field="foreclosureChargesGst" form={fcForm} setF={setF} inputStyle={inputStyle} color="#f97316" />

              {/* Upcoming month interest */}
              <SectionLabel>Upcoming Month Interest</SectionLabel>
              <FcRow label="Interest (₹)" field="foreclosureInterest" form={fcForm} setF={setF} inputStyle={inputStyle} color="var(--warning)" />
              <FcRow label="GST on interest (18%) (₹)" field="foreclosureInterestGst" form={fcForm} setF={setF} inputStyle={inputStyle} color="var(--purple)" />

              {/* Total */}
              <div style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 8, padding: '12px 14px', marginTop: 8, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#f97316', fontWeight: 600 }}>Total Payable</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#f97316' }}>{fmtD(computeTotal(fcForm), 2)}</span>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
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

// ── Small helpers ─────────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 12 }}>{children}</div>
);

const Divider: React.FC = () => (
  <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0' }} />
);

const Row: React.FC<{ label: string; value: string; color: string; bold?: boolean }> = ({ label, value, color, bold }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ fontSize: bold ? 13 : 12, fontWeight: bold ? 700 : 500, color }}>{value}</span>
  </div>
);

const FcRow: React.FC<{
  label: string;
  field: keyof FcForm;
  form: FcForm;
  setF: (k: keyof FcForm) => (ev: React.ChangeEvent<HTMLInputElement>) => void;
  inputStyle: React.CSSProperties;
  color: string;
}> = ({ label, field, form, setF, inputStyle, color }) => (
  <div style={{ marginBottom: 8 }}>
    <label style={{ fontSize: 11, color, display: 'block', marginBottom: 3 }}>{label}</label>
    <input type="number" step="0.01" style={inputStyle} value={form[field]} onChange={setF(field)} />
  </div>
);

export default EmiLoanDetailPage;

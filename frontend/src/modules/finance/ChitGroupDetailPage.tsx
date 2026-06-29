import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chitApi, bankAccountApi, transactionApi } from '../../services/api';
import { ChitGroup, ChitBatch, ChitMonthlyEntry, ChitGroupRequest, BankAccount } from '../../types';
import { useMobile } from '../../hooks/useMobile';
import DatePicker from '../../components/DatePicker';

const fmt = (n?: number) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (d?: string) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

const ChitGroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [group, setGroup] = useState<ChitGroup | null>(null);
  const [loading, setLoading] = useState(true);
  // editingKasir: { entryId -> draft string value }
  const [editingKasir, setEditingKasir] = useState<Record<number, string>>({});
  // editBatch: batchId -> { dateTaken, amountTaken } draft
  const [editBatch, setEditBatch] = useState<Record<number, { dateTaken: string; amountTaken: string }>>({});
  const [savingKasir, setSavingKasir] = useState<Record<number, boolean>>({});
  const [savingBatch, setSavingBatch] = useState<Record<number, boolean>>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<ChitGroupRequest | null>(null);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [payModal, setPayModal] = useState<{ entry: ChitMonthlyEntry; batchLabel: string } | null>(null);
  const [payBankId, setPayBankId] = useState('');
  const [payDate, setPayDate] = useState('');
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await chitApi.getById(parseInt(id));
      setGroup(res.data);
    } catch { navigate('/finance/chit'); } finally { setLoading(false); }
  }, [id, navigate]);

  const openEdit = () => {
    if (!group) return;
    setEditForm({
      name: group.name,
      groupLabel: group.groupLabel,
      membersCount: group.membersCount,
      totalBatches: group.totalBatches,
      membersPerBatch: group.membersPerBatch,
      monthlyAmount: group.monthlyAmount,
      basicInterest: group.basicInterest,
      companyCommission: group.companyCommission,
      startDate: group.startDate,
      status: group.status,
      notes: group.notes ?? '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm || !id) return;
    setSaving(true);
    try {
      await chitApi.update(parseInt(id), editForm);
      setShowEditModal(false);
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Update failed';
      alert(`Error: ${msg}`);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!group || !id) return;
    if (!window.confirm(`Delete "${group.name}"? This cannot be undone.`)) return;
    try {
      await chitApi.delete(parseInt(id));
      navigate('/finance/chit');
    } catch { /* handled */ }
  };

  const setF = (key: keyof ChitGroupRequest, value: any) =>
    setEditForm(f => f ? { ...f, [key]: value } : f);

  useEffect(() => {
    load();
    bankAccountApi.getAll().then(r => setAccounts(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [load]);

  const openPayModal = (entry: ChitMonthlyEntry, batchLabel: string) => {
    setPayBankId(entry.paid && entry.paidBankAccountId != null ? String(entry.paidBankAccountId) : '');
    setPayDate((entry.paid && entry.paidDate ? entry.paidDate : entry.monthDate).slice(0, 10));
    setPayModal({ entry, batchLabel });
  };

  const handlePay = async () => {
    if (!payModal || !payBankId || !group) return;
    const { entry, batchLabel } = payModal;
    const isEdit = !!entry.paid;
    setPaying(true);
    try {
      const txn = {
        description: `Chit – ${group.name} ${batchLabel} (Month ${entry.monthNumber})`,
        amount: entry.amountPerMonth,
        type: 'EXPENSE',
        category: 'Investments',
        date: payDate,
        paymentSource: 'BANK',
        bankAccountId: parseInt(payBankId),
      };
      // Re-use the linked transaction when editing; create a new one on first payment.
      let transactionId = entry.paidTransactionId;
      if (isEdit && transactionId != null) {
        await transactionApi.update(transactionId, txn);
      } else {
        const res = await transactionApi.create(txn);
        transactionId = res.data?.id;
      }
      await chitApi.updatePayment(entry.id, {
        paid: true,
        paidDate: payDate,
        paidBankAccountId: parseInt(payBankId),
        paidTransactionId: transactionId,
      });
      setPayModal(null);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to record payment');
    } finally { setPaying(false); }
  };

  const handleRemovePayment = async () => {
    if (!payModal) return;
    const { entry } = payModal;
    if (!window.confirm('Remove this payment? The linked transaction will be deleted.')) return;
    setPaying(true);
    try {
      if (entry.paidTransactionId != null) {
        try { await transactionApi.delete(entry.paidTransactionId); } catch { /* already gone */ }
      }
      await chitApi.updatePayment(entry.id, { paid: false });
      setPayModal(null);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to remove payment');
    } finally { setPaying(false); }
  };

  const saveKasir = async (entry: ChitMonthlyEntry) => {
    const raw = editingKasir[entry.id];
    if (raw === undefined) return;
    const val = raw === '' ? null : parseFloat(raw);
    setSavingKasir(s => ({ ...s, [entry.id]: true }));
    try {
      await chitApi.updateKasir(entry.id, val);
      setEditingKasir(s => { const n = { ...s }; delete n[entry.id]; return n; });
      load();
    } catch { /* handled */ } finally { setSavingKasir(s => ({ ...s, [entry.id]: false })); }
  };

  const saveBatch = async (batch: ChitBatch) => {
    const draft = editBatch[batch.id];
    if (!draft) return;
    setSavingBatch(s => ({ ...s, [batch.id]: true }));
    try {
      await chitApi.updateBatch(batch.id, {
        dateTaken: draft.dateTaken || undefined,
        amountTaken: draft.amountTaken ? parseFloat(draft.amountTaken) : undefined,
      });
      setEditBatch(s => { const n = { ...s }; delete n[batch.id]; return n; });
      load();
    } catch { /* handled */ } finally { setSavingBatch(s => ({ ...s, [batch.id]: false })); }
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!group) return null;

  const totalAmount = group.monthlyAmount * group.membersPerBatch;
  const netGain = (group.totalReceived || 0) - (group.totalPaid || 0);
  const overallTotal = (group.totalKasir || 0) + (group.totalReceived || 0);
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, timezone-safe

  const inputSm: React.CSSProperties = {
    width: '100%', padding: '6px 9px', borderRadius: 7,
    border: '1px solid var(--border)',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box',
  };

  const BatchTable: React.FC<{ batch: ChitBatch; batchLabel: string }> = ({ batch, batchLabel }) => {
    const draft = editBatch[batch.id];
    const isSaving = savingBatch[batch.id];
    const hasTaken = !!(batch.dateTaken || batch.amountTaken);

    return (
      <div style={{ flex: 1, minWidth: 0, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.15)' }}>
        {/* Top accent bar */}
        <div style={{ height: 3, background: hasTaken ? 'linear-gradient(90deg, #C9A84C 0%, rgba(201,168,76,0.15) 100%)' : 'rgba(148,163,184,0.15)' }} />

        {/* Batch header */}
        <div style={{ background: 'var(--bg-card)', padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              Chit {batch.batchNumber}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              Total pot: <strong style={{ color: 'var(--text-primary)' }}>{fmt(totalAmount)}</strong>
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Date Taken</div>
              <DatePicker
                value={editBatch[batch.id]?.dateTaken ?? batch.dateTaken?.split('T')[0] ?? ''}
                onChange={e => setEditBatch(s => ({ ...s, [batch.id]: { ...s[batch.id] ?? { dateTaken: '', amountTaken: String(batch.amountTaken ?? '') }, dateTaken: e.target.value } }))}
                fullWidth size="sm" />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Amount Taken (₹)</div>
              <input type="number" defaultValue={batch.amountTaken ?? ''}
                onChange={e => setEditBatch(s => ({ ...s, [batch.id]: { ...s[batch.id] ?? { dateTaken: batch.dateTaken?.split('T')[0] ?? '', amountTaken: '' }, amountTaken: e.target.value } }))}
                style={inputSm} />
            </div>
          </div>
          {draft && (
            <button onClick={() => saveBatch(batch)} disabled={isSaving}
              style={{ marginTop: 10, width: '100%', padding: '7px', borderRadius: 8, background: 'linear-gradient(135deg, #b8922e, #C9A84C)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 10px rgba(201,168,76,0.3)' }}>
              {isSaving ? 'Saving...' : 'Save Batch Info'}
            </button>
          )}
        </div>

        {/* Monthly table */}
        <div style={{ background: 'var(--bg-card)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 460 }}>
            <thead>
              <tr style={{ background: 'var(--bg-row-alt)' }}>
                {['#', 'Month', 'Amt/Month', 'Kasir', 'Co. Yelam', 'Thalli', ''].map(h => (
                  <th key={h} style={{ padding: '9px 10px', textAlign: h === '#' ? 'center' : 'right', color: 'var(--text-muted)', fontWeight: 700, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batch.monthlyEntries.map((entry, i) => {
                const entryDateStr = entry.monthDate.slice(0, 10); // YYYY-MM-DD
                const isPast = entryDateStr <= todayStr;
                const wonDateStr = batch.dateTaken ? batch.dateTaken.slice(0, 7) : null; // YYYY-MM
                const isWonMonth = wonDateStr != null && wonDateStr === entryDateStr.slice(0, 7);
                const isEditing = entry.id in editingKasir;
                const isSavingThis = savingKasir[entry.id];

                return (
                  <tr key={entry.id} style={{
                    background: isWonMonth
                      ? 'rgba(201,168,76,0.1)'
                      : i % 2 === 0 ? 'transparent' : 'var(--bg-row-alt)',
                    borderLeft: isWonMonth ? '3px solid rgba(201,168,76,0.8)' : '3px solid transparent',
                    transition: 'background 0.12s',
                  }}
                    onMouseEnter={e => { if (!isWonMonth) e.currentTarget.style.background = 'var(--bg-row-alt)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isWonMonth ? 'rgba(201,168,76,0.1)' : i % 2 === 0 ? 'transparent' : 'var(--bg-row-alt)'; }}
                  >
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: isWonMonth ? '#C9A84C' : 'var(--text-muted)', fontWeight: isWonMonth ? 700 : 400, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{entry.monthNumber}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: isWonMonth ? '#C9A84C' : isPast ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isWonMonth ? 700 : 400, whiteSpace: 'nowrap' }}>
                      {fmtDate(entryDateStr)}
                      {isWonMonth && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, background: 'rgba(201,168,76,0.2)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 4, padding: '1px 5px', verticalAlign: 'middle' }}>WON</span>}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: isWonMonth ? '#C9A84C' : 'var(--text-secondary)', fontWeight: isWonMonth ? 700 : 500, fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(entry.amountPerMonth)}
                    </td>
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                          <input autoFocus type="number" value={editingKasir[entry.id]}
                            onChange={e => setEditingKasir(s => ({ ...s, [entry.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') saveKasir(entry); if (e.key === 'Escape') setEditingKasir(s => { const n={...s}; delete n[entry.id]; return n; }); }}
                            style={{ width: 70, padding: '3px 5px', borderRadius: 5, border: '1px solid rgba(201,168,76,0.5)', background: 'rgba(201,168,76,0.06)', color: 'var(--text-primary)', fontSize: 12, textAlign: 'right' }}
                          />
                          <button onClick={() => saveKasir(entry)} disabled={isSavingThis} style={{ padding: '3px 7px', borderRadius: 5, background: '#C9A84C', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer' }}>
                            {isSavingThis ? '…' : '✓'}
                          </button>
                          <button onClick={() => setEditingKasir(s => { const n={...s}; delete n[entry.id]; return n; })} style={{ padding: '3px 6px', borderRadius: 5, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>✕</button>
                        </div>
                      ) : (
                        <span onClick={() => setEditingKasir(s => ({ ...s, [entry.id]: String(entry.kasirPerMonth ?? '') }))}
                          title="Click to edit Kasir"
                          style={{ cursor: 'pointer', color: entry.kasirPerMonth ? '#C9A84C' : 'var(--text-empty)', fontWeight: entry.kasirPerMonth ? 600 : 400, padding: '3px 6px', borderRadius: 5, display: 'inline-block', minWidth: 50, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {entry.kasirPerMonth ? fmt(entry.kasirPerMonth) : <span style={{ fontSize: 10 }}>+ Add</span>}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {entry.companyYelam ? fmt(entry.companyYelam) : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: entry.thalliEduthathu ? 'var(--primary)' : 'var(--text-empty)', fontVariantNumeric: 'tabular-nums' }}>
                      {entry.thalliEduthathu ? fmt(entry.thalliEduthathu) : '—'}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                      {entry.paid ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                          <span title={entry.paidDate ? `Paid on ${fmtDate(entry.paidDate)}` : 'Paid'}
                            style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.12)', color: 'var(--income)' }}>
                            ✓ Paid
                          </span>
                          <button
                            onClick={() => openPayModal(entry, batchLabel)}
                            title="Edit this payment"
                            style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            Edit
                          </button>
                        </span>
                      ) : isPast && (
                        <button
                          onClick={() => openPayModal(entry, batchLabel)}
                          title="Record payment from bank account"
                          style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.07)', color: 'var(--income)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Pay
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg-row-alt)', borderTop: '1px solid var(--border)' }}>
                <td colSpan={2} style={{ padding: '9px 10px', fontWeight: 700, color: 'var(--text-primary)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Total</td>
                <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(batch.monthlyEntries.reduce((s, e) => s + (e.amountPerMonth ?? 0), 0))}
                </td>
                <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#C9A84C', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(batch.monthlyEntries.reduce((s, e) => s + (e.kasirPerMonth ?? 0), 0))}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
      {/* Back */}
      <button onClick={() => navigate('/finance/chit')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        ← Back to Chit Tracker
      </button>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="page-title">{group.name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Group {group.groupLabel} · {group.membersCount} members · {group.totalBatches} {group.totalBatches === 1 ? 'chit' : 'chits'} · Started {fmtDate(group.startDate)}
            {group.notes ? ` · ${group.notes}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 20,
            background: group.status === 'ACTIVE' ? 'var(--income-dim)' : 'rgba(148,163,184,0.15)',
            color: group.status === 'ACTIVE' ? 'var(--income)' : '#94a3b8',
          }}>{group.status}</span>
          <button onClick={openEdit} style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 12,
            fontWeight: 600, cursor: 'pointer',
          }}>Edit</button>
          <button onClick={handleDelete} style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.08)', color: 'var(--expense)', fontSize: 12,
            fontWeight: 600, cursor: 'pointer',
          }}>Delete</button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', flexWrap: isMobile ? 'wrap' : 'nowrap', marginBottom: 24, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.15)' }}>
        {[
          { label: 'MONTHLY', value: fmt(group.monthlyAmount), color: 'var(--text-primary)' },
          { label: 'TOTAL POT', value: fmt(totalAmount), color: 'var(--text-primary)' },
          { label: 'TOTAL PAID', value: fmt(group.totalPaid), color: 'var(--warning)' },
          { label: 'KASIR', value: fmt(group.totalKasir), color: 'var(--purple)' },
          { label: 'RECEIVED', value: fmt(group.totalReceived), color: 'var(--primary)' },
          { label: 'NET', value: `${netGain >= 0 ? '+' : ''}${fmt(netGain)}`, color: netGain >= 0 ? 'var(--income)' : 'var(--expense)' },
        ].map((c, i) => (
          <div key={c.label} style={{
            flex: isMobile ? '1 1 100%' : 1,
            padding: isMobile ? '12px 14px' : '14px 18px',
            borderLeft: isMobile ? 'none' : i > 0 ? '1px solid var(--border-subtle)' : 'none',
            borderTop: isMobile && i >= 3 ? '1px solid var(--border-subtle)' : 'none',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 5 }}>{c.label}</div>
            <div style={{ fontSize: isMobile ? 14 : 17, fontWeight: 700, color: c.color, fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Config row */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 24, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        {group.basicInterest != null && <span>Interest: <strong style={{ color: 'var(--text-primary)' }}>{(group.basicInterest * 100).toFixed(0)}%</strong></span>}
        {group.companyCommission != null && <span>Commission: <strong style={{ color: 'var(--text-primary)' }}>{(group.companyCommission * 100).toFixed(0)}%</strong></span>}
        <span>Members/Batch: <strong style={{ color: 'var(--text-primary)' }}>{group.membersPerBatch}</strong></span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Click any <strong style={{ color: '#C9A84C' }}>Kasir</strong> cell to edit · Press Enter to save
        </span>
      </div>

      {/* Batch tables — side by side on desktop, stacked on mobile */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20, alignItems: 'flex-start' }}>
        {group.batches.map(batch => (
          <div key={batch.id} style={{ flex: 1, minWidth: 0, width: '100%' }}>
            <BatchTable batch={batch} batchLabel={`Chit ${batch.batchNumber}`} />
          </div>
        ))}
      </div>

      {/* Pay from Bank Modal */}
      {payModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setPayModal(null)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 380 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{payModal.entry.paid ? 'Edit Chit Payment' : 'Record Chit Payment'}</h3>
              <button onClick={() => setPayModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-elevated)', fontSize: 12, color: 'var(--text-muted)' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{group.name} · {payModal.batchLabel} · Month {payModal.entry.monthNumber}</div>
              <div>Amount: <span style={{ fontWeight: 700, color: 'var(--income)' }}>{fmt(payModal.entry.amountPerMonth)}</span></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Pay from Bank Account <span style={{ color: 'var(--expense)' }}>*</span></label>
                <select value={payBankId} onChange={e => setPayBankId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
                  <option value="">Select account…</option>
                  {accounts.filter(a => a.accountType !== 'CREDIT').map(a => (
                    <option key={a.id} value={a.id}>{a.name}{a.bankName ? ` · ${a.bankName}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Payment Date</label>
                <DatePicker value={payDate} onChange={e => setPayDate(e.target.value)} fullWidth />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setPayModal(null)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handlePay} disabled={!payBankId || paying}
                style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: paying || !payBankId ? 'rgba(34,197,94,0.3)' : 'var(--income)', color: '#fff', fontWeight: 600, cursor: !payBankId || paying ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                {paying ? 'Saving…' : payModal.entry.paid ? 'Save Changes' : 'Record Payment'}
              </button>
            </div>
            {payModal.entry.paid && (
              <button onClick={handleRemovePayment} disabled={paying}
                style={{ width: '100%', marginTop: 10, padding: '8px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: 'var(--expense)', fontWeight: 600, cursor: paying ? 'not-allowed' : 'pointer', fontSize: 12 }}>
                Remove payment
              </button>
            )}
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {showEditModal && editForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowEditModal(false)}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16, padding: 28,
            width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Edit Chit Group</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            <form onSubmit={handleUpdate}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Chit Name', key: 'name' as const, type: 'text', colSpan: 2, placeholder: 'e.g. DEC 2025 10000' },
                  { label: 'Group Label', key: 'groupLabel' as const, type: 'text', placeholder: 'A, B, C...' },
                  { label: 'Start Date', key: 'startDate' as const, type: 'date' },
                  { label: 'Members Count', key: 'membersCount' as const, type: 'number' },
                  { label: 'Members per Batch', key: 'membersPerBatch' as const, type: 'number' },
                  { label: 'Chit Slots (Batches)', key: 'totalBatches' as const, type: 'number' },
                  { label: 'Monthly Amount (₹)', key: 'monthlyAmount' as const, type: 'number' },
                  { label: 'Basic Interest (e.g. 0.12)', key: 'basicInterest' as const, type: 'number', step: '0.0001' },
                  { label: 'Commission (e.g. 0.01)', key: 'companyCommission' as const, type: 'number', step: '0.0001' },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn: (f as any).colSpan === 2 ? '1/-1' : undefined }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>{f.label}</label>
                    <input
                      type={f.type}
                      step={(f as any).step}
                      placeholder={(f as any).placeholder}
                      value={(editForm as any)[f.key] ?? ''}
                      onChange={e => setF(f.key, f.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                      required={['name', 'groupLabel', 'startDate', 'membersCount', 'membersPerBatch', 'totalBatches', 'monthlyAmount'].includes(f.key)}
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13,
                        border: '1px solid var(--border)', background: 'var(--bg-main)',
                        color: 'var(--text-primary)', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Notes (optional)</label>
                  <input
                    type="text" value={editForm.notes ?? ''} onChange={e => setF('notes', e.target.value)}
                    placeholder="e.g. Vaalapaadi group"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Status</label>
                  <select value={editForm.status} onChange={e => setF('status', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#C9A84C', color: '#fff', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChitGroupDetailPage;

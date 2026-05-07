import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { chitApi } from '../../services/api';
import { ChitGroup, ChitGroupRequest } from '../../types';
import { useMobile } from '../../hooks/useMobile';

const fmt = (n?: number) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (d?: string) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

const emptyForm = (): ChitGroupRequest => ({
  name: '', groupLabel: '', membersCount: 12, totalBatches: 1,
  membersPerBatch: 12, monthlyAmount: 10000, basicInterest: 0.12,
  companyCommission: 0.01, startDate: '', status: 'ACTIVE', notes: '',
});

const ChitTrackerPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ChitGroupRequest>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await chitApi.getAll();
      setGroups(res.data);
    } catch { /* handled by interceptor */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await chitApi.create(form);
      setShowModal(false);
      setForm(emptyForm());
      load();
    } catch { /* handled */ } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try { await chitApi.delete(id); load(); } catch { /* handled */ }
  };

  const setF = (key: keyof ChitGroupRequest, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

  const visible = groups.filter(g => filter === 'ALL' || g.status === filter);

  const totalInvested = groups.reduce((s, g) => s + (g.totalPaid || 0), 0);
  const totalReceived = groups.reduce((s, g) => s + (g.totalReceived || 0), 0);
  const totalKasir = groups.reduce((s, g) => s + (g.totalKasir || 0), 0);
  const activeCount = groups.filter(g => g.status === 'ACTIVE').length;

  return (
    <div style={{
      padding: isMobile ? '16px' : '24px 28px', maxWidth: 1100,
      background: 'radial-gradient(ellipse 70% 40% at 15% 0%, rgba(201,168,76,0.07) 0%, transparent 65%)',
      minHeight: '100%',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>Chit Tracker</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '5px 0 0' }}>Track all your chit fund groups</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          background: 'linear-gradient(135deg, #b8922e, #C9A84C)',
          color: '#fff', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 10,
          padding: '10px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(201,168,76,0.25)',
          letterSpacing: '0.01em',
        }}>
          + New Chit
        </button>
      </div>

      {/* Summary strip — single panel */}
      <div style={{
        display: 'flex', flexWrap: isMobile ? 'wrap' : 'nowrap', marginBottom: 24, borderRadius: 14, overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.15)',
      }}>
        {[
          { label: 'ACTIVE', value: String(activeCount), sub: `of ${groups.length}`, color: '#22c55e' },
          { label: 'INVESTED', value: fmt(totalInvested), color: '#C9A84C' },
          { label: 'KASIR', value: fmt(totalKasir), color: '#a855f7' },
          { label: 'RECEIVED', value: fmt(totalReceived), color: '#3b82f6' },
          { label: 'OVERALL', value: fmt(totalKasir + totalReceived), color: '#f97316' },
        ].map((item, i) => (
          <div key={item.label} style={{
            flex: isMobile ? '1 1 40%' : 1, padding: '12px 16px',
            borderLeft: (!isMobile && i > 0) ? '1px solid var(--border-subtle)' : 'none',
            borderTop: (isMobile && i > 0) ? '1px solid var(--border-subtle)' : 'none',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: item.color, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
            {item.sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{item.sub}</div>}
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${filter === f ? 'rgba(201,168,76,0.5)' : 'var(--border)'}`,
            background: filter === f ? 'rgba(201,168,76,0.12)' : 'transparent',
            color: filter === f ? '#C9A84C' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}>{f === 'ALL' ? `All  ${groups.length}` : f === 'ACTIVE' ? `Active  ${activeCount}` : `Completed  ${groups.length - activeCount}`}</button>
        ))}
      </div>

      {/* Group Cards */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 48 }}>Loading...</div>
      ) : visible.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 48 }}>
          No chit groups found. Click <strong>+ New Chit</strong> to add one.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12 }}>
          {visible.map(g => {
            const netGain = (g.totalReceived || 0) - (g.totalPaid || 0);
            const paidMonths = g.totalPaid > 0 ? Math.round(g.totalPaid / (g.monthlyAmount * g.totalBatches)) : 0;
            const progress = g.membersPerBatch > 0 ? Math.min(100, (paidMonths / g.membersPerBatch) * 100) : 0;
            const isActive = g.status === 'ACTIVE';

            return (
              <div key={g.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.12)',
                  transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
                }}
                onClick={() => navigate(`/finance/chit/${g.id}`)}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)';
                  e.currentTarget.style.boxShadow = '0 0 0 1px rgba(201,168,76,0.15), 0 8px 32px rgba(0,0,0,0.22)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.12)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Top accent bar */}
                <div style={{
                  height: 3,
                  background: isActive
                    ? 'linear-gradient(90deg, #C9A84C 0%, rgba(201,168,76,0.2) 100%)'
                    : 'rgba(148,163,184,0.2)',
                }} />

                <div style={{ padding: '14px 16px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Group {g.groupLabel} · {g.membersCount} members</div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, flexShrink: 0,
                      letterSpacing: '0.04em',
                      background: isActive ? 'rgba(34,197,94,0.1)' : 'rgba(148,163,184,0.1)',
                      border: `1px solid ${isActive ? 'rgba(34,197,94,0.2)' : 'rgba(148,163,184,0.18)'}`,
                      color: isActive ? '#22c55e' : '#94a3b8',
                    }}>{g.status}</span>
                  </div>

                  {/* Stats row — 3 clean columns, no nested boxes */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, marginBottom: 14 }}>
                    {[
                      { label: 'Monthly', value: fmt(g.monthlyAmount), color: 'var(--text-primary)' },
                      { label: 'Total Paid', value: fmt(g.totalPaid), color: '#f59e0b' },
                      { label: 'Net', value: (netGain >= 0 ? '+' : '') + fmt(netGain), color: netGain >= 0 ? '#22c55e' : '#ef4444' },
                    ].map((item, i) => (
                      <div key={item.label} style={{
                        padding: '0 12px 0 0',
                        borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                        paddingLeft: i > 0 ? 12 : 0,
                      }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.03em', marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: item.color, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: 'var(--bg-row-hover)', marginBottom: 12 }} />

                  {/* Progress */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
                      <span>{fmtDate(g.startDate)}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{paidMonths} / {g.membersPerBatch} months</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--border-subtle)', borderRadius: 99 }}>
                      <div style={{
                        height: '100%', width: `${progress}%`, borderRadius: 99,
                        background: isActive ? 'linear-gradient(90deg, #b8922e, #e8c46a)' : 'rgba(148,163,184,0.4)',
                        boxShadow: isActive ? '0 0 8px rgba(201,168,76,0.4)' : 'none',
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>

                  {/* Delete */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(g.id, g.name); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.45)', fontSize: 11, padding: '2px 0', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.45)')}
                    >Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Chit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16, padding: isMobile ? 20 : 28,
            width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
            margin: isMobile ? '0 16px' : 0,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Add New Chit Group</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            <form onSubmit={handleCreate}>
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
                      value={(form as any)[f.key] ?? ''}
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
                    type="text" value={form.notes ?? ''} onChange={e => setF('notes', e.target.value)}
                    placeholder="e.g. Vaalapaadi group"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Status</label>
                  <select value={form.status} onChange={e => setF('status', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#C9A84C', color: '#fff', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                  {saving ? 'Creating...' : 'Create Chit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChitTrackerPage;

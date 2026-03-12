import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const WeightPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ weight: '', date: new Date().toISOString().split('T')[0], notes: '' });

  const load = () => api.get('/fitness/weight').then(r => setLogs(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.weight) return;
    await api.post('/fitness/weight', { weight: parseFloat(form.weight), date: form.date, notes: form.notes });
    load(); setShowAdd(false); setForm({ weight: '', date: new Date().toISOString().split('T')[0], notes: '' });
  };

  const sorted = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const latest = logs[0];
  const first = sorted[0];
  const change = latest && first && latest.id !== first.id ? (latest.weight - first.weight).toFixed(1) : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
        <div><h1 className="page-title">Weight Tracker</h1><p className="page-subtitle">Track your body weight over time</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Log Weight</button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Current Weight</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{latest ? `${latest.weight} kg` : '--'}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{latest?.date || 'Not logged'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Starting Weight</div>
          <div className="stat-value" style={{ color: 'var(--gold)' }}>{first ? `${first.weight} kg` : '--'}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{first?.date || ''}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Change</div>
          <div className="stat-value" style={{ color: change ? (parseFloat(change) < 0 ? 'var(--success)' : 'var(--danger)') : 'var(--gold)' }}>
            {change ? `${parseFloat(change) > 0 ? '+' : ''}${change} kg` : '--'}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 20 }}>Weight History</h3>
        {logs.length > 0 ? (
          <table className="table">
            <thead><tr><th>Date</th><th>Weight</th><th>Notes</th><th></th></tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td>{new Date(l.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{l.weight} kg</td>
                  <td style={{ color: 'var(--text-muted)' }}>{l.notes || '-'}</td>
                  <td><button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => api.delete(`/fitness/weight/${l.id}`).then(load)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>⚖️</p><p>No weight logs yet.</p>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Log Weight</h3>
            <div className="form-group"><label className="form-label">WEIGHT (kg)</label><input type="number" step="0.1" className="input" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} placeholder="75.5" /></div>
            <div className="form-group"><label className="form-label">DATE</label><input type="date" className="input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">NOTES</label><input className="input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Morning weight..." /></div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={add}>Save</button>
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeightPage;

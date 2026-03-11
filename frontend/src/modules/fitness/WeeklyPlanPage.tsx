import React, { useEffect, useState } from 'react';
import api from '../../shared/services/api';

const DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
const DAY_SHORT = ['MON','TUE','WED','THU','FRI','SAT','SUN'];

const WeeklyPlanPage: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [planDesc, setPlanDesc] = useState('');
  const [notes, setNotes] = useState('');
  const today = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  const load = () => api.get('/api/fitness/weekly-plan').then(r => setPlans(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const getPlan = (d: string) => plans.find(p => p.dayOfWeek === d);

  const startEdit = (d: string) => {
    const p = getPlan(d);
    setPlanDesc(p?.planDescription || '');
    setNotes(p?.notes || '');
    setEditing(d);
  };

  const save = async () => {
    if (!editing || !planDesc) return;
    await api.post('/api/fitness/weekly-plan', { dayOfWeek: editing, planDescription: planDesc, notes });
    load();
    setEditing(null);
  };

  const deletePlan = (id: number) => {
    api.delete(`/api/fitness/weekly-plan/${id}`).then(load);
  };

  return (
    <div>
      <h1 className="page-title">Weekly Plan</h1>
      <p className="page-subtitle">Set your workout for each day of the week</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 10 }}>
        {DAYS.map((day, i) => {
          const plan = getPlan(day);
          const isToday = day === today;
          return (
            <div key={day} className="card" style={{ border: `1px solid ${isToday ? 'var(--gold)' : 'var(--border)'}`, background: isToday ? 'rgba(201,168,76,0.05)' : 'var(--bg-secondary)', minHeight: 150 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ color: isToday ? 'var(--gold)' : 'var(--text-muted)', fontSize: 10, fontWeight: 700 }}>{DAY_SHORT[i]}</p>
                {isToday && <span className="badge badge-warning" style={{ fontSize: 8, padding: '2px 5px' }}>TODAY</span>}
              </div>
              {plan ? (
                <>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{plan.planDescription}</p>
                  {plan.notes && <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 10 }}>{plan.notes}</p>}
                  <div style={{ display: 'flex', gap: 4, marginTop: 'auto' }}>
                    <button onClick={() => startEdit(day)} style={{ flex: 1, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)', borderRadius: 6, padding: '5px', cursor: 'pointer', fontSize: 10 }}>Edit</button>
                    <button onClick={() => deletePlan(plan.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', fontSize: 10 }}>✕</button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', paddingTop: 12 }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 10 }}>Rest Day</p>
                  <button onClick={() => startEdit(day)} style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 6, padding: '7px', cursor: 'pointer', fontSize: 10 }}>+ Add</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{editing.charAt(0) + editing.slice(1).toLowerCase()}'s Plan</h3>
            <div className="form-group">
              <label className="form-label">WORKOUT NAME</label>
              <input className="input" value={planDesc} onChange={e => setPlanDesc(e.target.value)} placeholder="e.g. Chest Day, Leg Day..." />
            </div>
            <div className="form-group">
              <label className="form-label">NOTES</label>
              <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={save}>Save</button>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyPlanPage;

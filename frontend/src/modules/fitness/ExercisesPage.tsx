import React, { useEffect, useState, useMemo } from 'react';
import api from '../../services/api';
import FilterDropdown from '../../components/FilterDropdown';

const MUSCLES = ['Chest','Back','Shoulders','Biceps','Triceps','Legs','Core','Cardio','Full Body'];
const DEFAULTS = [
  { name: 'Bench Press', muscleGroup: 'Chest', description: 'Barbell chest press' },
  { name: 'Pull Ups', muscleGroup: 'Back', description: 'Bodyweight pull ups' },
  { name: 'Squats', muscleGroup: 'Legs', description: 'Barbell back squats' },
  { name: 'Deadlift', muscleGroup: 'Back', description: 'Conventional deadlift' },
  { name: 'Shoulder Press', muscleGroup: 'Shoulders', description: 'Overhead press' },
  { name: 'Bicep Curls', muscleGroup: 'Biceps', description: 'Dumbbell curls' },
  { name: 'Tricep Dips', muscleGroup: 'Triceps', description: 'Parallel bar dips' },
  { name: 'Plank', muscleGroup: 'Core', description: 'Core stability' },
];

const ExercisesPage: React.FC = () => {
  const [exercises, setExercises] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', muscleGroup: 'Chest', description: '' });

  const load = () => api.get('/fitness/exercises').then(r => setExercises(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.name) return;
    await api.post('/fitness/exercises', form);
    load(); setShowAdd(false); setForm({ name: '', muscleGroup: 'Chest', description: '' });
  };

  const seed = async () => {
    await Promise.allSettled(DEFAULTS.map(e => api.post('/fitness/exercises', e)));
    load();
  };

  const filtered = useMemo(
    () => filter === 'All' ? exercises : exercises.filter(e => e.muscleGroup === filter),
    [exercises, filter]
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
        <div><h1 className="page-title">Exercise Library</h1><p className="page-subtitle">Manage exercises by muscle group</p></div>
        <div style={{ display: 'flex', gap: 12 }}>
          {exercises.length === 0 && <button className="btn btn-secondary" onClick={seed}>🌱 Add Defaults</button>}
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Exercise</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {['All', ...MUSCLES].map(m => (
          <button key={m} onClick={() => setFilter(m)} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
            fontFamily: 'inherit', background: filter === m ? 'var(--gold)' : 'var(--bg-secondary)',
            color: filter === m ? '#0a0a0a' : 'var(--text-muted)'
          }}>{m}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {filtered.map(e => (
          <div key={e.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>{e.name}</h4>
                <span className="badge badge-warning">{e.muscleGroup}</span>
              </div>
              <button onClick={() => api.delete(`/fitness/exercises/${e.id}`).then(load)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            {e.description && <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12 }}>{e.description}</p>}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>💪</p><p>No exercises yet.</p>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add Exercise</h3>
            <div className="form-group"><label className="form-label">NAME</label><input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Bench Press" /></div>
            <div className="form-group"><label className="form-label">MUSCLE GROUP</label>
              <FilterDropdown
                value={form.muscleGroup}
                options={MUSCLES.map(m => ({ label: m, value: m }))}
                onChange={v => setForm(p => ({ ...p, muscleGroup: v as string }))}
                fullWidth
              />
            </div>
            <div className="form-group"><label className="form-label">DESCRIPTION</label><textarea className="input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={add}>Add</button>
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExercisesPage;

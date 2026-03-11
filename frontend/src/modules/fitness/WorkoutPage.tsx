import React, { useEffect, useState } from 'react';
import api from '../../shared/services/api';

const WorkoutPage: React.FC = () => {
  const [exercises, setExercises] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sets, setSets] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newSet, setNewSet] = useState({ exerciseId: '', setNumber: 1, reps: '', weight: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/api/fitness/exercises').then(r => setExercises(r.data)).catch(() => {}); }, []);

  useEffect(() => {
    api.get(`/api/fitness/workouts/date/${selectedDate}`).then(r => {
      if (r.data) { setSets(r.data.sets || []); setNotes(r.data.notes || ''); }
      else { setSets([]); setNotes(''); }
    }).catch(() => { setSets([]); setNotes(''); });
  }, [selectedDate]);

  const addSet = () => {
    if (!newSet.exerciseId || !newSet.reps) return;
    const ex = exercises.find(e => e.id === parseInt(newSet.exerciseId));
    setSets(prev => [...prev, {
      exerciseId: parseInt(newSet.exerciseId), exerciseName: ex?.name,
      muscleGroup: ex?.muscleGroup, setNumber: newSet.setNumber,
      reps: parseInt(newSet.reps), weight: newSet.weight ? parseFloat(newSet.weight) : null
    }]);
    setNewSet(p => ({ ...p, setNumber: p.setNumber + 1, reps: '', weight: '' }));
    setShowAdd(false);
  };

  const saveWorkout = async () => {
    setSaving(true);
    try {
      await api.post('/api/fitness/workouts', {
        date: selectedDate, notes,
        sets: sets.map(s => ({ exerciseId: s.exerciseId, setNumber: s.setNumber, reps: s.reps, weight: s.weight }))
      });
      alert('Workout saved! 💪');
    } catch { alert('Failed to save'); } finally { setSaving(false); }
  };

  return (
    <div>
      <h1 className="page-title">Workout Log</h1>
      <p className="page-subtitle">Log your sets, reps and weights</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ flex: 1 }}><input type="date" className="input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Set</button>
        <button className="btn btn-secondary" onClick={saveWorkout} disabled={saving}>{saving ? 'Saving...' : '💾 Save'}</button>
      </div>

      <div className="form-group" style={{ marginBottom: 20 }}>
        <label className="form-label">NOTES</label>
        <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="How did it go?" style={{ resize: 'vertical' }} />
      </div>

      <div className="card">
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 20 }}>Sets ({sets.length})</h3>
        {sets.length > 0 ? (
          <table className="table">
            <thead><tr><th>Exercise</th><th>Muscle</th><th>Set</th><th>Reps</th><th>Weight</th><th></th></tr></thead>
            <tbody>
              {sets.map((s, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-primary)' }}>{s.exerciseName}</td>
                  <td><span className="badge badge-warning">{s.muscleGroup}</span></td>
                  <td>{s.setNumber}</td><td>{s.reps}</td>
                  <td>{s.weight ? `${s.weight} kg` : 'BW'}</td>
                  <td><button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setSets(prev => prev.filter((_, j) => j !== i))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🏋️</p><p>Click "+ Add Set" to start!</p>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add Set</h3>
            <div className="form-group">
              <label className="form-label">EXERCISE</label>
              <select className="input" value={newSet.exerciseId} onChange={e => setNewSet(p => ({ ...p, exerciseId: e.target.value }))}>
                <option value="">Select exercise...</option>
                {exercises.map(e => <option key={e.id} value={e.id}>{e.name} ({e.muscleGroup})</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group"><label className="form-label">SET #</label><input type="number" className="input" value={newSet.setNumber} onChange={e => setNewSet(p => ({ ...p, setNumber: parseInt(e.target.value) }))} /></div>
              <div className="form-group"><label className="form-label">REPS</label><input type="number" className="input" value={newSet.reps} onChange={e => setNewSet(p => ({ ...p, reps: e.target.value }))} placeholder="12" /></div>
              <div className="form-group"><label className="form-label">KG</label><input type="number" className="input" value={newSet.weight} onChange={e => setNewSet(p => ({ ...p, weight: e.target.value }))} placeholder="BW" step="0.5" /></div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={addSet}>Add Set</button>
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutPage;

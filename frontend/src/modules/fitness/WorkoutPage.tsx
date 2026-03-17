import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../../services/api';

const DAYS = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];

interface PlanExercise { exerciseName: string; muscleGroup: string; plannedSets: string; plannedReps: string; }
interface DayPlan { id: number; dayOfWeek: string; planDescription: string; exercises: PlanExercise[]; }
interface ApiExercise { name: string; muscle: string; equipment: string; }

const WorkoutPage: React.FC = () => {
  const [weeklyPlan, setWeeklyPlan] = useState<DayPlan[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sets, setSets] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newSet, setNewSet] = useState({ exerciseName: '', sets: 3, reps: '', weight: '' });
  const [saving, setSaving] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [nameSearch, setNameSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ApiExercise[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  const getDayPlan = useCallback(() => {
    // Use noon to avoid timezone edge cases shifting the date
    const dayOfWeek = DAYS[new Date(selectedDate + 'T12:00:00').getDay()];
    return weeklyPlan.find(p => p.dayOfWeek === dayOfWeek);
  }, [weeklyPlan, selectedDate]);

  useEffect(() => {
    api.get('/fitness/weekly-plan').then(r => setWeeklyPlan(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get(`/fitness/workouts/date/${selectedDate}`).then(r => {
      if (r.data && r.data.sets) { setSets(r.data.sets || []); setNotes(r.data.notes || ''); }
      else { setSets([]); setNotes(''); }
    }).catch(() => { setSets([]); setNotes(''); });
  }, [selectedDate]);

  const openAdd = () => {
    setSearchMode(false);
    setNameSearch('');
    setSearchResults([]);
    setNewSet({ exerciseName: '', sets: 3, reps: '', weight: '' });
    setShowAdd(true);
  };

  const selectPlannedExercise = (ex: PlanExercise) => {
    setNewSet({
      exerciseName: ex.exerciseName,
      sets: parseInt(ex.plannedSets) || 3,
      reps: ex.plannedReps || '',
      weight: '',
    });
  };

  const searchExercises = async (name: string) => {
    if (!name.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get(`/fitness/exercises/search?name=${encodeURIComponent(name.trim())}`);
      setSearchResults(res.data || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const handleSearchInput = (val: string) => {
    setNameSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchExercises(val), 400);
  };

  const addSet = () => {
    if (!newSet.exerciseName || !newSet.reps) return;
    setSets(prev => [...prev, {
      exerciseName: newSet.exerciseName,
      sets: newSet.sets,
      reps: newSet.reps,
      weight: newSet.weight ? parseFloat(newSet.weight) : null,
    }]);
    setShowAdd(false);
  };

  const saveWorkout = async () => {
    setSaving(true);
    try {
      await api.post('/fitness/workouts', {
        date: selectedDate,
        notes,
        sets: sets.map(s => ({
          exerciseName: s.exerciseName,
          sets: s.sets,
          reps: typeof s.reps === 'string' ? (parseInt(s.reps) || 0) : s.reps,
          weight: s.weight,
        })),
      });
      alert('Workout saved! 💪');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to save';
      alert(`Error: ${msg}`);
    } finally { setSaving(false); }
  };

  const dayPlan = getDayPlan();
  const plannedExercises = dayPlan?.exercises || [];

  return (
    <div>
      <h1 className="page-title">Workout Log</h1>
      <p className="page-subtitle">Log your sets, reps and weights</p>

      <div className="workout-action-bar">
        <input type="date" className="input" style={{ flex: 1 }} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        <button className="btn btn-primary" onClick={openAdd}>+ Add Set</button>
        <button className="btn btn-secondary" onClick={saveWorkout} disabled={saving}>{saving ? 'Saving...' : '💾 Save'}</button>
      </div>

      {/* Today's plan banner */}
      {dayPlan && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.05)' }}>
          <p style={{ color: 'var(--gold)', fontWeight: 600, fontSize: 13, marginBottom: plannedExercises.length > 0 ? 8 : 0 }}>
            📋 {dayPlan.planDescription
              ? dayPlan.planDescription
              : `${dayPlan.dayOfWeek.charAt(0) + dayPlan.dayOfWeek.slice(1).toLowerCase()}'s Plan`}
          </p>
          {plannedExercises.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {plannedExercises.map((ex, i) => (
                <span key={i} style={{ fontSize: 12, background: 'rgba(201,168,76,0.12)', color: 'var(--gold)', padding: '3px 10px', borderRadius: 10 }}>
                  {ex.exerciseName}
                  {(ex.plannedSets || ex.plannedReps) && (
                    <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{ex.plannedSets}×{ex.plannedReps}</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="form-group" style={{ marginBottom: 20 }}>
        <label className="form-label">NOTES</label>
        <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="How did it go?" style={{ resize: 'vertical' }} />
      </div>

      <div className="card">
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 20 }}>Sets ({sets.length})</h3>
        {sets.length > 0 ? (
          <div className="table-container">
          <table className="table">
            <thead><tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>Weight</th><th></th></tr></thead>
            <tbody>
              {sets.map((s, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-primary)' }}>{s.exerciseName}</td>
                  <td>{s.sets}</td>
                  <td>{s.reps}</td>
                  <td>{s.weight ? `${s.weight} kg` : 'BW'}</td>
                  <td>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => setSets(prev => prev.filter((_, j) => j !== i))}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🏋️</p>
            <p>Click "+ Add Set" to start!</p>
          </div>
        )}
      </div>

      {/* Add Set modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" style={{ maxWidth: 500, width: '95%' }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add Set</h3>

            {/* Exercise picker */}
            {!searchMode ? (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    {plannedExercises.length > 0 ? "TODAY'S PLANNED EXERCISES" : "EXERCISE"}
                  </label>
                  <button onClick={() => setSearchMode(true)}
                    style={{ fontSize: 11, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    + Other exercise
                  </button>
                </div>
                {plannedExercises.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                    {plannedExercises.map((ex, i) => {
                      const selected = newSet.exerciseName === ex.exerciseName;
                      return (
                        <button key={i} onClick={() => selectPlannedExercise(ex)}
                          style={{
                            textAlign: 'left', padding: '10px 14px', cursor: 'pointer',
                            background: selected ? 'rgba(201,168,76,0.15)' : 'var(--bg-secondary)',
                            border: `1px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
                            borderRadius: 8, color: 'var(--text-primary)', width: '100%',
                          }}>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{ex.exerciseName}</div>
                          {(ex.plannedSets || ex.plannedReps) && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              Plan: {ex.plannedSets} sets × {ex.plannedReps} reps
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    No plan for today — use "Other exercise" to search.
                  </div>
                )}
              </div>
            ) : (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>SEARCH EXERCISES</label>
                  {plannedExercises.length > 0 && (
                    <button onClick={() => setSearchMode(false)}
                      style={{ fontSize: 11, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      ← Back to plan
                    </button>
                  )}
                </div>
                <input className="input" value={nameSearch} autoFocus
                  onChange={e => handleSearchInput(e.target.value)}
                  placeholder="Type exercise name..." />
                {searching && (
                  <div style={{ padding: '8px 0', color: 'var(--text-muted)', fontSize: 13 }}>Searching...</div>
                )}
                {!searching && searchResults.length > 0 && (
                  <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
                    {searchResults.map((ex, i) => (
                      <div key={i}
                        onClick={() => { setNewSet(p => ({ ...p, exerciseName: ex.name })); setSearchMode(false); }}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: i < searchResults.length - 1 ? '1px solid var(--border)' : 'none' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{ex.name}</div>
                        {ex.muscle && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ex.muscle.replace(/_/g, ' ')}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {newSet.exerciseName && (
              <div style={{ padding: '8px 12px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 500 }}>✓ {newSet.exerciseName}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">SETS</label>
                <input type="number" className="input" value={newSet.sets} min={1}
                  onChange={e => setNewSet(p => ({ ...p, sets: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="form-group">
                <label className="form-label">REPS</label>
                <input className="input" value={newSet.reps}
                  onChange={e => setNewSet(p => ({ ...p, reps: e.target.value }))}
                  placeholder="12 or 8-12" />
              </div>
              <div className="form-group">
                <label className="form-label">KG</label>
                <input type="number" className="input" value={newSet.weight}
                  onChange={e => setNewSet(p => ({ ...p, weight: e.target.value }))}
                  placeholder="BW" step="0.5" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={addSet}
                disabled={!newSet.exerciseName || !newSet.reps}>
                Add Set
              </button>
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutPage;

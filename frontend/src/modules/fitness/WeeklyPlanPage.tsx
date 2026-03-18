import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../services/api';
import FilterDropdown from '../../components/FilterDropdown';

const DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
const DAY_FULL = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAY_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const MUSCLES = [
  { label: 'All', value: '' },
  { label: 'Chest', value: 'chest' },
  { label: 'Back', value: 'lats' },
  { label: 'Shoulders', value: 'shoulders' },
  { label: 'Biceps', value: 'biceps' },
  { label: 'Triceps', value: 'triceps' },
  { label: 'Legs', value: 'quadriceps' },
  { label: 'Hamstrings', value: 'hamstrings' },
  { label: 'Glutes', value: 'glutes' },
  { label: 'Abs', value: 'abdominals' },
  { label: 'Calves', value: 'calves' },
  { label: 'Traps', value: 'traps' },
  { label: 'Lower Back', value: 'lower_back' },
];

interface ApiExercise { name: string; muscle: string; equipment: string; difficulty: string; }
interface PlanExercise { exerciseName: string; muscleGroup: string; plannedSets: string; plannedReps: string; }
interface DayPlan { id: number; dayOfWeek: string; planDescription: string; exercises: PlanExercise[]; }

const WeeklyPlanPage: React.FC = () => {
  const [plans, setPlans]     = useState<DayPlan[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [dayLabel, setDayLabel] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<PlanExercise[]>([]);

  const [nameSearch, setNameSearch]     = useState('');
  const [muscleFilter, setMuscleFilter] = useState('');
  const [searchResults, setSearchResults] = useState<ApiExercise[]>([]);
  const [searching, setSearching]       = useState(false);
  const [showResults, setShowResults]   = useState(false);
  const [saving, setSaving]             = useState(false);
  const searchRef  = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const today = DAYS[todayIdx];

  const load = () => api.get('/fitness/weekly-plan').then(r => setPlans(r.data)).catch(() => {});
  useEffect(() => { load(); setExpanded(today); }, []);  // auto-open today

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const searchExercises = useCallback(async (name: string, muscle: string) => {
    if (!name && !muscle) { setSearchResults([]); setShowResults(false); return; }
    setSearching(true); setShowResults(true);
    try {
      const p = new URLSearchParams();
      if (muscle) p.set('muscle', muscle);
      if (name)   p.set('name', name);
      const res = await api.get(`/fitness/exercises/search?${p.toString()}`);
      setSearchResults(res.data || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, []);

  const handleNameChange = (val: string) => {
    setNameSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchExercises(val, muscleFilter), 400);
  };

  const getPlan = (d: string) => plans.find(p => p.dayOfWeek === d);

  const openEdit = (day: string) => {
    const p = getPlan(day);
    setDayLabel(p?.planDescription || '');
    setSelectedExercises(p?.exercises.map(e => ({
      exerciseName: e.exerciseName, muscleGroup: e.muscleGroup || '',
      plannedSets: e.plannedSets?.toString() || '3',
      plannedReps: e.plannedReps?.toString() || '10',
    })) || []);
    setEditing(day);
    setNameSearch(''); setMuscleFilter(''); setSearchResults([]); setShowResults(false);
  };

  const addExercise = (ex: ApiExercise) => {
    if (selectedExercises.find(e => e.exerciseName === ex.name)) return;
    setSelectedExercises(prev => [...prev, {
      exerciseName: ex.name, muscleGroup: ex.muscle || '',
      plannedSets: '3', plannedReps: '10',
    }]);
  };

  const removeExercise = (idx: number) =>
    setSelectedExercises(prev => prev.filter((_, i) => i !== idx));

  const updateExercise = (idx: number, field: 'plannedSets' | 'plannedReps', val: string) =>
    setSelectedExercises(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e));

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.post('/fitness/weekly-plan', {
        dayOfWeek: editing,
        planDescription: dayLabel,
        exercises: selectedExercises.map((e, i) => ({
          exerciseName: e.exerciseName, muscleGroup: e.muscleGroup,
          plannedSets: e.plannedSets ? parseInt(e.plannedSets) : null,
          plannedReps: e.plannedReps || null, sortOrder: i,
        })),
      });
      await load();
      setEditing(null);
    } finally { setSaving(false); }
  };

  const deletePlan = async (id: number) => { await api.delete(`/fitness/weekly-plan/${id}`); load(); };

  const toggle = (day: string) => setExpanded(prev => prev === day ? null : day);

  return (
    <div>
      <h1 className="page-title">Weekly Plan</h1>
      <p className="page-subtitle">Your training schedule for the week</p>

      {/* Schedule list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {DAYS.map((day, i) => {
          const plan      = getPlan(day);
          const isToday   = day === today;
          const isOpen    = expanded === day;
          const exCount   = plan?.exercises.length ?? 0;

          return (
            <div key={day}
              style={{
                borderBottom: i < 6 ? '1px solid var(--border)' : 'none',
                background: isToday
                  ? 'rgba(201,168,76,0.04)'
                  : isOpen ? 'var(--bg-secondary)' : 'var(--bg-card)',
              }}>

              {/* Row header — always visible, clickable */}
              <div
                onClick={() => toggle(day)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px', cursor: 'pointer',
                  userSelect: 'none',
                }}>

                {/* Day pill */}
                <div style={{
                  minWidth: 44, textAlign: 'center',
                  padding: '4px 0', borderRadius: 8,
                  background: isToday ? 'rgba(201,168,76,0.15)' : 'var(--bg-elevated)',
                  border: `1px solid ${isToday ? 'rgba(201,168,76,0.4)' : 'var(--border)'}`,
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: isToday ? 'var(--gold)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {DAY_SHORT[i]}
                  </div>
                </div>

                {/* Label / status */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {plan ? (
                    <>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {plan.planDescription || DAY_FULL[i]}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                        {exCount > 0 ? `${exCount} exercise${exCount !== 1 ? 's' : ''}` : 'No exercises set'}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }}>Rest Day</div>
                  )}
                </div>

                {/* Right side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isToday && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: 0.8,
                      background: 'rgba(201,168,76,0.15)', color: 'var(--gold)',
                      padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase',
                    }}>Today</span>
                  )}
                  {/* Exercise count pills preview — hidden on mobile */}
                  {plan && exCount > 0 && !isOpen && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} className="hide-mobile">
                      {plan.exercises.slice(0, 3).map((ex, idx) => (
                        <span key={idx} style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 10,
                          background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                          border: '1px solid var(--border)', whiteSpace: 'nowrap',
                        }}>
                          {ex.exerciseName.split(' ').slice(0, 2).join(' ')}
                        </span>
                      ))}
                      {exCount > 3 && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>+{exCount - 3}</span>
                      )}
                    </div>
                  )}
                  {/* Chevron */}
                  <span style={{
                    fontSize: 11, color: 'var(--text-muted)',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    display: 'inline-block',
                  }}>▼</span>
                </div>
              </div>

              {/* Expanded content */}
              {isOpen && (
                <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border-subtle)' }}>
                  {plan && exCount > 0 ? (
                    <>
                      <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {plan.exercises.map((ex, idx) => (
                          <div key={idx} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', borderRadius: 9,
                            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                          }}>
                            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                              {ex.exerciseName}
                            </span>
                            {(ex.plannedSets || ex.plannedReps) && (
                              <span style={{
                                fontSize: 12, fontWeight: 700,
                                color: 'var(--gold)', letterSpacing: 0.3,
                              }}>
                                {ex.plannedSets}×{ex.plannedReps}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button onClick={() => openEdit(day)} className="btn btn-secondary" style={{ flex: 1, fontSize: 12 }}>
                          Edit Plan
                        </button>
                        <button onClick={() => deletePlan(plan.id)} style={{
                          fontSize: 12, padding: '8px 14px',
                          background: 'transparent', border: '1px solid var(--border)',
                          color: 'var(--text-muted)', borderRadius: 8, cursor: 'pointer',
                        }}>
                          Clear
                        </button>
                      </div>
                    </>
                  ) : plan ? (
                    <div style={{ paddingTop: 12 }}>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>No exercises added yet.</p>
                      <button onClick={() => openEdit(day)} className="btn btn-secondary" style={{ fontSize: 12 }}>
                        Add Exercises
                      </button>
                    </div>
                  ) : (
                    <div style={{ paddingTop: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: 28 }}>😴</span>
                      <div>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>No workout planned — rest day.</p>
                        <button onClick={() => openEdit(day)} className="btn btn-secondary" style={{ fontSize: 12 }}>
                          Plan a Workout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" style={{ maxWidth: 560, width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{DAY_FULL[DAYS.indexOf(editing)]}'s Workout</h3>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Workout Label (optional)</label>
              <input className="input" value={dayLabel} onChange={e => setDayLabel(e.target.value)}
                placeholder="e.g. Push Day, Leg Day, Chest & Triceps…" />
            </div>

            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">Search Exercises</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <FilterDropdown
                  value={muscleFilter}
                  options={MUSCLES}
                  onChange={v => { setMuscleFilter(v as string); searchExercises(nameSearch, v as string); }}
                  minWidth={150}
                />
                <div ref={searchRef} style={{ flex: 1, minWidth: 160, position: 'relative' }}>
                  <input className="input" value={nameSearch}
                    onChange={e => handleNameChange(e.target.value)}
                    onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
                    placeholder="Search by name…" />
                  {showResults && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 10, maxHeight: 240, overflowY: 'auto',
                      marginTop: 4, boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                    }}>
                      {searching && <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 13 }}>Searching…</div>}
                      {!searching && searchResults.length === 0 && <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 13 }}>No results found</div>}
                      {!searching && searchResults.map((ex, i) => {
                        const added = !!selectedExercises.find(e => e.exerciseName === ex.name);
                        return (
                          <div key={i} onClick={() => addExercise(ex)}
                            style={{ padding: '10px 14px', cursor: added ? 'default' : 'pointer', borderBottom: '1px solid var(--border-subtle)', opacity: added ? 0.5 : 1 }}
                            onMouseEnter={e => { if (!added) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                              <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>
                                {added && <span style={{ color: '#8a9f4a', marginRight: 6 }}>✓</span>}
                                {ex.name}
                              </span>
                              <div style={{ display: 'flex', gap: 5 }}>
                                {ex.muscle && <span style={{ fontSize: 10, background: 'rgba(201,168,76,0.12)', color: 'var(--gold)', padding: '2px 8px', borderRadius: 10 }}>{ex.muscle.replace(/_/g, ' ')}</span>}
                                {ex.difficulty && <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{ex.difficulty}</span>}
                              </div>
                            </div>
                            {ex.equipment && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{ex.equipment}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>Pick a muscle group to browse, or type a name to search. Tap to add.</p>
            </div>

            {selectedExercises.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Planned Exercises ({selectedExercises.length})</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedExercises.map((ex, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 12px', borderRadius: 10,
                      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                      flexWrap: 'wrap',
                    }}>
                      <div style={{ flex: '1 1 100px', minWidth: 0 }}>
                        <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.exerciseName}</p>
                        {ex.muscleGroup && <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 1 }}>{ex.muscleGroup.replace(/_/g, ' ')}</p>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <input type="number" className="input"
                          style={{ width: 52, textAlign: 'center', padding: '6px 4px', fontSize: 13 }}
                          value={ex.plannedSets} min={1} placeholder="Sets"
                          onChange={e => updateExercise(idx, 'plannedSets', e.target.value)} />
                        <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>×</span>
                        <input className="input"
                          style={{ width: 60, textAlign: 'center', padding: '6px 4px', fontSize: 13 }}
                          value={ex.plannedReps} placeholder="Reps"
                          onChange={e => updateExercise(idx, 'plannedReps', e.target.value)} />
                        <button onClick={() => removeExercise(idx)} style={{
                          background: 'transparent', border: '1px solid var(--border)',
                          color: 'var(--text-muted)', borderRadius: 7,
                          padding: '5px 8px', cursor: 'pointer', fontSize: 13, flexShrink: 0,
                        }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedExercises.length === 0 && (
              <div style={{ textAlign: 'center', padding: '16px 0 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>😴</div>
                No exercises — this day will be a Rest Day
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save Plan'}
              </button>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyPlanPage;

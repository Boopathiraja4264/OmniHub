import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../types';
import { fetchFitnessDashboard, fetchExercises, logWeight, logWorkout, addTransaction } from './homeApi';
import FilterDropdown from '../../components/FilterDropdown';
import { getDailyKuralNum, getCachedKural, fetchKural, pickNewKuralNum, setCachedDailyNum, getExplanation } from '../../services/external/thirukkuralApi';
import { loadBharathiPoems, getDailyBharathiIdx, pickNewBharathiIdx, setCachedDailyBharathiIdx, BharathiPoem } from '../../services/external/bharathiyarApi';

type DrawerType = 'weight' | 'workout' | 'transaction' | null;
const todayStr = () => new Date().toISOString().split('T')[0];

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [fitness, setFitness] = useState<any>(null);
  const [kuralData, setKuralData] = useState<any>(null);
  const [kuralLoading, setKuralLoading] = useState(false);
  const [bharathiPoem, setBharathiPoem] = useState<BharathiPoem | null>(null);
  const [bharathiPoems, setBharathiPoems] = useState<BharathiPoem[]>([]);
  const [bharathiLoading, setBharathiLoading] = useState(false);
  const [bharathiError, setBharathiError] = useState(false);

  // Drawer
  const [drawer, setDrawer] = useState<DrawerType>(null);
  const [saving, setSaving] = useState(false);
  const [drawerMsg, setDrawerMsg] = useState<string | null>(null);

  // Weight form
  const [wForm, setWForm] = useState({ weight: '', date: todayStr(), notes: '' });

  // Workout form
  const [exercises, setExercises] = useState<any[]>([]);
  const [workoutDate, setWorkoutDate] = useState(todayStr());
  const [sets, setSets] = useState<any[]>([]);
  const [newSet, setNewSet] = useState({ exerciseId: '', sets: '3', reps: '', weight: '' });

  // Transaction form
  const [txForm, setTxForm] = useState({
    description: '', amount: '', type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    category: '', date: todayStr(), notes: '',
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('greeting.morning') : hour < 17 ? t('greeting.afternoon') : t('greeting.evening');
  const dateStr = new Date().toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  useEffect(() => {
    fetchFitnessDashboard().then(r => setFitness(r.data)).catch(() => {});
    const cached = getCachedKural();
    if (cached) { setKuralData(cached); } else { loadKural(getDailyKuralNum()); }

    setBharathiLoading(true);
    loadBharathiPoems()
      .then(poems => {
        setBharathiPoems(poems);
        setBharathiPoem(poems[getDailyBharathiIdx(poems.length)]);
      })
      .catch(() => setBharathiError(true))
      .finally(() => setBharathiLoading(false));
  }, []);

  const loadKural = (num: number) => {
    setKuralLoading(true);
    fetchKural(num)
      .then(data => setKuralData(data))
      .catch(() => setKuralData({ number: num, fallback: true }))
      .finally(() => setKuralLoading(false));
  };

  const refreshKural = () => {
    const num = pickNewKuralNum();
    setCachedDailyNum(num);
    loadKural(num);
  };

  const refreshBharathi = () => {
    if (bharathiPoems.length === 0) return;
    const idx = pickNewBharathiIdx(bharathiPoems.length);
    setCachedDailyBharathiIdx(idx);
    setBharathiPoem(bharathiPoems[idx]);
  };

  const openDrawer = (type: DrawerType) => {
    setDrawerMsg(null); setSaving(false);
    if (type === 'weight') setWForm({ weight: '', date: todayStr(), notes: '' });
    if (type === 'workout') {
      setWorkoutDate(todayStr()); setSets([]);
      setNewSet({ exerciseId: '', sets: '3', reps: '', weight: '' });
      if (exercises.length === 0)
        fetchExercises().then(r => setExercises(r.data)).catch(() => {});
    }
    if (type === 'transaction')
      setTxForm({ description: '', amount: '', type: 'EXPENSE', category: '', date: todayStr(), notes: '' });
    setDrawer(type);
  };

  const saveWeight = async () => {
    if (!wForm.weight) return;
    setSaving(true); setDrawerMsg(null);
    try {
      await logWeight(parseFloat(wForm.weight), wForm.date, wForm.notes);
      setDrawerMsg(t('drawer.savedWeight'));
      setWForm({ weight: '', date: todayStr(), notes: '' });
    } catch { setDrawerMsg(t('drawer.failed')); }
    finally { setSaving(false); }
  };

  const addSet = () => {
    if (!newSet.exerciseId || !newSet.reps) return;
    const ex = exercises.find(e => e.id === parseInt(newSet.exerciseId));
    setSets(p => [...p, {
      exerciseId: parseInt(newSet.exerciseId), exerciseName: ex?.name,
      sets: parseInt(newSet.sets), reps: parseInt(newSet.reps),
      weight: parseFloat(newSet.weight) || 0,
    }]);
    setNewSet(p => ({ ...p, reps: '', weight: '' }));
  };

  const saveWorkout = async () => {
    if (sets.length === 0) return;
    setSaving(true); setDrawerMsg(null);
    try {
      await logWorkout(workoutDate, sets.map(s => ({ exerciseId: s.exerciseId, sets: s.sets, reps: s.reps, weight: s.weight })));
      setDrawerMsg(t('drawer.savedWorkout'));
      setSets([]);
    } catch { setDrawerMsg(t('drawer.failed')); }
    finally { setSaving(false); }
  };

  const saveTx = async () => {
    if (!txForm.description || !txForm.amount) return;
    setSaving(true); setDrawerMsg(null);
    try {
      await addTransaction({ ...txForm, amount: parseFloat(txForm.amount) });
      setDrawerMsg(t('drawer.savedTransaction'));
      setTxForm({ description: '', amount: '', type: 'EXPENSE', category: '', date: todayStr(), notes: '' });
    } catch { setDrawerMsg(t('drawer.failed')); }
    finally { setSaving(false); }
  };

  const kuralLines: string[] = kuralData?.kural || [];
  const tamilExplanation = kuralData ? getExplanation(kuralData) : '';
  const txCategories = txForm.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">{greeting}, {user?.fullName?.split(' ')[0]}! 🌴</h1>
        <p className="page-subtitle">{dateStr}</p>
      </div>

      {/* Poems row — side by side on wide screens, stacked on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>

        {/* Thirukkural */}
        <div className="card" style={{ borderLeft: '4px solid var(--gold)', position: 'relative' }}>
          <button
            onClick={refreshKural} disabled={kuralLoading} title="மற்றொரு குறள்"
            style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: 4, lineHeight: 1, opacity: kuralLoading ? 0.4 : 1 }}
          >↻</button>

          {!kuralData || kuralLoading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t('common.loading')}</div>
          ) : kuralData.fallback ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>இணையம் இல்லாமல் ஏற்றமுடியவில்லை.</div>
          ) : (
            <>
              {(kuralData.section || kuralData.chapter) && (
                <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, marginBottom: 12, letterSpacing: 0.5 }}>
                  {kuralData.section}{kuralData.section && kuralData.chapter ? ' › ' : ''}{kuralData.chapter}
                </div>
              )}
              <div style={{ fontFamily: "'Noto Sans Tamil', 'Latha', serif", fontSize: 22, lineHeight: 2, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 6, letterSpacing: 0.4 }}>
                {kuralLines[0]}<br />{kuralLines[1]}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'right', marginBottom: 14 }}>
                — திருவள்ளுவர்
              </div>
              {tamilExplanation && (
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.9, fontFamily: "'Noto Sans Tamil', 'Latha', sans-serif", borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                  {tamilExplanation}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bharathiyar */}
        <div className="card" style={{ borderLeft: '4px solid #7c9fd4', position: 'relative' }}>
          <button
            onClick={refreshBharathi} title="மற்றொரு பாடல்"
            disabled={bharathiLoading || bharathiPoems.length === 0}
            style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: 4, lineHeight: 1, opacity: bharathiLoading ? 0.4 : 1 }}
          >↻</button>

          {bharathiLoading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t('common.loading')}</div>
          ) : bharathiError ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>பாரதியார் பாடல்கள் ஏற்றமுடியவில்லை.</div>
          ) : bharathiPoem ? (
            <>
              <div style={{ fontFamily: "'Noto Sans Tamil', 'Latha', serif", fontSize: 22, lineHeight: 2, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 14, letterSpacing: 0.4 }}>
                {bharathiPoem.lines.slice(0, 4).map((line, i) => (
                  <React.Fragment key={i}>{line}{i < Math.min(bharathiPoem.lines.length, 4) - 1 && <br />}</React.Fragment>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'right', marginTop: 4 }}>
                — மகாகவி சுப்பிரமணிய பாரதியார்
              </div>
            </>
          ) : null}
        </div>

      </div>

      {/* Fitness stat cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">{t('home.workoutsThisWeek')}</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{fitness?.workoutsThisWeek ?? '--'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('home.totalWorkouts')}</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{fitness?.totalWorkouts ?? '--'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('home.currentWeight')}</div>
          <div className="stat-value" style={{ color: 'var(--gold)' }}>
            {fitness?.latestWeight ? `${fitness.latestWeight} kg` : '--'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('home.todayPlan')}</div>
          <div className="stat-value" style={{ color: 'var(--gold)', fontSize: 20 }}>{fitness?.todayPlan || t('home.restDay')}</div>
        </div>
      </div>

      {/* Quick log links */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        {([
          { key: 'home.logWeight', type: 'weight' as DrawerType },
          { key: 'home.logWorkout', type: 'workout' as DrawerType },
          { key: 'home.addTransaction', type: 'transaction' as DrawerType },
        ] as const).map((item, i, arr) => (
          <React.Fragment key={item.type}>
            <button
              onClick={() => openDrawer(item.type)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: 0, fontFamily: 'inherit' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary-light)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              {t(item.key)}
            </button>
            {i < arr.length - 1 && <span style={{ color: 'var(--border)', userSelect: 'none' }}>|</span>}
          </React.Fragment>
        ))}
      </div>

      {/* ── Right-side drawer ── */}
      {drawer && (
        <>
          <div onClick={() => setDrawer(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 400, backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(380px, 100vw)', background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', zIndex: 401, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.25)', animation: 'slideInRight 0.22s ease' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', fontFamily: lang === 'ta' ? "'Noto Sans Tamil', 'Latha', sans-serif" : 'inherit' }}>
                {drawer === 'weight' ? t('drawer.weight.title') : drawer === 'workout' ? t('drawer.workout.title') : t('drawer.transaction.title')}
              </span>
              <button onClick={() => setDrawer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '22px' }}>
              {/* Weight */}
              {drawer === 'weight' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">{t('drawer.weight')}</label>
                    <input className="input" type="number" step="0.1" placeholder="e.g. 72.5" autoFocus
                      value={wForm.weight} onChange={e => setWForm(p => ({ ...p, weight: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('drawer.date')}</label>
                    <input className="input" type="date" value={wForm.date}
                      onChange={e => setWForm(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('drawer.notes')}</label>
                    <input className="input" placeholder={t('drawer.notesPlaceholder')}
                      value={wForm.notes} onChange={e => setWForm(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                </div>
              )}

              {/* Workout */}
              {drawer === 'workout' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">{t('drawer.date')}</label>
                    <input className="input" type="date" value={workoutDate}
                      onChange={e => setWorkoutDate(e.target.value)} />
                  </div>
                  {sets.length > 0 && (
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '10px 14px' }}>
                      {sets.map((s, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < sets.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{s.exerciseName}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.sets}×{s.reps}{s.weight > 0 ? ` @ ${s.weight}kg` : ''}</span>
                          <button onClick={() => setSets(p => p.filter((_, j) => j !== i))}
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 0.5 }}>{t('drawer.addSet')}</div>
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <FilterDropdown
                        value={newSet.exerciseId}
                        options={exercises.map(e => ({ label: e.name, value: String(e.id) }))}
                        onChange={v => setNewSet(p => ({ ...p, exerciseId: String(v) }))}
                        placeholder={t('drawer.selectExercise')}
                        fullWidth
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <div>
                        <label className="form-label" style={{ fontSize: 10 }}>{t('drawer.sets')}</label>
                        <input className="input" type="number" min="1" value={newSet.sets}
                          onChange={e => setNewSet(p => ({ ...p, sets: e.target.value }))} />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: 10 }}>{t('drawer.reps')}</label>
                        <input className="input" type="number" min="1" placeholder="12"
                          value={newSet.reps} onChange={e => setNewSet(p => ({ ...p, reps: e.target.value }))} />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: 10 }}>{t('drawer.kg')}</label>
                        <input className="input" type="number" step="0.5" placeholder="0"
                          value={newSet.weight} onChange={e => setNewSet(p => ({ ...p, weight: e.target.value }))} />
                      </div>
                    </div>
                    <button className="btn btn-secondary" style={{ width: '100%', marginTop: 10 }} onClick={addSet}>
                      {t('drawer.addSetBtn')}
                    </button>
                  </div>
                </div>
              )}

              {/* Transaction */}
              {drawer === 'transaction' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['EXPENSE', 'INCOME'] as const).map(tp => (
                      <button key={tp} onClick={() => setTxForm(p => ({ ...p, type: tp, category: '' }))}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid', borderColor: txForm.type === tp ? (tp === 'INCOME' ? 'var(--primary)' : 'var(--danger)') : 'var(--border)', background: txForm.type === tp ? (tp === 'INCOME' ? 'var(--primary-dim)' : 'rgba(192,57,43,0.08)') : 'var(--bg-elevated)', color: txForm.type === tp ? (tp === 'INCOME' ? 'var(--primary-light)' : 'var(--danger)') : 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
                        {tp === 'INCOME' ? t('drawer.income') : t('drawer.expense')}
                      </button>
                    ))}
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('drawer.description')}</label>
                    <input className="input" placeholder={t('drawer.descriptionPlaceholder')} autoFocus
                      value={txForm.description} onChange={e => setTxForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('drawer.amount')}</label>
                    <input className="input" type="number" step="0.01" placeholder="0.00"
                      value={txForm.amount} onChange={e => setTxForm(p => ({ ...p, amount: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('drawer.category')}</label>
                    <FilterDropdown
                      value={txForm.category}
                      options={txCategories.map(c => ({ label: c, value: c }))}
                      onChange={v => setTxForm(p => ({ ...p, category: v as string }))}
                      placeholder={t('drawer.selectCategory')}
                      fullWidth
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('drawer.date')}</label>
                    <input className="input" type="date" value={txForm.date}
                      onChange={e => setTxForm(p => ({ ...p, date: e.target.value }))} />
                  </div>
                </div>
              )}

              {drawerMsg && (
                <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13, background: drawerMsg.includes('!') ? 'rgba(138,159,74,0.1)' : 'rgba(192,57,43,0.1)', color: drawerMsg.includes('!') ? 'var(--primary-light)' : 'var(--danger)', border: `1px solid ${drawerMsg.includes('!') ? 'rgba(138,159,74,0.3)' : 'rgba(192,57,43,0.3)'}` }}>
                  {drawerMsg}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 22px', borderTop: '1px solid var(--border)' }}>
              <button
                className="btn btn-primary" style={{ width: '100%' }}
                disabled={saving || (drawer === 'workout' && sets.length === 0)}
                onClick={drawer === 'weight' ? saveWeight : drawer === 'workout' ? saveWorkout : saveTx}
              >
                {saving ? t('drawer.saving') : drawer === 'weight' ? t('drawer.saveWeight') : drawer === 'workout' ? `${t('drawer.saveWorkout')} (${sets.length})` : t('drawer.saveTransaction')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HomePage;

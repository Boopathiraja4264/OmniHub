import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { fetchFitnessDashboard, fetchExercises, logWeight, logWorkout } from './homeApi';
import { transactionApi, categoryItemApi, creditCardApi, bankAccountApi } from '../../services/api';
import FilterDropdown from '../../components/FilterDropdown';
import { getDailyKuralNum, getCachedKural, fetchKural, pickNewKuralNum, setCachedDailyNum, getExplanation } from '../../services/external/thirukkuralApi';
import { loadBharathiPoems, getDailyBharathiIdx, pickNewBharathiIdx, setCachedDailyBharathiIdx, BharathiPoem } from '../../services/external/bharathiyarApi';
import { ExpenseCategory, ExpenseItem, CreditCard, BankAccount } from '../../types';

type DrawerType = 'weight' | 'workout' | 'expense' | null;
const todayStr = () => new Date().toISOString().split('T')[0];

const emptyExpense = {
  amount: '', categoryId: '', categoryName: '', itemName: '',
  paymentSource: 'BANK', bankAccountId: '', cardId: '',
  date: todayStr(), notes: '',
};

type ExpenseForm = typeof emptyExpense;
interface PendingExpense extends ExpenseForm { _id: number; }

const fmtAmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

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

  // Expense form
  const [eForm, setEForm] = useState({ ...emptyExpense });
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [defaultBankId, setDefaultBankId] = useState<string>('');
  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const [pendingNextId, setPendingNextId] = useState(0);

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

    // Pre-load expense data so drawer opens instantly
    categoryItemApi.getCategories().then(r => {
      const arr = Array.isArray(r.data) ? r.data : [];
      const seen = new Set<string>();
      setExpenseCategories(arr.filter((c: ExpenseCategory) => seen.has(c.name) ? false : !!seen.add(c.name)));
    }).catch(() => {});
    creditCardApi.getAll().then(r => setCards(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    bankAccountApi.getAll().then(r => {
      const arr: BankAccount[] = Array.isArray(r.data) ? r.data : [];
      setBankAccounts(arr);
      const def = arr.find((b: BankAccount) => b.isDefault) || arr[0];
      if (def) setDefaultBankId(String(def.id));
    }).catch(() => {});
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

  // If bank accounts finish loading while expense drawer is already open, fill in the default
  useEffect(() => {
    if (drawer === 'expense' && eForm.paymentSource === 'BANK' && !eForm.bankAccountId && defaultBankId) {
      setEForm(f => ({ ...f, bankAccountId: defaultBankId }));
    }
  }, [defaultBankId, drawer, eForm.paymentSource, eForm.bankAccountId]);

  const openDrawer = (type: DrawerType) => {
    setDrawerMsg(null); setSaving(false);
    if (type === 'weight') setWForm({ weight: '', date: todayStr(), notes: '' });
    if (type === 'workout') {
      setWorkoutDate(todayStr()); setSets([]);
      setNewSet({ exerciseId: '', sets: '3', reps: '', weight: '' });
      if (exercises.length === 0)
        fetchExercises().then(r => setExercises(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }
    if (type === 'expense') {
      setEForm({ ...emptyExpense, date: todayStr(), bankAccountId: defaultBankId });
      setExpenseItems([]);
      setPendingExpenses([]);
    }
    setDrawer(type);
  };

  const handleExpenseCategoryChange = (catId: string) => {
    const cat = expenseCategories.find(c => String(c.id) === catId);
    setEForm(f => ({ ...f, categoryId: catId, categoryName: cat?.name || '', itemName: '' }));
    setExpenseItems([]);
    if (catId) categoryItemApi.getItems(parseInt(catId)).then(r => setExpenseItems(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  };

  const handleAddExpenseToList = () => {
    if (!eForm.amount || !eForm.categoryName) return;
    if (pendingExpenses.length >= 50) return;
    setPendingExpenses(p => [...p, { ...eForm, _id: pendingNextId }]);
    setPendingNextId(n => n + 1);
    // Reset form but keep date and payment info
    setEForm(f => ({
      ...emptyExpense,
      date: f.date,
      paymentSource: f.paymentSource,
      bankAccountId: f.bankAccountId,
      cardId: f.cardId,
    }));
    setExpenseItems([]);
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

  const buildExpensePayload = (f: ExpenseForm) => ({
    type: 'EXPENSE' as const,
    description: f.itemName ? `${f.categoryName} – ${f.itemName}` : f.categoryName,
    category: f.categoryName,
    itemName: f.itemName || undefined,
    amount: parseFloat(f.amount),
    date: f.date,
    notes: f.notes || undefined,
    paymentSource: f.paymentSource,
    bankAccountId: f.paymentSource === 'BANK' && f.bankAccountId ? parseInt(f.bankAccountId) : undefined,
    cardId: f.paymentSource === 'CREDIT_CARD' && f.cardId ? parseInt(f.cardId) : undefined,
  });

  const saveExpense = async () => {
    if (pendingExpenses.length === 0) return;
    setSaving(true); setDrawerMsg(null);
    try {
      await Promise.all(pendingExpenses.map(p => transactionApi.create(buildExpensePayload(p))));
      setDrawerMsg(`${pendingExpenses.length} expense${pendingExpenses.length > 1 ? 's' : ''} saved!`);
      setPendingExpenses([]);
      setEForm({ ...emptyExpense, date: todayStr(), bankAccountId: defaultBankId });
      setExpenseItems([]);
    } catch { setDrawerMsg(t('drawer.failed')); }
    finally { setSaving(false); }
  };

  const drawerTitle = drawer === 'weight' ? t('drawer.weight.title')
    : drawer === 'workout' ? t('drawer.workout.title')
    : 'Add Expense';

  const kuralLines: string[] = kuralData?.kural || [];
  const tamilExplanation = kuralData ? getExplanation(kuralData) : '';

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
          { label: t('home.logWeight'), type: 'weight' as DrawerType },
          { label: t('home.logWorkout'), type: 'workout' as DrawerType },
          { label: t('home.addExpense') || 'Add Expense', type: 'expense' as DrawerType },
        ]).map((item, i, arr) => (
          <React.Fragment key={item.type}>
            <button
              onClick={() => openDrawer(item.type)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: 0, fontFamily: 'inherit' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary-light)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              {item.label}
            </button>
            {i < arr.length - 1 && <span style={{ color: 'var(--border)', userSelect: 'none' }}>|</span>}
          </React.Fragment>
        ))}
      </div>

      {/* ── Right-side drawer ── */}
      {drawer && (
        <>
          <div onClick={() => setDrawer(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 400, backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 100vw)', background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', zIndex: 401, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.25)', animation: 'slideInRight 0.22s ease' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', fontFamily: lang === 'ta' ? "'Noto Sans Tamil', 'Latha', sans-serif" : 'inherit' }}>
                {drawerTitle}
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

              {/* Expense */}
              {drawer === 'expense' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">AMOUNT (₹)</label>
                    <input className="input" type="number" step="0.01" min="0" placeholder="0.00" autoFocus
                      value={eForm.amount} onChange={e => setEForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">DATE</label>
                    <input className="input" type="date" value={eForm.date}
                      onChange={e => setEForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CATEGORY <span style={{ color: 'var(--expense)' }}>*</span></label>
                    <FilterDropdown
                      value={eForm.categoryId}
                      options={expenseCategories.map(c => ({ label: c.name, value: String(c.id) }))}
                      onChange={v => handleExpenseCategoryChange(v as string)}
                      placeholder="Select category..."
                      fullWidth
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ITEM <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11 }}>(optional)</span></label>
                    <FilterDropdown
                      value={eForm.itemName}
                      options={expenseItems.map(i => ({ label: i.name, value: i.name }))}
                      onChange={v => setEForm(f => ({ ...f, itemName: v as string }))}
                      placeholder="Select item..."
                      disabled={!eForm.categoryId || expenseItems.length === 0}
                      fullWidth
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PAYMENT SOURCE</label>
                    <FilterDropdown
                      value={eForm.paymentSource}
                      options={[
                        { label: 'Cash', value: 'CASH' },
                        { label: 'Bank / UPI', value: 'BANK' },
                        { label: 'Credit Card', value: 'CREDIT_CARD' },
                      ]}
                      onChange={v => setEForm(f => ({
                        ...f, paymentSource: v as string, cardId: '',
                        bankAccountId: v === 'BANK' ? defaultBankId : '',
                      }))}
                      fullWidth
                    />
                  </div>
                  {eForm.paymentSource === 'BANK' && (
                    <div className="form-group">
                      <label className="form-label">BANK ACCOUNT</label>
                      <FilterDropdown
                        value={eForm.bankAccountId}
                        options={bankAccounts.map(b => ({ label: b.name + (b.bankName ? ` (${b.bankName})` : ''), value: String(b.id) }))}
                        onChange={v => setEForm(f => ({ ...f, bankAccountId: v as string }))}
                        placeholder="Select account..."
                        fullWidth
                      />
                    </div>
                  )}
                  {eForm.paymentSource === 'CREDIT_CARD' && (
                    <div className="form-group">
                      <label className="form-label">CREDIT CARD</label>
                      <FilterDropdown
                        value={eForm.cardId}
                        options={cards.map(c => ({ label: c.lastFourDigits ? `${c.name} ••••${c.lastFourDigits}` : c.name, value: String(c.id) }))}
                        onChange={v => setEForm(f => ({ ...f, cardId: v as string }))}
                        placeholder="Select card..."
                        fullWidth
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">NOTES <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11 }}>(optional)</span></label>
                    <input className="input" placeholder="Optional note..."
                      value={eForm.notes} onChange={e => setEForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>

                  {/* Add to list button */}
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                    disabled={!eForm.amount || !eForm.categoryName || pendingExpenses.length >= 50}
                    onClick={handleAddExpenseToList}
                  >
                    {pendingExpenses.length >= 50 ? 'Max 50 reached' : '+ Add to List'}
                  </button>

                  {/* Pending list */}
                  {pendingExpenses.length > 0 && (
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                          Queued ({pendingExpenses.length}/50)
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--expense)' }}>
                          {fmtAmt(pendingExpenses.reduce((s, p) => s + parseFloat(p.amount || '0'), 0))}
                        </span>
                      </div>
                      {pendingExpenses.map((p, idx) => (
                        <div key={p._id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '6px 4px', fontSize: 12,
                          borderBottom: idx < pendingExpenses.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500, flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.categoryName}{p.itemName ? ` / ${p.itemName}` : ''}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <span style={{ fontWeight: 700, color: 'var(--expense)' }}>{fmtAmt(parseFloat(p.amount))}</span>
                            <button onClick={() => setPendingExpenses(prev => prev.filter(x => x._id !== p._id))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
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
                disabled={saving || (drawer === 'workout' && sets.length === 0) || (drawer === 'expense' && pendingExpenses.length === 0)}
                onClick={drawer === 'weight' ? saveWeight : drawer === 'workout' ? saveWorkout : saveExpense}
              >
                {saving ? t('drawer.saving')
                  : drawer === 'weight' ? t('drawer.saveWeight')
                  : drawer === 'workout' ? `${t('drawer.saveWorkout')} (${sets.length})`
                  : pendingExpenses.length === 0 ? 'Add to List first'
                  : `Save All (${pendingExpenses.length})`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HomePage;

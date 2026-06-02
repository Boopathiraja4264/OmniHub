import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchFitnessDashboard, fetchExercises, logWeight, logWorkout } from './homeApi';
import { transactionApi, categoryItemApi, creditCardApi, bankAccountApi, productivityApi, investmentApi, budgetApi } from '../../services/api';
import FilterDropdown from '../../components/FilterDropdown';
import DatePicker from '../../components/DatePicker';
import { getDailyKuralNum, getCachedKural, fetchKural, pickNewKuralNum, setCachedDailyNum, getExplanation } from '../../services/external/thirukkuralApi';
import { loadBharathiPoems, getDailyBharathiIdx, pickNewBharathiIdx, setCachedDailyBharathiIdx, BharathiPoem } from '../../services/external/bharathiyarApi';
import { ExpenseCategory, ExpenseItem, CreditCard, BankAccount, Summary, Budget, InvestmentDashboard } from '../../types';

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

// Shared ghost button used inside data cards
const CardBtn: React.FC<{ onClick: () => void; children: React.ReactNode; full?: boolean }> = ({ onClick, children, full }) => (
  <button
    onClick={onClick}
    style={{
      width: full ? '100%' : undefined, flex: full ? undefined : 1,
      padding: '8px 10px', borderRadius: 8,
      border: '1px solid var(--border)', background: 'transparent',
      color: 'var(--text-secondary)', cursor: 'pointer',
      fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
      transition: 'background 0.15s, color 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
  >
    {children}
  </button>
);

const Stat: React.FC<{ label: string; value: React.ReactNode; color?: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid var(--border-subtle)' }}>
    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ fontSize: 15, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</span>
  </div>
);

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language;

  const [fitness, setFitness] = useState<any>(null);
  const [financeSummary, setFinanceSummary] = useState<Summary | null>(null);
  const [investDash, setInvestDash] = useState<InvestmentDashboard | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [activeTasks, setActiveTasks] = useState<number | null>(null);
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
    transactionApi.getSummary().then(r => setFinanceSummary(r.data)).catch(() => {});
    investmentApi.getDashboard().then(r => setInvestDash(r.data)).catch(() => {});
    const now = new Date();
    budgetApi.getForMonth(now.getMonth() + 1, now.getFullYear())
      .then(r => setBudgets(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    productivityApi.getActiveTasks().then(r => {
      setActiveTasks(Array.isArray(r.data) ? r.data.length : 0);
    }).catch(() => setActiveTasks(0));

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
    setEForm(f => ({ ...emptyExpense, date: f.date, paymentSource: f.paymentSource, bankAccountId: f.bankAccountId, cardId: f.cardId }));
    setExpenseItems([]);
  };

  const saveWeight = async () => {
    if (!wForm.weight) return;
    setSaving(true); setDrawerMsg(null);
    try {
      await logWeight(parseFloat(wForm.weight), wForm.date, wForm.notes);
      setDrawerMsg(t('drawer.savedWeight'));
      setWForm({ weight: '', date: todayStr(), notes: '' });
      fetchFitnessDashboard().then(r => setFitness(r.data)).catch(() => {});
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
      fetchFitnessDashboard().then(r => setFitness(r.data)).catch(() => {});
    } catch { setDrawerMsg(t('drawer.failed')); }
    finally { setSaving(false); }
  };

  const buildExpensePayload = (f: ExpenseForm) => ({
    type: 'EXPENSE' as const,
    description: f.itemName ? `${f.categoryName} – ${f.itemName}` : f.categoryName,
    category: f.categoryName, itemName: f.itemName || undefined,
    amount: parseFloat(f.amount), date: f.date, notes: f.notes || undefined,
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
      transactionApi.getSummary().then(r => setFinanceSummary(r.data)).catch(() => {});
    } catch { setDrawerMsg(t('drawer.failed')); }
    finally { setSaving(false); }
  };

  const drawerTitle = drawer === 'weight' ? t('drawer.weight.title')
    : drawer === 'workout' ? t('drawer.workout.title')
    : 'Add Expense';

  const kuralLines: string[] = kuralData?.kural || [];
  const tamilFont: React.CSSProperties = { fontFamily: "'Noto Sans Tamil', 'Latha', serif" };

  // ── shared card accent bar style
  const accentCard = (color: string): React.CSSProperties => ({
    borderTop: `3px solid ${color}`,
    borderRadius: 14,
    background: 'var(--bg-card)',
    border: `1px solid var(--border)`,
    borderTopColor: color,
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    boxShadow: 'var(--shadow)',
  });
  const accentCardClass = 'home-accent-card';

  return (
    <div style={{ width: '100%' }}>

      {/* ── Greeting ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">{greeting}, {user?.fullName?.split(' ')[0]}! 🌴</h1>
        <p className="page-subtitle">{dateStr}</p>
      </div>

      {/* ── Daily Wisdom ── */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
        Daily Wisdom
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 32 }}>

        {/* Thirukkural */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--gold)', borderRadius: 14, padding: '16px 18px', position: 'relative', boxShadow: 'var(--shadow)' }}>
          <button onClick={refreshKural} disabled={kuralLoading} title="மற்றொரு குறள்"
            style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 15, padding: 4, lineHeight: 1, opacity: kuralLoading ? 0.4 : 1 }}>↻</button>

          {(kuralData?.section || kuralData?.chapter) && (
            <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {kuralData.section}{kuralData.section && kuralData.chapter ? ' › ' : ''}{kuralData.chapter}
            </div>
          )}

          {!kuralData || kuralLoading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('common.loading')}</div>
          ) : kuralData.fallback ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>இணையம் இல்லாமல் ஏற்றமுடியவில்லை.</div>
          ) : (
            <>
              <div style={{ ...tamilFont, fontSize: 17, lineHeight: 1.85, color: 'var(--text-primary)', fontWeight: 700, letterSpacing: 0.3, marginBottom: 10, paddingRight: 24 }}>
                {kuralLines[0]}<br />{kuralLines[1]}
              </div>
              {getExplanation(kuralData) && (
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)', ...tamilFont }}>
                  {getExplanation(kuralData)}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'right' }}>
                — திருவள்ளுவர்
              </div>
            </>
          )}
        </div>

        {/* Bharathiyar */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid #7c9fd4', borderRadius: 14, padding: '16px 18px', position: 'relative', boxShadow: 'var(--shadow)' }}>
          <button onClick={refreshBharathi} title="மற்றொரு பாடல்"
            disabled={bharathiLoading || bharathiPoems.length === 0}
            style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 15, padding: 4, lineHeight: 1, opacity: bharathiLoading ? 0.4 : 1 }}>↻</button>

          {bharathiLoading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('common.loading')}</div>
          ) : bharathiError ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>பாரதியார் பாடல்கள் ஏற்றமுடியவில்லை.</div>
          ) : bharathiPoem ? (
            <>
              <div style={{ ...tamilFont, fontSize: 18, lineHeight: 1.85, color: 'var(--text-primary)', fontWeight: 700, letterSpacing: 0.3, marginBottom: 8, paddingRight: 24 }}>
                {bharathiPoem.lines.slice(0, 4).map((line, i) => (
                  <React.Fragment key={i}>{line}{i < Math.min(bharathiPoem.lines.length, 4) - 1 && <br />}</React.Fragment>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'right' }}>
                — மகாகவி சுப்பிரமணிய பாரதியார்
              </div>
            </>
          ) : null}
        </div>

      </div>

      {/* ── Financial Overview ── */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
        Financial Overview
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>

        {/* Finance card */}
        <div className={accentCardClass} style={accentCard('var(--primary)')}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
            This Month
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 16, flex: 1 }}>
            <Stat label="Spent" value={financeSummary ? fmtAmt(financeSummary.monthlyExpenses) : '—'} color="var(--expense)" />
            <Stat label="Income" value={financeSummary ? fmtAmt(financeSummary.monthlyIncome) : '—'} color="var(--income)" />
            <Stat label="Net balance" value={financeSummary ? fmtAmt(financeSummary.balance) : '—'} color="var(--primary)" />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <CardBtn onClick={() => openDrawer('expense')}>+ Expense</CardBtn>
            <CardBtn onClick={() => navigate('/transactions')}>Transactions</CardBtn>
          </div>
        </div>

        {/* Investments card */}
        <div className={accentCardClass} style={accentCard('#7c9fd4')}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
            Investments
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 16, flex: 1 }}>
            <Stat label="Total invested" value={investDash ? fmtAmt(investDash.totalInvested) : '—'} color="#7c9fd4" />
            <Stat label="Interest earned" value={investDash ? fmtAmt(investDash.totalInterestEarned) : '—'} color="var(--income)" />
            <Stat label="Active FD / RD" value={investDash ? `${investDash.fdList.length} FD · ${investDash.rdList.length} RD` : '—'} />
          </div>
          <CardBtn onClick={() => navigate('/finance/investments-dashboard')} full>View Details →</CardBtn>
        </div>

        {/* Budget card */}
        {(() => {
          const totalLimit  = budgets.reduce((s, b) => s + b.limitAmount, 0);
          const totalSpent  = budgets.reduce((s, b) => s + b.spent, 0);
          const overCount   = budgets.filter(b => b.spent > b.limitAmount).length;
          const pct         = totalLimit > 0 ? Math.min(100, Math.round((totalSpent / totalLimit) * 100)) : 0;
          const barColor    = pct >= 90 ? 'var(--expense)' : pct >= 70 ? 'var(--gold)' : 'var(--primary)';
          const top3        = [...budgets].sort((a, b) => b.spent - a.spent).slice(0, 3);
          return (
            <div className={accentCardClass} style={accentCard(barColor)}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                Budget — {new Date().toLocaleString('en-IN', { month: 'long' })}
              </div>
              <div style={{ flex: 1, marginBottom: 16 }}>
                {budgets.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>No budgets set for this month.</div>
                ) : (
                  <>
                    {/* Progress bar */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtAmt(totalSpent)} spent</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtAmt(totalLimit)} limit</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 0.4s' }} />
                      </div>
                      <div style={{ fontSize: 11, color: barColor, fontWeight: 700, marginTop: 4, textAlign: 'right' }}>{pct}% used{overCount > 0 ? ` · ${overCount} over limit` : ''}</div>
                    </div>
                    {/* Top 3 */}
                    {top3.map(b => {
                      const bPct = b.limitAmount > 0 ? Math.min(100, Math.round((b.spent / b.limitAmount) * 100)) : 0;
                      const bColor = bPct >= 90 ? 'var(--expense)' : bPct >= 70 ? 'var(--gold)' : 'var(--primary)';
                      return (
                        <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{b.category}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: bColor, flexShrink: 0 }}>{bPct}%</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
              <CardBtn onClick={() => navigate('/budgets')} full>Manage Budgets →</CardBtn>
            </div>
          );
        })()}

      </div>

      {/* ── Personal Overview ── */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
        Personal Overview
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>

        {/* Fitness card */}
        <div className={accentCardClass} style={accentCard('var(--gold)')}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
            Fitness
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 16, flex: 1 }}>
            <Stat label="Current weight" value={fitness?.latestWeight ? `${fitness.latestWeight} kg` : '—'} color="var(--gold)" />
            <Stat label="Workouts this week" value={fitness?.workoutsThisWeek ?? '—'} color="var(--primary)" />
            <Stat label="Today's plan" value={fitness?.todayPlan || t('home.restDay')} color="var(--gold)" />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <CardBtn onClick={() => openDrawer('weight')}>Log Weight</CardBtn>
            <CardBtn onClick={() => openDrawer('workout')}>Log Workout</CardBtn>
          </div>
        </div>

        {/* Focus card */}
        <div className={accentCardClass} style={accentCard('#a78bfa')}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
            Focus
          </div>
          <div style={{ flex: 1, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: '#a78bfa', lineHeight: 1 }}>{activeTasks ?? '—'}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>active tasks</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
              {activeTasks === 0 ? 'All clear — nothing pending!'
                : activeTasks === 1 ? '1 task needs your attention.'
                : `${activeTasks} tasks in progress.`}
            </div>
          </div>
          <CardBtn onClick={() => navigate('/productivity/tasks')} full>View Tasks →</CardBtn>
        </div>

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
                    <DatePicker value={wForm.date} onChange={e => setWForm(p => ({ ...p, date: e.target.value }))} fullWidth />
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
                    <DatePicker value={workoutDate} onChange={e => setWorkoutDate(e.target.value)} fullWidth />
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
                    <DatePicker value={eForm.date} onChange={e => setEForm(f => ({ ...f, date: e.target.value }))} fullWidth />
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
                      onChange={v => setEForm(f => ({ ...f, paymentSource: v as string, cardId: '', bankAccountId: v === 'BANK' ? defaultBankId : '' }))}
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

                  <button className="btn btn-secondary" style={{ width: '100%' }}
                    disabled={!eForm.amount || !eForm.categoryName || pendingExpenses.length >= 50}
                    onClick={handleAddExpenseToList}>
                    {pendingExpenses.length >= 50 ? 'Max 50 reached' : '+ Add to List'}
                  </button>

                  {pendingExpenses.length > 0 && (
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Queued ({pendingExpenses.length}/50)</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--expense)' }}>
                          {fmtAmt(pendingExpenses.reduce((s, p) => s + parseFloat(p.amount || '0'), 0))}
                        </span>
                      </div>
                      {pendingExpenses.map((p, idx) => (
                        <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 4px', fontSize: 12, borderBottom: idx < pendingExpenses.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
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

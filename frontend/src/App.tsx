import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import TopNav from './components/TopNav';
import AuthPage from './modules/auth/AuthPage';
import OAuthCallbackPage from './modules/auth/OAuthCallbackPage';
import ResetPasswordPage from './modules/auth/ResetPasswordPage';
import HomePage from './modules/home/HomePage';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { initSentry, Sentry } from './monitoring/sentry';
import './i18n/i18n';
import './index.css';

initSentry();

const TransactionsPage          = lazy(() => import('./modules/finance/TransactionsPage'));
const BudgetsPage               = lazy(() => import('./modules/finance/BudgetsPage'));
const AnalyticsPage             = lazy(() => import('./modules/finance/AnalyticsPage'));
const CategoryItemSettingsPage  = lazy(() => import('./modules/finance/CategoryItemSettingsPage'));
const AccountsPage              = lazy(() => import('./modules/finance/AccountsPage'));
const BankAccountDetailPage     = lazy(() => import('./modules/finance/BankAccountDetailPage'));
const CreditCardDetailPage      = lazy(() => import('./modules/finance/CreditCardDetailPage'));
const VehicleLogPage            = lazy(() => import('./modules/finance/VehicleLogPage'));
const ImportExportPage          = lazy(() => import('./modules/finance/ImportExportPage'));
const FinanceOverviewPage       = lazy(() => import('./modules/finance/FinanceOverviewPage'));
const InvestmentsPage           = lazy(() => import('./modules/finance/InvestmentsPage'));
const ChitTrackerPage           = lazy(() => import('./modules/finance/ChitTrackerPage'));
const IncomeExpenseDashboard    = lazy(() => import('./modules/finance/IncomeExpenseDashboard'));
const InvestmentsDashboard      = lazy(() => import('./modules/finance/InvestmentsDashboard'));
const EmergencyFundPage         = lazy(() => import('./modules/finance/EmergencyFundPage'));
const ChitGroupDetailPage       = lazy(() => import('./modules/finance/ChitGroupDetailPage'));
const DebtTrackerPage           = lazy(() => import('./modules/finance/DebtTrackerPage'));
const EmiLoansPage              = lazy(() => import('./modules/finance/EmiLoansPage'));
const EmiLoanDetailPage         = lazy(() => import('./modules/finance/EmiLoanDetailPage'));
const AnnualLoansPage           = lazy(() => import('./modules/finance/AnnualLoansPage'));
const AnnualLoanDetailPage      = lazy(() => import('./modules/finance/AnnualLoanDetailPage'));
const BorrowedLoansPage         = lazy(() => import('./modules/finance/BorrowedLoansPage'));
const BorrowedLoanDetailPage    = lazy(() => import('./modules/finance/BorrowedLoanDetailPage'));
const WealthPage                = lazy(() => import('./modules/finance/WealthPage'));
const Dashboard        = lazy(() => import('./components/Dashboard'));
const FitnessDashboard = lazy(() => import('./modules/fitness/FitnessDashboard'));
const WorkoutPage      = lazy(() => import('./modules/fitness/WorkoutPage'));
const WeeklyPlanPage   = lazy(() => import('./modules/fitness/WeeklyPlanPage'));
const WeightPage       = lazy(() => import('./modules/fitness/WeightPage'));
const StepsPage        = lazy(() => import('./modules/fitness/StepsPage'));
const SettingsPage              = lazy(() => import('./modules/settings/SettingsPage'));
const BackupPage                = lazy(() => import('./modules/settings/BackupPage'));
const ProductivityDashboard     = lazy(() => import('./modules/productivity/ProductivityDashboard'));
const TodayPage                 = lazy(() => import('./modules/productivity/TodayPage'));
const TaskBoardPage             = lazy(() => import('./modules/productivity/TaskBoardPage'));
const TemplatesPage             = lazy(() => import('./modules/productivity/TemplatesPage'));
const InsightsPage              = lazy(() => import('./modules/productivity/InsightsPage'));
const CalendarPage              = lazy(() => import('./modules/productivity/CalendarPage'));

const PageFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
    Loading...
  </div>
);

const WakingUpScreen: React.FC = () => {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent, #6366f1)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)' }}>Server is waking up…</div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
        Render's free tier pauses after 15 min of inactivity.<br />
        This usually takes 30–60 seconds.
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', opacity: 0.6 }}>{elapsed}s elapsed</div>
    </div>
  );
};

const ProtectedLayout: React.FC = () => {
  const { user, loading, wakingUp } = useAuth();

  if (loading && wakingUp) return <WakingUpScreen />;
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
      Loading...
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-layout">
      <TopNav />
      <main className="main-content">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/home" element={<HomePage />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/finance/categories" element={<CategoryItemSettingsPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/accounts/bank/:id" element={<BankAccountDetailPage />} />
            <Route path="/accounts/card/:id" element={<CreditCardDetailPage />} />
            <Route path="/vehicles" element={<VehicleLogPage />} />
            <Route path="/finance/overview" element={<FinanceOverviewPage />} />
            <Route path="/finance/import-export" element={<ImportExportPage />} />
            <Route path="/finance/investments" element={<InvestmentsPage />} />
            <Route path="/finance/income-expense" element={<IncomeExpenseDashboard />} />
            <Route path="/finance/investments-dashboard" element={<InvestmentsDashboard />} />
            <Route path="/finance/chit" element={<ChitTrackerPage />} />
            <Route path="/finance/emergency-fund" element={<EmergencyFundPage />} />
            <Route path="/finance/chit/:id" element={<ChitGroupDetailPage />} />
            <Route path="/finance/wealth" element={<WealthPage />} />
            <Route path="/finance/debt" element={<DebtTrackerPage />} />
            <Route path="/finance/debt/emi" element={<EmiLoansPage />} />
            <Route path="/finance/debt/emi/:id" element={<EmiLoanDetailPage />} />
            <Route path="/finance/debt/annual" element={<AnnualLoansPage />} />
            <Route path="/finance/debt/annual/:id" element={<AnnualLoanDetailPage />} />
            <Route path="/finance/debt/borrowed" element={<BorrowedLoansPage />} />
            <Route path="/finance/debt/borrowed/:id" element={<BorrowedLoanDetailPage />} />
            <Route path="/fitness" element={<FitnessDashboard />} />
            <Route path="/fitness/workout" element={<WorkoutPage />} />
            <Route path="/fitness/weekly-plan" element={<WeeklyPlanPage />} />
            <Route path="/fitness/weight" element={<WeightPage />} />
            <Route path="/fitness/steps" element={<StepsPage />} />
            <Route path="/productivity" element={<ProductivityDashboard />} />
            <Route path="/productivity/today" element={<TodayPage />} />
            <Route path="/productivity/tasks" element={<TaskBoardPage />} />
            <Route path="/productivity/templates" element={<TemplatesPage />} />
            <Route path="/productivity/insights" element={<InsightsPage />} />
            <Route path="/productivity/calendar" element={<CalendarPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/backup" element={<BackupPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/home" replace /> : <AuthPage />} />
      <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <Sentry.ErrorBoundary fallback={
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 18 }}>Something went wrong.</p>
      <button onClick={() => window.location.reload()} style={{ padding: '8px 20px', borderRadius: 8, cursor: 'pointer' }}>Reload</button>
    </div>
  }>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
    <Analytics />
    <SpeedInsights />
  </Sentry.ErrorBoundary>
);

export default App;

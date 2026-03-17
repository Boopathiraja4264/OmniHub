import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import TopNav from './components/TopNav';
import AuthPage from './modules/auth/AuthPage';
import HomePage from './modules/home/HomePage';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { initSentry, Sentry } from './monitoring/sentry';
import './i18n/i18n';
import './index.css';

initSentry();

const TransactionsPage = lazy(() => import('./modules/finance/TransactionsPage'));
const BudgetsPage      = lazy(() => import('./modules/finance/BudgetsPage'));
const AnalyticsPage    = lazy(() => import('./modules/finance/AnalyticsPage'));
const Dashboard        = lazy(() => import('./components/Dashboard'));
const FitnessDashboard = lazy(() => import('./modules/fitness/FitnessDashboard'));
const WorkoutPage      = lazy(() => import('./modules/fitness/WorkoutPage'));
const ExercisesPage    = lazy(() => import('./modules/fitness/ExercisesPage'));
const WeeklyPlanPage   = lazy(() => import('./modules/fitness/WeeklyPlanPage'));
const WeightPage       = lazy(() => import('./modules/fitness/WeightPage'));
const SettingsPage     = lazy(() => import('./modules/settings/SettingsPage'));
const BackupPage       = lazy(() => import('./modules/settings/BackupPage'));

const PageFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
    Loading...
  </div>
);

const ProtectedLayout: React.FC = () => {
  const { user, loading } = useAuth();

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
            <Route path="/fitness" element={<FitnessDashboard />} />
            <Route path="/fitness/workout" element={<WorkoutPage />} />
            <Route path="/fitness/exercises" element={<ExercisesPage />} />
            <Route path="/fitness/weekly-plan" element={<WeeklyPlanPage />} />
            <Route path="/fitness/weight" element={<WeightPage />} />
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

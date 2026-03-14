import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TransactionsPage from './modules/finance/TransactionsPage';
import BudgetsPage from './modules/finance/BudgetsPage';
import AnalyticsPage from './modules/finance/AnalyticsPage';
import AuthPage from './modules/auth/AuthPage';
import FitnessDashboard from './modules/fitness/FitnessDashboard';
import WorkoutPage from './modules/fitness/WorkoutPage';
import ExercisesPage from './modules/fitness/ExercisesPage';
import WeeklyPlanPage from './modules/fitness/WeeklyPlanPage';
import WeightPage from './modules/fitness/WeightPage';
import SettingsPage from './modules/settings/SettingsPage';
import BackupPage from './modules/settings/BackupPage';
import './index.css';

const ThemeToggle: React.FC<{ theme: string; toggle: () => void }> = ({ theme, toggle }) => (
  <button className="theme-toggle" onClick={toggle} title="Toggle theme">
    {theme === 'dark' ? '☀️' : '🌙'}
  </button>
);

const ProtectedLayout: React.FC<{ theme: string; toggleTheme: () => void }> = ({ theme, toggleTheme }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text-muted)' }}>
      Loading...
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-layout">
      <ThemeToggle theme={theme} toggle={toggleTheme} />
      <Sidebar />
      <main className="main-content">
        <Routes>
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
      </main>
    </div>
  );
};

const AppRoutes: React.FC<{ theme: string; toggleTheme: () => void }> = ({ theme, toggleTheme }) => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/*" element={<ProtectedLayout theme={theme} toggleTheme={toggleTheme} />} />
    </Routes>
  );
};

const App: React.FC = () => {
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes theme={theme} toggleTheme={toggleTheme} />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

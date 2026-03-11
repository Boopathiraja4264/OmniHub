import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './shared/context/AuthContext';
import Sidebar from './shared/components/Sidebar';
import Dashboard from './shared/components/Dashboard';
import TransactionsPage from './modules/finance/TransactionsPage';
import BudgetsPage from './modules/finance/BudgetsPage';
import AnalyticsPage from './modules/finance/AnalyticsPage';
import AuthPage from './modules/auth/AuthPage';

// Fitness pages
import FitnessDashboard from './modules/fitness/FitnessDashboard';
import WorkoutPage from './modules/fitness/WorkoutPage';
import ExercisesPage from './modules/fitness/ExercisesPage';
import WeeklyPlanPage from './modules/fitness/WeeklyPlanPage';
import WeightPage from './modules/fitness/WeightPage';

import './index.css';

const ProtectedLayout: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text-muted)' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          {/* Finance */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          {/* Fitness */}
          <Route path="/fitness" element={<FitnessDashboard />} />
          <Route path="/fitness/workout" element={<WorkoutPage />} />
          <Route path="/fitness/exercises" element={<ExercisesPage />} />
          <Route path="/fitness/weekly-plan" element={<WeeklyPlanPage />} />
          <Route path="/fitness/weight" element={<WeightPage />} />
        </Routes>
      </main>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);

export default App;

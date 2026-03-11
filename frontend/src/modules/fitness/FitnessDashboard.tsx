import React, { useEffect, useState } from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import api from '../../shared/services/api';

const FitnessDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  useEffect(() => {
    api.get('/api/fitness/dashboard').then(r => setDashboard(r.data)).catch(() => {});
    api.get(`/api/fitness/workouts/date/${todayStr}`).then(r => setTodayWorkout(r.data)).catch(() => {});
  }, [todayStr]);

  const totalSets = todayWorkout?.sets?.length || 0;
  const muscles = Array.from(new Set((todayWorkout?.sets?.map((s: any) => s.exerciseName) || []) as string[]));

  return (
    <div>
      <h1 className="page-title">{greeting}, {user?.fullName?.split(' ')[0]}! 💪</h1>
      <p className="page-subtitle">{dateStr}</p>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Workouts This Week</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{dashboard?.workoutsThisWeek ?? '--'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Today's Plan</div>
          <div className="stat-value" style={{ color: 'var(--gold)', fontSize: 20 }}>{dashboard?.todayPlan || 'Rest Day'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Current Weight</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>
            {dashboard?.latestWeight ? `${dashboard.latestWeight} kg` : '--'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Today's Sets</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{totalSets}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>Today's Workout</h3>
          <a href="/fitness/workout" style={{ color: 'var(--gold)', fontSize: 13, textDecoration: 'none' }}>Log Workout →</a>
        </div>
        {todayWorkout?.sets?.length > 0 ? (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {muscles.map((m: any) => <span key={m} className="badge badge-warning">{m}</span>)}
            </div>
            <table className="table">
              <thead><tr><th>Exercise</th><th>Reps</th><th>Weight</th><th>Notes</th></tr></thead>
              <tbody>
                {todayWorkout.sets.map((s: any) => (
                  <tr key={s.id}>
                    <td>{s.exerciseName}</td>
                    <td>{s.reps}</td>
                    <td>{s.weight ? `${s.weight} kg` : 'BW'}</td>
                    <td>{s.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🏋️</p>
            <p>{dashboard?.todayPlan ? `Today is ${dashboard.todayPlan} day! ` : ''}
              <a href="/fitness/workout" style={{ color: 'var(--gold)' }}>Start logging!</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FitnessDashboard;

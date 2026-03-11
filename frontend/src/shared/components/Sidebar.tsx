import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  const isFitness = location.pathname.startsWith('/fitness');

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <h1>OmniHub</h1>
        <span>{isFitness ? 'Fitness Tracker' : 'Finance Tracker'}</span>
      </div>

      {/* App Switcher */}
      <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
        <NavLink to="/" end style={({ isActive }) => ({
          flex: 1, textAlign: 'center' as const, padding: '8px 4px', borderRadius: 8,
          background: !isFitness ? 'var(--gold)' : 'var(--bg-secondary)',
          color: !isFitness ? '#0a0a0a' : 'var(--text-muted)',
          fontSize: 12, fontWeight: 600, textDecoration: 'none',
          border: `1px solid ${!isFitness ? 'var(--gold)' : 'var(--border)'}`,
          transition: 'all 0.2s'
        })}>
          💰 Finance
        </NavLink>
        <NavLink to="/fitness" style={({ isActive }) => ({
          flex: 1, textAlign: 'center' as const, padding: '8px 4px', borderRadius: 8,
          background: isFitness ? 'var(--gold)' : 'var(--bg-secondary)',
          color: isFitness ? '#0a0a0a' : 'var(--text-muted)',
          fontSize: 12, fontWeight: 600, textDecoration: 'none',
          border: `1px solid ${isFitness ? 'var(--gold)' : 'var(--border)'}`,
          transition: 'all 0.2s'
        })}>
          🏋️ Fitness
        </NavLink>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '0 0 8px' }} />

      {/* Finance Nav */}
      {!isFitness && (
        <nav>
          <p style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: 2, padding: '8px 20px 4px', textTransform: 'uppercase' as const }}>Finance</p>
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Dashboard
          </NavLink>
          <NavLink to="/transactions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            Transactions
          </NavLink>
          <NavLink to="/budgets" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            Budgets
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            Analytics
          </NavLink>
        </nav>
      )}

      {/* Fitness Nav */}
      {isFitness && (
        <nav>
          <p style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: 2, padding: '8px 20px 4px', textTransform: 'uppercase' as const }}>Fitness</p>
          <NavLink to="/fitness" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Dashboard
          </NavLink>
          <NavLink to="/fitness/workout" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="6" y1="4" x2="18" y2="4"/>
            </svg>
            Workout
          </NavLink>
          <NavLink to="/fitness/exercises" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
            Exercises
          </NavLink>
          <NavLink to="/fitness/weekly-plan" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Weekly Plan
          </NavLink>
          <NavLink to="/fitness/weight" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Weight
          </NavLink>
        </nav>
      )}

      {/* User section */}
      <div className="sidebar-user">
        <div className="sidebar-user-name">{user?.fullName}</div>
        <div className="sidebar-user-email">{user?.email}</div>
        <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
      </div>
    </div>
  );
};

export default Sidebar;

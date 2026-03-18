import React, { useTransition } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const TopNav: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
  const { t } = useTranslation();

  const handleLogout = () => {
    startTransition(() => {
      logout();
      navigate('/login');
    });
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  const financeLinks = [
    { to: '/', label: t('nav.dashboard'), icon: '📊', end: true },
    { to: '/transactions', label: t('nav.transactions'), icon: '💸', end: false },
    { to: '/budgets', label: t('nav.budgets'), icon: '🎯', end: true },
    { to: '/analytics', label: t('nav.analytics'), icon: '📈', end: false },
    { to: '/finance/categories', label: 'Categories & Items', icon: '🏷️', end: false },
    { to: '/accounts', label: 'Accounts', icon: '🏦', end: false },
    { to: '/vehicles', label: 'Vehicle Log', icon: '🚗', end: false },
    { to: '/finance/import-export', label: 'Import / Export', icon: '📥', end: false },
  ];

  const fitnessLinks = [
    { to: '/fitness', label: t('nav.dashboard'), icon: '🏠', end: true },
    { to: '/fitness/workout', label: t('nav.workout'), icon: '🏋️', end: false },
    { to: '/fitness/weekly-plan', label: t('nav.weeklyPlan'), icon: '📅', end: false },
    { to: '/fitness/weight', label: t('nav.weightTracker'), icon: '⚖️', end: false },
    { to: '/fitness/steps', label: t('nav.stepsRun'), icon: '👟', end: false },
  ];

  return (
    <header className="top-nav">
      <div className="top-nav-inner">

        {/* Logo → Home */}
        <NavLink to="/home" className="top-nav-logo">
          <span style={{ fontSize: 22 }}>🌴</span>
          <span className="top-nav-logo-text">OmniHub</span>
        </NavLink>

        <nav className="top-nav-links">
          {/* Finance dropdown */}
          <div className="top-nav-dropdown">
            <button className="top-nav-item top-nav-dropdown-trigger">
              <span>💰</span> {t('nav.finance')}
              <svg className="top-nav-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div className="top-nav-dropdown-menu">
              <div className="top-nav-dropdown-inner">
                {financeLinks.map(link => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) => `top-nav-dropdown-item ${isActive ? 'active' : ''}`}
                  >
                    <span style={{ fontSize: 15 }}>{link.icon}</span>
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>

          {/* Fitness dropdown */}
          <div className="top-nav-dropdown">
            <button className="top-nav-item top-nav-dropdown-trigger">
              <span>💪</span> {t('nav.fitness')}
              <svg className="top-nav-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div className="top-nav-dropdown-menu">
              <div className="top-nav-dropdown-inner">
                {fitnessLinks.map(link => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) => `top-nav-dropdown-item ${isActive ? 'active' : ''}`}
                  >
                    <span style={{ fontSize: 15 }}>{link.icon}</span>
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        </nav>

        {/* User avatar with settings + logout */}
        <div className="top-nav-right">
          <div className="top-nav-dropdown top-nav-user-dropdown">
            <button className="top-nav-avatar">
              {getInitials(user?.fullName || '')}
            </button>
            <div className="top-nav-dropdown-menu top-nav-user-menu">
              <div className="top-nav-dropdown-inner">
                <div className="top-nav-user-info">
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                    {user?.fullName}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                    {user?.email}
                  </div>
                </div>
                <NavLink
                  to="/settings"
                  className={({ isActive }) => `top-nav-dropdown-item ${isActive ? 'active' : ''}`}
                  style={{ marginTop: 4 }}
                >
                  <span style={{ fontSize: 15 }}>⚙️</span>
                  {t('nav.settings')}
                </NavLink>
                <button className="top-nav-logout-btn" onClick={handleLogout}>
                  <span style={{ fontSize: 15 }}>🚪</span>
                  {t('nav.signOut')}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};

export default TopNav;

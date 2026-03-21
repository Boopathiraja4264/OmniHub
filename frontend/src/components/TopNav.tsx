import React, { useState, useTransition } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const TopNav: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    setMobileOpen(false);
    startTransition(() => {
      logout();
      navigate('/login');
    });
  };

  const closeMenu = () => setMobileOpen(false);

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
    <>
      <header className="top-nav">
        <div className="top-nav-inner">

          {/* Logo → Home */}
          <NavLink to="/home" className="top-nav-logo" onClick={closeMenu}>
            <span style={{ fontSize: 22 }}>🌴</span>
            <span className="top-nav-logo-text">OmniHub</span>
          </NavLink>

          {/* Desktop nav links */}
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

          {/* Right side — user avatar (desktop) */}
          <div className="top-nav-right">
            <div className="top-nav-dropdown top-nav-user-dropdown top-nav-user-desktop">
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

            {/* Hamburger — mobile only */}
            <button
              className="top-nav-hamburger"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/>
                </svg>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="top-nav-mobile-overlay" onClick={closeMenu} />
      )}
      <div className={`top-nav-mobile-panel${mobileOpen ? ' open' : ''}`}>
        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
            {getInitials(user?.fullName || '')}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{user?.fullName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
        </div>

        {/* Finance */}
        <div className="top-nav-mobile-section">💰 Finance</div>
        {financeLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={closeMenu}
            className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}
          >
            <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}

        {/* Fitness */}
        <div className="top-nav-mobile-section">💪 Fitness</div>
        {fitnessLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={closeMenu}
            className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}
          >
            <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}

        {/* Bottom: Settings + Sign out */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
          <NavLink to="/settings" onClick={closeMenu}
            className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}>
            <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>⚙️</span>
            {t('nav.settings')}
          </NavLink>
          <button onClick={handleLogout} className="top-nav-mobile-link" style={{ color: 'var(--danger)', width: '100%', textAlign: 'left' }}>
            <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>🚪</span>
            {t('nav.signOut')}
          </button>
        </div>
      </div>
    </>
  );
};

export default TopNav;

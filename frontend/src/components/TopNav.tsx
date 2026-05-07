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

  const debtSubLinks = [
    { to: '/finance/debt/emi',      label: 'EMI Based Loans',       end: false },
    { to: '/finance/debt/annual',   label: 'Annual Interest Loans', end: false },
    { to: '/finance/debt/borrowed', label: 'Borrowed',              end: false },
  ];

  const incomeExpenseSubLinks = [
    { to: '/transactions',           label: 'Transactions', end: false },
    { to: '/budgets',                label: 'Budgets',      end: true  },
    { to: '/analytics',              label: 'Analytics',    end: false },
    { to: '/finance/categories',     label: 'Categories',   end: false },
    { to: '/accounts',               label: 'Accounts',     end: false },
  ];


  const fitnessLinks = [
    { to: '/fitness', label: t('nav.dashboard'), icon: '🏠', end: true },
    { to: '/fitness/workout', label: t('nav.workout'), icon: '🏋️', end: false },
    { to: '/fitness/weekly-plan', label: t('nav.weeklyPlan'), icon: '📅', end: false },
    { to: '/fitness/weight', label: t('nav.weightTracker'), icon: '⚖️', end: false },
    { to: '/fitness/steps', label: t('nav.stepsRun'), icon: '👟', end: false },
  ];

  const focusLinks = [
    { to: '/productivity', label: 'Dashboard', icon: '📊', end: true },
    { to: '/productivity/calendar', label: 'Calendar', icon: '📅', end: false },
    { to: '/productivity/today', label: 'Today', icon: '🗓️', end: false },
    { to: '/productivity/tasks', label: 'Tasks', icon: '✅', end: false },
    { to: '/productivity/templates', label: 'Templates', icon: '📋', end: false },
    { to: '/productivity/insights', label: 'Insights', icon: '📈', end: false },
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
              <div className="top-nav-dropdown-menu" style={{ minWidth: 400 }}>
                <div className="top-nav-dropdown-inner" style={{ padding: '8px' }}>

                  {/* Finance Overview — full-width top link */}
                  <NavLink to="/finance/overview" onClick={closeMenu}
                    className={({ isActive }) => `top-nav-dropdown-item ${isActive ? 'active' : ''}`}
                    style={{ fontWeight: 600 }}>
                    <span style={{ fontSize: 15 }}>📊</span> Finance Overview
                  </NavLink>

                  <div className="top-nav-dropdown-divider" />

                  {/* 2-col: Trackers | Manage */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 4px' }}>
                    {/* Trackers column */}
                    <div>
                      <div className="top-nav-dropdown-section-label">Trackers</div>

                      {/* Income & Expense submenu */}
                      <div className="top-nav-submenu">
                        <NavLink to="/finance/income-expense"
                          className={({ isActive }) => `top-nav-dropdown-item top-nav-submenu-trigger${isActive ? ' active' : ''}`}
                          onClick={closeMenu}>
                          <span style={{ fontSize: 15 }}>💸</span> Income & Expense
                          <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 'auto' }}>›</span>
                        </NavLink>
                        <div className="top-nav-submenu-menu">
                          {[
                            { to: '/transactions',           label: 'Transactions', icon: '💸', end: false },
                            { to: '/budgets',                label: 'Budgets',      icon: '🎯', end: true  },
                            { to: '/analytics',              label: 'Analytics',    icon: '📈', end: false },
                            { to: '/finance/categories',     label: 'Categories',   icon: '🏷️', end: false },
                            { to: '/accounts',               label: 'Accounts',     icon: '🏦', end: false },
                          ].map(link => (
                            <NavLink key={link.to} to={link.to} end={link.end}
                              className={({ isActive }) => `top-nav-dropdown-item ${isActive ? 'active' : ''}`}
                              onClick={closeMenu}>
                              <span style={{ fontSize: 14 }}>{link.icon}</span> {link.label}
                            </NavLink>
                          ))}
                        </div>
                      </div>

                      {/* Debt submenu */}
                      <div className="top-nav-submenu">
                        <NavLink to="/finance/debt" end
                          className={({ isActive }) => `top-nav-dropdown-item top-nav-submenu-trigger${isActive ? ' active' : ''}`}
                          onClick={closeMenu}>
                          <span style={{ fontSize: 15 }}>💳</span> Debt
                          <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 'auto' }}>›</span>
                        </NavLink>
                        <div className="top-nav-submenu-menu">
                          {[
                            { to: '/finance/debt/emi',      label: 'EMI Based Loans',       icon: '📆', end: false },
                            { to: '/finance/debt/annual',   label: 'Annual Interest Loans', icon: '🏦', end: false },
                            { to: '/finance/debt/borrowed', label: 'Borrowed',              icon: '🤝', end: false },
                          ].map(link => (
                            <NavLink key={link.to} to={link.to} end={link.end}
                              className={({ isActive }) => `top-nav-dropdown-item ${isActive ? 'active' : ''}`}
                              onClick={closeMenu}>
                              <span style={{ fontSize: 14 }}>{link.icon}</span> {link.label}
                            </NavLink>
                          ))}
                        </div>
                      </div>

                      {/* Investments submenu */}
                      <div className="top-nav-submenu">
                        <NavLink to="/finance/investments-dashboard"
                          className={({ isActive }) => `top-nav-dropdown-item top-nav-submenu-trigger${isActive ? ' active' : ''}`}
                          onClick={closeMenu}>
                          <span style={{ fontSize: 15 }}>📈</span> Investments
                          <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 'auto' }}>›</span>
                        </NavLink>
                        <div className="top-nav-submenu-menu">
                          {[
                            { to: '/finance/investments',    label: 'RD & FD',        icon: '🏦', end: false },
                            { to: '/finance/chit',           label: 'Chit',           icon: '🔄', end: true  },
                            { to: '/finance/emergency-fund', label: 'Emergency Fund', icon: '🛡', end: false },
                          ].map(link => (
                            <NavLink key={link.to} to={link.to} end={link.end}
                              className={({ isActive }) => `top-nav-dropdown-item ${isActive ? 'active' : ''}`}
                              onClick={closeMenu}>
                              <span style={{ fontSize: 14 }}>{link.icon}</span> {link.label}
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Manage column */}
                    <div>
                      <div className="top-nav-dropdown-section-label">Manage</div>
                      {[
                        { to: '/vehicles',              label: 'Vehicle Log',   icon: '🚗', end: false },
                        { to: '/finance/import-export', label: 'Import/Export', icon: '📥', end: false },
                      ].map(l => (
                        <NavLink key={l.to} to={l.to} end={l.end}
                          className={({ isActive }) => `top-nav-dropdown-item ${isActive ? 'active' : ''}`}
                          onClick={closeMenu}>
                          <span style={{ fontSize: 14 }}>{l.icon}</span> {l.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>

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

            {/* Focus dropdown */}
            <div className="top-nav-dropdown">
              <button className="top-nav-item top-nav-dropdown-trigger">
                <span>✅</span> Focus
                <svg className="top-nav-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <div className="top-nav-dropdown-menu">
                <div className="top-nav-dropdown-inner">
                  {focusLinks.map(link => (
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
        <div className="top-nav-mobile-section">Finance</div>
        <NavLink to="/finance/overview" onClick={closeMenu}
          className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}>
          Finance Overview
        </NavLink>
        <NavLink to="/finance/income-expense" onClick={closeMenu}
          className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}
          style={{ fontWeight: 600, paddingLeft: 20 }}>
          <span style={{ fontSize: 16, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif" }}>💸</span>
          Income &amp; Expense
        </NavLink>
        {incomeExpenseSubLinks.map(link => (
          <NavLink key={link.to} to={link.to} end={link.end} onClick={closeMenu}
            className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}
            style={{ paddingLeft: 36 }}>
            {link.label}
          </NavLink>
        ))}
        <NavLink to="/finance/debt" end onClick={closeMenu}
          className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}
          style={{ fontWeight: 600, paddingLeft: 20 }}>
          <span style={{ fontSize: 16, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif" }}>💳</span>
          Debt
        </NavLink>
        {debtSubLinks.map(link => (
          <NavLink key={link.to} to={link.to} end={link.end} onClick={closeMenu}
            className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}
            style={{ paddingLeft: 36 }}>
            {link.label}
          </NavLink>
        ))}
        <NavLink to="/finance/investments-dashboard" onClick={closeMenu}
          className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}
          style={{ fontWeight: 600, paddingLeft: 20 }}>
          <span style={{ fontSize: 16, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif" }}>📈</span>
          Investments
        </NavLink>
        <NavLink to="/finance/investments" onClick={closeMenu}
          className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}
          style={{ paddingLeft: 36 }}>
          RD &amp; FD
        </NavLink>
        <NavLink to="/finance/chit" end onClick={closeMenu}
          className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}
          style={{ paddingLeft: 32 }}>
          <span style={{ fontSize: 16, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif" }}>🔄</span>
          Chit
        </NavLink>
        <NavLink to="/finance/emergency-fund" onClick={closeMenu}
          className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}
          style={{ paddingLeft: 32 }}>
          <span style={{ fontSize: 16, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif" }}>🛡</span>
          Emergency Fund
        </NavLink>
        {[
          { to: '/vehicles',              label: 'Vehicle Log',   end: false },
          { to: '/finance/import-export', label: 'Import/Export', end: false },
        ].map(link => (
          <NavLink key={link.to} to={link.to} end={link.end} onClick={closeMenu}
            className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}>
            {link.label}
          </NavLink>
        ))}

        {/* Fitness */}
        <div className="top-nav-mobile-section"><span className="top-nav-mobile-section-emoji">💪</span>Fitness</div>
        {fitnessLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={closeMenu}
            className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}
          >
            <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif" }}>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}

        {/* Focus */}
        <div className="top-nav-mobile-section"><span className="top-nav-mobile-section-emoji">✅</span>Focus</div>
        {focusLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={closeMenu}
            className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}
          >
            <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif" }}>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}

        {/* Bottom: Settings + Sign out */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
          <NavLink to="/settings" onClick={closeMenu}
            className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}>
            <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif" }}>⚙️</span>
            {t('nav.settings')}
          </NavLink>
          <button onClick={handleLogout} className="top-nav-mobile-link" style={{ color: 'var(--danger)', width: '100%', textAlign: 'left' }}>
            <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif" }}>🚪</span>
            {t('nav.signOut')}
          </button>
        </div>
      </div>
    </>
  );
};

export default TopNav;

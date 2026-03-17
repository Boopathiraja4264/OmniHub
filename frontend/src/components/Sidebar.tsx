import React, { useState, useEffect, useTransition } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [, startTransition] = useTransition();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isFitnessRoute = location.pathname.startsWith('/fitness');
  const [section, setSection] = useState<'finance' | 'fitness'>(isFitnessRoute ? 'fitness' : 'finance');

  useEffect(() => {
    if (location.pathname.startsWith('/fitness')) setSection('fitness');
    else if (location.pathname !== '/settings') setSection('finance');
  }, [location.pathname]);

  const handleSectionChange = (s: 'finance' | 'fitness') => {
    startTransition(() => {
      setSection(s);
      if (s === 'finance') navigate('/');
      else navigate('/fitness');
    });
    if (onClose) onClose();
  };

  const handleLogout = () => {
    startTransition(() => {
      logout();
      navigate('/login');
    });
    if (onClose) onClose();
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return parts[0].charAt(0).toUpperCase();
  };

  return (
    <>
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={onClose}
      />
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isOpen ? 'mobile-open' : ''}`}>
        <button 
          className="sidebar-close-mobile"
          onClick={onClose}
        >
          ×
        </button>
        <button 
          className="sidebar-toggle" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? '›' : '‹'}
        </button>

        <div className="sidebar-logo">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
            <span className="logo-emoji" style={{ fontSize: '28px' }}>🌴</span> 
            {!isCollapsed && <span>OmniHub</span>}
          </h1>
          {!isCollapsed && <span>Life Management</span>}
        </div>

        <div style={{ 
          display: 'flex', 
          backgroundColor: 'var(--bg-card)', 
          borderRadius: 8, 
          padding: 4, 
          margin: isCollapsed ? '0 10px 16px' : '0 10px 16px 10px',
          flexDirection: isCollapsed ? 'column' : 'row',
          gap: isCollapsed ? '4px' : '0'
        }}>
          {(['finance', 'fitness'] as const).map(s => (
            <button key={s} onClick={() => handleSectionChange(s)} style={{
              flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: isCollapsed ? 16 : 12, fontWeight: 600,
              backgroundColor: section === s ? '#C9A84C' : 'transparent',
              color: section === s ? 'white' : 'var(--text-muted)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }} title={isCollapsed ? (s === 'finance' ? 'Finance' : 'Fitness') : ''}>
              {s === 'finance' ? (isCollapsed ? '💰' : '💰 Finance') : (isCollapsed ? '💪' : '💪 Fitness')}
            </button>
          ))}
        </div>

        <nav>
          {section === 'finance' ? (
            <>
              <NavLink title="Dashboard" to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => onClose && onClose()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
                {!isCollapsed && <span>Dashboard</span>}
              </NavLink>
              <NavLink title="Transactions" to="/transactions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => onClose && onClose()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                {!isCollapsed && <span>Transactions</span>}
              </NavLink>
              <NavLink title="Budgets" to="/budgets" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => onClose && onClose()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                {!isCollapsed && <span>Budgets</span>}
              </NavLink>
              <NavLink title="Analytics" to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => onClose && onClose()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                {!isCollapsed && <span>Analytics</span>}
              </NavLink>
            </>
          ) : (
            <>
              <NavLink title="Dashboard" to="/fitness" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => onClose && onClose()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
                {!isCollapsed && <span>Dashboard</span>}
              </NavLink>
              <NavLink title="Workout Log" to="/fitness/workout" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => onClose && onClose()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 4v16M18 4v16M2 8h4M18 8h4M2 16h4M18 16h4"/>
                </svg>
                {!isCollapsed && <span>Workout Log</span>}
              </NavLink>
              <NavLink title="Exercises" to="/fitness/exercises" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => onClose && onClose()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                {!isCollapsed && <span>Exercises</span>}
              </NavLink>
              <NavLink title="Weekly Plan" to="/fitness/weekly-plan" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => onClose && onClose()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {!isCollapsed && <span>Weekly Plan</span>}
              </NavLink>
              <NavLink title="Weight" to="/fitness/weight" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => onClose && onClose()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                {!isCollapsed && <span>Weight</span>}
              </NavLink>
            </>
          )}

          <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
            <NavLink title="Settings" to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => onClose && onClose()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              {!isCollapsed && <span>Settings</span>}
            </NavLink>
          </div>
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-name">
            {isCollapsed ? getInitials(user?.fullName || '') : user?.fullName}
          </div>
          {!isCollapsed && <div className="sidebar-user-email">{user?.email}</div>}
          <button className="logout-btn" onClick={handleLogout} title={isCollapsed ? "Sign Out" : ""}>
            <svg style={{ width: 14, height: 14, display: isCollapsed ? 'block' : 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

import React, { useState, useRef, useTransition } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { authApi } from '../services/api';
import {
  Wallet, Activity, CheckSquare, LayoutDashboard,
  ArrowLeftRight, Target, BarChart2, Tag, Building2,
  CalendarClock, Percent, Users, TrendingUp, Landmark, PieChart,
  RefreshCw, Shield, Car, FileDown, Dumbbell,
  CalendarDays, Scale, Footprints, Calendar, Sun,
  FileText, Lightbulb, Settings2, LogOut, ChevronDown,
  Eye, EyeOff, KeyRound, Mail, Camera, Check, Pencil,
} from 'lucide-react';

const TopNav: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const picInputRef = useRef<HTMLInputElement>(null);

  // ── Profile panel state ──────────────────────────────────────────────────
  const [showProfile, setShowProfile]   = useState(false);
  const [currentPw, setCurrentPw]       = useState('');
  const [newPw, setNewPw]               = useState('');
  const [confirmPw, setConfirmPw]       = useState('');
  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNew, setShowNew]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [pwSaving, setPwSaving]         = useState(false);
  const [pwMsg, setPwMsg]               = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [forgotSent, setForgotSent]     = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  // Name editing
  const [editingName, setEditingName]   = useState(false);
  const [nameValue, setNameValue]       = useState('');
  const [nameSaving, setNameSaving]     = useState(false);
  // Picture
  const [picUploading, setPicUploading] = useState(false);

  const isSsoUser = !!(user?.oauthProvider && user.oauthProvider !== '');

  const openProfile = () => {
    setShowProfile(true);
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setPwMsg(null); setForgotSent(false);
    setShowCurrent(false); setShowNew(false); setShowConfirm(false);
    setEditingName(false); setNameValue(user?.fullName || '');
    setMobileOpen(false);
  };

  const handleSaveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === user?.fullName) { setEditingName(false); return; }
    setNameSaving(true);
    try {
      await authApi.updateProfile({ fullName: trimmed });
      updateUser({ fullName: trimmed });
      setEditingName(false);
    } catch {}
    finally { setNameSaving(false); }
  };

  const handlePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 220;
        let w = img.width, h = img.height;
        if (w > h) { if (w > max) { h = Math.round((h * max) / w); w = max; } }
        else        { if (h > max) { w = Math.round((w * max) / h); h = max; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        const base64 = canvas.toDataURL('image/jpeg', 0.82);
        setPicUploading(true);
        authApi.updateProfile({ profilePicture: base64 })
          .then(() => updateUser({ profilePicture: base64 }))
          .catch(() => {})
          .finally(() => { setPicUploading(false); if (picInputRef.current) picInputRef.current.value = ''; });
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) { setPwMsg({ text: 'Passwords do not match', type: 'error' }); return; }
    if (newPw.length < 8)    { setPwMsg({ text: 'Minimum 8 characters', type: 'error' }); return; }
    setPwSaving(true);
    try {
      if (isSsoUser) {
        await authApi.setPassword(newPw);
        setPwMsg({ text: 'Password set successfully!', type: 'success' });
      } else {
        await authApi.changePassword(currentPw, newPw);
        setPwMsg({ text: 'Password updated successfully!', type: 'success' });
        setCurrentPw('');
      }
      setNewPw(''); setConfirmPw('');
    } catch (err: any) {
      setPwMsg({ text: err.response?.data?.error || 'Failed to update password', type: 'error' });
    } finally { setPwSaving(false); }
  };

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    setForgotLoading(true);
    try {
      await authApi.forgotPassword(user.email);
    } catch { /* intentionally silent */ } finally {
      setForgotSent(true);
      setForgotLoading(false);
    }
  };

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
    { to: '/finance/debt/emi',      label: 'EMI Based Loans',       icon: <CalendarClock size={14} strokeWidth={1.75} />, end: false },
    { to: '/finance/debt/annual',   label: 'Annual Interest Loans', icon: <Percent       size={14} strokeWidth={1.75} />, end: false },
    { to: '/finance/debt/borrowed', label: 'Borrowed',              icon: <Users         size={14} strokeWidth={1.75} />, end: false },
  ];

  const incomeExpenseSubLinks = [
    { to: '/transactions',           label: 'Transactions', icon: <ArrowLeftRight size={14} strokeWidth={1.75} />, end: false },
    { to: '/budgets',                label: 'Budgets',      icon: <Target         size={14} strokeWidth={1.75} />, end: true  },
    { to: '/analytics',              label: 'Analytics',    icon: <BarChart2      size={14} strokeWidth={1.75} />, end: false },
    { to: '/finance/categories',     label: 'Categories',   icon: <Tag            size={14} strokeWidth={1.75} />, end: false },
    { to: '/accounts',               label: 'Accounts',     icon: <Building2      size={14} strokeWidth={1.75} />, end: false },
  ];

  const fitnessLinks = [
    { to: '/fitness',             label: t('nav.dashboard'),    icon: <LayoutDashboard size={14} strokeWidth={1.75} />, end: true  },
    { to: '/fitness/workout',     label: t('nav.workout'),      icon: <Dumbbell        size={14} strokeWidth={1.75} />, end: false },
    { to: '/fitness/weekly-plan', label: t('nav.weeklyPlan'),   icon: <CalendarDays    size={14} strokeWidth={1.75} />, end: false },
    { to: '/fitness/weight',      label: t('nav.weightTracker'),icon: <Scale           size={14} strokeWidth={1.75} />, end: false },
    { to: '/fitness/steps',       label: t('nav.stepsRun'),     icon: <Footprints      size={14} strokeWidth={1.75} />, end: false },
  ];

  const focusLinks = [
    { to: '/productivity',             label: 'Dashboard',  icon: <LayoutDashboard size={14} strokeWidth={1.75} />, end: true  },
    { to: '/productivity/calendar',    label: 'Calendar',   icon: <Calendar        size={14} strokeWidth={1.75} />, end: false },
    { to: '/productivity/today',       label: 'Today',      icon: <Sun             size={14} strokeWidth={1.75} />, end: false },
    { to: '/productivity/tasks',       label: 'Tasks',      icon: <CheckSquare     size={14} strokeWidth={1.75} />, end: false },
    { to: '/productivity/templates',   label: 'Templates',  icon: <FileText        size={14} strokeWidth={1.75} />, end: false },
    { to: '/productivity/insights',    label: 'Insights',   icon: <Lightbulb       size={14} strokeWidth={1.75} />, end: false },
  ];

  return (
    <>
      <header className="top-nav">
        <div className="top-nav-inner">

          {/* Logo */}
          <NavLink to="/home" className="top-nav-logo" onClick={closeMenu}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>🌴</span>
            <span className="top-nav-logo-text">OmniHub</span>
          </NavLink>

          {/* Desktop nav */}
          <nav className="top-nav-links">

            {/* Finance dropdown */}
            <div className="top-nav-dropdown">
              <button className="top-nav-item top-nav-dropdown-trigger">
                <Wallet size={15} strokeWidth={2} /> {t('nav.finance')}
                <ChevronDown size={11} strokeWidth={2.5} className="top-nav-chevron" />
              </button>
              <div className="top-nav-dropdown-menu" style={{ minWidth: 400 }}>
                <div className="top-nav-dropdown-inner" style={{ padding: '8px' }}>

                  <NavLink to="/finance/overview" onClick={closeMenu}
                    className={({ isActive }) => `top-nav-dropdown-item ${isActive ? 'active' : ''}`}
                    style={{ fontWeight: 600 }}>
                    <LayoutDashboard size={14} strokeWidth={1.75} /> Finance Overview
                  </NavLink>

                  <NavLink to="/finance/wealth" onClick={closeMenu}
                    className={({ isActive }) => `top-nav-dropdown-item ${isActive ? 'active' : ''}`}
                    style={{ fontWeight: 600 }}>
                    <PieChart size={14} strokeWidth={1.75} /> Wealth
                  </NavLink>

                  <div className="top-nav-dropdown-divider" />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 4px' }}>
                    {/* Trackers column */}
                    <div>
                      <div className="top-nav-dropdown-section-label">Trackers</div>

                      {/* Income & Expense submenu */}
                      <div className="top-nav-submenu">
                        <NavLink to="/finance/income-expense"
                          className={({ isActive }) => `top-nav-dropdown-item top-nav-submenu-trigger${isActive ? ' active' : ''}`}
                          onClick={closeMenu}>
                          <ArrowLeftRight size={14} strokeWidth={1.75} /> Income &amp; Expense
                          <span style={{ fontSize: 10, opacity: 0.45, marginLeft: 'auto' }}>›</span>
                        </NavLink>
                        <div className="top-nav-submenu-menu">
                          {incomeExpenseSubLinks.map(link => (
                            <NavLink key={link.to} to={link.to} end={link.end}
                              className={({ isActive }) => `top-nav-dropdown-item ${isActive ? 'active' : ''}`}
                              onClick={closeMenu}>
                              {link.icon} {link.label}
                            </NavLink>
                          ))}
                        </div>
                      </div>

                      {/* Debt submenu */}
                      <div className="top-nav-submenu">
                        <NavLink to="/finance/debt" end
                          className={({ isActive }) => `top-nav-dropdown-item top-nav-submenu-trigger${isActive ? ' active' : ''}`}
                          onClick={closeMenu}>
                          <Wallet size={14} strokeWidth={1.75} /> Debt
                          <span style={{ fontSize: 10, opacity: 0.45, marginLeft: 'auto' }}>›</span>
                        </NavLink>
                        <div className="top-nav-submenu-menu">
                          {debtSubLinks.map(link => (
                            <NavLink key={link.to} to={link.to} end={link.end}
                              className={({ isActive }) => `top-nav-dropdown-item ${isActive ? 'active' : ''}`}
                              onClick={closeMenu}>
                              {link.icon} {link.label}
                            </NavLink>
                          ))}
                        </div>
                      </div>

                      {/* Investments submenu */}
                      <div className="top-nav-submenu">
                        <NavLink to="/finance/investments-dashboard"
                          className={({ isActive }) => `top-nav-dropdown-item top-nav-submenu-trigger${isActive ? ' active' : ''}`}
                          onClick={closeMenu}>
                          <TrendingUp size={14} strokeWidth={1.75} /> Investments
                          <span style={{ fontSize: 10, opacity: 0.45, marginLeft: 'auto' }}>›</span>
                        </NavLink>
                        <div className="top-nav-submenu-menu">
                          {[
                            { to: '/finance/investments',    label: 'RD & FD',        icon: <Landmark   size={14} strokeWidth={1.75} />, end: false },
                            { to: '/finance/chit',           label: 'Chit',           icon: <RefreshCw  size={14} strokeWidth={1.75} />, end: true  },
                            { to: '/finance/emergency-fund', label: 'Emergency Fund', icon: <Shield     size={14} strokeWidth={1.75} />, end: false },
                          ].map(link => (
                            <NavLink key={link.to} to={link.to} end={link.end}
                              className={({ isActive }) => `top-nav-dropdown-item ${isActive ? 'active' : ''}`}
                              onClick={closeMenu}>
                              {link.icon} {link.label}
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Manage column */}
                    <div>
                      <div className="top-nav-dropdown-section-label">Manage</div>
                      {[
                        { to: '/vehicles',              label: 'Vehicle Log',   icon: <Car      size={14} strokeWidth={1.75} />, end: false },
                        { to: '/finance/import-export', label: 'Import/Export', icon: <FileDown size={14} strokeWidth={1.75} />, end: false },
                      ].map(l => (
                        <NavLink key={l.to} to={l.to} end={l.end}
                          className={({ isActive }) => `top-nav-dropdown-item ${isActive ? 'active' : ''}`}
                          onClick={closeMenu}>
                          {l.icon} {l.label}
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
                <Activity size={15} strokeWidth={2} /> {t('nav.fitness')}
                <ChevronDown size={11} strokeWidth={2.5} className="top-nav-chevron" />
              </button>
              <div className="top-nav-dropdown-menu">
                <div className="top-nav-dropdown-inner">
                  {fitnessLinks.map(link => (
                    <NavLink key={link.to} to={link.to} end={link.end}
                      className={({ isActive }) => `top-nav-dropdown-item ${isActive ? 'active' : ''}`}>
                      {link.icon} {link.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>

            {/* Focus dropdown */}
            <div className="top-nav-dropdown">
              <button className="top-nav-item top-nav-dropdown-trigger">
                <CheckSquare size={15} strokeWidth={2} /> Focus
                <ChevronDown size={11} strokeWidth={2.5} className="top-nav-chevron" />
              </button>
              <div className="top-nav-dropdown-menu">
                <div className="top-nav-dropdown-inner">
                  {focusLinks.map(link => (
                    <NavLink key={link.to} to={link.to} end={link.end}
                      className={({ isActive }) => `top-nav-dropdown-item ${isActive ? 'active' : ''}`}>
                      {link.icon} {link.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          {/* Right — avatar (desktop) */}
          <div className="top-nav-right">
            <div className="top-nav-user-desktop">
              <div className="top-nav-avatar-wrap">

                {/* Avatar circle */}
                <button className="top-nav-avatar" onClick={openProfile} style={{ overflow: user?.profilePicture ? 'hidden' : undefined, padding: user?.profilePicture ? 0 : undefined }}>
                  {user?.profilePicture
                    ? <img src={user.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : getInitials(user?.fullName || '')}
                </button>

                {/* Hover dropdown — CSS only, no JS state */}
                <div className="top-nav-user-dropdown">
                  <div className="top-nav-user-dropdown-inner">
                    {/* Name + email row → opens profile panel */}
                    <button className="top-nav-user-dropdown-profile" onClick={openProfile}>
                      <div className="top-nav-avatar" style={{ width: 34, height: 34, fontSize: 11, flexShrink: 0, overflow: user?.profilePicture ? 'hidden' : undefined, padding: user?.profilePicture ? 0 : undefined }}>
                        {user?.profilePicture
                          ? <img src={user.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : getInitials(user?.fullName || '')}
                      </div>
                      <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.2 }}>{user?.fullName}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
                        <div style={{ fontSize: 11, color: isSsoUser ? '#6a8fe8' : 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>
                          {isSsoUser ? `via ${user?.oauthProvider}` : 'via Email'}
                        </div>
                      </div>
                    </button>

                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

                    <NavLink to="/settings" onClick={() => setMobileOpen(false)} className="top-nav-user-dropdown-item">
                      <Settings2 size={14} strokeWidth={1.75} /> Settings
                    </NavLink>
                    <button onClick={handleLogout} className="top-nav-user-dropdown-item" style={{ color: 'var(--danger)', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>
                      <LogOut size={14} strokeWidth={1.75} /> Sign Out
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Hamburger — mobile */}
            <button className="top-nav-hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Toggle menu">
              {mobileOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/>
                </svg>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* ── Profile panel ── */}
      {showProfile && (
        <>
          <div onClick={() => setShowProfile(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 600, backdropFilter: 'blur(2px)' }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(400px, 100vw)',
            background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
            zIndex: 601, display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 40px rgba(0,0,0,0.25)', animation: 'slideInRight 0.22s ease',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Profile</span>
              <button onClick={() => setShowProfile(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
            </div>

            {/* Body */}
            <div className="profile-panel-body" style={{ flex: 1, overflowY: 'auto', padding: '24px 22px' }}>

              {/* ── Profile picture ── */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
                <input ref={picInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePicChange} />
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: user?.profilePicture ? 'transparent' : 'linear-gradient(135deg, var(--primary-dark), var(--primary-light))',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 28, overflow: 'hidden',
                    border: '3px solid var(--border)',
                  }}>
                    {user?.profilePicture
                      ? <img src={user.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getInitials(user?.fullName || '')}
                  </div>
                  <button onClick={() => picInputRef.current?.click()} disabled={picUploading}
                    style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--bg-card)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 0, opacity: picUploading ? 0.5 : 1 }}>
                    <Camera size={13} strokeWidth={2} />
                  </button>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center' }}>
                  {picUploading ? 'Uploading…' : 'Click camera to change photo'}
                </div>
              </div>

              {/* ── Name ── */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Name</div>
                {editingName ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input className="input" value={nameValue} autoFocus
                      onChange={e => setNameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                      style={{ flex: '1 1 160px' }} />
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={handleSaveName} disabled={nameSaving}
                        style={{ padding: '0 14px', borderRadius: 9, background: 'var(--primary)', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, height: 40 }}>
                        {nameSaving ? '…' : <><Check size={13} strokeWidth={2.5} /> Save</>}
                      </button>
                      <button onClick={() => setEditingName(false)}
                        style={{ padding: '0 10px', borderRadius: 9, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, height: 40 }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 9 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.fullName}</span>
                    <button onClick={() => { setNameValue(user?.fullName || ''); setEditingName(true); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center' }}>
                      <Pencil size={13} strokeWidth={1.75} />
                    </button>
                  </div>
                )}
              </div>

              {/* ── Email (read-only) ── */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Email</div>
                <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 9, fontSize: 14, color: 'var(--text-secondary)' }}>{user?.email}</div>
              </div>

              {/* ── Login method ── */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Signed in via</div>
                <div style={{ padding: '7px 12px', background: 'var(--bg-elevated)', borderRadius: 9, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: isSsoUser ? '#6a8fe8' : 'var(--primary-light)' }}>
                  {isSsoUser ? user?.oauthProvider : 'Email / Password'}
                </div>
              </div>

              {/* ── Security divider ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <KeyRound size={14} strokeWidth={1.75} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {isSsoUser ? 'Set Password' : 'Change Password'}
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              </div>

              {isSsoUser && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 8, borderLeft: '3px solid #6a8fe8' }}>
                  Set a password to also log in with email.
                </div>
              )}

              {/* Password form */}
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {!isSsoUser && (
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <div style={{ position: 'relative' }}>
                      <input className="input" type={showCurrent ? 'text' : 'password'} value={currentPw}
                        onChange={e => setCurrentPw(e.target.value)} required style={{ paddingRight: 40 }} />
                      <button type="button" onClick={() => setShowCurrent(v => !v)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, lineHeight: 1 }}>
                        {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="input" type={showNew ? 'text' : 'password'} value={newPw}
                      onChange={e => setNewPw(e.target.value)} required style={{ paddingRight: 40 }} />
                    <button type="button" onClick={() => setShowNew(v => !v)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, lineHeight: 1 }}>
                      {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>Min 8 chars, 1 uppercase, 1 number</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="input" type={showConfirm ? 'text' : 'password'} value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)} required style={{ paddingRight: 40 }} />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, lineHeight: 1 }}>
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {pwMsg && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, background: pwMsg.type === 'success' ? 'rgba(138,159,74,0.1)' : 'rgba(192,57,43,0.1)', color: pwMsg.type === 'success' ? 'var(--primary-light)' : 'var(--danger)', border: `1px solid ${pwMsg.type === 'success' ? 'rgba(138,159,74,0.3)' : 'rgba(192,57,43,0.3)'}` }}>
                    {pwMsg.text}
                  </div>
                )}

                <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                  {pwSaving ? 'Saving…' : isSsoUser ? 'Set Password' : 'Update Password'}
                </button>
              </form>

              {/* Forgot password */}
              {!isSsoUser && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                  {forgotSent ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--primary-light)', padding: '10px 14px', background: 'rgba(138,159,74,0.1)', borderRadius: 8, border: '1px solid rgba(138,159,74,0.3)' }}>
                      <Mail size={14} strokeWidth={1.75} /> Reset link sent to {user?.email}
                    </div>
                  ) : (
                    <button onClick={handleForgotPassword} disabled={forgotLoading}
                      style={{ background: 'none', border: 'none', cursor: forgotLoading ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: 0, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, opacity: forgotLoading ? 0.5 : 1 }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary-light)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                      <Mail size={13} strokeWidth={1.75} />
                      {forgotLoading ? 'Sending…' : 'Forgot password? Send reset link'}
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>
        </>
      )}

      {/* Mobile overlay */}
      {mobileOpen && <div className="top-nav-mobile-overlay" onClick={closeMenu} />}
      <div className={`top-nav-mobile-panel${mobileOpen ? ' open' : ''}`}>
        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
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
          <LayoutDashboard size={16} strokeWidth={1.75} /> Finance Overview
        </NavLink>
        <NavLink to="/finance/wealth" onClick={closeMenu}
          className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}>
          <PieChart size={16} strokeWidth={1.75} /> Wealth
        </NavLink>
        <NavLink to="/finance/income-expense" onClick={closeMenu}
          className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}
          style={{ fontWeight: 600, paddingLeft: 20 }}>
          <ArrowLeftRight size={16} strokeWidth={1.75} /> Income &amp; Expense
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
          <Wallet size={16} strokeWidth={1.75} /> Debt
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
          <TrendingUp size={16} strokeWidth={1.75} /> Investments
        </NavLink>
        <NavLink to="/finance/investments" onClick={closeMenu}
          className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}
          style={{ paddingLeft: 36 }}>RD &amp; FD</NavLink>
        <NavLink to="/finance/chit" end onClick={closeMenu}
          className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}
          style={{ paddingLeft: 36 }}>Chit</NavLink>
        <NavLink to="/finance/emergency-fund" onClick={closeMenu}
          className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}
          style={{ paddingLeft: 36 }}>Emergency Fund</NavLink>
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
        <div className="top-nav-mobile-section">
          <Activity size={14} strokeWidth={2} style={{ flexShrink: 0 }} /> Fitness
        </div>
        {fitnessLinks.map(link => (
          <NavLink key={link.to} to={link.to} end={link.end} onClick={closeMenu}
            className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}>
            {link.icon} {link.label}
          </NavLink>
        ))}

        {/* Focus */}
        <div className="top-nav-mobile-section">
          <CheckSquare size={14} strokeWidth={2} style={{ flexShrink: 0 }} /> Focus
        </div>
        {focusLinks.map(link => (
          <NavLink key={link.to} to={link.to} end={link.end} onClick={closeMenu}
            className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}>
            {link.icon} {link.label}
          </NavLink>
        ))}

        {/* Bottom */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
          <button onClick={openProfile} className="top-nav-mobile-link" style={{ width: '100%', textAlign: 'left' }}>
            <KeyRound size={16} strokeWidth={1.75} /> Profile
          </button>
          <NavLink to="/settings" onClick={closeMenu}
            className={({ isActive }) => `top-nav-mobile-link${isActive ? ' active' : ''}`}>
            <Settings2 size={16} strokeWidth={1.75} /> {t('nav.settings')}
          </NavLink>
          <button onClick={handleLogout} className="top-nav-mobile-link" style={{ color: 'var(--danger)', width: '100%', textAlign: 'left' }}>
            <LogOut size={16} strokeWidth={1.75} /> {t('nav.signOut')}
          </button>
        </div>
      </div>
    </>
  );
};

export default TopNav;

import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
  <div
    onClick={onChange}
    style={{
      width: 52, height: 28, borderRadius: 14, cursor: 'pointer',
      backgroundColor: value ? 'var(--primary)' : 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      position: 'relative', transition: 'background-color 0.2s',
      flexShrink: 0,
    }}
  >
    <div style={{
      width: 22, height: 22, borderRadius: '50%', backgroundColor: 'white',
      position: 'absolute', top: 3,
      left: value ? 27 : 3,
      transition: 'left 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    }} />
  </div>
);

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState({
    enabled: false,
    sendTime: '08:00',
    includeFinance: true,
    includeFitness: true,
    includeBudgetAlerts: true,
    includeWeeklyPlan: true,
  });
  const [customEmail, setCustomEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    api.get('/notifications/email-settings')
      .then(r => {
        setSettings({
          enabled: r.data.enabled,
          sendTime: r.data.sendTime?.slice(0, 5) || '08:00',
          includeFinance: r.data.includeFinance,
          includeFitness: r.data.includeFitness,
          includeBudgetAlerts: r.data.includeBudgetAlerts,
          includeWeeklyPlan: r.data.includeWeeklyPlan,
        });
        setCustomEmail(r.data.customEmail || r.data.user?.email || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/notifications/email-settings', { ...settings, customEmail });
      setMessage({ text: '✅ Settings saved successfully!', type: 'success' });
    } catch {
      setMessage({ text: '❌ Failed to save settings.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const r = await api.post('/notifications/email-settings/test');
      setMessage({ text: r.data, type: 'success' });
    } catch {
      setMessage({ text: '❌ Failed to send test email.', type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const toggle = (key: keyof typeof settings) =>
    setSettings(p => ({ ...p, [key]: !p[key] }));

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 40 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your daily email notifications</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 4 }}>📧 Daily Email Notifications</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Receive a daily summary to your email</p>
          </div>
          <Toggle value={settings.enabled} onChange={() => toggle('enabled')} />
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">SEND TIME (IST)</label>
          <input
            type="time"
            className="input"
            value={settings.sendTime}
            onChange={e => setSettings(p => ({ ...p, sendTime: e.target.value }))}
            style={{ maxWidth: 200 }}
          />
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
            Format: HH:MM (e.g. 08:30 for 8:30 AM)
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">SEND EMAIL TO</label>
          <input
            type="email"
            className="input"
            value={customEmail}
            onChange={e => setCustomEmail(e.target.value)}
            placeholder="your@email.com"
          />
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
            Leave as your account email or enter a different one
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 20 }}>📋 What to Include</h3>

        {[
          { key: 'includeFinance' as const, label: '💰 Finance Summary', desc: 'Monthly income, expenses and balance' },
          { key: 'includeBudgetAlerts' as const, label: '🎯 Budget Alerts', desc: 'Warnings when over 80% of budget' },
          { key: 'includeFitness' as const, label: '💪 Fitness Summary', desc: 'Total workouts and latest weight' },
          { key: 'includeWeeklyPlan' as const, label: "📅 Today's Plan", desc: 'Your workout plan for today' },
        ].map(item => (
          <div key={item.key} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 0', borderBottom: '1px solid var(--border)',
          }}>
            <div>
              <p style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: 2 }}>{item.label}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.desc}</p>
            </div>
            <Toggle value={settings[item.key]} onChange={() => toggle(item.key)} />
          </div>
        ))}
      </div>

      {message && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 16,
          backgroundColor: message.type === 'success' ? 'rgba(138,159,74,0.1)' : 'rgba(192,57,43,0.1)',
          color: message.type === 'success' ? 'var(--primary)' : 'var(--danger)',
          border: `1px solid ${message.type === 'success' ? 'rgba(138,159,74,0.3)' : 'rgba(192,57,43,0.3)'}`,
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={save} disabled={saving}>
          {saving ? 'Saving...' : '💾 Save Settings'}
        </button>
        <button className="btn btn-secondary" onClick={sendTest} disabled={testing}>
          {testing ? 'Sending...' : '📧 Send Test Email'}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;

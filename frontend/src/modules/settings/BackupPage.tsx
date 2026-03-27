import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface BackupLog {
  id: number;
  fileName: string;
  drivePath: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage: string | null;
  fileSizeBytes: number | null;
  transactionCount: number;
  budgetCount: number;
  workoutCount: number;
  weightCount: number;
  backedUpAt: string;
  dataDate: string;
  driveFileId: string;
}

interface BackupStats {
  total: number;
  successful: number;
  failed: number;
  totalBytes: number;
  latest: BackupLog | null;
}

interface BackupSettings {
  enabled: boolean;
  backupTime: string; // "HH:mm:ss"
}

const formatBytes = (bytes: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(1) + ' KB';
};

const formatTime = (dateStr: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST';
};

const BackupPage: React.FC = () => {
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState<BackupSettings>({ enabled: true, backupTime: '00:00:00' });
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, logsRes, settingsRes] = await Promise.all([
        api.get('/backup/stats'),
        api.get('/backup/logs'),
        api.get('/backup/settings'),
      ]);
      setStats(statsRes.data);
      setLogs(logsRes.data);
      setSettings(settingsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (patch: Partial<BackupSettings>) => {
    setSettingsSaving(true);
    try {
      const updated = { ...settings, ...patch };
      await api.put('/backup/settings', updated);
      setSettings(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSettingsSaving(false);
    }
  };

  const runBackup = async () => {
    setRunning(true);
    setMessage('');
    try {
      await api.post('/backup/run');
      setMessage('Backup completed successfully!');
      fetchData();
    } catch (e) {
      setMessage('Backup failed. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  const downloadBackup = async (id: number, fileName: string) => {
    try {
      const res = await api.get(`/backup/download/${id}`);
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Download failed');
    }
  };

  const toggle = (id: number) => setExpanded(expanded === id ? null : id);

  if (loading) return <div style={{ padding: 44 }}><p className="page-subtitle">Loading...</p></div>;

  const latest = stats?.latest;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Backup Centre</h1>
          <p className="page-subtitle">Auto-runs at 12:00 AM IST · OneDrive</p>
        </div>
        <button className="btn btn-primary" onClick={runBackup} disabled={running}>
          {running ? 'Running...' : 'Run backup now'}
        </button>
      </div>

      {message && (
        <div className={message.includes('success') ? 'badge badge-success' : 'error-msg'}
          style={{ display: 'block', marginBottom: 20, padding: '10px 16px', borderRadius: 10, fontSize: 14 }}>
          {message}
        </div>
      )}

      {/* Settings */}
      <div className="card" style={{ marginBottom: 24, padding: '18px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Automatic backup</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {settings.enabled ? `Runs daily at ${settings.backupTime.slice(0, 5)} IST` : 'Disabled — no automatic backups will run'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {settings.enabled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Time</label>
                <input
                  type="time"
                  value={settings.backupTime.slice(0, 5)}
                  onChange={e => saveSettings({ backupTime: e.target.value + ':00' })}
                  style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer' }}
                />
              </div>
            )}
            <button
              onClick={() => saveSettings({ enabled: !settings.enabled })}
              disabled={settingsSaving}
              style={{
                padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                background: settings.enabled ? 'rgba(224,92,106,0.15)' : 'var(--primary-dim)',
                color: settings.enabled ? '#ef4444' : 'var(--primary-light)',
                transition: 'all 0.15s',
              }}
            >
              {settingsSaving ? '...' : settings.enabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Last backup</div>
          <div className="stat-value" style={{ fontSize: 22, color: latest?.status === 'SUCCESS' ? 'var(--primary-light)' : '#e05555' }}>
            {latest?.status || '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {latest ? formatTime(latest.backedUpAt) : 'No backups yet'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total backups</div>
          <div className="stat-value">{stats?.successful || 0}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {stats?.failed || 0} failed
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Drive storage</div>
          <div className="stat-value">{formatBytes(stats?.totalBytes || 0)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>used so far</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Next backup</div>
          <div className="stat-value" style={{ fontSize: 22, color: settings.enabled ? undefined : 'var(--text-muted)' }}>
            {settings.enabled ? 'Tonight' : 'Disabled'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {settings.enabled ? `${settings.backupTime.slice(0, 5)} IST` : 'Enable to schedule'}
          </div>
        </div>
      </div>

      {/* Latest backup banner */}
      {latest && latest.status === 'SUCCESS' && (
        <div style={{
          background: 'var(--bg-card)', border: '2px solid var(--primary)',
          borderRadius: 16, padding: '18px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 16
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: 'var(--primary-dim)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: 'var(--primary-light)', flexShrink: 0
          }}>✓</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
              Latest backup · backed up on {formatTime(latest.backedUpAt)}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {latest.fileName} · contains data up to {latest.dataDate}
            </div>
            <div style={{ fontSize: 12, color: 'var(--primary-light)', marginTop: 2 }}>
              {formatBytes(latest.fileSizeBytes || 0)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'monospace' }}>
              {latest.drivePath}{latest.fileName}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => downloadBackup(latest.id, latest.fileName)}>
              Download
            </button>
          </div>
        </div>
      )}

      {/* History log */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
            Backup history
          </h2>
        </div>

        {logs.filter(l => l.status === 'SUCCESS' || l.status === 'FAILED').length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No backups yet</div>
        ) : (
          logs.map(log => (
            <div key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {/* Row header */}
              <div
                onClick={() => toggle(log.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 24px', cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{
                  fontSize: 12, color: 'var(--text-muted)',
                  transform: expanded === log.id ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s', display: 'inline-block', width: 16
                }}>›</span>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: log.status === 'SUCCESS' ? 'var(--primary-light)' : '#e05555',
                  border: `1.5px solid ${log.status === 'SUCCESS' ? 'var(--primary)' : '#c0392b'}`
                }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {log.fileName || '—'}
                  </div>
                  {log.drivePath && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
                      {log.drivePath}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 160 }}>
                  {formatTime(log.backedUpAt)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 50, textAlign: 'right' }}>
                  {formatBytes(log.fileSizeBytes || 0)}
                </div>
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
                  background: log.status === 'SUCCESS' ? 'var(--primary-dim)' : 'rgba(192,57,43,0.12)',
                  color: log.status === 'SUCCESS' ? 'var(--primary-light)' : '#e05555'
                }}>
                  {log.status}
                </span>
              </div>

              {/* Expanded panel */}
              {expanded === log.id && (
                <div style={{ padding: '0 24px 20px 52px' }}>
                  <div style={{
                    background: 'var(--bg-elevated)', borderRadius: 12, padding: 16
                  }}>
                    {log.status === 'FAILED' ? (
                      <>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 6 }}>Error</div>
                        <div style={{ fontSize: 13, color: '#e05555', marginBottom: 14 }}>{log.errorMessage}</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 6 }}>Drive path</div>
                        <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-primary)', marginBottom: 14 }}>
                          {log.drivePath}{log.fileName}
                        </div>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 10 }}>Data snapshot</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                          {[
                            { label: 'Transactions', value: log.transactionCount },
                            { label: 'Budgets', value: log.budgetCount },
                            { label: 'Workout logs', value: log.workoutCount },
                            { label: 'Weight logs', value: log.weightCount },
                          ].map(item => (
                            <div key={item.label} style={{
                              background: 'var(--bg-card)', border: '1px solid var(--border)',
                              borderRadius: 10, padding: '10px 14px'
                            }}>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {log.status === 'SUCCESS' && (
                        <button className="btn btn-primary" onClick={() => downloadBackup(log.id, log.fileName)}>
                          Download JSON
                        </button>
                      )}
                      {log.status === 'FAILED' && (
                        <button className="btn btn-secondary" onClick={runBackup}>
                          Retry backup
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BackupPage;

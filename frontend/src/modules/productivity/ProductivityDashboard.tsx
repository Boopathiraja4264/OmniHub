import React, { useState, useEffect } from 'react';
import { productivityApi } from '../../services/api';
import { ProductivityDashboard as DashboardData } from '../../types';

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        flex:         1,
        minWidth:     '140px',
        padding:      '18px 20px',
        borderRadius: '10px',
        border:       '1px solid var(--border)',
        background:   'var(--bg-card)',
        display:      'flex',
        flexDirection:'column',
        gap:          '6px',
      }}
    >
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '28px', fontWeight: 700, color: color ?? 'inherit', lineHeight: 1.1 }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sub}</span>}
    </div>
  );
}

const ProductivityDashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    productivityApi
      .getDashboard()
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#e05c6a' }}>
        {error ?? 'No data'}
      </div>
    );
  }

  const todayScore   = data.todayScore?.totalScore ?? 0;
  const scoreColor   = todayScore >= 85 ? '#4caf82' : todayScore >= 70 ? '#c9a84c' : '#e09c5c';
  const streakColor  = data.currentStreak > 0 ? '#e09c5c' : 'var(--text-muted)';
  const adherencePct = Math.round(data.todayAdherence * 100);

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Productivity Overview</h2>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <StatCard
          label="Today's Focus Score"
          value={todayScore}
          sub={data.todayScore?.label ?? '—'}
          color={scoreColor}
        />
        <StatCard
          label="7-Day Avg Score"
          value={Math.round(data.weekAvgScore)}
          sub="last 7 days"
          color="#6a8fe8"
        />
        <StatCard
          label="Current Streak"
          value={
            <span>
              {data.currentStreak}
              <span style={{ fontSize: '20px', marginLeft: '4px' }}>🔥</span>
            </span>
          }
          sub={data.currentStreak === 1 ? '1 day' : `${data.currentStreak} days`}
          color={streakColor}
        />
        <StatCard
          label="Today Adherence"
          value={`${adherencePct}%`}
          sub="blocks completed"
          color={adherencePct >= 80 ? '#4caf82' : adherencePct >= 50 ? '#c9a84c' : '#e05c6a'}
        />
      </div>

      {/* Bottom two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        {/* Today's blocks progress */}
        <div
          style={{
            padding:      '18px 20px',
            borderRadius: '10px',
            border:       '1px solid var(--border)',
            background:   'var(--bg-card)',
            display:      'flex',
            flexDirection:'column',
            gap:          '14px',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
            Today's Blocks
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: '#4caf82' }}>
              {data.todayBlocksDone}
            </span>
            <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>
              / {data.todayBlocksTotal}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '4px' }}>
              done
            </span>
          </div>

          {/* Progress bar */}
          <div
            style={{
              height:       '8px',
              borderRadius: '4px',
              background:   'var(--border-subtle, rgba(255,255,255,0.06))',
              overflow:     'hidden',
            }}
          >
            <div
              style={{
                height:       '100%',
                borderRadius: '4px',
                background:   '#4caf82',
                width:        data.todayBlocksTotal > 0
                  ? `${(data.todayBlocksDone / data.todayBlocksTotal) * 100}%`
                  : '0%',
                transition:   'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Tasks + timer status */}
        <div
          style={{
            padding:      '18px 20px',
            borderRadius: '10px',
            border:       '1px solid var(--border)',
            background:   'var(--bg-card)',
            display:      'flex',
            flexDirection:'column',
            gap:          '14px',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
            Tasks & Timer
          </span>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: '#a874d4' }}>
              {data.pendingTasks}
            </span>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>pending tasks</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width:        '10px',
                height:       '10px',
                borderRadius: '50%',
                background:   data.timerRunning ? '#4caf82' : '#8c8a96',
                flexShrink:   0,
              }}
            />
            <span
              style={{
                fontSize:   '13px',
                fontWeight: 500,
                color:      data.timerRunning ? '#4caf82' : 'var(--text-muted)',
              }}
            >
              {data.timerRunning ? 'Timer Running' : 'No active timer'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductivityDashboardPage;

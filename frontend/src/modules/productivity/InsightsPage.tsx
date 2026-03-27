import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { productivityApi } from '../../services/api';
import { ScoreSeriesPoint, AdherenceDataPoint, FocusScoreResponse } from '../../types';

type ScoreView = 'daily' | 'weekly' | 'monthly';

const scoreColor = (score: number) => {
  if (score >= 85) return '#4caf82';
  if (score >= 70) return '#c9a84c';
  if (score >= 50) return '#e09c5c';
  return '#e05c6a';
};

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const fmtMonth = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short' });
};

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload?.score) return null;
  return <circle cx={cx} cy={cy} r={4} fill={scoreColor(payload.score)} stroke="var(--bg-card)" strokeWidth={2} />;
};

const ScoreTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ScoreSeriesPoint;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{fmtDate(d.date)}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: scoreColor(d.score) }}>{Number(d.score).toFixed(1)}</div>
      <div style={{ fontSize: 11, color: scoreColor(d.score), fontWeight: 600 }}>{d.label}</div>
    </div>
  );
};

const AdherenceTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ fontSize: 13, color: p.fill, fontWeight: 600, marginBottom: 2 }}>
          {p.name}: {p.value}m
        </div>
      ))}
      {payload.length === 2 && payload[0].value > 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          {Math.round((payload[1].value / payload[0].value) * 100)}% adherence
        </div>
      )}
    </div>
  );
};

const InsightsPage: React.FC = () => {
  const [scoreView, setScoreView]       = useState<ScoreView>('daily');
  const [scoreSeries, setScoreSeries]   = useState<ScoreSeriesPoint[]>([]);
  const [adherence, setAdherence]       = useState<AdherenceDataPoint[]>([]);
  const [todayScore, setTodayScore]     = useState<FocusScoreResponse | null>(null);
  const [loadingScore, setLoadingScore] = useState(true);
  const [loadingAdh, setLoadingAdh]     = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const year  = new Date().getFullYear();

  const loadTodayScore = useCallback(() => {
    productivityApi.getFocusScore(today)
      .then(r => setTodayScore(r.data))
      .catch(console.error);
  }, [today]);

  const loadScoreSeries = useCallback(() => {
    setLoadingScore(true);
    const p =
      scoreView === 'daily'   ? productivityApi.getDailyScoreSeries(
          new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0], today)
      : scoreView === 'weekly'  ? productivityApi.getWeeklyScoreSeries(year)
      : productivityApi.getMonthlyScoreSeries(year);
    p.then(r => setScoreSeries(r.data))
     .catch(console.error)
     .finally(() => setLoadingScore(false));
  }, [scoreView, today, year]);

  const loadAdherence = useCallback(() => {
    setLoadingAdh(true);
    const from = new Date(Date.now() - 13 * 86400000).toISOString().split('T')[0];
    productivityApi.getAdherence(from, today)
      .then(r => setAdherence(r.data))
      .catch(console.error)
      .finally(() => setLoadingAdh(false));
  }, [today]);

  useEffect(() => { loadTodayScore(); loadAdherence(); }, [loadTodayScore, loadAdherence]);
  useEffect(() => { loadScoreSeries(); }, [loadScoreSeries]);

  const scoreChartData = scoreSeries.map(p => ({
    ...p,
    date: scoreView === 'monthly' ? fmtMonth(p.date) : fmtDate(p.date),
    score: Number(p.score),
  }));

  const adherenceChartData = adherence.map(p => ({
    date: fmtDate(p.date),
    Planned: p.plannedMinutes,
    Logged: p.loggedMinutes,
  }));

  const avgScore = scoreSeries.length > 0
    ? scoreSeries.reduce((s, p) => s + Number(p.score), 0) / scoreSeries.length
    : 0;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Insights</h2>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Track your focus score trends and schedule adherence.
        </div>
      </div>

      {/* Today's score summary */}
      {todayScore && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 4 }}>Today's FocusScore</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: scoreColor(todayScore.totalScore), lineHeight: 1 }}>
              {Number(todayScore.totalScore).toFixed(1)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: scoreColor(todayScore.totalScore), marginTop: 4 }}>{todayScore.label}</div>
          </div>
          <div style={{ width: 1, height: 48, background: 'var(--border)' }} />
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Tasks', value: `${todayScore.tasksDone}/${todayScore.tasksPlanned}` },
              { label: 'Blocks', value: `${todayScore.blocksDone}/${todayScore.blocksPlanned}` },
              { label: 'Adherence', value: `${Math.round(todayScore.adherenceRate * 100)}%` },
              { label: 'Streak', value: `🔥 ${todayScore.streakDays}d` },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Score legend */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { range: '85–100', label: 'Excellent', color: '#4caf82' },
              { range: '70–84',  label: 'Good',      color: '#c9a84c' },
              { range: '50–69',  label: 'Fair',       color: '#e09c5c' },
              { range: '<50',    label: 'Poor',       color: '#e05c6a' },
            ].map(b => (
              <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color, display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FocusScore Chart */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '20px 24px', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>FocusScore Trend</div>
            {!loadingScore && scoreSeries.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Avg: <strong style={{ color: scoreColor(avgScore) }}>{avgScore.toFixed(1)}</strong> over this period
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['daily', 'weekly', 'monthly'] as ScoreView[]).map(v => (
              <button key={v} onClick={() => setScoreView(v)} style={{
                padding: '5px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: scoreView === v ? '#C9A84C' : 'var(--bg)',
                color: scoreView === v ? '#fff' : 'var(--text-muted)',
              }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loadingScore ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : scoreChartData.length === 0 ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            No data yet — complete some daily plans to see your score trend.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={scoreChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#C9A84C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C9A84C" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" tick={{ fill: '#8c8a96', fontSize: 11 }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#8c8a96', fontSize: 11 }} tickLine={false} />
              <Tooltip content={<ScoreTooltip />} />
              {/* Reference bands */}
              <ReferenceLine y={85} stroke="#4caf82" strokeDasharray="4 4" strokeOpacity={0.5} />
              <ReferenceLine y={70} stroke="#c9a84c" strokeDasharray="4 4" strokeOpacity={0.5} />
              <ReferenceLine y={50} stroke="#e09c5c" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Area
                type="monotone" dataKey="score" stroke="#C9A84C" strokeWidth={2.5}
                fill="url(#scoreGrad)" dot={<CustomDot />} activeDot={{ r: 5, fill: '#C9A84C' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Adherence Chart */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '20px 24px',
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Plan vs Reality — Last 14 Days</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>
          Planned minutes (blue) vs actual time logged (green) per day.
        </div>

        {loadingAdh ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : adherenceChartData.length === 0 ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            No data yet — start logging time to see adherence.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={adherenceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={3} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" tick={{ fill: '#8c8a96', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: '#8c8a96', fontSize: 11 }} tickLine={false} />
              <Tooltip content={<AdherenceTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#8c8a96' }} />
              <Bar dataKey="Planned" fill="#6a8fe8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Logged"  fill="#4caf82" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Category breakdown table */}
        {adherence.length > 0 && (() => {
          const latest = adherence[adherence.length - 1];
          return Object.keys(latest.byCategory).length > 0 ? (
            <div style={{ marginTop: 20, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 10 }}>
                Latest Day — Category Breakdown
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {Object.entries(latest.byCategory).map(([cat, data]) => (
                  <div key={cat} style={{
                    flex: 1, minWidth: 120, padding: '10px 14px', borderRadius: 8,
                    background: 'var(--bg)', border: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                      {cat.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{data.loggedMinutes}m</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>of {data.plannedMinutes}m planned</div>
                    {data.plannedMinutes > 0 && (
                      <div style={{ marginTop: 6, background: 'var(--border)', borderRadius: 999, height: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 999, background: '#4caf82',
                          width: `${Math.min(100, Math.round((data.loggedMinutes / data.plannedMinutes) * 100))}%`,
                        }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
};

export default InsightsPage;

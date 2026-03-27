import React, { useState, useEffect, useCallback } from 'react';
import { productivityApi } from '../../services/api';
import {
  DailyPlan,
  TimeBlock,
  BlockStatus,
  BlockCategory,
  TimeEntry,
} from '../../types';
import TimeBlockCard from './components/TimeBlockCard';
import ActiveTimerBanner from './components/ActiveTimerBanner';

const PLAN_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: 'rgba(140,138,150,0.15)', color: '#8c8a96' },
  ACTIVE:    { bg: 'rgba(106,143,232,0.15)', color: '#6a8fe8' },
  COMPLETED: { bg: 'rgba(76,175,130,0.15)',  color: '#4caf82' },
};

const BLOCK_CATEGORIES: BlockCategory[] = ['PERSONAL', 'PROFESSIONAL', 'DEEP_WORK', 'BREAK', 'ADMIN'];

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(str: string): string {
  return new Date(str + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
}

const TodayPage: React.FC = () => {
  const today = todayStr();

  const [plan, setPlan]           = useState<DailyPlan | null>(null);
  const [loading, setLoading]     = useState(true);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | undefined>(undefined);

  // Quick-add form state
  const [qaTitle, setQaTitle]     = useState('');
  const [qaCategory, setQaCategory] = useState<BlockCategory>('DEEP_WORK');
  const [qaStart, setQaStart]     = useState('');
  const [qaEnd, setQaEnd]         = useState('');
  const [qaLoading, setQaLoading] = useState(false);

  const fetchPlan = useCallback(() => {
    setLoading(true);
    productivityApi
      .getPlan(today)
      .then((res) => setPlan(res.data))
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, [today]);

  const fetchTimer = useCallback(() => {
    productivityApi
      .getActiveTimer()
      .then((res) => setActiveTimer(res.data?.running ? res.data : undefined))
      .catch(() => setActiveTimer(undefined));
  }, []);

  useEffect(() => {
    fetchPlan();
    fetchTimer();
  }, [fetchPlan, fetchTimer]);

  const handleBlockStatusChange = async (id: number, status: BlockStatus) => {
    try {
      await productivityApi.updateBlockStatus(id, status);
      fetchPlan();
    } catch {}
  };

  const handleStartTimer = async (blockId: number) => {
    try {
      await productivityApi.startTimer({ blockId });
      fetchTimer();
    } catch {}
  };

  const handleStopTimer = async () => {
    try {
      await productivityApi.stopTimer();
      setActiveTimer(undefined);
    } catch {}
  };

  const handleGeneratePlan = async () => {
    if (!plan) return;
    try {
      await productivityApi.generatePlan(plan.id);
      fetchPlan();
    } catch {}
  };

  const handleMarkComplete = async () => {
    if (!plan) return;
    try {
      await productivityApi.updatePlan(plan.id, { status: 'COMPLETED' });
      fetchPlan();
    } catch {}
  };

  const handleDeferIncomplete = async () => {
    if (!plan) return;
    try {
      await productivityApi.deferIncomplete(plan.id);
      fetchPlan();
    } catch {}
  };

  const handleQuickAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !qaTitle.trim() || !qaStart || !qaEnd) return;
    setQaLoading(true);
    try {
      await productivityApi.addBlock(plan.id, {
        title:     qaTitle.trim(),
        category:  qaCategory,
        startTime: qaStart,
        endTime:   qaEnd,
      });
      setQaTitle('');
      setQaStart('');
      setQaEnd('');
      fetchPlan();
    } catch {
    } finally {
      setQaLoading(false);
    }
  };

  const sortedBlocks = plan
    ? [...plan.timeBlocks].sort((a: TimeBlock, b: TimeBlock) =>
        a.startTime.localeCompare(b.startTime)
      )
    : [];

  const isTimerActive = !!activeTimer;

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading today's plan…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <ActiveTimerBanner entry={activeTimer} onStop={handleStopTimer} />

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
              Today's Plan
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              {formatDisplayDate(today)}
            </p>
          </div>

          {plan && (
            <span
              style={{
                padding:      '3px 10px',
                borderRadius: '999px',
                fontSize:     '12px',
                fontWeight:   600,
                ...(PLAN_STATUS_COLORS[plan.status] ?? { bg: 'transparent', color: 'var(--text-muted)' }),
              }}
            >
              {plan.status}
            </span>
          )}

          <button
            onClick={handleGeneratePlan}
            disabled={!plan}
            style={{
              padding:      '7px 16px',
              borderRadius: '8px',
              border:       '1px solid var(--border)',
              background:   'transparent',
              color:        '#6a8fe8',
              fontSize:     '13px',
              fontWeight:   600,
              cursor:       plan ? 'pointer' : 'not-allowed',
            }}
          >
            Generate from Template
          </button>
        </div>

        {/* No plan state */}
        {!plan && (
          <div
            style={{
              padding:      '32px',
              borderRadius: '10px',
              border:       '1px dashed var(--border)',
              textAlign:    'center',
              color:        'var(--text-muted)',
              fontSize:     '14px',
            }}
          >
            No plan for today yet. Generate one from a template or add blocks below.
          </div>
        )}

        {/* Timeline of blocks */}
        {sortedBlocks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Time Blocks ({sortedBlocks.filter((b) => b.status === 'DONE').length}/{sortedBlocks.length} done)
            </h3>
            {sortedBlocks.map((block) => (
              <TimeBlockCard
                key={block.id}
                block={block}
                onStatusChange={handleBlockStatusChange}
                onStartTimer={handleStartTimer}
                isTimerActive={isTimerActive}
              />
            ))}
          </div>
        )}

        {/* Quick Add Block form */}
        <div
          style={{
            padding:      '16px',
            borderRadius: '10px',
            border:       '1px solid var(--border)',
            background:   'var(--bg-card)',
          }}
        >
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>
            Quick Add Block
          </h3>
          {!plan && (
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-muted)' }}>
              A plan will be created automatically when you add a block.
            </p>
          )}
          <form
            onSubmit={handleQuickAddBlock}
            style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '2 1 160px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Title</label>
              <input
                value={qaTitle}
                onChange={(e) => setQaTitle(e.target.value)}
                placeholder="Block title…"
                required
                style={{
                  padding:      '7px 10px',
                  borderRadius: '7px',
                  border:       '1px solid var(--border)',
                  background:   'transparent',
                  color:        'inherit',
                  fontSize:     '13px',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 130px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Category</label>
              <select
                value={qaCategory}
                onChange={(e) => setQaCategory(e.target.value as BlockCategory)}
                style={{
                  padding:      '7px 10px',
                  borderRadius: '7px',
                  border:       '1px solid var(--border)',
                  background:   'var(--bg-card)',
                  color:        'inherit',
                  fontSize:     '13px',
                  cursor:       'pointer',
                }}
              >
                {BLOCK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '0 1 110px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Start</label>
              <input
                type="time"
                value={qaStart}
                onChange={(e) => setQaStart(e.target.value)}
                required
                style={{
                  padding:      '7px 10px',
                  borderRadius: '7px',
                  border:       '1px solid var(--border)',
                  background:   'transparent',
                  color:        'inherit',
                  fontSize:     '13px',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '0 1 110px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>End</label>
              <input
                type="time"
                value={qaEnd}
                onChange={(e) => setQaEnd(e.target.value)}
                required
                style={{
                  padding:      '7px 10px',
                  borderRadius: '7px',
                  border:       '1px solid var(--border)',
                  background:   'transparent',
                  color:        'inherit',
                  fontSize:     '13px',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={qaLoading}
              style={{
                padding:      '8px 18px',
                borderRadius: '7px',
                border:       'none',
                background:   '#6a8fe8',
                color:        '#fff',
                fontSize:     '13px',
                fontWeight:   600,
                cursor:       qaLoading ? 'not-allowed' : 'pointer',
                height:       '34px',
                alignSelf:    'flex-end',
              }}
            >
              {qaLoading ? 'Adding…' : 'Add'}
            </button>
          </form>
        </div>

        {/* Day completion actions */}
        {plan && plan.status !== 'COMPLETED' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleMarkComplete}
              style={{
                padding:      '8px 18px',
                borderRadius: '8px',
                border:       '1px solid #4caf82',
                background:   'rgba(76,175,130,0.12)',
                color:        '#4caf82',
                fontSize:     '13px',
                fontWeight:   600,
                cursor:       'pointer',
              }}
            >
              Mark Day Complete
            </button>
            <button
              onClick={handleDeferIncomplete}
              style={{
                padding:      '8px 18px',
                borderRadius: '8px',
                border:       '1px solid var(--border)',
                background:   'transparent',
                color:        'var(--text-muted)',
                fontSize:     '13px',
                fontWeight:   500,
                cursor:       'pointer',
              }}
            >
              Defer Incomplete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodayPage;

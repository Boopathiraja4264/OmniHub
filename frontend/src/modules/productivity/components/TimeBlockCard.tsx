import React from 'react';
import { TimeBlock, BlockStatus } from '../../../types';
import CategoryBadge from './CategoryBadge';

const CATEGORY_BORDER: Record<string, string> = {
  PERSONAL:     '#6a8fe8',
  PROFESSIONAL: '#a874d4',
  DEEP_WORK:    '#4caf82',
  BREAK:        '#e09c5c',
  ADMIN:        '#8c8a96',
};

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  PLANNED:     { bg: 'rgba(140,138,150,0.15)', color: '#8c8a96',  label: 'Planned'     },
  IN_PROGRESS: { bg: 'rgba(106,143,232,0.15)', color: '#6a8fe8',  label: 'In Progress' },
  DONE:        { bg: 'rgba(76,175,130,0.15)',  color: '#4caf82',  label: 'Done'        },
  SKIPPED:     { bg: 'rgba(224,92,106,0.12)',  color: '#e05c6a',  label: 'Skipped'     },
};

function formatTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12  = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

interface TimeBlockCardProps {
  block: TimeBlock;
  onStatusChange: (id: number, status: BlockStatus) => void;
  onStartTimer: (blockId: number) => void;
  isTimerActive: boolean;
}

const TimeBlockCard: React.FC<TimeBlockCardProps> = ({
  block,
  onStatusChange,
  onStartTimer,
  isTimerActive,
}) => {
  const borderColor = CATEGORY_BORDER[block.category] ?? '#8c8a96';
  const badge       = STATUS_BADGE[block.status] ?? STATUS_BADGE.PLANNED;
  const isDone      = block.status === 'DONE';
  const isSkipped   = block.status === 'SKIPPED';

  return (
    <div
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          '12px',
        padding:      '10px 14px',
        borderRadius: '8px',
        border:       '1px solid var(--border)',
        background:   'var(--bg-card)',
        borderLeft:   `4px solid ${borderColor}`,
        opacity:      isSkipped ? 0.55 : 1,
      }}
    >
      {/* Time range */}
      <span
        style={{
          fontSize:   '12px',
          color:      'var(--text-muted)',
          whiteSpace: 'nowrap',
          minWidth:   '100px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatTime(block.startTime)} – {formatTime(block.endTime)}
      </span>

      {/* Title */}
      <span
        style={{
          flex:           1,
          fontSize:       '14px',
          fontWeight:     500,
          textDecoration: isDone ? 'line-through' : 'none',
          color:          isDone ? 'var(--text-muted)' : 'inherit',
          overflow:       'hidden',
          textOverflow:   'ellipsis',
          whiteSpace:     'nowrap',
        }}
      >
        {block.title}
      </span>

      {/* Category badge */}
      <CategoryBadge category={block.category} />

      {/* Status badge */}
      <span
        style={{
          display:      'inline-flex',
          alignItems:   'center',
          padding:      '2px 8px',
          borderRadius: '999px',
          fontSize:     '11px',
          fontWeight:   500,
          background:   badge.bg,
          color:        badge.color,
          whiteSpace:   'nowrap',
        }}
      >
        {badge.label}
      </span>

      {/* Mark Done / Skipped */}
      {!isDone && !isSkipped && (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => onStatusChange(block.id, 'DONE')}
            title="Mark done"
            style={{
              padding:      '3px 10px',
              borderRadius: '6px',
              border:       '1px solid #4caf82',
              background:   'transparent',
              color:        '#4caf82',
              fontSize:     '12px',
              cursor:       'pointer',
              fontWeight:   500,
            }}
          >
            Done
          </button>
          <button
            onClick={() => onStatusChange(block.id, 'SKIPPED')}
            title="Skip block"
            style={{
              padding:      '3px 10px',
              borderRadius: '6px',
              border:       '1px solid var(--border)',
              background:   'transparent',
              color:        'var(--text-muted)',
              fontSize:     '12px',
              cursor:       'pointer',
              fontWeight:   500,
            }}
          >
            Skip
          </button>
        </div>
      )}

      {/* Start Timer */}
      {!isDone && !isSkipped && (
        <button
          onClick={() => onStartTimer(block.id)}
          disabled={isTimerActive}
          title={isTimerActive ? 'A timer is already running' : 'Start timer for this block'}
          style={{
            padding:      '3px 10px',
            borderRadius: '6px',
            border:       '1px solid #6a8fe8',
            background:   isTimerActive ? 'transparent' : 'rgba(106,143,232,0.12)',
            color:        isTimerActive ? 'var(--text-muted)' : '#6a8fe8',
            fontSize:     '12px',
            cursor:       isTimerActive ? 'not-allowed' : 'pointer',
            fontWeight:   500,
            whiteSpace:   'nowrap',
          }}
        >
          ▶ Timer
        </button>
      )}
    </div>
  );
};

export default TimeBlockCard;

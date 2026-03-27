import React from 'react';

const PRIORITY_COLORS: Record<string, string> = {
  LOW:    '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH:   '#ef4444',
  URGENT: '#7c3aed',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW:    'Low priority',
  MEDIUM: 'Medium priority',
  HIGH:   'High priority',
  URGENT: 'Urgent',
};

interface PriorityDotProps {
  priority: string;
}

const PriorityDot: React.FC<PriorityDotProps> = ({ priority }) => {
  const color = PRIORITY_COLORS[priority] ?? '#8c8a96';
  const label = PRIORITY_LABELS[priority] ?? priority;

  return (
    <span
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        gap:           4,
        padding:       '2px 7px',
        borderRadius:  999,
        background:    `${color}18`,
        border:        `1px solid ${color}40`,
        flexShrink:    0,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 700, color, lineHeight: 1 }}>{label}</span>
    </span>
  );
};

export default PriorityDot;

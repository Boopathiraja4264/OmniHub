import React, { useState } from 'react';
import { Task, TaskStatus } from '../../../types';
import CategoryBadge from './CategoryBadge';
import PriorityDot from './PriorityDot';

interface TaskCardProps {
  task: Task;
  onStatusChange: (id: number, status: TaskStatus) => void;
  onDelete: (id: number) => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(d);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  return `${diff}d left`;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange, onDelete }) => {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const isDone = task.status === 'DONE';

  const dueDateColor = (): string => {
    if (!task.dueDate) return 'var(--text-muted)';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return '#ef4444';
    if (diff === 0) return '#f59e0b';
    return 'var(--text-muted)';
  };

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('taskId', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            '10px',
        padding:        '10px 12px',
        borderRadius:   '8px',
        border:         '1px solid var(--border)',
        background:     hovered ? 'var(--bg-card)' : 'transparent',
        cursor:         'grab',
        transition:     'background 0.15s, opacity 0.15s',
        opacity:        dragging ? 0.4 : isDone ? 0.65 : 1,
        userSelect:     'none',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onStatusChange(task.id, isDone ? 'TODO' : 'DONE')}
        title={isDone ? 'Mark todo' : 'Mark done'}
        style={{
          width:        '18px',
          height:       '18px',
          borderRadius: '4px',
          border:       isDone ? '2px solid #22c55e' : '2px solid var(--border)',
          background:   isDone ? '#22c55e' : 'transparent',
          cursor:       'pointer',
          flexShrink:   0,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          padding:      0,
        }}
      >
        {isDone && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Priority badge */}
      <PriorityDot priority={task.priority} />

      {/* Title */}
      <span
        style={{
          flex:           1,
          fontSize:       '14px',
          color:          isDone ? 'var(--text-muted)' : 'inherit',
          textDecoration: isDone ? 'line-through' : 'none',
          overflow:       'hidden',
          textOverflow:   'ellipsis',
          whiteSpace:     'nowrap',
        }}
      >
        {task.title}
      </span>

      {/* Category badge */}
      <CategoryBadge category={task.category} />

      {/* Due date */}
      {task.dueDate && (
        <span style={{ fontSize: '11px', color: dueDateColor(), whiteSpace: 'nowrap' }}>
          {formatDate(task.dueDate)}
        </span>
      )}

      {/* Delete button — visible on hover */}
      <button
        onClick={() => onDelete(task.id)}
        title="Delete task"
        style={{
          opacity:     hovered ? 1 : 0,
          transition:  'opacity 0.15s',
          background:  'transparent',
          border:      'none',
          cursor:      'pointer',
          padding:     '2px 4px',
          borderRadius:'4px',
          color:       '#ef4444',
          fontSize:    '14px',
          lineHeight:  1,
        }}
      >
        ✕
      </button>
    </div>
  );
};

export default TaskCard;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productivityApi } from '../../services/api';
import { DailyPlan, Task, TimeBlock, BlockCategory, TaskCategory, TaskPriority } from '../../types';

// ─── helpers ────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0'); }
function toDateStr(y: number, m: number, d: number) { return `${y}-${pad(m)}-${pad(d)}`; }

const CATEGORY_COLOR: Record<BlockCategory, string> = {
  DEEP_WORK:    '#6a8fe8',
  PROFESSIONAL: '#a78bfa',
  PERSONAL:     '#4caf82',
  BREAK:        '#f59e0b',
  ADMIN:        '#8c8a96',
};
const PRIORITY_COLOR: Record<string, string> = {
  LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444', URGENT: '#7c3aed',
};

interface DayData { date: string; plan?: DailyPlan; tasks: Task[]; }

// ─── Hover Tooltip ────────────────────────────────────────────────────────────

const HoverTooltip: React.FC<{ date: string; plan?: DailyPlan; tasks: Task[] }> = ({ date, plan, tasks }) => {
  const blocks = plan?.timeBlocks ?? [];
  const doneBlocks = blocks.filter(b => b.status === 'DONE').length;
  const doneTasks  = tasks.filter(t => t.status === 'DONE').length;
  const d = new Date(date + 'T12:00:00');
  const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div style={{
      position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
      transform: 'translateX(-50%)', zIndex: 300,
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 14px', minWidth: 180,
      boxShadow: '0 8px 24px rgba(0,0,0,0.35)', pointerEvents: 'none',
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{label}</div>
      {blocks.length === 0 && tasks.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nothing scheduled</div>
      ) : (
        <>
          {blocks.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Blocks {doneBlocks}/{blocks.length}
              </div>
              {[...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime)).slice(0, 4).map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, flexShrink: 0, background: b.color || CATEGORY_COLOR[b.category] }} />
                  <span style={{ fontSize: 11, color: b.status === 'DONE' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: b.status === 'DONE' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.startTime.slice(0, 5)} {b.title}
                  </span>
                </div>
              ))}
              {blocks.length > 4 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{blocks.length - 4} more</div>}
            </div>
          )}
          {tasks.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Tasks {doneTasks}/{tasks.length}
              </div>
              {tasks.slice(0, 3).map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: PRIORITY_COLOR[t.priority] }} />
                  <span style={{ fontSize: 11, color: t.status === 'DONE' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: t.status === 'DONE' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </span>
                </div>
              ))}
              {tasks.length > 3 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{tasks.length - 3} more</div>}
            </div>
          )}
        </>
      )}
      {/* caret */}
      <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: 'none', borderLeft: 'none', rotate: '45deg' }} />
    </div>
  );
};

// ─── Block/Task display rows ───────────────────────────────────────────────

const BlockPill: React.FC<{ block: TimeBlock }> = ({ block }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 6, background: 'var(--bg-main)', border: '1px solid var(--border)', fontSize: 12 }}>
    <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: block.color || CATEGORY_COLOR[block.category] || '#8c8a96' }} />
    <span style={{ fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {block.startTime.slice(0, 5)}–{block.endTime.slice(0, 5)} {block.title}
    </span>
    <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: block.status === 'DONE' ? 'rgba(76,175,130,0.15)' : 'rgba(106,143,232,0.1)', color: block.status === 'DONE' ? '#4caf82' : '#6a8fe8' }}>{block.status}</span>
  </div>
);

const TaskRow: React.FC<{ task: Task }> = ({ task }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, background: 'var(--bg-main)', border: '1px solid var(--border)', fontSize: 12, opacity: task.status === 'DONE' ? 0.5 : 1 }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: PRIORITY_COLOR[task.priority] || '#8c8a96' }} />
    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: task.status === 'DONE' ? 'line-through' : 'none' }}>{task.title}</span>
    <span style={{ color: 'var(--text-muted)', fontSize: 10, flexShrink: 0 }}>{task.category}</span>
  </div>
);

// ─── Day Panel ────────────────────────────────────────────────────────────────

type PanelTab = 'overview' | 'todo' | 'plan';

const inputStyle: React.CSSProperties = {
  padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)',
  background: 'transparent', color: 'inherit', fontSize: 13, width: '100%', boxSizing: 'border-box',
};
const selectStyle: React.CSSProperties = { ...inputStyle, background: 'var(--bg-card)', cursor: 'pointer' };
const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, display: 'block' };

const DayPanel: React.FC<{
  dayData: DayData | null;
  onClose: () => void;
  onGoToDay: (date: string) => void;
  onRefresh: () => void;
}> = ({ dayData, onClose, onGoToDay, onRefresh }) => {
  const [tab, setTab] = useState<PanelTab>('overview');

  // Add Todo form
  const [todoTitle, setTodoTitle]       = useState('');
  const [todoPriority, setTodoPriority] = useState<TaskPriority>('MEDIUM');
  const [todoCategory, setTodoCategory] = useState<TaskCategory>('PERSONAL');
  const [todoSaving, setTodoSaving]     = useState(false);

  // Plan Day form
  const [blockTitle, setBlockTitle]       = useState('');
  const [blockCategory, setBlockCategory] = useState<BlockCategory>('DEEP_WORK');
  const [blockStart, setBlockStart]       = useState('09:00');
  const [blockEnd, setBlockEnd]           = useState('10:00');
  const [blockSaving, setBlockSaving]     = useState(false);

  // Reset forms when day changes
  useEffect(() => {
    setTab('overview');
    setTodoTitle(''); setTodoPriority('MEDIUM'); setTodoCategory('PERSONAL');
    setBlockTitle(''); setBlockCategory('DEEP_WORK'); setBlockStart('09:00'); setBlockEnd('10:00');
  }, [dayData?.date]);

  if (!dayData) return null;

  const d = new Date(dayData.date + 'T12:00:00');
  const label = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const blocks = [...(dayData.plan?.timeBlocks ?? [])].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoTitle.trim()) return;
    setTodoSaving(true);
    try {
      await productivityApi.createTask({
        title: todoTitle.trim(),
        category: todoCategory,
        priority: todoPriority,
        dueDate: dayData.date,
        recurring: 'NONE',
      });
      setTodoTitle('');
      onRefresh();
      setTab('overview');
    } catch {} finally { setTodoSaving(false); }
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockTitle.trim() || !blockStart || !blockEnd) return;
    setBlockSaving(true);
    try {
      // getPlan auto-creates if not exists
      const planRes = await productivityApi.getPlan(dayData.date);
      await productivityApi.addBlock(planRes.data.id, {
        title: blockTitle.trim(),
        category: blockCategory,
        startTime: blockStart,
        endTime: blockEnd,
      });
      setBlockTitle(''); setBlockStart('09:00'); setBlockEnd('10:00');
      onRefresh();
      setTab('overview');
    } catch {} finally { setBlockSaving(false); }
  };

  const TABS: { key: PanelTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'todo',     label: '+ Todo' },
    { key: 'plan',     label: '+ Time Block' },
  ];

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 380,
      background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', zIndex: 200,
      boxShadow: '-4px 0 24px rgba(0,0,0,0.3)',
    }}>
      {/* header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{label}</div>
          {dayData.plan && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Plan: <span style={{ color: '#6a8fe8' }}>{dayData.plan.status}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onGoToDay(dayData.date)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #6a8fe8', background: 'rgba(106,143,232,0.1)', color: '#6a8fe8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Open Day
          </button>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
            color: tab === t.key ? '#6a8fe8' : 'var(--text-muted)',
            borderBottom: tab === t.key ? '2px solid #6a8fe8' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* ── Overview tab ── */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Time Blocks ({blocks.filter(b => b.status === 'DONE').length}/{blocks.length})
              </div>
              {blocks.length === 0
                ? <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No blocks — <button onClick={() => setTab('plan')} style={{ background: 'none', border: 'none', color: '#6a8fe8', cursor: 'pointer', fontSize: 12, padding: 0, fontStyle: 'normal' }}>add one</button></div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{blocks.map(b => <BlockPill key={b.id} block={b} />)}</div>
              }
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Tasks Due ({dayData.tasks.filter(t => t.status === 'DONE').length}/{dayData.tasks.length})
              </div>
              {dayData.tasks.length === 0
                ? <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No tasks — <button onClick={() => setTab('todo')} style={{ background: 'none', border: 'none', color: '#6a8fe8', cursor: 'pointer', fontSize: 12, padding: 0, fontStyle: 'normal' }}>add one</button></div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{dayData.tasks.map(t => <TaskRow key={t.id} task={t} />)}</div>
              }
            </div>
          </div>
        )}

        {/* ── Add Todo tab ── */}
        {tab === 'todo' && (
          <form onSubmit={handleAddTodo} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
              Adding task due on <strong style={{ color: 'var(--text-primary)' }}>{label}</strong>
            </div>

            <div>
              <label style={labelStyle}>Title *</label>
              <input value={todoTitle} onChange={e => setTodoTitle(e.target.value)} placeholder="What needs to be done?" required style={inputStyle} autoFocus />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Priority</label>
                <select value={todoPriority} onChange={e => setTodoPriority(e.target.value as TaskPriority)} style={selectStyle}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <select value={todoCategory} onChange={e => setTodoCategory(e.target.value as TaskCategory)} style={selectStyle}>
                  <option value="PERSONAL">Personal</option>
                  <option value="PROFESSIONAL">Professional</option>
                </select>
              </div>
            </div>

            {/* priority preview dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: PRIORITY_COLOR[todoPriority] }} />
              <span style={{ fontSize: 12, flex: 1, color: todoTitle ? 'var(--text-primary)' : 'var(--text-muted)' }}>{todoTitle || 'Task preview'}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{todoPriority}</span>
            </div>

            <button type="submit" disabled={todoSaving || !todoTitle.trim()} style={{
              padding: '9px 0', borderRadius: 8, border: 'none',
              background: '#6a8fe8', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: todoSaving || !todoTitle.trim() ? 'not-allowed' : 'pointer',
              opacity: todoSaving || !todoTitle.trim() ? 0.6 : 1,
            }}>{todoSaving ? 'Adding…' : 'Add Todo'}</button>
          </form>
        )}

        {/* ── Plan Day tab ── */}
        {tab === 'plan' && (
          <form onSubmit={handleAddBlock} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
              Scheduling a block on <strong style={{ color: 'var(--text-primary)' }}>{label}</strong>
            </div>

            <div>
              <label style={labelStyle}>Title *</label>
              <input value={blockTitle} onChange={e => setBlockTitle(e.target.value)} placeholder="Block name…" required style={inputStyle} autoFocus />
            </div>

            <div>
              <label style={labelStyle}>Category</label>
              <select value={blockCategory} onChange={e => setBlockCategory(e.target.value as BlockCategory)} style={selectStyle}>
                <option value="DEEP_WORK">Deep Work</option>
                <option value="PROFESSIONAL">Professional</option>
                <option value="PERSONAL">Personal</option>
                <option value="BREAK">Break</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Start time</label>
                <input type="time" value={blockStart} onChange={e => setBlockStart(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>End time</label>
                <input type="time" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} required style={inputStyle} />
              </div>
            </div>

            {/* block preview */}
            {blockTitle && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLOR[blockCategory] }} />
                <span style={{ fontSize: 12, flex: 1 }}>{blockStart}–{blockEnd} {blockTitle}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {(() => { const [sh,sm] = blockStart.split(':').map(Number); const [eh,em] = blockEnd.split(':').map(Number); const mins = (eh*60+em)-(sh*60+sm); return mins > 0 ? `${Math.floor(mins/60)}h${mins%60>0?` ${mins%60}m`:''}` : ''; })()}
                </span>
              </div>
            )}

            <button type="submit" disabled={blockSaving || !blockTitle.trim()} style={{
              padding: '9px 0', borderRadius: 8, border: 'none',
              background: CATEGORY_COLOR[blockCategory], color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: blockSaving || !blockTitle.trim() ? 'not-allowed' : 'pointer',
              opacity: blockSaving || !blockTitle.trim() ? 0.6 : 1,
            }}>{blockSaving ? 'Saving…' : 'Add Time Block'}</button>

            {/* existing blocks for reference */}
            {blocks.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Existing blocks:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {blocks.map(b => <BlockPill key={b.id} block={b} />)}
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

// ─── Month Cell ───────────────────────────────────────────────────────────────

const MonthCell: React.FC<{
  date: string; dayNum: number; isToday: boolean; isCurrentMonth: boolean;
  plan?: DailyPlan; tasks: Task[]; isSelected: boolean; onClick: () => void;
}> = ({ date, dayNum, isToday, isCurrentMonth, plan, tasks, isSelected, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const blocks    = plan?.timeBlocks ?? [];
  const doneTasks  = tasks.filter(t => t.status === 'DONE').length;
  const doneBlocks = blocks.filter(b => b.status === 'DONE').length;
  const sortedTasks = [...tasks].sort((a, b) => ['URGENT','HIGH','MEDIUM','LOW'].indexOf(a.priority) - ['URGENT','HIGH','MEDIUM','LOW'].indexOf(b.priority)).slice(0, 4);
  const topBlocks   = blocks.slice(0, 3);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        minHeight: 80, padding: '6px 8px', borderRadius: 8, position: 'relative',
        border: isSelected ? '2px solid #6a8fe8' : isToday ? '2px solid #C9A84C' : '1px solid var(--border)',
        background: isSelected ? 'rgba(106,143,232,0.08)' : isToday ? 'rgba(201,168,76,0.07)' : hovered ? 'var(--bg-hover,rgba(128,128,128,0.06))' : 'var(--bg-card)',
        cursor: 'pointer', opacity: isCurrentMonth ? 1 : 0.35,
        transition: 'border-color 0.15s, background 0.15s',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, background: isToday ? '#C9A84C' : 'transparent', color: isToday ? '#fff' : isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)' }}>{dayNum}</span>
        {blocks.length > 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{doneBlocks}/{blocks.length}</span>}
      </div>
      {topBlocks.length > 0 && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {topBlocks.map(b => <div key={b.id} style={{ height: 5, flex: '1 1 12px', maxWidth: 28, borderRadius: 3, background: b.color || CATEGORY_COLOR[b.category] || '#8c8a96', opacity: b.status === 'DONE' ? 0.5 : 1 }} />)}
          {blocks.length > 3 && <span style={{ fontSize: 9, color: 'var(--text-muted)', alignSelf: 'center' }}>+{blocks.length - 3}</span>}
        </div>
      )}
      {sortedTasks.length > 0 && (
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {sortedTasks.map(t => <div key={t.id} style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[t.priority] || '#8c8a96', opacity: t.status === 'DONE' ? 0.4 : 1 }} />)}
          {tasks.length > 4 && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{tasks.length - 4}</span>}
        </div>
      )}
      {(blocks.length > 0 || tasks.length > 0) && (() => {
        const total = blocks.length + tasks.length;
        const done  = doneBlocks + doneTasks;
        return <div style={{ height: 3, borderRadius: 2, background: 'var(--border)', marginTop: 'auto' }}><div style={{ height: '100%', borderRadius: 2, background: '#4caf82', width: `${Math.round(done / total * 100)}%` }} /></div>;
      })()}

      {/* hover tooltip */}
      {hovered && !isSelected && (
        <HoverTooltip date={date} plan={plan} tasks={tasks} />
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const nowRef = useRef(new Date());
  const now = nowRef.current;

  const [year, setYear]     = useState(now.getFullYear());
  const [month, setMonth]   = useState(now.getMonth() + 1);
  const [view, setView]     = useState<'month' | 'week'>('month');
  const [weekOffset, setWeekOffset] = useState(0);
  const [plans, setPlans]   = useState<DailyPlan[]>([]);
  const [tasks, setTasks]   = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayStr = toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const getRangeForView = useCallback((): [string, string] => {
    if (view === 'month') {
      const first = new Date(year, month - 1, 1);
      const last  = new Date(year, month, 0);
      const from  = new Date(first); from.setDate(first.getDate() - ((first.getDay() + 6) % 7));
      const to    = new Date(last);  to.setDate(last.getDate() + ((7 - last.getDay()) % 7 || 7) - 1);
      return [toDateStr(from.getFullYear(), from.getMonth() + 1, from.getDate()), toDateStr(to.getFullYear(), to.getMonth() + 1, to.getDate())];
    } else {
      const base = new Date(now); base.setDate(base.getDate() + weekOffset * 7);
      const dow  = (base.getDay() + 6) % 7;
      const mon  = new Date(base); mon.setDate(base.getDate() - dow);
      const sun  = new Date(mon);  sun.setDate(mon.getDate() + 6);
      return [toDateStr(mon.getFullYear(), mon.getMonth() + 1, mon.getDate()), toDateStr(sun.getFullYear(), sun.getMonth() + 1, sun.getDate())];
    }
  }, [view, year, month, weekOffset, now]);

  const fetchData = useCallback(() => {
    const [from, to] = getRangeForView();
    setLoading(true);
    Promise.all([productivityApi.getPlansRange(from, to), productivityApi.getTasks()])
      .then(([p, t]) => { setPlans(p.data); setTasks(t.data); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [getRangeForView]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const planByDate  = Object.fromEntries(plans.map(p => [p.planDate, p]));
  const tasksByDate: Record<string, Task[]> = {};
  tasks.forEach(t => { if (t.dueDate) { tasksByDate[t.dueDate] = [...(tasksByDate[t.dueDate] ?? []), t]; } });

  const selectedDayData: DayData | null = selectedDate
    ? { date: selectedDate, plan: planByDate[selectedDate], tasks: tasksByDate[selectedDate] ?? [] }
    : null;

  const buildMonthGrid = () => {
    const first = new Date(year, month - 1, 1);
    const last  = new Date(year, month, 0);
    const startDow = (first.getDay() + 6) % 7;
    const days: Array<{ date: string; dayNum: number; currentMonth: boolean }> = [];
    for (let i = startDow - 1; i >= 0; i--) { const d = new Date(first); d.setDate(d.getDate() - i - 1); days.push({ date: toDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate()), dayNum: d.getDate(), currentMonth: false }); }
    for (let d = 1; d <= last.getDate(); d++) days.push({ date: toDateStr(year, month, d), dayNum: d, currentMonth: true });
    const rem = days.length % 7;
    if (rem !== 0) for (let i = 1; i <= 7 - rem; i++) { const d = new Date(last); d.setDate(d.getDate() + i); days.push({ date: toDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate()), dayNum: d.getDate(), currentMonth: false }); }
    return days;
  };

  const buildWeekDays = () => {
    const base = new Date(now); base.setDate(base.getDate() + weekOffset * 7);
    const dow = (base.getDay() + 6) % 7;
    const mon = new Date(base); mon.setDate(base.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return toDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate()); });
  };

  const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);
  const timeToFraction = (t: string) => { const [h, m] = t.split(':').map(Number); return (h - 6 + m / 60) / 16; };
  const monthName = new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const weekDays  = buildWeekDays();
  const weekLabel = (() => { const f = new Date(weekDays[0] + 'T12:00:00'); const t = new Date(weekDays[6] + 'T12:00:00'); return `${f.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${t.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`; })();

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Calendar</h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{view === 'month' ? monthName : weekLabel}</p>
          </div>
          <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
            {(['month', 'week'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: view === v ? '#6a8fe8' : 'transparent', color: view === v ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => { if (view === 'month') { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); } else setWeekOffset(w => w - 1); }} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>‹</button>
            <button onClick={() => { if (view === 'month') { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); } else setWeekOffset(0); }} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>Today</button>
            <button onClick={() => { if (view === 'month') { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); } else setWeekOffset(w => w + 1); }} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>›</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60 }}>Loading…</div>
        ) : view === 'month' ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
              {WEEKDAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {buildMonthGrid().map(({ date, dayNum, currentMonth }) => (
                <MonthCell key={date} date={date} dayNum={dayNum} isToday={date === todayStr} isCurrentMonth={currentMonth} plan={planByDate[date]} tasks={tasksByDate[date] ?? []} isSelected={selectedDate === date} onClick={() => setSelectedDate(selectedDate === date ? null : date)} />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
              <div />
              {weekDays.map(date => {
                const d = new Date(date + 'T12:00:00');
                const isToday = date === todayStr;
                return (
                  <div key={date} onClick={() => setSelectedDate(selectedDate === date ? null : date)} style={{ padding: '8px 4px', textAlign: 'center', cursor: 'pointer', borderLeft: '1px solid var(--border)', background: selectedDate === date ? 'rgba(106,143,232,0.08)' : 'transparent' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', margin: '2px auto 0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isToday ? '#C9A84C' : 'transparent', color: isToday ? '#fff' : 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}>{d.getDate()}</div>
                    {(tasksByDate[date] ?? []).length > 0 && <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>{(tasksByDate[date] ?? []).slice(0, 4).map(t => <div key={t.id} style={{ width: 5, height: 5, borderRadius: '50%', background: PRIORITY_COLOR[t.priority] }} />)}</div>}
                  </div>
                );
              })}
            </div>
            <div style={{ position: 'relative', overflow: 'hidden' }}>
              {HOURS.map(h => (
                <div key={h} style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', borderBottom: '1px solid rgba(128,128,128,0.15)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '2px 6px', textAlign: 'right', lineHeight: '32px' }}>{pad(h)}:00</div>
                  {weekDays.map(date => <div key={date} style={{ height: 40, borderLeft: '1px solid var(--border)' }} />)}
                </div>
              ))}
              {weekDays.map((date, colIdx) =>
                (planByDate[date]?.timeBlocks ?? []).filter(b => parseInt(b.startTime) >= 6 && parseInt(b.startTime) < 22).map(b => {
                  const top = timeToFraction(b.startTime) * HOURS.length * 40;
                  const height = Math.max(20, (timeToFraction(b.endTime) - timeToFraction(b.startTime)) * HOURS.length * 40 - 2);
                  return (
                    <div key={b.id} title={`${b.startTime.slice(0, 5)}–${b.endTime.slice(0, 5)}: ${b.title}`} style={{ position: 'absolute', top, left: `calc(48px + ${colIdx} * (100% - 48px) / 7 + 2px)`, width: `calc((100% - 48px) / 7 - 4px)`, height, borderRadius: 5, background: b.color || CATEGORY_COLOR[b.category] || '#6a8fe8', opacity: b.status === 'DONE' ? 0.5 : 0.85, padding: '2px 5px', overflow: 'hidden', fontSize: 10, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
                      {b.startTime.slice(0, 5)} {b.title}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* legend */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
          <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Blocks:</span>
          {(Object.entries(CATEGORY_COLOR) as [BlockCategory, string][]).map(([cat, col]) => (
            <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: col, display: 'inline-block' }} />{cat.replace('_', ' ')}
            </span>
          ))}
          <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 8 }}>Tasks:</span>
          {Object.entries(PRIORITY_COLOR).map(([p, col]) => (
            <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, display: 'inline-block' }} />{p}
            </span>
          ))}
        </div>
      </div>

      {/* side panel */}
      {selectedDate && (
        <>
          <div onClick={() => setSelectedDate(null)} style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,0.2)' }} />
          <DayPanel
            dayData={selectedDayData}
            onClose={() => setSelectedDate(null)}
            onGoToDay={date => { setSelectedDate(null); navigate('/productivity/today', { state: { date } }); }}
            onRefresh={() => { fetchData(); }}
          />
        </>
      )}
    </div>
  );
};

export default CalendarPage;

import React, { useEffect, useState, useCallback } from 'react';
import { productivityApi } from '../../services/api';
import { Task, TaskCategory, TaskPriority, TaskStatus } from '../../types';
import TaskCard from './components/TaskCard';

type CategoryFilter = 'ALL' | TaskCategory;

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'TODO',        label: 'To Do',       color: '#8c8a96' },
  { status: 'IN_PROGRESS', label: 'In Progress',  color: '#6a8fe8' },
  { status: 'DONE',        label: 'Done',         color: '#4caf82' },
];

const emptyForm = { title: '', category: 'PERSONAL' as TaskCategory, priority: 'MEDIUM' as TaskPriority, dueDate: '' };

const TaskBoardPage: React.FC = () => {
  const [tasks, setTasks]             = useState<Task[]>([]);
  const [filter, setFilter]           = useState<CategoryFilter>('ALL');
  const [form, setForm]               = useState(emptyForm);
  const [saving, setSaving]           = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [loading, setLoading]         = useState(true);
  const [dragOver, setDragOver]       = useState<TaskStatus | null>(null);

  const load = useCallback(() => {
    productivityApi.getTasks()
      .then(r => setTasks(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const r = await productivityApi.updateTaskStatus(id, status);
      setTasks(prev => prev.map(t => t.id === id ? r.data : t));
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: number) => {
    try {
      await productivityApi.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const r = await productivityApi.createTask({
        title: form.title,
        category: form.category,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
      });
      setTasks(prev => [r.data, ...prev]);
      setForm(emptyForm);
      setShowForm(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const visible = tasks.filter(t =>
    filter === 'ALL' || t.category === filter
  );

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Tasks</h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{tasks.length} total tasks</div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: '#C9A84C', color: '#fff', fontWeight: 700, fontSize: 13,
          }}
        >
          + Add Task
        </button>
      </div>

      {/* Quick add form */}
      {showForm && (
        <form onSubmit={handleCreate} style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '16px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end',
        }}>
          <div style={{ flex: 2, minWidth: 180 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Title *</label>
            <input
              autoFocus
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="What needs to be done?"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text)', fontSize: 13,
              }}
            />
          </div>
          <div style={{ minWidth: 130 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as TaskCategory }))}
              style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}>
              <option value="PERSONAL">Personal</option>
              <option value="PROFESSIONAL">Professional</option>
            </select>
          </div>
          <div style={{ minWidth: 110 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Priority</label>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
              style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div style={{ minWidth: 130 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Due Date</label>
            <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
          </div>
          <button type="submit" disabled={saving || !form.title.trim()}
            style={{
              padding: '8px 18px', borderRadius: 7, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              background: saving ? 'var(--border)' : '#4caf82', color: '#fff', fontWeight: 700, fontSize: 13,
            }}>
            {saving ? 'Adding…' : 'Add'}
          </button>
          <button type="button" onClick={() => setShowForm(false)}
            style={{ padding: '8px 14px', borderRadius: 7, border: '1px solid var(--border)', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)', fontSize: 13 }}>
            Cancel
          </button>
        </form>
      )}

      {/* Category filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['ALL', 'PERSONAL', 'PROFESSIONAL'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: filter === f ? '#C9A84C' : 'var(--bg-card)',
            color: filter === f ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}>
            {f === 'ALL' ? 'All' : f === 'PERSONAL' ? 'Personal' : 'Professional'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 24 }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', overflowX: 'auto' }}>
          {COLUMNS.map(col => {
            const colTasks = visible.filter(t => t.status === col.status);
            const isOver = dragOver === col.status;
            return (
              <div
                key={col.status}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(col.status); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(null);
                  const id = Number(e.dataTransfer.getData('taskId'));
                  if (id) handleStatusChange(id, col.status);
                }}
                style={{
                  flex: 1, minWidth: 260, background: isOver ? `${col.color}12` : 'var(--bg-card)',
                  border: isOver ? `2px solid ${col.color}` : '1px solid var(--border)',
                  borderRadius: 12, overflow: 'hidden',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                {/* Column header */}
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{col.label}</span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '2px 7px',
                    borderRadius: 999, background: 'var(--border)', color: 'var(--text-muted)',
                  }}>
                    {colTasks.length}
                  </span>
                </div>
                {/* Tasks */}
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 }}>
                  {colTasks.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center', fontStyle: 'italic' }}>
                      {isOver ? 'Drop here' : 'No tasks'}
                    </div>
                  ) : (
                    colTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TaskBoardPage;

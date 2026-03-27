import React, { useEffect, useState, useCallback } from 'react';
import { productivityApi } from '../../services/api';
import { WeeklyTemplate, TemplateBlock, BlockCategory } from '../../types';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday',
  FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday',
};
const CATEGORY_COLORS: Record<string, string> = {
  PERSONAL: '#6a8fe8', PROFESSIONAL: '#a874d4', DEEP_WORK: '#4caf82', BREAK: '#e09c5c', ADMIN: '#8c8a96',
};

const emptyBlockForm = {
  dayOfWeek: 'MON', title: '', category: 'PROFESSIONAL' as BlockCategory,
  startTime: '09:00', endTime: '10:00', color: '',
};

const fmtTime = (t: string) => {
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
};

const TemplatesPage: React.FC = () => {
  const [templates, setTemplates]     = useState<WeeklyTemplate[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState<number | null>(null);
  const [newName, setNewName]         = useState('');
  const [creating, setCreating]       = useState(false);
  const [blockForms, setBlockForms]   = useState<Record<number, typeof emptyBlockForm>>({});
  const [addingBlock, setAddingBlock] = useState<Record<number, boolean>>({});
  const [showBlockForm, setShowBlockForm] = useState<number | null>(null);

  const load = useCallback(() => {
    productivityApi.getTemplates()
      .then(r => setTemplates(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const r = await productivityApi.createTemplate({ name: newName.trim(), active: true });
      setTemplates(prev => [r.data, ...prev]);
      setNewName('');
      setExpanded(r.data.id);
    } catch (e) { console.error(e); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await productivityApi.deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleToggleActive = async (t: WeeklyTemplate) => {
    try {
      const r = await productivityApi.updateTemplate(t.id, { name: t.name, active: !t.active });
      setTemplates(prev => prev.map(x => x.id === t.id ? r.data : x));
    } catch (e) { console.error(e); }
  };

  const handleAddBlock = async (templateId: number, e: React.FormEvent) => {
    e.preventDefault();
    const form = blockForms[templateId] ?? { ...emptyBlockForm };
    if (!form.title.trim()) return;
    setAddingBlock(prev => ({ ...prev, [templateId]: true }));
    try {
      const r = await productivityApi.addTemplateBlock(templateId, form);
      setTemplates(prev => prev.map(t => t.id === templateId
        ? { ...t, blocks: [...t.blocks, r.data] }
        : t
      ));
      setBlockForms(prev => ({ ...prev, [templateId]: { ...emptyBlockForm } }));
      setShowBlockForm(null);
    } catch (e) { console.error(e); }
    finally { setAddingBlock(prev => ({ ...prev, [templateId]: false })); }
  };

  const handleDeleteBlock = async (templateId: number, blockId: number) => {
    try {
      await productivityApi.deleteTemplateBlock(blockId);
      setTemplates(prev => prev.map(t => t.id === templateId
        ? { ...t, blocks: t.blocks.filter(b => b.id !== blockId) }
        : t
      ));
    } catch (e) { console.error(e); }
  };

  const getBlockForm = (id: number) => blockForms[id] ?? { ...emptyBlockForm };
  const setBlockForm = (id: number, val: Partial<typeof emptyBlockForm>) =>
    setBlockForms(prev => ({ ...prev, [id]: { ...(prev[id] ?? emptyBlockForm), ...val } }));

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Weekly Templates</h2>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Build reusable day schedules. The active template auto-fills your daily plan.
        </div>
      </div>

      {/* Create template */}
      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10, marginBottom: 24, alignItems: 'center' }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New template name…"
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg)', color: 'var(--text)', fontSize: 13,
          }}
        />
        <button type="submit" disabled={creating || !newName.trim()} style={{
          padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: '#C9A84C', color: '#fff', fontWeight: 700, fontSize: 13,
        }}>
          {creating ? 'Creating…' : '+ Create'}
        </button>
      </form>

      {loading ? (
        <div style={{ color: 'var(--text-muted)' }}>Loading…</div>
      ) : templates.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 48 }}>
          No templates yet. Create one above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {templates.map(tmpl => (
            <div key={tmpl.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, overflow: 'hidden',
            }}>
              {/* Template header */}
              <div style={{
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer', borderBottom: expanded === tmpl.id ? '1px solid var(--border-subtle)' : 'none',
              }} onClick={() => setExpanded(expanded === tmpl.id ? null : tmpl.id)}>
                <span style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>{tmpl.name}</span>

                {/* Active toggle */}
                <div
                  onClick={e => { e.stopPropagation(); handleToggleActive(tmpl); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                    borderRadius: 999, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    background: tmpl.active ? 'rgba(76,175,130,0.15)' : 'rgba(140,138,150,0.15)',
                    color: tmpl.active ? '#4caf82' : '#8c8a96',
                  }}
                  title={tmpl.active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                  {tmpl.active ? 'Active' : 'Inactive'}
                </div>

                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tmpl.blocks.length} blocks</span>

                <button
                  onClick={e => { e.stopPropagation(); handleDelete(tmpl.id); }}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: 'rgba(224,92,106,0.12)', color: '#e05c6a', fontSize: 11, fontWeight: 600,
                  }}
                >
                  Delete
                </button>

                <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>{expanded === tmpl.id ? '▲' : '▼'}</span>
              </div>

              {/* Expanded: blocks by day */}
              {expanded === tmpl.id && (
                <div style={{ padding: '16px 18px' }}>
                  {DAYS.map(day => {
                    const dayBlocks = tmpl.blocks.filter(b => b.dayOfWeek === day);
                    return (
                      <div key={day} style={{ marginBottom: 14 }}>
                        <div style={{
                          fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                          color: 'var(--text-muted)', marginBottom: 6,
                        }}>
                          {DAY_LABELS[day]}
                        </div>
                        {dayBlocks.length === 0 ? (
                          <div style={{ fontSize: 12, color: 'var(--border)', fontStyle: 'italic' }}>No blocks</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {dayBlocks.map(b => (
                              <div key={b.id} style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px',
                                borderRadius: 7, background: 'var(--bg)', border: '1px solid var(--border-subtle)',
                              }}>
                                <div style={{ width: 3, height: 28, borderRadius: 2, background: CATEGORY_COLORS[b.category] ?? '#8c8a96', flexShrink: 0 }} />
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 110, fontVariantNumeric: 'tabular-nums' }}>
                                  {fmtTime(b.startTime)} – {fmtTime(b.endTime)}
                                </span>
                                <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{b.title}</span>
                                <span style={{
                                  fontSize: 11, padding: '2px 7px', borderRadius: 999,
                                  background: `${CATEGORY_COLORS[b.category]}22`, color: CATEGORY_COLORS[b.category],
                                  fontWeight: 600,
                                }}>{b.category.replace('_', ' ')}</span>
                                <button onClick={() => handleDeleteBlock(tmpl.id, b.id)} style={{
                                  padding: '2px 8px', borderRadius: 5, border: 'none', cursor: 'pointer',
                                  background: 'transparent', color: '#e05c6a', fontSize: 12, fontWeight: 700,
                                }}>×</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add block form */}
                  {showBlockForm === tmpl.id ? (
                    <form onSubmit={e => handleAddBlock(tmpl.id, e)} style={{
                      marginTop: 16, padding: '14px 16px', borderRadius: 10,
                      border: '1px dashed var(--border)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end',
                    }}>
                      <div style={{ minWidth: 100 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Day</label>
                        <select value={getBlockForm(tmpl.id).dayOfWeek}
                          onChange={e => setBlockForm(tmpl.id, { dayOfWeek: e.target.value })}
                          style={{ padding: '7px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}>
                          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 2, minWidth: 150 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Title</label>
                        <input value={getBlockForm(tmpl.id).title}
                          onChange={e => setBlockForm(tmpl.id, { title: e.target.value })}
                          placeholder="e.g. Deep Work"
                          style={{ width: '100%', boxSizing: 'border-box', padding: '7px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
                      </div>
                      <div style={{ minWidth: 120 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Category</label>
                        <select value={getBlockForm(tmpl.id).category}
                          onChange={e => setBlockForm(tmpl.id, { category: e.target.value as BlockCategory })}
                          style={{ padding: '7px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}>
                          <option value="PROFESSIONAL">Professional</option>
                          <option value="PERSONAL">Personal</option>
                          <option value="DEEP_WORK">Deep Work</option>
                          <option value="BREAK">Break</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Start</label>
                        <input type="time" value={getBlockForm(tmpl.id).startTime}
                          onChange={e => setBlockForm(tmpl.id, { startTime: e.target.value })}
                          style={{ padding: '7px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>End</label>
                        <input type="time" value={getBlockForm(tmpl.id).endTime}
                          onChange={e => setBlockForm(tmpl.id, { endTime: e.target.value })}
                          style={{ padding: '7px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
                      </div>
                      <button type="submit" disabled={addingBlock[tmpl.id] || !getBlockForm(tmpl.id).title.trim()} style={{
                        padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                        background: '#4caf82', color: '#fff', fontWeight: 700, fontSize: 13,
                      }}>
                        {addingBlock[tmpl.id] ? 'Adding…' : 'Add Block'}
                      </button>
                      <button type="button" onClick={() => setShowBlockForm(null)} style={{
                        padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border)', cursor: 'pointer',
                        background: 'transparent', color: 'var(--text-muted)', fontSize: 13,
                      }}>Cancel</button>
                    </form>
                  ) : (
                    <button onClick={() => setShowBlockForm(tmpl.id)} style={{
                      marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px dashed var(--border)',
                      cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)',
                      fontSize: 13, fontWeight: 600, width: '100%',
                    }}>
                      + Add Time Block
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;

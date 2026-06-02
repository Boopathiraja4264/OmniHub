import React, { useEffect, useMemo, useState } from 'react';
import { categoryItemApi } from '../../services/api';
import { ExpenseCategory, ExpenseItem } from '../../types';

// Rotating accent colours for category cards
const PALETTE = [
  'var(--primary)', 'var(--income)', 'var(--warning)', 'var(--purple)',
  'var(--expense)', '#0ea5e9', '#f97316', '#ec4899',
  '#14b8a6', '#8b5cf6', '#84cc16', '#e11d48',
];
const accent = (idx: number) => PALETTE[idx % PALETTE.length];
const accentBg = (color: string) => `${color}18`;
const accentBorder = (color: string) => `${color}40`;

const CategoryItemSettingsPage: React.FC = () => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [search, setSearch] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [showCatInput, setShowCatInput] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  // per-card inline add-item state
  const [addingItemForCat, setAddingItemForCat] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [deduping, setDeduping] = useState(false);

  const loadAll = async () => {
    const [cats, all] = await Promise.all([
      categoryItemApi.getCategories(),
      categoryItemApi.getAll(),
    ]);
    setCategories(Array.isArray(cats.data) ? cats.data : []);
    setItems(Array.isArray(all.data) ? all.data : []);
  };

  useEffect(() => { loadAll(); }, []);

  const itemsByCat = useMemo(() => {
    const map: Record<number, ExpenseItem[]> = {};
    items.forEach(i => {
      (map[i.categoryId] ??= []).push(i);
    });
    return map;
  }, [items]);

  const visibleCats = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (itemsByCat[c.id] || []).some(i => i.name.toLowerCase().includes(q))
    );
  }, [categories, search, itemsByCat]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatError(null);
    setAddingCat(true);
    try {
      await categoryItemApi.addCategory(newCatName.trim());
      setNewCatName('');
      setShowCatInput(false);
      loadAll();
    } catch (err: any) {
      setCatError(err?.response?.data?.message || err?.message || 'Failed to add category');
    } finally { setAddingCat(false); }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Delete this category and all its items?')) return;
    await categoryItemApi.deleteCategory(id);
    loadAll();
  };

  const handleAddItem = async (catId: number) => {
    if (!newItemName.trim()) return;
    setItemError(null);
    setAddingItem(true);
    try {
      await categoryItemApi.addItem(newItemName.trim(), catId);
      setNewItemName('');
      setAddingItemForCat(null);
      loadAll();
    } catch (err: any) {
      setItemError(err?.response?.data?.message || err?.message || 'Failed to add item');
    } finally { setAddingItem(false); }
  };

  const handleDeleteItem = async (id: number) => {
    await categoryItemApi.deleteItem(id);
    loadAll();
  };

  const handleToggleFavorite = async (id: number) => {
    await categoryItemApi.toggleFavorite(id);
    loadAll();
  };

  const handleDeduplicate = async () => {
    if (!window.confirm('Remove all duplicate categories and their items?')) return;
    setDeduping(true);
    try {
      const r = await categoryItemApi.deduplicate();
      await loadAll();
      alert(`Done — removed ${r.data.removed} duplicate(s).`);
    } finally { setDeduping(false); }
  };

  const handleReset = async () => {
    if (!window.confirm('Delete ALL categories & items and restore defaults?')) return;
    setResetting(true);
    try {
      await categoryItemApi.reset();
      await loadAll();
    } finally { setResetting(false); }
  };

  return (
    <div style={{ padding: '24px 28px', minHeight: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 className="page-title">
            Categories & Items
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
            {categories.length} categories · {items.length} items total
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={handleDeduplicate} disabled={deduping}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {deduping ? 'Fixing…' : 'Fix Duplicates'}
          </button>
          <button onClick={handleReset} disabled={resetting}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)', color: 'var(--expense)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {resetting ? 'Resetting…' : 'Reset to Defaults'}
          </button>
          <button onClick={() => { setShowCatInput(v => !v); setCatError(null); setNewCatName(''); }}
            className="btn btn-primary">
            {showCatInput ? '✕ Cancel' : '+ Category'}
          </button>
        </div>
      </div>

      {/* Add Category inline bar */}
      {showCatInput && (
        <form onSubmit={handleAddCategory}
          style={{ display: 'flex', gap: 10, marginBottom: 20, padding: '14px 16px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <input
            autoFocus
            value={newCatName}
            onChange={e => { setNewCatName(e.target.value); setCatError(null); }}
            placeholder="Category name, e.g. Food & Dining"
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${catError ? 'var(--expense)' : 'var(--border)'}`, background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: 13 }}
          />
          <button type="submit" disabled={addingCat || !newCatName.trim()}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: newCatName.trim() ? 'var(--primary)' : 'var(--bg-elevated)', color: newCatName.trim() ? '#fff' : 'var(--text-muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {addingCat ? 'Adding…' : 'Add'}
          </button>
          {catError && <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--expense)' }}>{catError}</span>}
        </form>
      )}

      {/* Search */}
      <div style={{ marginBottom: 20, position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none' }}>⌕</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search categories or items…"
          style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }}
        />
      </div>

      {/* Category Cards Grid */}
      {visibleCats.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)', fontSize: 14 }}>
          {search ? `No categories matching "${search}"` : 'No categories yet. Add one above.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {visibleCats.map((cat, idx) => {
            const color = accent(idx);
            const catItems = itemsByCat[cat.id] || [];
            const isAdding = addingItemForCat === cat.id;
            const sortedItems = [...catItems].sort((a, b) => {
              if (a.favorite && !b.favorite) return -1;
              if (!a.favorite && b.favorite) return 1;
              return a.name.localeCompare(b.name);
            });
            const filteredItems = search.trim()
              ? sortedItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
              : sortedItems;

            return (
              <div key={cat.id} style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>

                {/* Accent top bar */}
                <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />

                {/* Card header */}
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cat.name}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: accentBg(color), color, border: `1px solid ${accentBorder(color)}`, flexShrink: 0 }}>
                      {catItems.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => { setAddingItemForCat(isAdding ? null : cat.id); setNewItemName(''); setItemError(null); }}
                      title="Add item"
                      style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${accentBorder(color)}`, background: accentBg(color), color, fontSize: 16, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                      {isAdding ? '−' : '+'}
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      title="Delete category"
                      style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: 'var(--expense)', fontSize: 14, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ×
                    </button>
                  </div>
                </div>

                {/* Items area */}
                <div style={{ padding: '12px 14px', flex: 1 }}>
                  {filteredItems.length === 0 && !isAdding ? (
                    <div style={{ fontSize: 12, color: 'var(--text-empty)', fontStyle: 'italic', paddingBottom: 4 }}>
                      No items yet — click + to add
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {filteredItems.map(item => (
                        <span key={item.id}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 8px 4px 10px', borderRadius: 20,
                            background: item.favorite ? `${color}18` : 'var(--bg-elevated)',
                            border: `1px solid ${item.favorite ? accentBorder(color) : 'var(--border-subtle)'}`,
                            fontSize: 12, color: item.favorite ? color : 'var(--text-secondary)', fontWeight: item.favorite ? 600 : 500,
                          }}>
                          {item.name}
                          <button
                            onClick={() => handleToggleFavorite(item.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: item.favorite ? '#f59e0b' : 'var(--text-muted)', fontSize: 12, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center', opacity: item.favorite ? 1 : 0.5 }}
                            title={item.favorite ? 'Remove from favourites' : 'Mark as favourite'}>
                            ★
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center' }}
                            title="Remove item">
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Inline add item form */}
                  {isAdding && (
                    <div style={{ marginTop: filteredItems.length > 0 ? 10 : 0 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          autoFocus
                          value={newItemName}
                          onChange={e => { setNewItemName(e.target.value); setItemError(null); }}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(cat.id); } if (e.key === 'Escape') { setAddingItemForCat(null); setNewItemName(''); } }}
                          placeholder="Item name…"
                          style={{ flex: 1, padding: '6px 10px', borderRadius: 7, border: `1px solid ${itemError ? 'var(--expense)' : accentBorder(color)}`, background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: 12 }}
                        />
                        <button onClick={() => handleAddItem(cat.id)} disabled={addingItem || !newItemName.trim()}
                          style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: color, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: newItemName.trim() ? 1 : 0.5 }}>
                          {addingItem ? '…' : 'Add'}
                        </button>
                      </div>
                      {itemError && <div style={{ fontSize: 11, color: 'var(--expense)', marginTop: 4 }}>{itemError}</div>}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Enter to save · Esc to cancel</div>
                    </div>
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

export default CategoryItemSettingsPage;

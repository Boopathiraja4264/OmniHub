import React, { useEffect, useMemo, useState } from 'react';
import { categoryItemApi } from '../../services/api';
import { ExpenseCategory, ExpenseItem } from '../../types';

const CategoryItemSettingsPage: React.FC = () => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deduping, setDeduping] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);

  const loadAll = async () => {
    const cats = await categoryItemApi.getCategories();
    setCategories(Array.isArray(cats.data) ? cats.data : []);
    const all = await categoryItemApi.getAll();
    setItems(Array.isArray(all.data) ? all.data : []);
  };

  const handleDeduplicate = async () => {
    if (!window.confirm('Remove all duplicate categories and their items? Custom categories will be kept.')) return;
    setDeduping(true);
    try {
      const r = await categoryItemApi.deduplicate();
      await loadAll();
      alert(`Done — removed ${r.data.removed} duplicate(s).`);
    } finally {
      setDeduping(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('This will delete ALL your categories and items and restore the default list. Continue?')) return;
    setResetting(true);
    try {
      await categoryItemApi.reset();
      setSelectedCatId(null);
      await loadAll();
    } catch {
      // reset failed
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const filteredItems = useMemo(
    () => selectedCatId ? items.filter(i => i.categoryId === selectedCatId) : items,
    [items, selectedCatId]
  );

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatError(null);
    setAddingCat(true);
    try {
      await categoryItemApi.addCategory(newCatName.trim());
      setNewCatName('');
      loadAll();
    } catch (err: any) {
      setCatError(err?.response?.data?.message || err?.message || 'Failed to add category');
    } finally {
      setAddingCat(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Delete this category and all its items?')) return;
    await categoryItemApi.deleteCategory(id);
    if (selectedCatId === id) setSelectedCatId(null);
    loadAll();
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !selectedCatId) return;
    setItemError(null);
    setAddingItem(true);
    try {
      await categoryItemApi.addItem(newItemName.trim(), selectedCatId);
      setNewItemName('');
      loadAll();
    } catch (err: any) {
      setItemError(err?.response?.data?.message || err?.message || 'Failed to add item');
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    await categoryItemApi.deleteItem(id);
    loadAll();
  };

  const selectedCatName = categories.find(c => c.id === selectedCatId)?.name;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Categories & Items</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleDeduplicate}
            disabled={deduping}
            title="Remove duplicate categories keeping custom ones"
          >
            {deduping ? 'Deduplicating...' : 'Fix Duplicates'}
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={handleReset}
            disabled={resetting}
            title="Wipe all categories & items and restore defaults"
          >
            {resetting ? 'Resetting...' : 'Reset to Defaults'}
          </button>
        </div>
      </div>

      <div className="two-col-grid">
        {/* Categories */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>
            Categories
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
              ({categories.length})
            </span>
          </h3>

          <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 8, marginBottom: catError ? 8 : 16 }}>
            <input
              value={newCatName}
              onChange={e => { setNewCatName(e.target.value); setCatError(null); }}
              placeholder="New category name..."
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={addingCat || !newCatName.trim()}>
              {addingCat ? 'Adding...' : 'Add'}
            </button>
          </form>
          {catError && <div style={{ color: 'var(--expense)', fontSize: 12, marginBottom: 12 }}>{catError}</div>}

          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {categories.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedCatId(selectedCatId === c.id ? null : c.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  marginBottom: 2,
                  background: selectedCatId === c.id ? 'var(--accent-bg)' : 'transparent',
                  border: selectedCatId === c.id ? '1px solid var(--accent)' : '1px solid transparent',
                  transition: 'background 0.1s'
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{c.name}</span>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={ev => { ev.stopPropagation(); handleDeleteCategory(c.id); }}
                  style={{ opacity: 0.7 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
            Items
            {selectedCatName && (
              <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 400, color: 'var(--accent)' }}>
                — {selectedCatName}
              </span>
            )}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            {selectedCatId ? `${filteredItems.length} items` : `All items (${items.length}) — select a category to filter`}
          </p>

          {selectedCatId && (
            <>
              <form onSubmit={handleAddItem} style={{ display: 'flex', gap: 8, marginBottom: itemError ? 8 : 16 }}>
                <input
                  value={newItemName}
                  onChange={e => { setNewItemName(e.target.value); setItemError(null); }}
                  placeholder="New item name..."
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={addingItem || !newItemName.trim()}>
                  {addingItem ? 'Adding...' : 'Add'}
                </button>
              </form>
              {itemError && <div style={{ color: 'var(--expense)', fontSize: 12, marginBottom: 12 }}>{itemError}</div>}
            </>
          )}

          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {filteredItems.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0', fontSize: 13 }}>
                {selectedCatId ? 'No items yet. Add one above.' : 'No items found.'}
              </div>
            )}
            {filteredItems.map(i => (
              <div key={i.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '7px 10px',
                borderRadius: 6,
                marginBottom: 2,
                background: 'var(--bg-secondary)'
              }}>
                <div>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{i.name}</span>
                  {!selectedCatId && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                      {i.categoryName}
                    </span>
                  )}
                </div>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDeleteItem(i.id)}
                  style={{ opacity: 0.7 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryItemSettingsPage;

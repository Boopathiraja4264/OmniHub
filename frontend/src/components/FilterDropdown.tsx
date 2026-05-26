import React, { useState, useRef, useEffect } from 'react';

interface Option { label: string; value: string | number; favorite?: boolean; }

interface Props {
  value: string | number;
  options: Option[];
  onChange: (val: string | number) => void;
  placeholder?: string;
  minWidth?: number;
  disabled?: boolean;
  fullWidth?: boolean;
}

const FilterDropdown: React.FC<Props> = ({ value, options, onChange, placeholder = 'All', minWidth = 130, disabled = false, fullWidth = false }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Recalculate panel position when open
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const panelHeight = Math.min(280, options.length * 38 + 56);
    const showAbove = spaceBelow < panelHeight + 10 && rect.top > panelHeight + 10;
    setPanelStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(showAbove
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
    // Focus search after panel positions
    setTimeout(() => searchRef.current?.focus(), 10);
  }, [open, options.length]);

  const selected = options.find(o => o.value === value);
  const label = selected ? selected.label : placeholder;

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleOpen = () => {
    if (!disabled) {
      setOpen(o => !o);
      setQuery('');
    }
  };

  const handleSelect = (val: string | number) => {
    onChange(val);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: fullWidth ? 'block' : 'inline-block', minWidth: fullWidth ? undefined : minWidth, width: fullWidth ? '100%' : undefined }}>
      {/* Trigger */}
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '8px 14px',
          background: open ? 'var(--bg-hover)' : 'var(--bg-elevated)',
          border: `1px solid ${open ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 10,
          color: value !== 'ALL' && value !== '' ? 'var(--text-primary)' : 'var(--text-muted)',
          fontWeight: value !== 'ALL' && value !== '' ? 600 : 400,
          fontSize: 13,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} style={{
          ...panelStyle,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-float)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 280,
        }}>
          {/* Search input */}
          <div style={{ padding: '8px 8px 4px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') { setOpen(false); setQuery(''); }
                if (e.key === 'Enter' && filtered.length === 1) handleSelect(filtered[0].value);
              }}
              placeholder="Search…"
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 7,
                border: '1px solid var(--border)', background: 'var(--bg-main)',
                color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {/* Options list */}
          <div style={{ overflowY: 'auto', padding: '6px' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-muted)' }}>No matches</div>
            )}
            {filtered.map((opt, idx) => {
              const active = opt.value === value;
              const prevOpt = filtered[idx - 1];
              const showSeparator = idx > 0 && prevOpt?.favorite && !opt.favorite;
              return (
                <React.Fragment key={opt.value}>
                  {showSeparator && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 4px' }} />
                  )}
                  <div onClick={() => handleSelect(opt.value)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: active ? 600 : opt.favorite ? 500 : 400,
                      color: active ? 'var(--primary)' : 'var(--text-primary)',
                      background: active ? 'var(--primary-dim)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = active ? 'var(--primary-dim)' : 'transparent'; }}
                  >
                    {opt.favorite && (
                      <span style={{ fontSize: 11, color: '#f59e0b', flexShrink: 0 }}>★</span>
                    )}
                    <span style={{ flex: 1 }}>{opt.label}</span>
                    {active && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M2.5 7l3 3 6-6" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;

import React, { useState, useRef, useEffect } from 'react';

interface Option { label: string; value: string | number; }

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);
  const label = selected ? selected.label : placeholder;

  return (
    <div ref={ref} style={{ position: 'relative', display: fullWidth ? 'block' : 'inline-block', minWidth: fullWidth ? undefined : minWidth, width: fullWidth ? '100%' : undefined }}>
      {/* Trigger */}
      <button
        onClick={() => { if (!disabled) setOpen(o => !o); }}
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
        <span>{label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-float)',
          minWidth: '100%',
          maxHeight: 240,
          overflowY: 'auto',
          padding: '6px',
        }}>
          {options.map(opt => {
            const active = opt.value === value;
            return (
              <div key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--primary)' : 'var(--text-primary)',
                  background: active ? 'var(--primary-dim)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                {opt.label}
                {active && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3 3 6-6" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;

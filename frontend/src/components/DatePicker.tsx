import React, { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;                                           // YYYY-MM-DD
  onChange: (e: { target: { value: string } }) => void;  // matches native input
  min?: string;
  max?: string;
  required?: boolean;
  style?: React.CSSProperties;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md';  // 'sm' matches compact inputSm fields; 'md' is default
}

type ViewMode = 'days' | 'months' | 'years';

const DAYS   = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const todayStr    = () => new Date().toISOString().split('T')[0];
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const firstDow    = (y: number, m: number) => new Date(y, m, 1).getDay();
const pad         = (n: number) => String(n).padStart(2, '0');
const toStr       = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const formatDisplay = (s: string) => {
  if (!s) return '';
  const d = new Date(s + 'T00:00:00');
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const NAV: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg-elevated)',
  color: 'var(--text-muted)', fontSize: 17, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
};

const DatePicker: React.FC<Props> = ({
  value, onChange, min, max, required, style, className,
  placeholder = 'Select date', disabled = false, fullWidth = false, size = 'md',
}) => {
  const btnPadding    = size === 'sm' ? '6px 9px'  : '10px 14px';
  const btnRadius     = size === 'sm' ? 7           : 9;
  const btnFontSize   = size === 'sm' ? '12px'      : '13.5px';
  const btnFontWeight = (val: boolean) => val ? (size === 'sm' ? 600 : 600) : 400;
  const today       = todayStr();
  const ref         = useRef<HTMLDivElement>(null);
  const triggerRef  = useRef<HTMLButtonElement>(null);
  const [open, setOpen]         = useState(false);
  const [panelPos, setPanelPos] = useState<React.CSSProperties>({});
  const [viewMode, setViewMode] = useState<ViewMode>('days');

  const initYear  = () => { const d = value ? new Date(value + 'T00:00:00') : new Date(); return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear(); };
  const initMonth = () => { const d = value ? new Date(value + 'T00:00:00') : new Date(); return isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth(); };

  const [vy, setVy] = useState(initYear);
  const [vm, setVm] = useState(initMonth);

  // year-grid page: 12 years starting here
  const [yearPage, setYearPage] = useState(() => {
    const y = initYear();
    return y - (y % 12);
  });

  // Sync view to external value changes
  useEffect(() => {
    if (!value) return;
    const d = new Date(value + 'T00:00:00');
    if (!isNaN(d.getTime())) { setVy(d.getFullYear()); setVm(d.getMonth()); }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open]);

  // Compute panel position
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const panelH = viewMode === 'days' ? 310 : 260;
    const panelW = Math.max(r.width, 280);
    const spaceBelow = window.innerHeight - r.bottom;
    const showAbove  = spaceBelow < panelH + 10 && r.top > panelH + 10;
    const left = Math.min(r.left, window.innerWidth - panelW - 8);
    setPanelPos({
      position: 'fixed', left, width: panelW, zIndex: 9999,
      ...(showAbove ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
    });
  }, [open, viewMode]);

  const openPicker = () => {
    if (disabled) return;
    if (!open) setViewMode('days');
    setOpen(o => !o);
  };

  const prevMonth = () => vm === 0  ? (setVm(11), setVy(y => y - 1)) : setVm(m => m - 1);
  const nextMonth = () => vm === 11 ? (setVm(0),  setVy(y => y + 1)) : setVm(m => m + 1);

  const isOutOfRange = (s: string) => (min && s < min) || (max && s > max);

  const select = (s: string) => {
    onChange({ target: { value: s } });
    setOpen(false);
    setViewMode('days');
  };

  // Build 42-cell calendar grid
  const cells: { s: string; day: number; curr: boolean }[] = [];
  const prevDays = daysInMonth(vm === 0 ? vy - 1 : vy, vm === 0 ? 11 : vm - 1);
  const fd       = firstDow(vy, vm);
  const dim      = daysInMonth(vy, vm);

  for (let i = fd - 1; i >= 0; i--) {
    const d = prevDays - i;
    const pm = vm === 0 ? 11 : vm - 1;
    const py = vm === 0 ? vy - 1 : vy;
    cells.push({ s: toStr(py, pm, d), day: d, curr: false });
  }
  for (let d = 1; d <= dim; d++) cells.push({ s: toStr(vy, vm, d), day: d, curr: true });
  const need = 42 - cells.length;
  for (let d = 1; d <= need; d++) {
    const nm = vm === 11 ? 0 : vm + 1;
    const ny = vm === 11 ? vy + 1 : vy;
    cells.push({ s: toStr(ny, nm, d), day: d, curr: false });
  }

  // ── panel content per view ───────────────────────────────────────────────

  const renderDays = () => (
    <>
      {/* Month / Year header — click to jump to month picker */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 2px' }}>
        <button type="button" onClick={prevMonth} style={NAV}>‹</button>
        <button
          type="button"
          onClick={() => setViewMode('months')}
          style={{
            fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px',
            background: 'none', border: 'none', cursor: 'pointer', padding: '3px 8px',
            borderRadius: 6, transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          {MONTHS[vm]} {vy}
        </button>
        <button type="button" onClick={nextMonth} style={NAV}>›</button>
      </div>

      {/* Day-of-week row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', padding: '3px 0', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((cell, i) => {
          const sel = cell.s === value;
          const isT = cell.s === today;
          const oor = isOutOfRange(cell.s);
          return (
            <button
              key={i} type="button"
              onClick={() => !oor && select(cell.s)}
              style={{
                padding: '6px 2px', borderRadius: 8,
                border: isT && !sel ? '1px solid var(--primary-glow)' : '1px solid transparent',
                background: sel ? 'var(--primary)' : 'transparent',
                color: sel ? '#fff' : oor ? 'var(--border)' : !cell.curr ? 'var(--text-muted)' : isT ? 'var(--primary)' : 'var(--text-primary)',
                fontSize: 12, fontWeight: sel || isT ? 700 : 400,
                cursor: oor ? 'default' : 'pointer',
                opacity: !cell.curr ? 0.4 : oor ? 0.3 : 1,
                textAlign: 'center', fontFamily: 'Space Grotesk, sans-serif',
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={e => { if (!sel && !oor) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={e => { if (!sel)        (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={() => select(today)}
          style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-dim)', border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: 20, fontFamily: 'Space Grotesk, sans-serif' }}>
          Today
        </button>
        {value && (
          <button type="button" onClick={() => { onChange({ target: { value: '' } }); setOpen(false); }}
            style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', fontFamily: 'Space Grotesk, sans-serif' }}>
            Clear
          </button>
        )}
      </div>
    </>
  );

  const renderMonths = () => (
    <>
      {/* Year header — click to jump to year picker */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '0 2px' }}>
        <button type="button" onClick={() => setVy(y => y - 1)} style={NAV}>‹</button>
        <button
          type="button"
          onClick={() => { setYearPage(vy - (vy % 12)); setViewMode('years'); }}
          style={{
            fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px',
            background: 'none', border: 'none', cursor: 'pointer', padding: '3px 8px',
            borderRadius: 6, transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          {vy}
        </button>
        <button type="button" onClick={() => setVy(y => y + 1)} style={NAV}>›</button>
      </div>

      {/* Month grid 3×4 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {MONTHS_SHORT.map((m, i) => {
          const sel = i === vm && vy === (value ? new Date(value + 'T00:00:00').getFullYear() : -1);
          const isCurrent = i === new Date().getMonth() && vy === new Date().getFullYear();
          return (
            <button
              key={m} type="button"
              onClick={() => { setVm(i); setViewMode('days'); }}
              style={{
                padding: '9px 4px', borderRadius: 8, fontSize: 13, fontWeight: sel || isCurrent ? 700 : 400,
                border: isCurrent && !sel ? '1px solid var(--primary-glow)' : '1px solid transparent',
                background: sel ? 'var(--primary)' : 'transparent',
                color: sel ? '#fff' : isCurrent ? 'var(--primary)' : 'var(--text-primary)',
                cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif',
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {m}
            </button>
          );
        })}
      </div>
    </>
  );

  const renderYears = () => {
    const years = Array.from({ length: 12 }, (_, i) => yearPage + i);
    const curY = value ? new Date(value + 'T00:00:00').getFullYear() : -1;
    const thisY = new Date().getFullYear();
    return (
      <>
        {/* Decade header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '0 2px' }}>
          <button type="button" onClick={() => setYearPage(p => p - 12)} style={NAV}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
            {yearPage} – {yearPage + 11}
          </span>
          <button type="button" onClick={() => setYearPage(p => p + 12)} style={NAV}>›</button>
        </div>

        {/* Year grid 3×4 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {years.map(y => {
            const sel = y === curY;
            const isCurrent = y === thisY;
            return (
              <button
                key={y} type="button"
                onClick={() => { setVy(y); setViewMode('months'); }}
                style={{
                  padding: '9px 4px', borderRadius: 8, fontSize: 13, fontWeight: sel || isCurrent ? 700 : 400,
                  border: isCurrent && !sel ? '1px solid var(--primary-glow)' : '1px solid transparent',
                  background: sel ? 'var(--primary)' : 'transparent',
                  color: sel ? '#fff' : isCurrent ? 'var(--primary)' : 'var(--text-primary)',
                  cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif',
                  transition: 'background 0.1s, color 0.1s',
                }}
                onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                {y}
              </button>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        display: fullWidth ? 'block' : 'inline-block',
        width: fullWidth ? '100%' : undefined,
        boxSizing: 'border-box',
        ...(style || {}),
      }}
      className={className}
    >
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={openPicker}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: btnPadding, borderRadius: btnRadius,
          background: open ? 'var(--bg-elevated)' : 'var(--bg-input)',
          border: `1px solid ${open ? 'var(--border-focus)' : 'var(--border)'}`,
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          fontWeight: btnFontWeight(!!value),
          fontSize: btnFontSize,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          fontFamily: 'Space Grotesk, sans-serif',
          transition: 'border-color 0.18s, box-shadow 0.18s',
          boxShadow: open ? '0 0 0 3px var(--primary-dim)' : 'none',
          boxSizing: 'border-box',
          whiteSpace: 'nowrap',
        }}
      >
        <span>{value ? formatDisplay(value) : placeholder}</span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0, color: 'var(--text-muted)', opacity: 0.7 }}>
          <rect x="1" y="2" width="14" height="13" rx="2"/>
          <line x1="1" y1="6" x2="15" y2="6"/>
          <line x1="5" y1="1" x2="5" y2="4"/>
          <line x1="11" y1="1" x2="11" y2="4"/>
        </svg>
      </button>

      {/* Calendar panel */}
      {open && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            ...panelPos,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: 'var(--shadow-float)',
            padding: '14px 12px 10px',
            userSelect: 'none',
          }}
        >
          {viewMode === 'days'   && renderDays()}
          {viewMode === 'months' && renderMonths()}
          {viewMode === 'years'  && renderYears()}
        </div>
      )}

      {/* Hidden native input keeps form validation working */}
      {required && (
        <input
          tabIndex={-1}
          type="date"
          value={value}
          onChange={() => {}}
          required={required}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none', top: 0, left: 0 }}
        />
      )}
    </div>
  );
};

export default DatePicker;

import React, { useState, useEffect } from 'react';
import { TimeEntry } from '../../../types';

interface ActiveTimerBannerProps {
  entry: TimeEntry | undefined;
  onStop: () => void;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

const ActiveTimerBanner: React.FC<ActiveTimerBannerProps> = ({ entry, onStop }) => {
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    if (!entry) {
      setElapsed(0);
      return;
    }

    const startMs = new Date(entry.startedAt).getTime();

    const calc = () => {
      const diff = Math.floor((Date.now() - startMs) / 1000);
      setElapsed(diff < 0 ? 0 : diff);
    };

    calc(); // initial call
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [entry]);

  if (!entry) return null;

  return (
    <div
      style={{
        position:       'sticky',
        top:            0,
        zIndex:         200,
        display:        'flex',
        alignItems:     'center',
        gap:            '14px',
        padding:        '10px 20px',
        background:     'rgba(76,175,130,0.12)',
        borderBottom:   '1px solid rgba(76,175,130,0.35)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Pulsing dot */}
      <span
        style={{
          width:        '10px',
          height:       '10px',
          borderRadius: '50%',
          background:   '#4caf82',
          flexShrink:   0,
          animation:    'timerPulse 1.4s ease-in-out infinite',
        }}
      />

      <span style={{ fontSize: '13px', fontWeight: 600, color: '#4caf82' }}>
        Timer Running
      </span>

      {/* Elapsed time */}
      <span
        style={{
          fontVariantNumeric: 'tabular-nums',
          fontSize:           '15px',
          fontWeight:         700,
          color:              '#4caf82',
          minWidth:           '60px',
        }}
      >
        {formatElapsed(elapsed)}
      </span>

      {/* Description */}
      {entry.description && (
        <span
          style={{
            flex:         1,
            fontSize:     '13px',
            color:        'var(--text-muted)',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}
        >
          {entry.description}
        </span>
      )}

      <div style={{ marginLeft: 'auto' }}>
        <button
          onClick={onStop}
          style={{
            padding:      '5px 16px',
            borderRadius: '7px',
            border:       '1px solid #e05c6a',
            background:   'rgba(224,92,106,0.12)',
            color:        '#e05c6a',
            fontSize:     '13px',
            fontWeight:   600,
            cursor:       'pointer',
          }}
        >
          Stop
        </button>
      </div>

      <style>{`
        @keyframes timerPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
};

export default ActiveTimerBanner;

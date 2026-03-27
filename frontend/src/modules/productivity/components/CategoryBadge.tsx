import React from 'react';

const CATEGORY_COLORS: Record<string, { bg: string; color: string; dot: string }> = {
  PERSONAL:     { bg: 'rgba(106,143,232,0.15)', color: '#6a8fe8', dot: '#6a8fe8' },
  PROFESSIONAL: { bg: 'rgba(168,116,212,0.15)', color: '#a874d4', dot: '#a874d4' },
  DEEP_WORK:    { bg: 'rgba(76,175,130,0.15)',  color: '#4caf82', dot: '#4caf82' },
  BREAK:        { bg: 'rgba(224,156,92,0.15)',  color: '#e09c5c', dot: '#e09c5c' },
  ADMIN:        { bg: 'rgba(140,138,150,0.15)', color: '#8c8a96', dot: '#8c8a96' },
};

const LABEL_MAP: Record<string, string> = {
  PERSONAL:     'Personal',
  PROFESSIONAL: 'Professional',
  DEEP_WORK:    'Deep Work',
  BREAK:        'Break',
  ADMIN:        'Admin',
};

interface CategoryBadgeProps {
  category: string;
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  const scheme = CATEGORY_COLORS[category] ?? { bg: 'rgba(140,138,150,0.15)', color: '#8c8a96', dot: '#8c8a96' };
  const label  = LABEL_MAP[category] ?? category;

  return (
    <span
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            '5px',
        padding:        '2px 8px',
        borderRadius:   '999px',
        fontSize:       '11px',
        fontWeight:     500,
        letterSpacing:  '0.02em',
        background:     scheme.bg,
        color:          scheme.color,
        whiteSpace:     'nowrap',
      }}
    >
      <span
        style={{
          width:        '6px',
          height:       '6px',
          borderRadius: '50%',
          background:   scheme.dot,
          flexShrink:   0,
        }}
      />
      {label}
    </span>
  );
};

export default CategoryBadge;

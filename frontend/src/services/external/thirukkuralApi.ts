/**
 * External API: Thirukkural
 * Source: https://tamil-kural-api.vercel.app
 * All Thirukkural-related logic lives here.
 * Zero backend cost — one fetch per day, cached in localStorage.
 */

const BASE_URL = 'https://tamil-kural-api.vercel.app/api/kural';

const KEYS = {
  seen: 'kural_seen',
  day: 'kural_day_cache',
  data: 'kural_data_cache',
} as const;

export const pickNewKuralNum = (): number => {
  let seen: number[] = [];
  try { seen = JSON.parse(localStorage.getItem(KEYS.seen) || '[]'); } catch {}
  if (seen.length >= 1330) seen = []; // full cycle → start fresh
  let num: number;
  do { num = Math.floor(Math.random() * 1330) + 1; } while (seen.includes(num));
  seen.push(num);
  localStorage.setItem(KEYS.seen, JSON.stringify(seen));
  return num;
};

export const getDailyKuralNum = (): number => {
  const today = new Date().toDateString();
  try {
    const p = JSON.parse(localStorage.getItem(KEYS.day) || '{}');
    if (p.date === today) return p.num;
  } catch {}
  const num = pickNewKuralNum();
  localStorage.setItem(KEYS.day, JSON.stringify({ date: today, num }));
  return num;
};

export const setCachedDailyNum = (num: number) => {
  localStorage.setItem(KEYS.day, JSON.stringify({ date: new Date().toDateString(), num }));
};

export const getCachedKural = (): any | null => {
  try {
    const p = JSON.parse(localStorage.getItem(KEYS.data) || '{}');
    if (p.date === new Date().toDateString()) return p.data;
  } catch {}
  return null;
};

export const fetchKural = (num: number): Promise<any> =>
  fetch(`${BASE_URL}/${num}`)
    .then(r => { if (!r.ok) throw new Error('API error'); return r.json(); })
    .then(data => {
      localStorage.setItem(KEYS.data, JSON.stringify({ date: new Date().toDateString(), data }));
      return data;
    });

/** Returns the best Tamil explanation, prefix stripped */
export const getExplanation = (data: any): string => {
  // Primary: Salamon Pappaiah — clearest for common readers (Sun TV pattimandram tested)
  // Fallback: Mu. Varadarajan (Mu.Va) — scholarly but slightly formal
  const raw: string = data?.meaning?.ta_salamon || data?.meaning?.ta_mu_va || '';
  return raw.replace(/^[^:]+:\s*/, '');
};

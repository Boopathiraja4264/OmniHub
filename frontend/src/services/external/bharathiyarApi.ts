/**
 * Bharathiyar (Mahakavi Subramania Bharathi) poems
 * Source: raw GitHub text corpus — free, no auth, verified accessible
 * Fetched once and cached in localStorage; no repeat until all poems shown.
 */

const POEMS_URL =
  'https://raw.githubusercontent.com/NitheshNSK/BharathiyarTextGenerationModel/main/data/Bharathiyar_Poems_Excerpts.txt';

const B_KEYS = {
  poems: 'bharathi_poems_v1',
  seen:  'bharathi_seen_v1',
  day:   'bharathi_day_v1',
} as const;

export interface BharathiPoem {
  lines: string[]; // all lines of the excerpt
}

// ── Parse ────────────────────────────────────────────────────────────────────

function parsePoems(raw: string): BharathiPoem[] {
  return raw
    .split(/\r?\n\r?\n+/)                            // blank line = poem separator
    .map(block =>
      block.split(/\r?\n/)
           .map(l => l.trim())
           .filter(l => l.length > 0)
    )
    .filter(lines => lines.length >= 2)              // need at least 2 lines
    .map(lines => ({ lines }));
}

// ── Cache ────────────────────────────────────────────────────────────────────

function getCachedPoems(): BharathiPoem[] | null {
  try {
    const raw = localStorage.getItem(B_KEYS.poems);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return null;
}

export async function loadBharathiPoems(): Promise<BharathiPoem[]> {
  const cached = getCachedPoems();
  if (cached) return cached;

  const res = await fetch(POEMS_URL);
  if (!res.ok) throw new Error('Failed to fetch Bharathiyar poems');
  const text = await res.text();
  const poems = parsePoems(text);
  if (poems.length === 0) throw new Error('No poems parsed');
  localStorage.setItem(B_KEYS.poems, JSON.stringify(poems));
  return poems;
}

// ── Selection ────────────────────────────────────────────────────────────────

export function pickNewBharathiIdx(total: number): number {
  let seen: number[] = [];
  try { seen = JSON.parse(localStorage.getItem(B_KEYS.seen) || '[]'); } catch {}
  if (seen.length >= total) seen = [];
  const unseen = Array.from({ length: total }, (_, i) => i).filter(i => !seen.includes(i));
  const idx = unseen[Math.floor(Math.random() * unseen.length)];
  seen.push(idx);
  localStorage.setItem(B_KEYS.seen, JSON.stringify(seen));
  return idx;
}

export function getDailyBharathiIdx(total: number): number {
  const today = new Date().toDateString();
  try {
    const p = JSON.parse(localStorage.getItem(B_KEYS.day) || '{}');
    if (p.date === today && typeof p.idx === 'number' && p.idx < total) return p.idx;
  } catch {}
  const idx = pickNewBharathiIdx(total);
  localStorage.setItem(B_KEYS.day, JSON.stringify({ date: today, idx }));
  return idx;
}

export function setCachedDailyBharathiIdx(idx: number) {
  localStorage.setItem(B_KEYS.day, JSON.stringify({ date: new Date().toDateString(), idx }));
}

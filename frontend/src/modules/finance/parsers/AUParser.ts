import * as pdfjsLib from 'pdfjs-dist';
import { ParsedRow } from './KotakParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const MONTH_MAP: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

function normalizeMonth(m: string): string {
  return MONTH_MAP[m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()] || '01';
}

function tryParseDate(raw: string): string {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m1 = s.match(/^(\d{1,2})[\s\-/](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s\-/](\d{4})$/i);
  if (m1) return `${m1[3]}-${normalizeMonth(m1[2])}-${m1[1].padStart(2, '0')}`;
  const m1b = s.match(/^(\d{1,2})[\s\-/](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s\-/](\d{2})$/i);
  if (m1b) return `20${m1b[3]}-${normalizeMonth(m1b[2])}-${m1b[1].padStart(2, '0')}`;
  const m2 = s.match(/^(\d{1,2})[-/](\d{2})[-/](\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  const m3 = s.match(/^(\d{1,2})[-/](\d{2})[-/](\d{2})$/);
  if (m3) return `20${m3[3]}-${m3[2].padStart(2, '0')}-${m3[1].padStart(2, '0')}`;
  return '';
}

function parseAmount(s: string): number {
  return parseFloat((s || '').replace(/,/g, '').trim()) || 0;
}

const AMOUNT_RE = /^[\d,]+\.\d{2}$/;

async function extractLines(file: File): Promise<{ lines: { x: number; y: number; text: string }[][] }> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const allItems: { x: number; y: number; text: string }[] = [];
  let yOffset = 0;
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    for (const item of textContent.items as any[]) {
      if (!item.str?.trim()) continue;
      allItems.push({ x: item.transform[4], y: yOffset + (viewport.height - item.transform[5]), text: item.str.trim() });
    }
    yOffset += viewport.height + 20;
  }
  allItems.sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: { x: number; y: number; text: string }[][] = [];
  let cur: typeof allItems = [], lastY = -1;
  for (const item of allItems) {
    if (lastY < 0 || Math.abs(item.y - lastY) <= 5) { cur.push(item); if (item.y > lastY) lastY = item.y; }
    else { if (cur.length) lines.push([...cur]); cur = [item]; lastY = item.y; }
  }
  if (cur.length) lines.push(cur);
  return { lines };
}

// AU date is "DD Mon YYYY" — may arrive as 3 separate tokens in pdfjs.
// Try single token first, then 3-token and 2-token combinations.
function findDateInTokens(tokens: string[]): { date: string; raw: string } | null {
  for (const t of tokens) {
    const d = tryParseDate(t);
    if (d) return { date: d, raw: t };
  }
  for (let i = 0; i <= tokens.length - 3; i++) {
    const c = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
    const d = tryParseDate(c);
    if (d) return { date: d, raw: c };
  }
  for (let i = 0; i <= tokens.length - 2; i++) {
    const c = `${tokens[i]} ${tokens[i + 1]}`;
    const d = tryParseDate(c);
    if (d) return { date: d, raw: c };
  }
  return null;
}

// Columns: Transaction Date | Value Date | Description/Narration | Cheque/Reference No. | Debit (₹) | Credit (₹) | Balance (₹)
// Date arrives as 3 tokens ("03 Jan 2026"). State machine handles multi-line rows.
export async function parseAUPDF(file: File): Promise<ParsedRow[]> {
  const { lines } = await extractLines(file);

  let debitX = -1, creditX = -1;
  for (const line of lines) {
    const text = line.map(i => i.text).join(' ');
    if (/Transaction\s*Date/i.test(text) && /Debit/i.test(text) && /Credit/i.test(text)) {
      for (const item of line) {
        if (/Debit/i.test(item.text)) debitX = item.x;
        if (/Credit/i.test(item.text)) creditX = item.x;
      }
      break;
    }
  }

  let inTable = false;
  let currentDate = '';
  let currentRawDate = '';
  const rows: ParsedRow[] = [];

  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);
    const tokens = line.map(i => i.text);
    const text = tokens.join(' ');

    if (/Transaction\s*Date/i.test(text) && /Debit/i.test(text)) { inTable = true; continue; }
    if (/Total|Opening Balance/i.test(text)) { currentDate = ''; continue; }
    if (!inTable) continue;

    const dateResult = findDateInTokens(tokens);
    if (dateResult) { currentDate = dateResult.date; currentRawDate = dateResult.raw; }

    if (!currentDate) continue;

    const amounts: { x: number; v: number }[] = [];
    for (const item of line) {
      if (AMOUNT_RE.test(item.text)) amounts.push({ x: item.x, v: parseAmount(item.text) });
    }
    if (amounts.length < 2) continue;

    amounts.sort((a, b) => a.x - b.x);
    const balance = amounts[amounts.length - 1].v;
    const txn = amounts[amounts.length - 2];
    if (txn.v <= 0) continue;

    let type: 'EXPENSE' | 'INCOME';
    if (debitX >= 0 && creditX >= 0) {
      type = Math.abs(txn.x - debitX) <= Math.abs(txn.x - creditX) ? 'EXPENSE' : 'INCOME';
    } else {
      type = /\bCR\b|MONEY TRANSFER CR/i.test(text) ? 'INCOME' : 'EXPENSE';
    }

    rows.push({ date: currentDate, rawDate: currentRawDate, amount: txn.v, type, balance });
    currentDate = '';
  }

  return rows.filter(r => r.date && r.amount > 0);
}

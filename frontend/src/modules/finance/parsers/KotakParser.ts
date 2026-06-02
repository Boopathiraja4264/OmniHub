import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface ParsedRow {
  date: string;        // ISO: YYYY-MM-DD
  rawDate: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  balance: number;
}

const MONTH_MAP: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

function normalizeMonth(m: string): string {
  const key = m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
  return MONTH_MAP[key] || '01';
}

function tryParseDate(raw: string): string {
  const s = raw.trim();
  // YYYY-MM-DD (ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD Mon YYYY  |  DD-Mon-YYYY  |  DD/Mon/YYYY  (4-digit year)
  const m1 = s.match(/^(\d{1,2})[\s\-\/](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s\-\/](\d{4})$/i);
  if (m1) return `${m1[3]}-${normalizeMonth(m1[2])}-${m1[1].padStart(2, '0')}`;
  // DD Mon YY  |  DD-Mon-YY  |  DD/Mon/YY  (2-digit year e.g. 15-Mar-26)
  const m1b = s.match(/^(\d{1,2})[\s\-\/](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s\-\/](\d{2})$/i);
  if (m1b) return `20${m1b[3]}-${normalizeMonth(m1b[2])}-${m1b[1].padStart(2, '0')}`;
  // DD/MM/YYYY  |  DD-MM-YYYY
  const m2 = s.match(/^(\d{1,2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  // DD/MM/YY  |  DD-MM-YY
  const m3 = s.match(/^(\d{1,2})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (m3) return `20${m3[3]}-${m3[2].padStart(2, '0')}-${m3[1].padStart(2, '0')}`;
  return '';
}

function toISODate(raw: string): string {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return tryParseDate(raw);
}

function parseAmount(s: string): number {
  return parseFloat((s || '').replace(/,/g, '').trim()) || 0;
}

const AMOUNT_RE = /^-?[\d,]+\.\d{2}$/;

// ─── Extract text lines + page width ─────────────────────────────────────────
async function extractLines(file: File): Promise<{
  lines: { x: number; y: number; text: string }[][];
  pageWidth: number;
}> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const allItems: { x: number; y: number; text: string }[] = [];
  let yOffset = 0;
  let pageWidth = 595; // A4 default

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    if (p === 1) pageWidth = viewport.width;
    const textContent = await page.getTextContent();
    for (const item of textContent.items as any[]) {
      if (!item.str?.trim()) continue;
      allItems.push({
        x: item.transform[4],
        y: yOffset + (viewport.height - item.transform[5]),
        text: item.str.trim(),
      });
    }
    yOffset += viewport.height + 20;
  }

  allItems.sort((a, b) => a.y - b.y || a.x - b.x);

  const lines: { x: number; y: number; text: string }[][] = [];
  let cur: typeof allItems = [];
  let lastY = -1;
  for (const item of allItems) {
    if (lastY < 0 || Math.abs(item.y - lastY) <= 5) {
      cur.push(item);
      if (item.y > lastY) lastY = item.y;
    } else {
      if (cur.length) lines.push([...cur]);
      cur = [item];
      lastY = item.y;
    }
  }
  if (cur.length) lines.push(cur);
  return { lines, pageWidth };
}

// ─── Find a date in a line's tokens (handles all formats) ────────────────────
function findDateInTokens(tokens: string[]): string {
  for (const t of tokens) {
    if (tryParseDate(t)) return t;
  }
  for (let i = 0; i <= tokens.length - 3; i++) {
    const c = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
    if (tryParseDate(c)) return c;
  }
  for (let i = 0; i <= tokens.length - 2; i++) {
    const c = `${tokens[i]} ${tokens[i + 1]}`;
    if (tryParseDate(c)) return c;
  }
  return '';
}

// ─── Main Kotak PDF parser ─────────────────────────────────────────────────────
// Strategy: on each transaction line, the RIGHTMOST amount is the running balance,
// and the amount to its left is the transaction amount (DR or CR).
// Type (EXPENSE/INCOME) is determined by whether the balance went DOWN or UP.
export async function parseKotakPDF(file: File): Promise<ParsedRow[]> {
  const { lines, pageWidth } = await extractLines(file);


  const amountXThreshold = 0;

  interface RawRow { date: string; rawDate: string; amounts: { x: number; v: number }[] }
  const rawRows: RawRow[] = [];

  let inRow = false;
  let rawDate = '';
  let rowAmounts: { x: number; v: number }[] = [];

  const flush = () => {
    if (!inRow || !rawDate) return;
    if (rowAmounts.length > 0) rawRows.push({ date: tryParseDate(rawDate), rawDate, amounts: [...rowAmounts] });
    inRow = false; rawDate = ''; rowAmounts = [];
  };

  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);
    const tokens = line.map(i => i.text);
    const text = tokens.join(' ');

    if (/Opening Balance|Closing Balance/i.test(text)) { inRow = false; rawDate = ''; continue; }

    const dateStr = findDateInTokens(tokens);
    if (dateStr) { flush(); inRow = true; rawDate = dateStr; rowAmounts = []; }
    if (!inRow) continue;

    for (const item of line) {
      if (AMOUNT_RE.test(item.text) && item.x >= amountXThreshold) {
        rowAmounts.push({ x: item.x, v: parseAmount(item.text) });
      }
    }
  }
  flush();


  // Build ParsedRows.
  // Amounts are signed: negative = DEBIT (EXPENSE), positive = CREDIT (INCOME).
  // Rightmost by x = running balance (always positive).
  // Second-rightmost = transaction amount (negative for debit, positive for credit).
  const rows: ParsedRow[] = [];
  for (const raw of rawRows) {
    if (!raw.date || raw.amounts.length < 2) continue;
    raw.amounts.sort((a, b) => a.x - b.x);
    const balance   = raw.amounts[raw.amounts.length - 1].v;
    const txnRaw    = raw.amounts[raw.amounts.length - 2].v;
    const txnAmount = Math.abs(txnRaw);
    if (txnAmount <= 0) continue;
    const type: 'EXPENSE' | 'INCOME' = txnRaw < 0 ? 'EXPENSE' : 'INCOME';
    rows.push({ date: raw.date, rawDate: raw.rawDate, amount: txnAmount, type, balance });
  }

  return rows.filter(r => r.date && r.amount > 0);
}

// ─── CSV parser ───────────────────────────────────────────────────────────────
function parseCSVText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  let headerIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    if (/date/i.test(lines[i])) { headerIdx = i; break; }
  }
  const splitCSV = (line: string): string[] => {
    const result: string[] = [];
    let cur = ''; let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { result.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    result.push(cur.trim());
    return result;
  };
  const headers = splitCSV(lines[headerIdx]);
  const records: Record<string, string>[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const vals = splitCSV(lines[i]);
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => { rec[h.trim()] = vals[idx] || ''; });
    records.push(rec);
  }
  return records;
}

export async function parseKotakCSV(file: File): Promise<ParsedRow[]> {
  const text = await file.text();
  const records = parseCSVText(text);
  const rows: ParsedRow[] = [];
  for (const row of records) {
    const dateRaw = row['Transaction Date'] || row['Date'] || row['Txn Date'] || '';
    const drRaw   = row['Withdrawal (Dr.)'] || row['Debit'] || row['Dr.'] || row['Dr'] || '';
    const crRaw   = row['Deposit (Cr.)']    || row['Credit'] || row['Cr.'] || row['Cr'] || '';
    const balRaw  = row['Balance'] || '';
    if (!dateRaw) continue;
    const dr = parseAmount(drRaw);
    const cr = parseAmount(crRaw);
    const amount = dr > 0 ? dr : cr;
    if (!amount) continue;
    rows.push({ date: toISODate(dateRaw), rawDate: dateRaw, amount, type: dr > 0 ? 'EXPENSE' : 'INCOME', balance: parseAmount(balRaw) });
  }
  return rows.filter(r => r.date && r.amount > 0);
}

// ─── Excel parser ─────────────────────────────────────────────────────────────
export async function parseKotakExcel(file: File): Promise<ParsedRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const rows: ParsedRow[] = [];
  for (const row of data) {
    const dateRaw = String(row['Transaction Date'] || row['Date'] || row['Txn Date'] || '');
    const drRaw   = String(row['Withdrawal (Dr.)'] || row['Debit'] || row['Dr.'] || row['Dr'] || '');
    const crRaw   = String(row['Deposit (Cr.)']    || row['Credit'] || row['Cr.'] || row['Cr'] || '');
    const balRaw  = String(row['Balance'] || '');
    if (!dateRaw) continue;
    const dr = parseAmount(drRaw);
    const cr = parseAmount(crRaw);
    const amount = dr > 0 ? dr : cr;
    if (!amount) continue;
    rows.push({ date: toISODate(dateRaw), rawDate: dateRaw, amount, type: dr > 0 ? 'EXPENSE' : 'INCOME', balance: parseAmount(balRaw) });
  }
  return rows.filter(r => r.date && r.amount > 0);
}

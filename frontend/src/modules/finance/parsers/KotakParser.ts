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

function parseDate(raw: string): string {
  const parts = raw.trim().split(/\s+/);
  if (parts.length < 3) return '';
  const dd = parts[0].padStart(2, '0');
  const mm = MONTH_MAP[parts[1]] || '01';
  const yyyy = parts[2];
  return `${yyyy}-${mm}-${dd}`;
}

function parseAmount(s: string): number {
  return parseFloat((s || '').replace(/,/g, '').trim()) || 0;
}

function toISODate(raw: string): string {
  if (!raw) return '';
  if (/\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  if (/\d{2}\/\d{2}\/\d{4}/.test(raw)) {
    const [dd, mm, yyyy] = raw.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  return parseDate(raw);
}

// ─── PDF: extract text lines from all pages ───────────────────────────────────
async function extractLines(file: File): Promise<{ x: number; y: number; text: string }[][]> {
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
    if (lastY < 0 || Math.abs(item.y - lastY) <= 4) {
      cur.push(item);
      if (item.y > lastY) lastY = item.y;
    } else {
      if (cur.length) lines.push([...cur]);
      cur = [item];
      lastY = item.y;
    }
  }
  if (cur.length) lines.push(cur);
  return lines;
}

// Kotak column x-boundaries (PDF units, scale 1)
const COL_DR_MIN  = 340;
const COL_CR_MIN  = 430;
const COL_BAL_MIN = 510;

const DATE_RE      = /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/i;
const ROW_NUM_RE   = /^\d+$/;
const AMOUNT_RE    = /^[\d,]+\.\d{2}$/;

export async function parseKotakPDF(file: File): Promise<ParsedRow[]> {
  const lines = await extractLines(file);
  const rows: ParsedRow[] = [];

  let inRow = false;
  let rawDate = '';
  let withdrawal = 0;
  let deposit = 0;
  let balance = 0;

  const flush = () => {
    if (!inRow || !rawDate) return;
    const amount = withdrawal > 0 ? withdrawal : deposit;
    if (amount > 0) {
      rows.push({ date: parseDate(rawDate), rawDate, amount, type: withdrawal > 0 ? 'EXPENSE' : 'INCOME', balance });
    }
    inRow = false; rawDate = ''; withdrawal = 0; deposit = 0; balance = 0;
  };

  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);
    const tokens = line.map(i => i.text);
    const text = tokens.join(' ');

    if (text.includes('Opening Balance')) { inRow = false; rawDate = ''; continue; }

    // Detect row start: row number + DD Mon YYYY
    let dateStr = '';
    for (let i = 0; i < tokens.length - 2; i++) {
      const candidate = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
      if (DATE_RE.test(candidate) && (i === 0 || ROW_NUM_RE.test(tokens[i - 1]))) {
        dateStr = candidate;
        break;
      }
    }

    if (dateStr) { flush(); inRow = true; rawDate = dateStr; withdrawal = 0; deposit = 0; balance = 0; }
    if (!inRow) continue;

    for (const item of line) {
      if (!AMOUNT_RE.test(item.text)) continue;
      const amt = parseAmount(item.text);
      if (item.x >= COL_BAL_MIN)     balance    = amt;
      else if (item.x >= COL_CR_MIN) deposit    = amt;
      else if (item.x >= COL_DR_MIN) withdrawal = amt;
    }
  }
  flush();
  return rows.filter(r => r.date && r.amount > 0);
}

// ─── CSV parser (no external lib) ────────────────────────────────────────────
function parseCSVText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Find header row: first row containing "Date" or "date"
  let headerIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    if (/date/i.test(lines[i])) { headerIdx = i; break; }
  }

  const splitCSV = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
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

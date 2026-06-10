import * as pdfjsLib from 'pdfjs-dist';
import { ParsedRow } from './KotakParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

function parseAmount(s: string): number {
  return parseFloat((s || '').replace(/,/g, '').trim()) || 0;
}

const AMOUNT_RE = /^[\d,]+\.\d{2}$/;

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

// "11 May 26" → "2026-05-11"
function parseSBIDate(s: string): string {
  const m = s.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2})$/);
  if (!m) return '';
  const mon = MONTH_MAP[m[2].toLowerCase()];
  return mon ? `20${m[3]}-${mon}-${m[1].padStart(2, '0')}` : '';
}

async function extractLines(file: File) {
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
  return lines;
}

// SBI Credit Card (BPCL SBI and other SBI CC)
// Date: "DD Mon YY" at x<40; Amount: x>270; Indicator at x>315: D=EXPENSE C=INCOME M=skip
// Lines without a date re-use the previous date (e.g. IGST continuation rows)
export async function parseSBICCPDF(file: File): Promise<ParsedRow[]> {
  const lines = await extractLines(file);
  const rows: ParsedRow[] = [];
  let inTable = false;
  let currentDate = '';
  let currentRawDate = '';

  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);
    const text = line.map(i => i.text).join(' ');

    if (/for Statement Period:/i.test(text)) { inTable = true; continue; }
    if (/Transactions highlighted in grey/i.test(text) || /C=Credit.*D=Debit/i.test(text)) {
      inTable = false; continue;
    }
    if (!inTable) continue;
    if (/TRANSACTIONS FOR/i.test(text)) continue;

    // Update current date if the leftmost token is a date
    const leftItem = line[0];
    if (leftItem && leftItem.x < 40) {
      const d = parseSBIDate(leftItem.text);
      if (d) { currentDate = d; currentRawDate = leftItem.text; }
    }
    if (!currentDate) continue;

    // Find amount (x>270) and D/C/M indicator (x>315)
    let amount = 0;
    let indicator = '';
    for (const item of line) {
      if (item.x > 270 && AMOUNT_RE.test(item.text)) amount = parseAmount(item.text);
      if (item.x > 315 && /^[DCM]$/.test(item.text)) indicator = item.text;
    }

    if (amount <= 0 || !indicator || indicator === 'M') continue;
    rows.push({ date: currentDate, rawDate: currentRawDate, amount, type: indicator === 'D' ? 'EXPENSE' : 'INCOME', balance: 0 });
  }

  return rows.filter(r => r.date && r.amount > 0);
}

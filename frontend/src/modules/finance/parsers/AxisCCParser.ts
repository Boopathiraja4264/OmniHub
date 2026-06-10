import * as pdfjsLib from 'pdfjs-dist';
import { ParsedRow } from './KotakParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

function parseAmount(s: string): number {
  return parseFloat((s || '').replace(/,/g, '').trim()) || 0;
}

// "2,638.00 Dr" or "824.00 Cr"
const AXIS_AMT_RE = /^([\d,]+\.\d{2})\s+(Dr|Cr)$/;

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

function tryParseDate(s: string): string {
  const m = s.trim().match(/^(\d{1,2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}

// Axis Bank Credit Card (Super Money, Flipkart Axis, and other Axis CC)
// Columns: DATE | TRANSACTION DETAILS | MERCHANT CATEGORY | AMOUNT (Rs.) | CASHBACK EARNED
// Amount tokens: "2,638.00 Dr" = EXPENSE, "824.00 Cr" = INCOME
// Cashback column starts at x~382 — pick only the amount left of it
export async function parseAxisCCPDF(file: File): Promise<ParsedRow[]> {
  const lines = await extractLines(file);
  const rows: ParsedRow[] = [];
  let inTable = false;
  let cashbackX = 382;

  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);
    const tokens = line.map(i => i.text);
    const text = tokens.join(' ');

    if (/Account Summary/i.test(text)) { inTable = true; continue; }
    if (/\*\*\*\* End of Statement/i.test(text)) { inTable = false; continue; }
    if (!inTable) continue;
    if (/Card No:/i.test(text) || /EMI BALANCES/i.test(text)) continue;

    // Detect cashback column x-position from the header row
    if (/CASHBACK/i.test(text) && /AMOUNT.*Rs/i.test(text)) {
      for (const item of line) {
        if (/CASHBACK/i.test(item.text)) { cashbackX = item.x; break; }
      }
      continue;
    }

    const dateStr = tryParseDate(tokens[0]);
    if (!dateStr) continue;

    // Pick the first Dr/Cr amount that sits left of the cashback column
    for (const item of line) {
      if (item.x >= cashbackX - 5) continue;
      const m = item.text.match(AXIS_AMT_RE);
      if (!m) continue;
      const amount = parseAmount(m[1]);
      if (amount <= 0) continue;
      rows.push({ date: dateStr, rawDate: tokens[0], amount, type: m[2] === 'Dr' ? 'EXPENSE' : 'INCOME', balance: 0 });
      break;
    }
  }

  return rows.filter(r => r.date && r.amount > 0);
}

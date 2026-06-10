import * as pdfjsLib from 'pdfjs-dist';
import { ParsedRow } from './KotakParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

function parseAmount(s: string): number {
  return parseFloat((s || '').replace(/,/g, '').trim()) || 0;
}

// "257.00" or "6,304.18 CR"
const ICICI_CC_AMT_RE = /^([\d,]+\.\d{2})(\s+CR)?$/;

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

// ICICI Bank Credit Card (Amazon Pay ICICI and other ICICI CC)
// Columns: Date | SerNo. | Transaction Details | Reward Points | Intl. amount | Amount (in `)
// Date: DD/MM/YYYY at x 185–215; Amount: rightmost token at x>480
// "CR" suffix = INCOME (credit/refund/payment), else EXPENSE
export async function parseICICICCPDF(file: File): Promise<ParsedRow[]> {
  const lines = await extractLines(file);
  const rows: ParsedRow[] = [];

  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);

    // Date at x 185–215
    let dateStr = '';
    let rawDate = '';
    for (const item of line) {
      if (item.x < 185 || item.x > 215) continue;
      const m = item.text.match(/^(\d{1,2})\/(\d{2})\/(\d{4})$/);
      if (m) {
        dateStr = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        rawDate = item.text;
        break;
      }
    }
    if (!dateStr) continue;

    // Rightmost token at x>480 matching the CC amount pattern
    let amount = 0;
    let isCredit = false;
    for (const item of line) {
      if (item.x <= 480) continue;
      const m = item.text.match(ICICI_CC_AMT_RE);
      if (m) { amount = parseAmount(m[1]); isCredit = !!m[2]; }
    }
    if (amount <= 0) continue;

    rows.push({ date: dateStr, rawDate, amount, type: isCredit ? 'INCOME' : 'EXPENSE', balance: 0 });
  }

  return rows.filter(r => r.date && r.amount > 0);
}

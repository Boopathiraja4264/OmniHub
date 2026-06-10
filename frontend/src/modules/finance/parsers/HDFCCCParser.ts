import * as pdfjsLib from 'pdfjs-dist';
import { ParsedRow } from './KotakParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

function parseAmount(s: string): number {
  return parseFloat((s || '').replace(/,/g, '').trim()) || 0;
}

const AMOUNT_RE = /^[\d,]+\.\d{2}$/;

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

// HDFC Bank Credit Card (Swiggy HDFC and other HDFC CC)
// Date token: "DD/MM/YYYY| HH:MM" at x~160
// Amount: rightmost numeric at x>490
// "+" token at x>480 on the same line = credit (INCOME), else debit (EXPENSE)
export async function parseHDFCCCPDF(file: File): Promise<ParsedRow[]> {
  const lines = await extractLines(file);
  const rows: ParsedRow[] = [];

  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);

    // Find the date-time token e.g. "15/04/2026| 00:00"
    let dateStr = '';
    let rawDate = '';
    for (const item of line) {
      const m = item.text.match(/^(\d{1,2})\/(\d{2})\/(\d{4})\s*\|/);
      if (m) {
        dateStr = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        rawDate = item.text.split('|')[0].trim();
        break;
      }
    }
    if (!dateStr) continue;

    // Rightmost numeric amount at x>490
    let amount = 0;
    for (const item of line) {
      if (item.x > 490 && AMOUNT_RE.test(item.text)) amount = parseAmount(item.text);
    }
    if (amount <= 0) continue;

    // "+" at x>480 signals a credit entry
    const hasPlus = line.some(i => i.x > 480 && i.text === '+');
    rows.push({ date: dateStr, rawDate, amount, type: hasPlus ? 'INCOME' : 'EXPENSE', balance: 0 });
  }

  return rows.filter(r => r.date && r.amount > 0);
}

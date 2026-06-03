import * as pdfjsLib from 'pdfjs-dist';
import { ParsedRow } from './KotakParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

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

// ICICI date format: DD.MM.YYYY (dots). Not at tokens[0] — S No. column is leftmost.
function findICICIDate(tokens: string[]): { date: string; raw: string } | null {
  for (const t of tokens) {
    const m = t.match(/^(\d{1,2})\.(\d{2})\.(\d{4})$/);
    if (m) return { date: `${m[3]}-${m[2]}-${m[1].padStart(2, '0')}`, raw: t };
  }
  return null;
}

// Columns: S No. | Transaction Date | Cheque Number | Transaction Remarks | Withdrawal Amount (INR) | Deposit Amount (INR) | Balance (INR)
// Date uses DD.MM.YYYY with dots. S No. is the leftmost column — date is at tokens[1] (after sort by x).
// State machine handles any multi-line narration wrapping.
export async function parseICICIPDF(file: File): Promise<ParsedRow[]> {
  const { lines } = await extractLines(file);

  // Find Withdrawal and Deposit column x-positions from the header
  let withdrawalX = -1, depositX = -1;
  for (const line of lines) {
    for (const item of line) {
      if (/Withdrawal/i.test(item.text) && withdrawalX < 0) withdrawalX = item.x;
      if (/^Deposit$/i.test(item.text) && depositX < 0) depositX = item.x;
    }
    if (withdrawalX >= 0 && depositX >= 0) break;
  }

  let currentDate = '';
  let currentRawDate = '';
  let currentNarration = '';
  const rows: ParsedRow[] = [];

  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);
    const tokens = line.map(i => i.text);
    const text = tokens.join(' ');

    // Skip legend/footer lines
    if (/Legends for transactions|Never share your OTP|www\.icici/i.test(text)) {
      currentDate = '';
      continue;
    }

    const dateResult = findICICIDate(tokens);
    if (dateResult) {
      currentDate = dateResult.date;
      currentRawDate = dateResult.raw;
      currentNarration = text;
    } else if (currentDate) {
      currentNarration += ' ' + text;
    }

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
    if (withdrawalX >= 0 && depositX >= 0) {
      type = Math.abs(txn.x - withdrawalX) <= Math.abs(txn.x - depositX) ? 'EXPENSE' : 'INCOME';
    } else {
      // Fallback: NEFT credit or UPI credit patterns
      type = /NEFT-[A-Z]+\d+-[A-Z].*-\d+.*HDFC0000240|NEFT-SBIN.*ITDTAX/i.test(currentNarration)
        ? 'INCOME'
        : 'EXPENSE';
    }

    rows.push({ date: currentDate, rawDate: currentRawDate, amount: txn.v, type, balance });
    currentDate = '';
    currentNarration = '';
  }

  return rows.filter(r => r.date && r.amount > 0);
}

import * as XLSX from 'xlsx';

export interface ParsedRow {
  date: string;
  merchantRaw: string;
  merchantNormalized: string;
  amountPaise: number;
  type: 'EXPENSE' | 'INCOME';
  paymentMethodType: string;
}

export async function parseFileManually(file: File): Promise<ParsedRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Get 2D array
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];
  
  let headerRowIndex = -1;
  let colMap = { date: -1, desc: -1, withdrawal: -1, deposit: -1, amount: -1 };

  // Find header row
  for (let i = 0; i < Math.min(50, rows.length); i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;
    
    const rowStr = row.map(cell => String(cell || '').toLowerCase().trim());
    
    // Look for common headers
    const dIdx = rowStr.findIndex(c => String(c || "").includes('date'));
    const nIdx = rowStr.findIndex(c => String(c || "").includes('narration') || String(c || "").includes('description') || String(c || "").includes('particulars'));
    const wIdx = rowStr.findIndex(c => String(c || "").includes('withdrawal') || String(c || "").includes('debit'));
    const cIdx = rowStr.findIndex(c => String(c || "").includes('deposit') || String(c || "").includes('credit'));
    const aIdx = rowStr.findIndex(c => String(c || '') === 'amount'); // Some sheets just have "Amount"
    
    if (dIdx !== -1 && nIdx !== -1 && (wIdx !== -1 || aIdx !== -1)) {
      headerRowIndex = i;
      colMap = { date: dIdx, desc: nIdx, withdrawal: wIdx, deposit: cIdx, amount: aIdx };
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error("Could not automatically detect table headers (Date, Description, Withdrawal, etc.).");
  }

  const results: ParsedRow[] = [];

  // Parse rows below header
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const dateStr = row[colMap.date];
    const descStr = row[colMap.desc];
    if (!dateStr || !descStr) continue; // skip empty rows

    let type: 'EXPENSE' | 'INCOME' = 'EXPENSE';
    let amount = 0;

    if (colMap.withdrawal !== -1 && colMap.deposit !== -1) {
      const wVal = parseFloat(String(row[colMap.withdrawal] || '0').replace(/,/g, ''));
      const dVal = parseFloat(String(row[colMap.deposit] || '0').replace(/,/g, ''));
      if (wVal > 0) {
        amount = wVal;
        type = 'EXPENSE';
      } else if (dVal > 0) {
        amount = dVal;
        type = 'INCOME';
      } else {
        continue; // both 0
      }
    } else if (colMap.amount !== -1) {
      // Some statements have negative amounts for expense
      const aVal = parseFloat(String(row[colMap.amount] || '0').replace(/,/g, ''));
      if (aVal === 0) continue;
      if (aVal < 0) {
        amount = Math.abs(aVal);
        type = 'EXPENSE';
      } else {
        amount = aVal;
        type = 'INCOME';
      }
    } else {
      continue;
    }

    results.push({
      date: dateStr.toString().substring(0, 20),
      merchantRaw: descStr.toString().substring(0, 100),
      merchantNormalized: descStr.toString().substring(0, 30), // User can edit
      amountPaise: Math.round(amount * 100),
      type,
      paymentMethodType: 'UNKNOWN'
    });
  }

  return results;
}

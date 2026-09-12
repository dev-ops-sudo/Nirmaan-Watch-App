import fs from 'fs';
import path from 'path';

const srcCsvPath = 'C:/Users/dm790/OneDrive/Desktop/mplads new project 2026/Allocated Limit for Honble MPs.csv';

if (!fs.existsSync(srcCsvPath)) {
  console.error('Source CSV not found at:', srcCsvPath);
  process.exit(1);
}

const content = fs.readFileSync(srcCsvPath, 'utf8');

// Ensure destination directories exist
fs.mkdirSync('public/data', { recursive: true });
fs.mkdirSync('data/source', { recursive: true });

// Copy CSV to repo
fs.copyFileSync(srcCsvPath, 'public/data/Allocated_Limit_for_Honble_MPs.csv');
fs.copyFileSync(srcCsvPath, 'data/source/Allocated_Limit_for_Honble_MPs.csv');
console.log('Copied CSV to public/data and data/source.');

// Parse CSV
const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result.map(s => s.replace(/^["']|["']$/g, '').trim());
}

const header = parseCsvLine(lines[0].replace(/^\uFEFF/, ''));
console.log('Parsed headers:', header);

const records = [];
let grandTotal = null;

for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i]);
  if (!row[0] || row.length < 2) continue;
  
  if (row[0].toLowerCase().includes('grand total')) {
    const rawAmt = row[row.length - 1].replace(/[^0-9.]/g, '');
    grandTotal = {
      label: 'Grand Total',
      allocated_amount: parseFloat(rawAmt) || 0,
      allocated_crores: parseFloat(((parseFloat(rawAmt) || 0) / 10000000).toFixed(2))
    };
    continue;
  }

  const srNo = parseInt(row[0], 10);
  const state = row[1] ? row[1].trim() : '';
  const mpName = row[2] ? row[2].trim() : '';
  const constituency = row[3] ? row[3].trim() : '';
  const rawAmt = (row[4] || '0').replace(/[^0-9.]/g, '');
  const allocatedAmount = parseFloat(rawAmt) || 0;
  const allocatedCrores = parseFloat((allocatedAmount / 10000000).toFixed(2));

  if (mpName) {
    records.push({
      sr_no: isNaN(srNo) ? i : srNo,
      state,
      mp_name: mpName,
      constituency,
      allocated_amount: allocatedAmount,
      allocated_crores: allocatedCrores,
      allocated_amount_inr: '₹' + allocatedAmount.toLocaleString('en-IN')
    });
  }
}

console.log('Total parsed MPs:', records.length);
console.log('Grand Total:', grandTotal);
console.log('Sample Record 1:', records[0]);
console.log('Sample Record 2:', records[1]);

const dataset = {
  description: 'Allocated Limit for Honble MPs - Official MPLADS Data',
  updatedAt: new Date().toISOString(),
  recordCount: records.length,
  grandTotal,
  records
};

fs.writeFileSync('public/data/mp-allocated-limits.json', JSON.stringify(dataset, null, 2), 'utf8');
console.log('Successfully saved to public/data/mp-allocated-limits.json');

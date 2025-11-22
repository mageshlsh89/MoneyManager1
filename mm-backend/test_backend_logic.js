
// Mocking the parsing logic from import.js for standalone testing

const DATE_START = /^(\d{2}[-/]\d{2}[-/]\d{4})|^(\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})/
const normalizeNumber = (s) => Number(String(s).replace(/,/g, '').replace(/\s/g, ''))
const monthMap = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' }
const toISODate = (dateStr) => {
    if (/^\d{2}[-/]\d{2}[-/]\d{4}/.test(dateStr)) {
        const [d, m, y] = dateStr.split(/[\/-]/);
        return `${y}-${m}-${d}`
    }
    const match = dateStr.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})/)
    if (match) {
        const d = match[1].padStart(2, '0')
        const m = monthMap[match[2]] || '01'
        let y = match[3]
        if (y.length === 2) y = '20' + y
        return `${y}-${m}-${d}`
    }
    return dateStr
}
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const detectCategory = (desc) => { const t = desc.toLowerCase(); if (t.includes('netflix')) return 'Leisure'; if (t.includes('railtel')) return 'Utilities'; if (t.includes('groww')) return 'Investment'; if (t.includes('rent')) return 'Housing'; if (t.includes('salary')) return 'Salary'; if (t.includes('apple')) return 'Leisure'; if (t.includes('google india')) return 'Leisure'; if (t.includes('cred')) return 'Investment'; return 'Misc' }
const foldLines = (lines) => { const out = []; let buf = ''; for (const l of lines) { if (DATE_START.test(l)) { if (buf) out.push(buf.trim()); buf = l; } else { buf += ' ' + l; } } if (buf) out.push(buf.trim()); return out }

const parseFoldedLine = (line) => {
    const dm = line.match(DATE_START);
    if (!dm) return null;
    const dateStr = dm[0];
    const rest = line.slice(dm[0].length).trim();

    const decMatches = Array.from(rest.matchAll(/-?[\d,]+\.\d+/g));

    if (decMatches.length < 1) return null;

    const balanceMatch = decMatches[decMatches.length - 1];
    const amountMatch = decMatches.length >= 2 ? decMatches[decMatches.length - 2] : decMatches[0];

    const balance = normalizeNumber(balanceMatch[0]);
    const amountRaw = normalizeNumber(amountMatch[0]);

    const desc = rest.slice(0, (amountMatch.index ?? rest.length)).trim();
    const dateISO = toISODate(dateStr);
    const month = monthNames[new Date(dateISO).getMonth()] || '';

    return { date: dateISO, merchant: desc, amount: amountRaw, balance, month }
}

const parseAxisText = (text) => { const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean); let openingBalance = null; for (const l of lines) { const m = l.match(/OPENING BALANCE\s+([0-9.,]+)/i); if (m) { openingBalance = normalizeNumber(m[1]); break; } } const folded = foldLines(lines); const rows = folded.map(parseFoldedLine).filter(Boolean); let prev = openingBalance; for (const r of rows) { let type = 'Expense'; if (prev != null && !Number.isNaN(prev)) { type = r.balance >= prev ? 'Income' : 'Expense'; } r.type = type; r.category = detectCategory(r.merchant || ''); prev = r.balance; } rows.sort((a, b) => new Date(a.date) - new Date(b.date)); return rows }

// Sample text simulating PDF content
const sampleText = `
26 Sep 25 BALANCE BROUGHT FORWARD 2,898.90
29 Sep 25 SO ATKINSON PROPERTIE 980.00 FLAT129STOWHILRENT
29 Sep 25 ) ) ) MASALA BAZAAR NEWP 3.14 NEWPORT
01-08-2025 UPI/P2A/521344178877/MAGESH LAKSHMIPATHY /LOAN/HDFC BANK LTD 26000.00 15194.94 2018
01-08-2025 MOB/TPFT/NAVIN RAJKUMAR /910010041245085 29000.00 44194.94 1594
05-08-2025 IMPS/P2A/521725325873/MAGESHLa/RATNAKA R/IMPS0000/9100000000009176111 14417.70 15033.74 2018
`;

console.log("Running parseAxisText on sample text...");
const transactions = parseAxisText(sampleText);
console.log("Parsed Transactions:", JSON.stringify(transactions, null, 2));

if (transactions.length === 5) {
    console.log("SUCCESS: Parsed 5 transactions as expected.");
} else {
    console.log(`FAILURE: Expected 5 transactions, got ${transactions.length}`);
}

import { describe, expect, it } from 'vitest';
import {
  buildRows,
  cleanNotes,
  detectDateOrder,
  detectDelimiter,
  findHeaderRow,
  guessMapping,
  matchCategory,
  parseCsv,
  parseImportAmount,
  parseImportDate,
  paymentMethodFrom,
} from './csvImport.js';

// Just the cell values (each parsed row also carries a .line number).
const cells = (rows) => rows.map((row) => [...row]);

describe('parseCsv', () => {
  it('reads quoted cells with commas, doubled quotes and line breaks', () => {
    const text = 'a,b,c\r\n"1,5","He said ""hi""","two\nlines"\r\n';
    expect(cells(parseCsv(text))).toEqual([
      ['a', 'b', 'c'],
      ['1,5', 'He said "hi"', 'two\nlines'],
    ]);
  });

  it('drops the Excel BOM and blank lines, keeps empty cells', () => {
    expect(cells(parseCsv('﻿date,amount\n\n2026-11-01,,x\n,,\n'))).toEqual([
      ['date', 'amount'],
      ['2026-11-01', '', 'x'],
    ]);
  });

  it('remembers the real line number of each row, past blank lines and multi-line cells', () => {
    const rows = parseCsv('Bank report\n\n\ndate,notes\n2026-11-01,"two\nlines"\r\n\r\n2026-11-02,x\n');
    expect(rows.map((row) => row.line)).toEqual([1, 4, 5, 8]);
  });

  it('handles a last line without a line break', () => {
    expect(cells(parseCsv('a,b\n1,2'))).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('detects ; and tab separators, ignoring commas inside quotes', () => {
    expect(detectDelimiter('Date;Amount;Notes\n01/11/2026;"1,50";x')).toBe(';');
    expect(detectDelimiter('Date\tAmount\n1\t2')).toBe('\t');
    expect(detectDelimiter('"a,b,c";d;e')).toBe(';');
    expect(detectDelimiter('just one column')).toBe(',');
    expect(cells(parseCsv('Date;Amount\n01/11/2026;"1,50"'))).toEqual([
      ['Date', 'Amount'],
      ['01/11/2026', '1,50'],
    ]);
  });
});

describe('guessMapping and findHeaderRow', () => {
  it("recognises this app's own export exactly", () => {
    const m = guessMapping(['date', 'type', 'category', 'amount', 'currency', 'payment_method', 'notes', 'recurring']);
    expect(m).toEqual({ date: 0, type: 1, category: 2, amount: 3, description: 6, paymentMethod: 5, debit: -1, credit: -1 });
  });

  it('recognises a debit / credit bank layout and prefers the transaction date', () => {
    const m = guessMapping(['Value Date', 'Txn Date', 'Narration', 'Chq./Ref.No.', 'Withdrawal Amt.', 'Deposit Amt.', 'Closing Balance']);
    expect(m).toMatchObject({ date: 1, description: 2, debit: 4, credit: 5, amount: -1 });
  });

  it('recognises an SBI-style layout', () => {
    const m = guessMapping(['Txn Date', 'Value Date', 'Description', 'Ref No./Cheque No.', 'Debit', 'Credit', 'Balance']);
    expect(m).toMatchObject({ date: 0, description: 2, debit: 4, credit: 5 });
  });

  it('recognises a single amount with a Dr/Cr column', () => {
    const m = guessMapping(['Transaction Date', 'Particulars', 'Amount (INR)', 'Dr / Cr']);
    expect(m).toMatchObject({ date: 0, description: 1, amount: 2, type: 3 });
  });

  it('skips the account details at the top of a bank statement', () => {
    const rows = [
      ['Account Name', 'ASHA'],
      ['Account Number', 'XXXX1234'],
      ['Date', 'Narration', 'Withdrawal Amt.', 'Deposit Amt.'],
      ['01/11/26', 'Salary', '', '50,000.00'],
    ];
    expect(findHeaderRow(rows)).toBe(2);
  });
});

describe('parseImportDate', () => {
  it.each([
    ['2026-11-05', '2026-11-05'],
    ['2026/1/5', '2026-01-05'],
    ['05/11/2026', '2026-11-05'],
    ['5-11-26', '2026-11-05'],
    ['05.11.2026', '2026-11-05'],
    ['05-Nov-2026', '2026-11-05'],
    ['5 November 2026', '2026-11-05'],
    ['05 Nov, 26', '2026-11-05'],
    ['05/11/2026 10:32:11', '2026-11-05'],
    ['2026-11-05T09:00', '2026-11-05'],
    ['29/02/2028', '2028-02-29'],
  ])('reads %s as %s (day first)', (input, expected) => {
    expect(parseImportDate(input, 'dmy')).toBe(expected);
  });

  it('reads month-first when asked', () => {
    expect(parseImportDate('11/05/2026', 'mdy')).toBe('2026-11-05');
  });

  it.each(['31/02/2026', '29/02/2026', '2026-13-01', '00/01/2026', 'yesterday', '', '05/11', '1/1/1969'])(
    'rejects %j',
    (input) => {
      expect(parseImportDate(input, 'dmy')).toBeNull();
    },
  );

  it('works out the date order from the column', () => {
    expect(detectDateOrder(['01/02/2026', '13/02/2026'])).toBe('dmy');
    expect(detectDateOrder(['01/02/2026', '02/13/2026'])).toBe('mdy');
    expect(detectDateOrder(['01/02/2026', '03/04/2026'])).toBeNull();
    expect(detectDateOrder(['2026-11-30'])).toBeNull();
  });
});

describe('parseImportAmount', () => {
  it.each([
    ['1,23,456.78', 12345678, 0],
    ['₹1,234.50', 123450, 0],
    ['Rs. 500', 50000, 0],
    ['INR 500.5', 50050, 0],
    ['-250.00', 25000, -1],
    ['+250', 25000, 1],
    ['(1,200.00)', 120000, -1],
    ['1,200.00 Dr', 120000, -1],
    ['500 CR', 50000, 1],
    ['500Cr.', 50000, 1],
    ['0.29', 29, 0],
  ])('reads %s', (input, minor, sign) => {
    expect(parseImportAmount(input, 'INR')).toEqual({ minor, sign });
  });

  it.each(['', '  ', '-', '0', '0.00', '0,000.00'])('treats %j as empty', (input) => {
    expect(parseImportAmount(input, 'INR')).toEqual({ empty: true });
  });

  it.each(['12,5', '1.234,56', 'abc', '1.234', '1e5'])('rejects %j', (input) => {
    expect(parseImportAmount(input, 'INR').error).toContain('isn\'t an amount');
  });
});

describe('helpers', () => {
  it('takes the payment method from its column or the bank description', () => {
    expect(paymentMethodFrom('debit_card', '')).toBe('debit_card');
    expect(paymentMethodFrom('Credit Card', '')).toBe('credit_card');
    expect(paymentMethodFrom('', 'UPI/DR/412345/ZOMATO/YESB')).toBe('upi');
    expect(paymentMethodFrom('', 'NEFT-HDFC0000123-ACME PVT LTD')).toBe('bank_transfer');
    expect(paymentMethodFrom('', 'ATM WDL 1234 MUMBAI')).toBe('cash');
    expect(paymentMethodFrom('', 'Coffee')).toBe('other');
  });

  it('removes the formula guard this app adds on export, and limits length', () => {
    expect(cleanNotes("'=HYPERLINK(\"x\")")).toBe('=HYPERLINK("x")');
    expect(cleanNotes("it's fine")).toBe("it's fine");
    expect(cleanNotes('x'.repeat(600))).toHaveLength(500);
  });

  it('matches categories by name and type, ignoring case and archived ones', () => {
    const categories = [
      { id: '1', name: 'Groceries', type: 'expense' },
      { id: '2', name: 'Other Income', type: 'income' },
      { id: '3', name: 'Old', type: 'expense', archived: true },
    ];
    expect(matchCategory(categories, ' groceries ', 'expense')?.id).toBe('1');
    expect(matchCategory(categories, 'Groceries', 'income')).toBeNull();
    expect(matchCategory(categories, 'other  income', 'income')?.id).toBe('2');
    expect(matchCategory(categories, 'Old', 'expense')).toBeNull();
    expect(matchCategory(categories, '', 'expense')).toBeNull();
  });
});

describe('buildRows', () => {
  it("round-trips this app's own export", () => {
    const [header, ...rows] = parseCsv(
      '﻿date,type,category,amount,currency,payment_method,notes,recurring\r\n' +
        "2026-11-01,income,Salary,50000.00,INR,bank_transfer,November,no\r\n" +
        "2026-11-03,expense,Groceries,450.50,INR,upi,\"'=SUM(A1)\",no\r\n",
    );
    expect(buildRows(rows, guessMapping(header), { currency: 'INR' })).toEqual([
      { line: 2, date: '2026-11-01', type: 'income', amountMinor: 5000000, notes: 'November', categoryName: 'Salary', paymentMethod: 'bank_transfer' },
      { line: 3, date: '2026-11-03', type: 'expense', amountMinor: 45050, notes: '=SUM(A1)', categoryName: 'Groceries', paymentMethod: 'upi' },
    ]);
  });

  it('reads a debit / credit bank statement, skipping rows with no amount', () => {
    const header = ['Date', 'Narration', 'Withdrawal Amt.', 'Deposit Amt.', 'Closing Balance'];
    const rows = [
      ['', 'Opening balance', '', '', '10,000.00'],
      ['03/11/26', 'UPI/ZOMATO', '450.00', '', '9,550.00'],
      ['04/11/26', 'NEFT SALARY', '0.00', '50,000.00', '59,550.00'],
      ['31/11/26', 'Bad date', '1.00', '', ''],
      ['05/11/26', 'Both', '1.00', '2.00', ''],
    ];
    const out = buildRows(rows, guessMapping(header), { currency: 'INR', headerLine: 5 });
    expect(out[0]).toMatchObject({ line: 6, skip: expect.any(String) });
    expect(out[1]).toMatchObject({ line: 7, date: '2026-11-03', type: 'expense', amountMinor: 45000, paymentMethod: 'upi' });
    expect(out[2]).toMatchObject({ date: '2026-11-04', type: 'income', amountMinor: 5000000, paymentMethod: 'bank_transfer' });
    expect(out[3].error).toContain('"31/11/26" isn\'t a real date');
    expect(out[4].error).toContain('Both a debit and a credit');
  });

  it('uses signs, Dr/Cr and the "positive amounts are" choice for one amount column', () => {
    const mapping = guessMapping(['Date', 'Description', 'Amount']);
    const rows = [
      ['01/11/2026', 'refund', '+100'],
      ['01/11/2026', 'coffee', '-100'],
      ['01/11/2026', 'card', '100 Dr'],
      ['01/11/2026', 'plain', '100'],
    ];
    const types = (positiveIs) => buildRows(rows, mapping, { currency: 'INR', positiveIs }).map((r) => r.type);
    expect(types('expense')).toEqual(['income', 'expense', 'expense', 'expense']);
    expect(types('income')).toEqual(['income', 'expense', 'expense', 'income']);
  });

  it('reports an unreadable type or amount with the row number', () => {
    const mapping = guessMapping(['date', 'type', 'amount']);
    const out = buildRows([['2026-11-01', 'transfer', '5'], ['2026-11-01', 'expense', '12,5']], mapping, { currency: 'INR' });
    expect(out[0]).toMatchObject({ line: 2, error: expect.stringContaining('"transfer"') });
    expect(out[1]).toMatchObject({ line: 3, error: expect.stringContaining('"12,5"') });
  });
});

import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, FileUp, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import * as importApi from '../../api/import.js';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button, buttonClasses } from '../../components/ui/Button.jsx';
import { Card, CardTitle } from '../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx';
import { SelectField } from '../../components/ui/SelectField.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { PAYMENT_METHOD_LABELS } from '../../lib/constants.js';
import {
  buildRows,
  detectDateOrder,
  FIELDS,
  findHeaderRow,
  guessMapping,
  matchCategory,
  MAX_FILE_BYTES,
  MAX_IMPORT_ROWS,
  parseCsv,
} from '../../lib/csvImport.js';
import { formatDate } from '../../lib/dates.js';
import { formatMoney } from '../../lib/money.js';
import { invalidateFinanceData } from '../../lib/queryClient.js';
import { useMe } from '../auth/useAuth.js';
import { useCategories } from '../categories/useCategories.js';

const STEPS = ['Choose file', 'Match columns', 'Review'];
const PAGE = 50;

// Bank files are usually UTF-8, but older ones are Windows-1252 (Excel's
// default "CSV" on Windows). Try UTF-8 strictly, then fall back.
async function readFileText(file) {
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

async function loadFile(file) {
  if (/\.(xlsx?|xlsm|ods|numbers)$/i.test(file.name)) {
    throw new Error('This is a spreadsheet file, not a CSV. In Excel choose File → Save As → "CSV UTF-8", then choose that file here.');
  }
  if (/\.pdf$/i.test(file.name)) {
    throw new Error("PDF statements can't be read. Download the statement from your bank as CSV (sometimes called \"Excel\" or \"delimited\").");
  }
  if (file.size === 0) throw new Error('That file is empty.');
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('That file is larger than 1 MB. Split it into smaller files (for example one per few months).');
  }
  const text = await readFileText(file);
  if (text.includes('\u0000')) throw new Error("That doesn't look like a CSV text file.");

  const rows = parseCsv(text);
  const headerIndex = findHeaderRow(rows);
  const dataRows = rows.slice(headerIndex + 1);
  if (dataRows.length === 0) throw new Error('No rows found below the column headings.');
  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw new Error(`That file has ${dataRows.length.toLocaleString('en-IN')} rows; the limit is ${MAX_IMPORT_ROWS.toLocaleString('en-IN')}. Split it into smaller files.`);
  }
  return { name: file.name, headers: rows[headerIndex], dataRows, headerLine: headerIndex + 1 };
}

function Steps({ current }) {
  return (
    <ol className="mb-6 flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Import steps">
      {STEPS.map((label, i) => (
        <li
          key={label}
          aria-current={i === current ? 'step' : undefined}
          className={`flex items-center gap-2 ${i === current ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <span
            className={`grid size-6 place-items-center rounded-full text-xs ${i <= current ? 'bg-teal-700 text-white dark:bg-teal-600' : 'bg-slate-200 dark:bg-slate-800'}`}
          >
            {i + 1}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}

// ---- Step 1 ----------------------------------------------------------------

function ChooseFile({ onLoaded }) {
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; // choosing the same file again still triggers a change
    if (!file) return;
    setError('');
    setReading(true);
    try {
      onLoaded(await loadFile(file));
    } catch (err) {
      setError(err.message);
    } finally {
      setReading(false);
    }
  }

  return (
    <Card>
      <CardTitle description="A CSV file from this app's export, a spreadsheet saved as CSV, or a statement downloaded from your bank. Up to 1 MB and 2,000 rows. The file is read on this device; nothing is saved until you press Import.">
        Choose a CSV file
      </CardTitle>
      <label
        className={`${buttonClasses({ className: 'cursor-pointer' })} has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-teal-600`}
      >
        {reading ? <Spinner className="size-4" /> : <FileUp className="size-5" aria-hidden="true" />}
        Choose file
        <input type="file" accept=".csv,text/csv,.txt" className="sr-only" onChange={handleFile} />
      </label>
      {error && <Alert className="mt-4">{error}</Alert>}
      <details className="mt-5 text-sm text-slate-600 dark:text-slate-300">
        <summary className="cursor-pointer font-medium">How do I get a CSV from my bank?</summary>
        <p className="mt-2">
          In net banking, open your account statement, choose the period, and download it as <strong>CSV</strong>{' '}
          (some banks call it "Excel" or "delimited text"). If you only get an Excel file (.xls / .xlsx), open it and
          use File → Save As → <strong>CSV UTF-8</strong>. PDF statements can't be read.
        </p>
      </details>
    </Card>
  );
}

// ---- Step 2 ----------------------------------------------------------------

function MatchColumns({ file, mapping, setMapping, dateOrder, setDateOrder, detectedOrder, positiveIs, setPositiveIs, sample, currency, onBack, onNext }) {
  const hasAmount = mapping.amount >= 0 || mapping.debit >= 0 || mapping.credit >= 0;
  const canContinue = mapping.date >= 0 && hasAmount;
  const askPositive = mapping.amount >= 0 && mapping.type < 0;
  const slashDates = file.dataRows.some((row) => /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(row[mapping.date] ?? ''));

  return (
    <Card>
      <CardTitle description={`${file.name}: ${file.dataRows.length.toLocaleString('en-IN')} rows. Check that each item points to the right column; choose "Not in this file" for anything the file doesn't have.`}>
        Match the columns
      </CardTitle>

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <SelectField
            key={field.key}
            label={`${field.label}${field.required ? ' *' : ''}`}
            value={mapping[field.key]}
            onChange={(e) => setMapping({ ...mapping, [field.key]: Number(e.target.value) })}
          >
            <option value={-1}>Not in this file</option>
            {file.headers.map((header, i) => (
              <option key={i} value={i}>
                {header || `Column ${i + 1}`}
              </option>
            ))}
          </SelectField>
        ))}
      </div>

      {!hasAmount && (
        <Alert className="mt-4">Choose the column with the amount, or the Debit and Credit columns.</Alert>
      )}

      {slashDates && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">A date like 05/11/2026 means</p>
          <SegmentedControl
            label="Date order"
            name="date-order"
            value={dateOrder}
            onChange={setDateOrder}
            options={[
              { value: 'dmy', label: '5 Nov (day first)' },
              { value: 'mdy', label: 'May 11 (month first)' },
            ]}
          />
          {detectedOrder && detectedOrder !== dateOrder && (
            <Alert className="mt-2">
              Some dates in this file only make sense {detectedOrder === 'dmy' ? 'day first' : 'month first'}, for
              example a 13 in the {detectedOrder === 'dmy' ? 'first' : 'second'} position.
            </Alert>
          )}
        </div>
      )}

      {askPositive && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Amounts without a minus sign or Dr / Cr are
          </p>
          <SegmentedControl
            label="Amounts without a sign"
            name="positive-is"
            value={positiveIs}
            onChange={setPositiveIs}
            options={[
              { value: 'expense', label: 'Money spent' },
              { value: 'income', label: 'Money received' },
            ]}
          />
        </div>
      )}

      {canContinue && sample && (
        <p className="mt-6 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
          <span className="font-medium">Row {sample.line} reads as: </span>
          {sample.error
            ? sample.error
            : `${formatDate(sample.date)} · ${sample.type === 'income' ? 'Income' : 'Expense'} ${formatMoney(sample.amountMinor, currency)}${sample.notes ? ` · ${sample.notes}` : ''}`}
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <Button variant="secondary" onClick={onBack}>
          Choose another file
        </Button>
        <Button onClick={onNext} disabled={!canContinue}>
          Review rows
        </Button>
      </div>
    </Card>
  );
}

// ---- Step 3 ----------------------------------------------------------------

function categoryOptions(categories, type) {
  return categories.filter((c) => c.type === type && !c.archived);
}

function Review({ built, categories, currency, onBack, onImported }) {
  const ready = useMemo(() => built.filter((row) => !row.error && !row.skip), [built]);
  const problems = built.filter((row) => row.error);
  const skipped = built.filter((row) => row.skip);

  const check = useMutation({
    mutationFn: () => importApi.checkDuplicates(ready.map(({ date, type, amountMinor }) => ({ date, type, amountMinor }))),
  });
  const runCheck = check.mutate;
  useEffect(() => {
    if (ready.length > 0) runCheck();
  }, [ready, runCheck]);
  const duplicates = useMemo(() => new Set(check.data ?? []), [check.data]);

  const firstOfType = (type, preferred) =>
    (categoryOptions(categories, type).find((c) => c.name === preferred) ?? categoryOptions(categories, type)[0])?.id ?? '';
  const [defaults, setDefaults] = useState(() => ({
    expense: firstOfType('expense', 'Other'),
    income: firstOfType('income', 'Other Income'),
  }));
  const [ticked, setTicked] = useState({}); // index → true/false, overrides the default
  const [chosen, setChosen] = useState({}); // index → categoryId
  const [visible, setVisible] = useState(PAGE);

  const isTicked = (i) => ticked[i] ?? !duplicates.has(i);
  const categoryFor = (row, i) =>
    chosen[i] ?? matchCategory(categories, row.categoryName, row.type)?.id ?? defaults[row.type];
  const selected = ready.flatMap((row, i) => (isTicked(i) ? [{ row, i }] : []));
  const totals = selected.reduce(
    (sum, { row }) => ({ ...sum, [row.type]: sum[row.type] + row.amountMinor }),
    { income: 0, expense: 0 },
  );

  const save = useMutation({
    mutationFn: () =>
      importApi.importTransactions(
        selected.map(({ row, i }) => ({
          type: row.type,
          amountMinor: row.amountMinor,
          categoryId: categoryFor(row, i),
          date: row.date,
          paymentMethod: row.paymentMethod,
          notes: row.notes,
        })),
      ),
    onSuccess: async (result) => {
      await invalidateFinanceData();
      onImported(result);
    },
  });
  // "rows.3.date" from the server → the line in the file.
  const saveProblems = (save.error?.details ?? []).map(({ field, message }) => {
    const index = Number(/^rows\.(\d+)/.exec(field)?.[1]);
    const line = selected[index]?.row.line;
    return line ? `Row ${line}: ${message}` : message;
  });
  const missingCategory = selected.some(({ row, i }) => !categoryFor(row, i));

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle description="Ticked rows will be added. Rows that match a transaction you already have (same date, type and amount) start unticked.">
          Review before importing
        </CardTitle>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {[
            ['Ready', ready.length],
            ['Possible duplicates', check.isPending ? '…' : duplicates.size],
            ['With problems', problems.length],
            ['Skipped (no amount)', skipped.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="tabular text-lg font-semibold">{value}</dd>
            </div>
          ))}
        </dl>

        {check.isError && (
          <Alert className="mt-4" action={<Button size="sm" variant="secondary" onClick={() => runCheck()}>Check again</Button>}>
            Couldn't check for duplicates: {check.error.message}
          </Alert>
        )}

        {ready.length > 0 && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {['expense', 'income'].map((type) => (
              <SelectField
                key={type}
                label={type === 'expense' ? 'Category for expenses' : 'Category for income'}
                hint="Used when the file has no matching category name. You can change any row below."
                value={defaults[type]}
                onChange={(e) => setDefaults({ ...defaults, [type]: e.target.value })}
              >
                {categoryOptions(categories, type).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectField>
            ))}
          </div>
        )}

        {problems.length > 0 && (
          <details className="mt-5 text-sm">
            <summary className="cursor-pointer font-medium text-rose-700 dark:text-rose-400">
              {problems.length} {problems.length === 1 ? 'row has a problem' : 'rows have problems'} and will be left out
            </summary>
            <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto text-slate-600 dark:text-slate-300">
              {problems.map((row) => (
                <li key={row.line}>
                  Row {row.line}: {row.error}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              To include them, fix those rows in the file and import it again (duplicates will be unticked).
            </p>
          </details>
        )}
      </Card>

      {ready.length === 0 ? (
        <Alert>No rows can be imported. Check the column choices, or the problems listed above.</Alert>
      ) : (
        <Card padded={false}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3 text-sm dark:border-slate-800">
            <span>
              <strong>{selected.length}</strong> of {ready.length} ticked
            </span>
            <span className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setTicked(Object.fromEntries(ready.map((_, i) => [i, true])))}>
                Tick all
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setTicked(Object.fromEntries(ready.map((_, i) => [i, false])))}>
                Untick all
              </Button>
            </span>
          </div>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {ready.slice(0, visible).map((row, i) => (
              <li key={row.line} className={`grid grid-cols-[auto_1fr_auto] items-start gap-x-3 gap-y-2 px-5 py-3 ${isTicked(i) ? '' : 'opacity-60'}`}>
                <input
                  type="checkbox"
                  className="mt-1 size-5 accent-teal-700"
                  checked={isTicked(i)}
                  onChange={(e) => setTicked({ ...ticked, [i]: e.target.checked })}
                  aria-label={`Import row ${row.line}`}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.notes || <span className="text-slate-500">No description</span>}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Row {row.line} · {formatDate(row.date)} · {PAYMENT_METHOD_LABELS[row.paymentMethod]}
                    {duplicates.has(i) && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                        Possible duplicate
                      </span>
                    )}
                  </p>
                </div>
                <p className={`tabular text-right text-sm font-semibold ${row.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
                  {row.type === 'income' ? '+' : '−'}
                  {formatMoney(row.amountMinor, currency)}
                </p>
                <label className="col-start-2 col-end-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="sr-only">Category for row {row.line}</span>
                  <select
                    className="min-h-9 w-full max-w-xs rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    value={categoryFor(row, i)}
                    onChange={(e) => setChosen({ ...chosen, [i]: e.target.value })}
                  >
                    {categoryOptions(categories, row.type).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
          {visible < ready.length && (
            <div className="border-t border-slate-200 px-5 py-3 dark:border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setVisible(visible + PAGE)}>
                Show {Math.min(PAGE, ready.length - visible)} more of {ready.length - visible}
              </Button>
            </div>
          )}
        </Card>
      )}

      {save.isError && (
        <Alert title={save.error.message}>
          {saveProblems.length > 0 && (
            <ul className="list-disc pl-5">
              {saveProblems.slice(0, 10).map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}
      {missingCategory && (
        <Alert>Some ticked rows have no category. Add an income or expense category in Settings → Categories first.</Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={onBack} disabled={save.isPending}>
          Back to columns
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <span className="tabular text-sm text-slate-600 dark:text-slate-300">
            +{formatMoney(totals.income, currency)} / −{formatMoney(totals.expense, currency)}
          </span>
          <Button
            onClick={() => save.mutate()}
            loading={save.isPending}
            disabled={selected.length === 0 || check.isPending || missingCategory}
          >
            <Upload className="size-4" aria-hidden="true" />
            Import {selected.length} {selected.length === 1 ? 'transaction' : 'transactions'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---- Done ------------------------------------------------------------------

function Done({ result, onAnother }) {
  const [confirming, setConfirming] = useState(false);
  const undo = useMutation({
    mutationFn: () => importApi.undoImport(result.importId),
    onSuccess: async () => {
      setConfirming(false);
      await invalidateFinanceData();
    },
  });

  return (
    <Card>
      {undo.isSuccess ? (
        <Alert tone="info" title="Import undone">
          The {undo.data.deleted} imported transactions were removed. Nothing else was changed.
        </Alert>
      ) : (
        <Alert tone="success" title={`Imported ${result.count} ${result.count === 1 ? 'transaction' : 'transactions'}`}>
          They now appear in your transactions, budgets and reports. Made a mistake? Undo removes exactly these rows.
        </Alert>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/transactions" className={buttonClasses()}>
          View transactions
        </Link>
        <Button variant="secondary" onClick={onAnother}>
          Import another file
        </Button>
        {!undo.isSuccess && (
          <Button variant="ghost" onClick={() => setConfirming(true)}>
            Undo this import
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => undo.mutate()}
        title="Undo this import?"
        confirmLabel="Undo import"
        pending={undo.isPending}
        error={undo.error}
      >
        <p>
          This removes the {result.count} transactions added by this import, including any changes you made to them
          since. Transactions you added yourself are not affected.
        </p>
      </ConfirmDialog>
    </Card>
  );
}

// ---- Page ------------------------------------------------------------------

export default function ImportPage() {
  useDocumentTitle('Import transactions');
  const { data: user } = useMe();
  const { categories, isPending: categoriesLoading } = useCategories();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [mapping, setMapping] = useState(null);
  const [dateOrder, setDateOrder] = useState('dmy');
  const [detectedOrder, setDetectedOrder] = useState(null);
  const [positiveIs, setPositiveIs] = useState('expense');
  const [result, setResult] = useState(null);
  const top = useRef(null);

  const built = useMemo(
    () =>
      file && mapping
        ? buildRows(file.dataRows, mapping, { currency: user.currency, dateOrder, positiveIs, headerLine: file.headerLine })
        : [],
    [file, mapping, dateOrder, positiveIs, user.currency],
  );

  function go(nextStep) {
    setStep(nextStep);
    top.current?.scrollIntoView({ block: 'start' });
  }

  function onLoaded(loaded) {
    const guessed = guessMapping(loaded.headers);
    const detected = detectDateOrder(loaded.dataRows.map((row) => row[guessed.date] ?? ''));
    setFile(loaded);
    setMapping(guessed);
    setDetectedOrder(detected);
    setDateOrder(detected ?? 'dmy');
    setPositiveIs('expense');
    go(1);
  }

  function restart() {
    setFile(null);
    setMapping(null);
    setResult(null);
    go(0);
  }

  return (
    <div ref={top} className="scroll-mt-20">
      <PageHeader
        title="Import transactions"
        description="Add many transactions at once from a CSV file."
        actions={
          <Link to="/transactions" className={buttonClasses({ variant: 'ghost' })}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Transactions
          </Link>
        }
      />
      {step < 3 && <Steps current={step} />}

      {step === 0 && <ChooseFile onLoaded={onLoaded} />}
      {step === 1 && (
        <MatchColumns
          file={file}
          mapping={mapping}
          setMapping={setMapping}
          dateOrder={dateOrder}
          setDateOrder={setDateOrder}
          detectedOrder={detectedOrder}
          positiveIs={positiveIs}
          setPositiveIs={setPositiveIs}
          sample={built.find((row) => !row.skip)}
          currency={user.currency}
          onBack={restart}
          onNext={() => go(2)}
        />
      )}
      {step === 2 &&
        (categoriesLoading ? (
          <Spinner className="size-6" />
        ) : (
          <Review
            built={built}
            categories={categories}
            currency={user.currency}
            onBack={() => go(1)}
            onImported={(res) => {
              setResult(res);
              go(3);
            }}
          />
        ))}
      {step === 3 && <Done result={result} onAnother={restart} />}
    </div>
  );
}

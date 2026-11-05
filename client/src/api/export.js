import { ApiError } from './client.js';

// Downloads a file from the API (CSV export, JSON backup). Uses fetch rather
// than a plain link so a failure shows an error message instead of saving a
// file that contains the error.
async function download(path, query = {}) {
  const url = new URL(`/api${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.set(key, value);
  }

  let res;
  try {
    res = await fetch(url, { credentials: 'same-origin', signal: AbortSignal.timeout(60_000) });
  } catch {
    throw new ApiError(0, "Couldn't download the file. Check your internet connection and try again.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.error?.message ?? `Download failed (error ${res.status}).`);
  }

  // The server names the file, e.g. attachment; filename="transactions-2026-11-05.csv"
  const name = /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'download';
  const blobUrl = URL.createObjectURL(await res.blob());
  const link = Object.assign(document.createElement('a'), { href: blobUrl, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing the memory.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
  return name;
}

// All transactions, or only those between from and to ("YYYY-MM-DD"), as CSV.
export const downloadTransactionsCsv = ({ from, to } = {}) => download('/export/transactions.csv', { from, to });

// Every category, transaction and budget, as JSON.
export const downloadBackup = () => download('/export/backup.json');

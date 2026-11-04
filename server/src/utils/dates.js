// Accepts any IANA time zone the JavaScript runtime knows, e.g. "Asia/Kolkata".
export function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
}

import { useEffect, useState } from 'react';

// Returns `value` only after it has stopped changing for `delay` ms, so a
// search box sends one request when the user pauses, not one per keystroke.
export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

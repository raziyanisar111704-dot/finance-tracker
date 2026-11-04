import { useSyncExternalStore } from 'react';

function subscribe(callback) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

// true / false, updated when the device connects or disconnects.
export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, () => navigator.onLine);
}

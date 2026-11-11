import { useSyncExternalStore } from 'react';

// Installing the app (PWA). Chrome, Edge and Samsung Internet announce that
// the app can be installed with a `beforeinstallprompt` event, which may fire
// before any page that offers an "Install" button exists. So it's caught here,
// at start-up, and kept until the user asks to install.

let deferredPrompt = null;
let installed = false;
const listeners = new Set();
const notify = () => listeners.forEach((listener) => listener());

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// iPhone / iPad: no install event; the user adds the app from the Share menu.
// (iPads report themselves as Macs, but Macs have no touch screen.)
export const isIos = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function setUpPwa() {
  installed = isStandalone();

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // no automatic mini-banner: we offer a button instead
    deferredPrompt = event;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installed = true;
    notify();
  });

  // Only in the built app: in development the service worker would keep
  // serving old code while you edit.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Not fatal: the app works without it, just not offline.
      });
    });
  }
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let snapshot = { canInstall: false, installed: false };
function getSnapshot() {
  const canInstall = deferredPrompt !== null;
  if (snapshot.canInstall !== canInstall || snapshot.installed !== installed) {
    snapshot = { canInstall, installed };
  }
  return snapshot;
}

// { canInstall, installed, install() }. install() opens the browser's own
// "Install app?" dialog and resolves to true if the user accepted.
export function useInstallPrompt() {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  async function install() {
    if (!deferredPrompt) return false;
    const prompt = deferredPrompt;
    deferredPrompt = null; // each event can be used only once
    notify();
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    return outcome === 'accepted';
  }
  return { ...state, install };
}

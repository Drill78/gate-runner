import { restoreRun, type Run } from './game.ts';
const RUN_KEY = 'ashen-gates-run-v2',
  BEST_KEY = 'ashen-gates-record-v1',
  SOUND_KEY = 'ashen-gates-sound-v1',
  TUTORIAL_KEY = 'ashen-gates-tutorial-v1';
const EVENT = 'ashen-gates-storage';
let storageFailed = false;
export function subscribeStorage(notify: () => void) {
  window.addEventListener('storage', notify);
  window.addEventListener(EVENT, notify);
  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener(EVENT, notify);
  };
}
export function storageSnapshot() {
  try {
    return JSON.stringify({
      raw: localStorage.getItem(RUN_KEY),
      best: localStorage.getItem(BEST_KEY),
      muted: localStorage.getItem(SOUND_KEY) === 'off',
      tutorialSeen: localStorage.getItem(TUTORIAL_KEY) === 'seen',
      available: !storageFailed,
    });
  } catch {
    return '{"available":false}';
  }
}
export function serverStorageSnapshot() {
  return '';
}
export function parseStorage(raw: string) {
  if (!raw)
    return {
      saved: null as Run | null,
      best: 0,
      muted: false,
      tutorialSeen: false,
      available: true,
    };
  try {
    const value = JSON.parse(raw),
      best = Number(value.best) || 0;
    return {
      saved: value.raw ? restoreRun(value.raw) : null,
      best: Number.isInteger(best) && best >= 0 && best <= 12 ? best : 0,
      muted: value.muted === true,
      tutorialSeen: value.tutorialSeen === true,
      available: value.available !== false,
    };
  } catch {
    return {
      saved: null,
      best: 0,
      muted: false,
      tutorialSeen: false,
      available: false,
    };
  }
}
export function persistRun(run: Run) {
  if (run.phase === 'setup' || run.phase === 'battle') return;
  try {
    if (run.phase === 'victory' || run.phase === 'defeat')
      localStorage.removeItem(RUN_KEY);
    else localStorage.setItem(RUN_KEY, JSON.stringify(run));
    const old = Number(localStorage.getItem(BEST_KEY)) || 0;
    localStorage.setItem(
      BEST_KEY,
      String(Math.min(12, Math.max(old, run.floor))),
    );
    storageFailed = false;
  } catch {
    storageFailed = true;
  }
  window.dispatchEvent(new Event(EVENT));
}
export function persistSound(muted: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, muted ? 'off' : 'on');
    storageFailed = false;
  } catch {
    storageFailed = true;
  }
  window.dispatchEvent(new Event(EVENT));
}
export function persistTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_KEY, 'seen');
  } catch {
    // The page also remembers dismissal for this visit when storage is disabled.
  }
  window.dispatchEvent(new Event(EVENT));
}

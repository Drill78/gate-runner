import { restoreRun, TOTAL_FLOORS, type Run } from './game.ts';
import {
  emptyCollection,
  parseCollection,
  mergeCollection,
} from './collection.ts';
const RUN_KEY = 'ashen-gates-run-v2',
  BEST_KEY = 'ashen-gates-record-v1',
  SOUND_KEY = 'ashen-gates-sound-v1',
  TUTORIAL_KEY = 'ashen-gates-tutorial-v1',
  DOUBLE_TAP_KEY = 'ashen-gates-double-tap-v1',
  COLLECTION_KEY = 'ashen-gates-collection-v1';
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
      doubleTapSkill: localStorage.getItem(DOUBLE_TAP_KEY) === 'on',
      collection: localStorage.getItem(COLLECTION_KEY),
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
      doubleTapSkill: false,
      collection: emptyCollection(),
      available: true,
    };
  try {
    const value = JSON.parse(raw),
      best = Number(value.best) || 0;
    return {
      saved: value.raw ? restoreRun(value.raw) : null,
      best:
        Number.isInteger(best) && best >= 0 && best <= TOTAL_FLOORS ? best : 0,
      muted: value.muted === true,
      tutorialSeen: value.tutorialSeen === true,
      doubleTapSkill: value.doubleTapSkill === true,
      collection: parseCollection(
        typeof value.collection === 'string' ? value.collection : null,
      ),
      available: value.available !== false,
    };
  } catch {
    return {
      saved: null,
      best: 0,
      muted: false,
      tutorialSeen: false,
      doubleTapSkill: false,
      collection: emptyCollection(),
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
      String(Math.min(TOTAL_FLOORS, Math.max(old, run.floor))),
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
export function persistDoubleTapSkill(enabled: boolean) {
  try {
    localStorage.setItem(DOUBLE_TAP_KEY, enabled ? 'on' : 'off');
  } catch {
    storageFailed = true;
  }
  window.dispatchEvent(new Event(EVENT));
}
export function persistCollection(
  run: Run,
  encounterKills: Record<string, number>,
) {
  try {
    const next = mergeCollection(
      parseCollection(localStorage.getItem(COLLECTION_KEY)),
      run,
      encounterKills,
    );
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(next));
  } catch {
    storageFailed = true;
  }
  window.dispatchEvent(new Event(EVENT));
}

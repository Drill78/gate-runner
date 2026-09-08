import { firepower, type Run, type Difficulty, type ClassId } from './game.ts';
import { peakArmyMagnitude } from './army.ts';

export const CHRONICLE_API = '/api/chronicle';
const IDENTITY = 'ashen-traveller-v1';
const OUTBOX = 'ashen-chronicle-outbox-v1';
const SETTLED = 'ashen-chronicle-settled-v1';
const settledMemory = new Set<string>();
function wasSettled(id: string) {
  if (settledMemory.has(id)) return true;
  try {
    const list = JSON.parse(localStorage.getItem(SETTLED) || '[]');
    return Array.isArray(list) && list.includes(id);
  } catch {
    return false;
  }
}
function rememberSettlement(id: string) {
  settledMemory.add(id);
  try {
    const list = JSON.parse(localStorage.getItem(SETTLED) || '[]');
    localStorage.setItem(
      SETTLED,
      JSON.stringify(
        [
          ...new Set([
            ...(Array.isArray(list)
              ? list.filter((v) => typeof v === 'string')
              : []),
            id,
          ]),
        ].slice(-200),
      ),
    );
  } catch {
    /* Session cache still prevents duplicate delivery. */
  }
}
export interface Identity {
  token: string;
  name: string;
  ascended?: boolean;
}
export interface ChronicleRow {
  id: string;
  name: string;
  title: string;
  mode: Difficulty;
  class_id: ClassId;
  depth: number;
  duration: number;
  peak_squad: number;
  peak_mantissa?: number;
  peak_exponent?: number;
  gold: number;
  finished_at: number;
  details: string;
  seed: number;
  status: 'won' | 'lost' | 'retired';
  ranked: number;
  favorite?: number;
  ascended?: number;
  start_room?: number;
  ruleset?: string;
}
type Pending = {
  id: string;
  mode: Difficulty;
  classId: ClassId;
  seed: number;
  startRoom?: number;
  ruleset?: string;
  started: boolean;
  offline: boolean;
  sentDepth: number;
  depth: number;
  result?: Record<string, unknown>;
};
let activeFlush: Promise<void> | null = null;
export function identity(): Identity {
  try {
    const saved = JSON.parse(localStorage.getItem(IDENTITY) || 'null');
    if (saved && /^[a-f0-9]{64}$/.test(saved.token)) return saved;
  } catch {
    /* A denied storage area still permits a temporary session. */
  }
  const value = (temporaryIdentity ||= {
    token: [...crypto.getRandomValues(new Uint8Array(32))]
      .map((n) => n.toString(16).padStart(2, '0'))
      .join(''),
    name: '无名旅人',
  });
  try {
    localStorage.setItem(IDENTITY, JSON.stringify(value));
  } catch {
    /* Session identity remains in memory. */
  }
  return value;
}
let temporaryIdentity: Identity | undefined;
export async function chronicleRequest<T = Record<string, unknown>>(
  action: string,
  data?: unknown,
): Promise<T> {
  const response = await fetch(`${CHRONICLE_API}/${action}`, {
    method: data === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${identity().token}`,
      ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    signal: AbortSignal.timeout(12000),
  });
  const result = (await response
    .json()
    .catch(() => ({ error: '史册暂时无法连通。' }))) as Record<string, unknown>;
  if (!response.ok)
    throw new Error(
      typeof result.error === 'string' ? result.error : '史册暂时无法连通。',
    );
  return result as T;
}
export async function saveIdentity(name: string) {
  const current = draftIdentity(name);
  const profile = await chronicleRequest<{ name: string; ascended?: number }>(
    'profile',
    {
      name: current.name,
    },
  );
  return draftIdentity(profile.name, Boolean(profile.ascended));
}
export function draftIdentity(name: string, ascended?: boolean) {
  const current = identity();
  if (ascended !== undefined) current.ascended = ascended;
  current.name = name.trim() || '无名旅人';
  temporaryIdentity = current;
  try {
    localStorage.setItem(IDENTITY, JSON.stringify(current));
  } catch {
    /* In-memory identity. */
  }
  return current;
}
let memoryOutbox: Pending[] = [];
function readOutbox(): Pending[] {
  try {
    const rows = JSON.parse(localStorage.getItem(OUTBOX) || '[]');
    if (!Array.isArray(rows)) return [];
    return rows.filter(
      (row) =>
        row &&
        typeof row === 'object' &&
        /^[a-f0-9-]{36}$/i.test(row.id) &&
        ['normal', 'hard', 'endless'].includes(row.mode) &&
        ['knight', 'ranger', 'mage'].includes(row.classId) &&
        Number.isSafeInteger(row.seed) &&
        Number.isSafeInteger(row.depth) &&
        row.depth >= 0 &&
        row.depth < 1000000 &&
        Number.isSafeInteger(row.sentDepth) &&
        row.sentDepth >= 0 &&
        row.sentDepth <= row.depth &&
        typeof row.started === 'boolean' &&
        typeof row.offline === 'boolean',
    );
  } catch {
    return memoryOutbox;
  }
}
function writeOutbox(rows: Pending[]) {
  memoryOutbox = rows;
  try {
    localStorage.setItem(OUTBOX, JSON.stringify(rows));
  } catch {
    /* Retry in this session. */
  }
}
function updatePending(id: string, fn: (record: Pending) => Pending | null) {
  writeOutbox(
    readOutbox().flatMap((record) => {
      if (record.id !== id) return [record];
      const next = fn(record);
      return next ? [next] : [];
    }),
  );
}
export function trackChronicle(run: Run) {
  if (
    run.devMode ||
    !run.runId ||
    wasSettled(run.runId) ||
    ['setup', 'battle', 'fallen'].includes(run.phase) ||
    (run.ascended && run.phase !== 'ascension')
  )
    return;
  const rows = readOutbox().filter(
    (row) => row.result || row.id === run.runId || !row.started,
  );
  let record = rows.find((row) => row.id === run.runId);
  if (!record) {
    record = {
      id: run.runId,
      mode: run.difficulty,
      classId: run.classId,
      seed: run.seed,
      startRoom: run.checkpointStart || 1,
      ruleset: run.ruleset,
      started: false,
      offline:
        Boolean(run.legacyContinuation) ||
        run.floor > (run.checkpointStart ? run.checkpointStart - 1 : 0),
      sentDepth: run.checkpointStart ? run.checkpointStart - 1 : 0,
      depth: 0,
    };
    rows.push(record);
  }
  // A restored hundredth-room result is the same settlement, including its
  // offline title. Only sealTitle may edit a result already waiting for upload.
  if (!record.result) {
    // Legacy progress has not defeated the replacement checkpoint boss yet.
    // Do not backfill that old depth as newly earned server-side authorization.
    record.depth = run.legacyPendingCheckpoint ? 0 : run.floor;
    if (
      run.phase === 'victory' ||
      run.phase === 'defeat' ||
      run.phase === 'ascension'
    )
      record.result = {
        id: run.runId,
        depth: run.floor,
        duration: run.combatTime,
        peakSquad: Math.max(run.peakSquad, run.squad),
        peakMagnitude: peakArmyMagnitude(run),
        gold: run.goldEarned,
        status:
          run.phase === 'victory' || run.phase === 'ascension'
            ? 'won'
            : run.retired
              ? 'retired'
              : 'lost',
        title: '',
        details: {
          weaponTier: run.weaponTier,
          maxHp: run.maxHp,
          kills: run.kills,
          chests: run.chests,
          gates: run.gates,
          doubleBossWins: run.doubleBossWins,
          flawlessBosses: run.flawlessBosses,
          reforges: run.endless.reforges,
          keysOpened: run.endless.keysOpened,
          power: run.endless.power,
          legion: run.endless.legion,
          dps: firepower(run).dps,
          allies: run.endless.allies,
          relics: run.relics,
          revivalsUsed: run.revivalsUsed || 0,
          checkpointStart: run.checkpointStart || 0,
        },
      };
  }
  writeOutbox(rows);
  void flushChronicle();
}
export async function sealTitle(id: string, title: string) {
  updatePending(id, (record) => ({
    ...record,
    ...(record.result ? { result: { ...record.result, title } } : {}),
  }));
  await flushChronicle();
  await flushChronicle();
  await chronicleRequest('title', { id, title });
}
export function flushChronicle(): Promise<void> {
  if (!activeFlush)
    activeFlush = drainChronicle().finally(() => {
      activeFlush = null;
    });
  return activeFlush;
}
async function drainChronicle() {
  try {
    const pending = readOutbox().filter(
      (record) =>
        !record.started || record.sentDepth < record.depth || record.result,
    );
    if (!pending.length) return;
    await saveIdentity(identity().name);
    for (const snapshot of pending) {
      if (!snapshot.started) {
        try {
          await chronicleRequest('start', {
            ...snapshot,
            offline: snapshot.offline,
          });
        } catch (error) {
          updatePending(snapshot.id, (record) => ({
            ...record,
            offline: true,
          }));
          throw error;
        }
        updatePending(snapshot.id, (record) => ({ ...record, started: true }));
      }
      for (
        let depth = snapshot.sentDepth + 1;
        depth <= snapshot.depth;
        depth++
      ) {
        await chronicleRequest('checkpoint', { id: snapshot.id, depth });
        updatePending(snapshot.id, (record) => ({
          ...record,
          sentDepth: depth,
        }));
      }
      if (snapshot.result) {
        await chronicleRequest(
          'finish',
          readOutbox().find((row) => row.id === snapshot.id)?.result ||
            snapshot.result,
        );
        rememberSettlement(snapshot.id);
        updatePending(snapshot.id, () => null);
      }
    }
    window.dispatchEvent(
      new CustomEvent('ashen-chronicle', { detail: { ok: true } }),
    );
  } catch (error) {
    window.dispatchEvent(
      new CustomEvent('ashen-chronicle', {
        detail: {
          ok: false,
          message: error instanceof Error ? error.message : '渡鸦尚未归来。',
        },
      }),
    );
  }
}
export function combatClock(seconds: number) {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

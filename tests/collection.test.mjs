import test from 'node:test';
import assert from 'node:assert/strict';
import { ENCOUNTERS } from '../lib/bosses.ts';
import {
  ACHIEVEMENTS,
  emptyCollection,
  parseCollection,
  mergeCollection,
  getAchievementStates,
} from '../lib/collection.ts';

const run = (phase = 'map', classId = 'knight') => ({ phase, classId });
const state = (progress, id) =>
  getAchievementStates(progress).find((a) => a.id === id);

test('missing, malformed and unsupported collections recover to independent empty records', () => {
  for (const raw of [
    null,
    '',
    '{broken',
    'null',
    '[]',
    'true',
    '42',
    '{}',
    '{"version":2}',
    '{"version":1,"kills":[],"wins":[],"secrets":{}}',
  ])
    assert.deepEqual(parseCollection(raw), emptyCollection());
  const first = emptyCollection();
  first.kills.executioner = 3;
  first.wins.knight = 1;
  first.secrets.push('forbidden-key');
  assert.deepEqual(emptyCollection(), {
    version: 1,
    progressRuleset: 'ascension-v1',
    hardWins: { knight: 0, ranger: 0, mage: 0 },
    records: {},
    kills: {},
    wins: { knight: 0, ranger: 0, mage: 0 },
    secrets: [],
  });
});

test('restoration keeps valid progress, drops invalid counts and deduplicates known secrets', () => {
  const restored = parseCollection(
    JSON.stringify({
      version: 1,
      hardWins: { knight: 0, ranger: 0, mage: 0 },
      records: {},
      kills: {
        executioner: 3,
        watcher: 2,
        commander: -1,
        hexblade: 1.5,
        stonewarden: '2',
        broodmother: Number.MAX_SAFE_INTEGER + 1,
        unknown: 5,
        king: 0,
      },
      wins: { knight: 2, ranger: '3', mage: -1, unknown: 9 },
      secrets: ['forbidden-key', 'unknown', 'forbidden-key', 3],
    }),
  );
  assert.deepEqual(restored, {
    version: 1,
    progressRuleset: 'ascension-v1',
    hardWins: { knight: 0, ranger: 0, mage: 0 },
    records: {},
    kills: { executioner: 3, watcher: 2 },
    wins: { knight: 2, ranger: 0, mage: 0 },
    secrets: ['forbidden-key'],
  });
  const unusual = parseCollection(
    '{"version":1,"kills":{"__proto__":{"polluted":true},"constructor":9,"lich":1},"wins":{"mage":1},"secrets":[]}',
  );
  assert.deepEqual(unusual.kills, { lich: 1 });
  assert.equal({}.polluted, undefined);
});

test('battle merging only adds supplied encounter deltas and does not mutate its inputs', () => {
  const before = emptyCollection();
  before.kills.executioner = 2;
  const delta = { executioner: 1, commander: 2 };
  const next = mergeCollection(before, { ...run('reward'), kills: 99 }, delta);
  assert.deepEqual(next.kills, { executioner: 3, commander: 2 });
  assert.deepEqual(before.kills, { executioner: 2 });
  assert.deepEqual(delta, { executioner: 1, commander: 2 });
  assert.deepEqual(next.wins, { knight: 0, ranger: 0, mage: 0 });
  const noDelta = mergeCollection(next, { ...run('map'), kills: 100 });
  assert.deepEqual(noDelta, next);
  assert.notEqual(noDelta, next);
  assert.notEqual(noDelta.kills, next.kills);
  assert.notEqual(noDelta.wins, next.wins);
  assert.notEqual(noDelta.secrets, next.secrets);
});

test('wins require a completed victory while kills and discovered secrets can survive defeat', () => {
  const defeated = mergeCollection(
    emptyCollection(),
    { ...run('defeat', 'mage'), secretDiscovered: true },
    { hexblade: 1 },
  );
  assert.equal(defeated.kills.hexblade, 1);
  assert.equal(defeated.wins.mage, 0);
  assert.deepEqual(defeated.secrets, ['forbidden-key']);
  const victory = mergeCollection(defeated, run('victory', 'ranger'), {
    king: 1,
  });
  assert.deepEqual(victory.wins, { knight: 0, ranger: 1, mage: 0 });
  const map = mergeCollection(victory, {
    ...run('map'),
    secretDiscovered: true,
  });
  assert.deepEqual(map.secrets, ['forbidden-key']);
  assert.deepEqual(map.wins, victory.wins);
});

test('invalid battle increments are ignored and lifetime counters saturate safely', () => {
  const before = emptyCollection();
  before.kills.watcher = Number.MAX_SAFE_INTEGER - 1;
  before.wins.knight = Number.MAX_SAFE_INTEGER;
  const next = mergeCollection(before, run('victory'), {
    watcher: 5,
    lich: -1,
    king: 0.5,
    commander: Number.POSITIVE_INFINITY,
    broodmother: Number.MAX_SAFE_INTEGER + 1,
    executioner: '2',
    unknown: 8,
  });
  assert.deepEqual(next.kills, { watcher: Number.MAX_SAFE_INTEGER });
  assert.equal(next.wins.knight, Number.MAX_SAFE_INTEGER);
  assert.ok(Number.isSafeInteger(next.kills.watcher));
  assert.ok(Number.isSafeInteger(next.wins.knight));
});

test('the achievement catalog covers thirteen encounters, three classes and ascension milestones', () => {
  assert.equal(ENCOUNTERS.filter((e) => e.kind === 'elite').length, 5);
  assert.equal(ENCOUNTERS.filter((e) => e.kind === 'boss').length, 8);
  assert.equal(ACHIEVEMENTS.length, 39);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, 39);
  for (const encounter of ENCOUNTERS)
    assert.ok(ACHIEVEMENTS.some((a) => a.id === `defeat-${encounter.id}`));
  for (const classId of ['knight', 'ranger', 'mage'])
    assert.ok(ACHIEVEMENTS.some((a) => a.id === `victory-${classId}`));
  assert.equal(
    getAchievementStates(emptyCollection()).filter((a) => a.unlocked).length,
    0,
  );
});

test('collection achievements count distinct foes and class victories rather than repeated kills', () => {
  const progress = mergeCollection(emptyCollection(), run('reward'), {
    executioner: 50,
    watcher: 8,
  });
  assert.equal(state(progress, 'all-elites').current, 1);
  assert.equal(state(progress, 'all-bosses').current, 1);
  assert.equal(state(progress, 'all-elites').unlocked, false);
  assert.equal(state(progress, 'defeat-executioner').unlocked, true);
  const everyFoe = Object.fromEntries(ENCOUNTERS.map((e) => [e.id, 1]));
  let complete = mergeCollection(progress, run('victory', 'knight'), everyFoe);
  assert.equal(state(complete, 'all-elites').unlocked, true);
  assert.equal(state(complete, 'all-bosses').unlocked, true);
  assert.equal(state(complete, 'first-victory').unlocked, true);
  assert.equal(state(complete, 'victory-knight').unlocked, true);
  assert.equal(state(complete, 'all-classes').current, 1);
  complete = mergeCollection(complete, run('victory', 'knight'));
  assert.equal(state(complete, 'all-classes').current, 1);
  complete = mergeCollection(complete, run('victory', 'ranger'));
  complete = mergeCollection(complete, run('victory', 'mage'));
  assert.equal(state(complete, 'all-classes').unlocked, true);
  assert.equal(state(complete, 'all-classes').current, 3);
});

test('the hidden achievement reveals neither its name nor condition before actual discovery', () => {
  const seenOnly = mergeCollection(emptyCollection(), {
    ...run(),
    squareGateSeen: true,
    secretDiscovered: false,
  });
  const concealed = state(seenOnly, 'forbidden-key');
  assert.equal(concealed.concealed, true);
  assert.equal(concealed.title, '???');
  assert.equal(concealed.description, '???');
  assert.equal(concealed.unlocked, false);
  const stringFlag = mergeCollection(seenOnly, {
    ...run(),
    secretDiscovered: 'true',
  });
  assert.deepEqual(stringFlag.secrets, []);
  const discovered = mergeCollection(seenOnly, {
    ...run(),
    secretDiscovered: true,
  });
  const revealed = state(discovered, 'forbidden-key');
  assert.equal(revealed.concealed, false);
  assert.equal(revealed.unlocked, true);
  assert.notEqual(revealed.title, '???');
  assert.notEqual(revealed.description, '???');
  assert.deepEqual(parseCollection(JSON.stringify(discovered)), discovered);
});

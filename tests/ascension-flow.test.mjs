import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun,
  availableNodes,
  enterNode,
  completeRoom,
  skipReward,
  restoreRun,
  reviveRun,
  acceptDefeat,
  beginEpilogue,
} from '../lib/game.ts';
import {
  mergeCollection,
  emptyCollection,
  getAchievementStates,
} from '../lib/collection.ts';
import { persistRun, persistCollection } from '../lib/storage.ts';
import { trackChronicle } from '../lib/chronicle.ts';

function arrive(room = 1, mode = 'endless') {
  let run = { ...createRun('knight', 721604, mode), phase: 'map' };
  while (run.floor < room - 1)
    run = skipReward(completeRoom(enterNode(run, availableNodes(run)[0].id)));
  return run;
}
test('chapter recovery grants half maximum health once, caps at maximum, and never heals ordinary rooms', () => {
  for (const mode of ['normal', 'hard', 'endless']) {
    let run = arrive(5, mode);
    run.maxHp = 300;
    run.hp = 80;
    run = enterNode(run, availableNodes(run)[0].id);
    const completed = completeRoom(run);
    assert.equal(completed.hp, 230);
    assert.equal(completeRoom(completed), completed);
    assert.equal(skipReward(completed).hp, 230);
    run.hp = 280;
    assert.equal(completeRoom(run).hp, 300);
  }
  let ordinary = arrive(2);
  ordinary.hp = 20;
  ordinary = enterNode(ordinary, availableNodes(ordinary)[0].id);
  assert.equal(completeRoom(ordinary).hp, 20);
});
test('all three coins are earned once, death can remain resumable, spending never replenishes currency', () => {
  let run = arrive(16);
  assert.equal(run.revivalCoins, 1);
  assert.equal(run.revivalCoinsEarned, 1);
  run = enterNode(run, availableNodes(run)[0].id);
  run.hp = 0;
  run.phase = 'fallen';
  assert.ok(restoreRun(JSON.stringify(run)));
  const revived = reviveRun(run);
  assert.equal(revived.phase, 'battle');
  assert.equal(revived.hp, revived.maxHp);
  assert.equal(revived.revivalCoins, 0);
  assert.equal(revived.revivalCoinsEarned, 1);
  assert.equal(revived.revivalsUsed, 1);
  const afterReload = restoreRun(JSON.stringify(revived));
  assert.ok(afterReload);
  assert.equal(afterReload.revivalCoins, 0);
  assert.equal(afterReload.phase, 'battle');
  assert.equal(afterReload.battleResume, true);
  assert.equal(
    restoreRun(JSON.stringify({ ...revived, battleResume: false })),
    null,
  );
  assert.equal(reviveRun(revived), revived);
  assert.equal(acceptDefeat(run).phase, 'defeat');
  assert.equal(arrive(76).revivalCoinsEarned, 3);
  assert.equal(arrive(100).revivalCoinsEarned, 3);
});
test('the 100th victory is resumable, unlocks hidden ascension once, and epilogue terminates at 101', () => {
  let run = arrive(100);
  const before = mergeCollection(emptyCollection(), run);
  assert.equal(
    getAchievementStates(before).find((a) => a.id === 'ascension').concealed,
    true,
  );
  run = completeRoom(enterNode(run, availableNodes(run)[0].id));
  assert.equal(run.phase, 'ascension');
  assert.equal(run.floor, 100);
  assert.ok(restoreRun(JSON.stringify(run)));
  const honoured = mergeCollection(before, run);
  assert.equal(
    getAchievementStates(honoured).find((a) => a.id === 'ascension').title,
    '登神',
  );
  assert.equal(
    mergeCollection(honoured, run).secrets.filter((s) => s === 'ascension')
      .length,
    1,
  );
  assert.equal(
    mergeCollection(before, { ...run, devMode: true }).secrets.includes(
      'ascension',
    ),
    false,
  );
  const celebration = beginEpilogue(run);
  assert.equal(celebration.phase, 'battle');
  assert.equal(celebration.node.floor, 100);
  const end = completeRoom(celebration);
  assert.equal(end.phase, 'victory');
  assert.equal(end.floor, 101);
  assert.equal(availableNodes(end).length, 0);
  assert.equal(beginEpilogue(end), end);
  assert.equal(completeRoom(end), end);
});
test('old unbounded saves must defeat the new last royal court before entering the staircase', () => {
  const run = arrive(91);
  delete run.ruleset;
  run.floor = 150;
  run.nodes = [];
  run.path = [];
  run.node = null;
  run.phase = 'map';
  const restored = restoreRun(JSON.stringify(run));
  assert.ok(restored);
  assert.equal(restored.floor, 89);
  assert.equal(restored.ascended, false);
  assert.equal(restored.legacyPendingCheckpoint, 90);
  assert.equal(availableNodes(restored).length, 1);
  assert.equal(availableNodes(restored)[0].kind, 'boss');
});
test('developer previews cannot overwrite real saves, grant achievements, or enqueue public scores', () => {
  const oldStorage = globalThis.localStorage,
    oldWindow = globalThis.window;
  const data = new Map([
    ['ashen-gates-run-v2', 'original save'],
    ['ashen-gates-collection-v1', 'original collection'],
  ]);
  globalThis.localStorage = {
    getItem: (k) => data.get(k) || null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
  globalThis.window = { dispatchEvent: () => {} };
  try {
    const run = {
      ...createRun('mage', 1, 'endless'),
      devMode: true,
      phase: 'ascension',
      floor: 100,
      ascended: true,
      runId: crypto.randomUUID(),
    };
    persistRun(run);
    persistCollection(run, { deity: 1 });
    trackChronicle(run);
    assert.equal(data.get('ashen-gates-run-v2'), 'original save');
    assert.equal(data.get('ashen-gates-collection-v1'), 'original collection');
    assert.equal(data.has('ashen-chronicle-outbox-v1'), false);
  } finally {
    globalThis.localStorage = oldStorage;
    globalThis.window = oldWindow;
  }
});

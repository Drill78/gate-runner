import { expedition } from './balance-sim.mjs';
import { applyGate } from '../lib/game.ts';
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const compact = (r) => ({
  classId: r.classId,
  seed: r.seed,
  depth: r.floor,
  win: r.win,
  hp: r.hp,
  maxHp: r.maxHp,
  squad: r.squad,
  squadMagnitude: r.squadMagnitude,
  failure: r.failure,
  endless: r.endless,
  rooms: r.rooms.map(({ floor, kind, time, damage, state, entrySquad }) => ({
    floor,
    kind,
    time,
    damage,
    state,
    entrySquad,
  })),
  decisions: r.decisions,
});
const pairs = [],
  windows = [],
  regression = [];
for (const classId of ['knight', 'ranger', 'mage']) {
  for (const seed of [734, 1743]) {
    for (const difficulty of ['normal', 'hard']) {
      const r = expedition(classId, seed, 'coherent', { difficulty });
      regression.push({ difficulty, ...compact(r) });
      console.log(`${difficulty} ${classId}/${seed}: ${r.floor}`);
    }
    let checkpoint;
    for (const noSquare of [true, false]) {
      const r = expedition(classId, seed, 'coherent', {
        difficulty: 'endless',
        maxFloors: 150,
        maxTime: 300,
        noSquare,
        onCheckpoint: noSquare
          ? (r) => {
              if (r.floor === 30) checkpoint = r;
            }
          : undefined,
      });
      pairs.push({ noSquare, ...compact(r) });
      console.log(
        `endless ${classId}/${seed}, ${noSquare ? 'without' : 'with'} keys: ${r.floor}, ${r.endless.keysOpened} gates`,
      );
    }
    if (checkpoint) {
      for (const square of [false, true]) {
        const start = structuredClone(checkpoint);
        if (square) applyGate(start, { op: '²', value: 2 }, 0);
        const r = expedition(classId, seed, 'coherent', {
          difficulty: 'endless',
          maxFloors: 45,
          maxTime: 300,
          noSquare: true,
          initialRun: start,
        });
        windows.push({
          square,
          startDepth: 30,
          startSquad: start.squad,
          ...compact(r),
        });
        console.log(
          `15-room reward window ${classId}/${seed}, square=${square}: ${r.floor}`,
        );
      }
    }
  }
}
const report = {
  version: '1.1.1',
  createdAt: new Date().toISOString(),
  policy:
    'Actual engine, 150ms visible-state pilot; genuine routes and rewards. Paired seeds with/without key purchases may take different routes. Reward-window probes clone a naturally reached room-30 build and grant exactly one square only to the treatment; these isolate its following 15-room benefit, not human completion probability.',
  hashes: Object.fromEntries(
    ['game', 'combat', 'army', 'endless'].map((f) => [
      f,
      createHash('sha256')
        .update(readFileSync(`lib/${f}.ts`))
        .digest('hex'),
    ]),
  ),
  regression,
  pairs,
  windows,
};
writeFileSync('artifacts/balance-v111.json', JSON.stringify(report, null, 2));

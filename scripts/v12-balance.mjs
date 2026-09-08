import { expedition, pilot } from './balance-sim.mjs';
import {
  createCheckpointRun,
  createDeveloperRun,
  DEVELOPER_PRESETS,
} from '../lib/presets.ts';
import { createBattle } from '../lib/combat.ts';
import { firepower } from '../lib/game.ts';
import { ENDLESS_CURVE, ENDLESS_ECONOMY } from '../lib/endless.ts';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const quick = process.argv.includes('--quick');
const seeds = quick ? [734] : [734, 1743];
const report = {
  version: '1.2',
  createdAt: new Date().toISOString(),
  method:
    'Actual combat engine with a 150ms visible-state movement/aim/skill pilot. Menus use genuine offered choices. No forced heals, coins or developer damage overrides in natural expeditions. Checkpoint trials use the exact shipped fixed recovery builds; coins are not automatically spent. Cutscene time is reported separately and never advances combat. These deterministic pilot samples are regression evidence, not human win rates.',
  hashes: Object.fromEntries(
    ['game', 'combat', 'army', 'endless', 'presets'].map((file) => [
      file,
      createHash('sha256')
        .update(readFileSync(`lib/${file}.ts`))
        .digest('hex'),
    ]),
  ),
  curve: ENDLESS_CURVE,
  economy: ENDLESS_ECONOMY,
  natural: [],
  checkpoint: [],
  hard: [],
  controls: [],
  showcases: [],
};
const summarize = (r, checkpoints = []) => ({
  classId: r.classId,
  seed: r.seed,
  difficulty: r.difficulty,
  floor: r.floor,
  win: r.win,
  failure: r.failure,
  hp: r.hp,
  maxHp: r.maxHp,
  weapon: r.weapon,
  endless: r.endless,
  checkpoints,
  rooms: r.rooms.map(
    ({
      floor,
      kind,
      state,
      time,
      cinematicTime,
      bossTime,
      damage,
      hp,
      shield,
      bossDetails,
      transitions,
      deathCause,
    }) => ({
      floor,
      kind,
      state,
      time,
      cinematicTime,
      bossTime,
      damage,
      hp,
      shield,
      bossDetails,
      transitions,
      deathCause,
    }),
  ),
});
const save = () =>
  writeFileSync('artifacts/balance-v12.json', JSON.stringify(report, null, 2));

for (const classId of ['knight', 'ranger', 'mage']) {
  for (const seed of seeds) {
    const h = expedition(classId, seed, 'coherent', {
      difficulty: 'hard',
      maxFloors: 15,
      maxTime: 360,
    });
    report.hard.push(summarize(h));
    console.log(`hard ${classId}/${seed}: ${h.floor}, ${h.failure || 'won'}`);
    save();
    for (const noSquare of quick ? [false] : [true, false]) {
      const checkpoints = [];
      const r = expedition(classId, seed, 'coherent', {
        difficulty: 'endless',
        maxFloors: 100,
        maxTime: 480,
        noSquare,
        onCheckpoint: (run) => {
          if (run.floor % 15 === 0 || run.floor >= 90)
            checkpoints.push({
              room: run.floor + 1,
              dps: firepower(run).dps,
              hp: run.hp,
              maxHp: run.maxHp,
              power: run.endless.power,
              legion: run.endless.legion,
              weapon: run.weaponTier,
              relics: { ...run.relics },
              army: run.squadMagnitude || run.squad,
            });
        },
      });
      report.natural.push({ noSquare, ...summarize(r, checkpoints) });
      console.log(
        `endless ${classId}/${seed}/${noSquare ? 'no keys' : 'keys'}: ${r.floor}, ${r.failure || 'won'}`,
      );
      save();
    }
  }
  for (const room of [46, 91]) {
    const initialRun = createCheckpointRun(classId, room, 734);
    const r = expedition(classId, 734, 'coherent', {
      initialRun,
      maxFloors: room === 46 ? 90 : 100,
      maxTime: 480,
    });
    report.checkpoint.push({ startRoom: room, ...summarize(r) });
    console.log(
      `checkpoint ${classId}/${room}: ${r.floor}, ${r.failure || 'won'}`,
    );
    save();
  }
  const initialRun = createCheckpointRun(classId, 91, 734);
  const control = expedition(classId, 734, 'coherent', {
    initialRun,
    stationary: true,
    maxFloors: 100,
    maxTime: 480,
  });
  report.controls.push({
    startRoom: 91,
    stationary: true,
    ...summarize(control),
  });
  for (const id of ['round-six', 'ascendant', 'deity']) {
    const run = createDeveloperRun(
      classId,
      DEVELOPER_PRESETS.find((p) => p.id === id),
      734,
    );
    const result = pilot(createBattle(run), { maxTime: 480 });
    report.showcases.push({ classId, id, ...result });
    console.log(
      `showcase ${classId}/${id}: ${result.state} ${result.time.toFixed(1)}s ${result.damage} damage`,
    );
    save();
  }
}
save();
console.log('Wrote artifacts/balance-v12.json');

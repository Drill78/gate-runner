import { expedition, pilot } from './balance-sim.mjs';
import {
  createRun,
  createMap,
  RELICS,
  addRelic,
  firepower,
} from '../lib/game.ts';
import { createBattle } from '../lib/combat.ts';
import { writeFileSync } from 'node:fs';

const sampleCount = Number(process.argv[2] || 4);
const results = [];
for (const difficulty of ['normal', 'hard', 'endless'])
  for (const classId of ['knight', 'ranger', 'mage']) {
    const sample = [];
    for (let i = 0; i < sampleCount; i++) {
      const run = expedition(classId, 734 + i * 1009, 'coherent', {
        difficulty,
        maxFloors: difficulty === 'endless' ? 75 : 15,
        maxTime: 300,
      });
      sample.push({
        seed: run.seed,
        depth: run.floor,
        won: run.win,
        cause: run.failure,
        hp: run.hp,
        maxHp: run.maxHp,
        weapon: run.weapon,
        squad: run.squad,
        endless: run.endless,
        bosses: run.rooms
          .filter((room) => room.kind === 'boss')
          .map((room) => ({
            floor: room.floor,
            seconds: room.time,
            damage: room.damage,
            state: room.state,
          })),
      });
    }
    results.push({ difficulty, classId, sample });
    console.log(
      `${difficulty}/${classId}: ${sample.map((run) => run.depth).join(', ')} floors; ${sample.filter((run) => run.won).length}/${sampleCount} target reached`,
    );
  }
// Mechanic probes start with an explicitly constructed late build; these are not completion-rate samples.
const probes = [];
for (const floor of [19, 24, 29, 34, 39, 44, 49, 99]) {
  let run = createRun('ranger', 734, 'endless');
  run.floor = floor;
  run.phase = 'battle';
  run.nodes = createMap(run.seed, Math.floor(floor / 15) * 15);
  run.node = run.nodes.find((row) => row[0].floor === floor)[0];
  run.weaponTier = 40;
  run.xp = 10000;
  run.talentPicks = 14;
  run.squad = 1e12;
  run.maxHp = run.hp = 500;
  for (const relic of RELICS.filter(
    (r) =>
      (r.family === 'all' || r.family === 'ranger') && r.id !== 'square_key',
  ))
    for (let i = 0; i < relic.max; i++) run = addRelic(run, relic.id);
  run.endless.power = Math.pow(1.3, Math.max(0, (floor - 15) / 5));
  run.endless.allies = ['watcher'];
  const b = createBattle(run);
  const stats = pilot(b, { maxTime: 300 });
  probes.push({
    floor: floor + 1,
    dps: firepower(run).dps,
    stages: b.rushStages,
    bossHealth: b.entities
      .filter((e) => e.boss)
      .reduce((n, e) => n + e.maxHp, 0),
    result: stats,
  });
  console.log(
    `Mechanic probe ${floor + 1}: ${b.state}, ${b.time.toFixed(1)}s, ${b.rushStage + 1}/${b.rushStages} stages`,
  );
}
writeFileSync(
  'artifacts/endless-balance-v11.json',
  JSON.stringify(
    {
      version: '1.1.0',
      createdAt: new Date().toISOString(),
      policy:
        'Actual engine; 150 ms pilot reaction; real route, rewards, shop and skill APIs; no invulnerability in expedition samples. Separate late-build probes are explicitly synthetic.',
      results,
      probes,
    },
    null,
    2,
  ),
);

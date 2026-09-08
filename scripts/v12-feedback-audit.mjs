import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expedition } from './balance-sim.mjs';
import { firepower } from '../lib/game.ts';
import { createCheckpointRun } from '../lib/presets.ts';
const historic = JSON.parse(readFileSync('artifacts/balance-v12.json'));
const stats = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p) => {
    const x = (sorted.length - 1) * p,
      lo = Math.floor(x);
    return sorted[lo] + (sorted[Math.ceil(x)] - sorted[lo]) * (x - lo);
  };
  return {
    min: sorted[0],
    q25: q(0.25),
    median: q(0.5),
    q75: q(0.75),
    max: sorted.at(-1),
  };
};
const comparison = [];
for (const classId of ['knight', 'ranger', 'mage'])
  for (const room of [46, 91, 99]) {
    const points = historic.natural
      .filter((r) => r.classId === classId)
      .map((r) => r.checkpoints.find((p) => p.room === room));
    const preset = createCheckpointRun(classId, room < 91 ? 46 : 91);
    comparison.push({
      classId,
      room,
      sampleSize: points.length,
      naturalDps: stats(points.map((p) => p.dps)),
      naturalHp: stats(points.map((p) => p.maxHp)),
      presetDps: firepower(preset).dps,
      presetHp: preset.maxHp,
    });
  }
const report = {
  createdAt: new Date().toISOString(),
  method:
    'Existing 12 actual v1.2 natural runs define the comparison sample. Economy is rechecked on unmodified natural play, with every actual shop debit logged; the script grants no coins or keys. This sample establishes reachability, not a random-player probability.',
  comparison,
  historicKeys: historic.natural
    .filter((r) => !r.noSquare)
    .map((r) => ({
      classId: r.classId,
      seed: r.seed,
      opened: r.endless.keysOpened,
      lore: r.endless.keyLore,
    })),
  hashes: Object.fromEntries(
    ['game', 'combat', 'endless', 'presets'].map((f) => [
      f,
      createHash('sha256')
        .update(readFileSync(`lib/${f}.ts`))
        .digest('hex'),
    ]),
  ),
  economy: [],
};
const routes = process.argv.includes('--all-routes')
  ? [
      ['knight', 734],
      ['ranger', 734],
      ['mage', 734],
    ]
  : [['ranger', 734]];
for (const [classId, seed] of routes) {
  const snapshots = [];
  const result = expedition(classId, seed, 'coherent', {
    difficulty: 'endless',
    maxFloors: 90,
    maxTime: 480,
    onCheckpoint: (r) => {
      if ([45, 75].includes(r.floor)) snapshots.push(r);
    },
    onFinish: (r) => snapshots.push(r),
  });
  writeFileSync(
    `artifacts/feedback-natural-${classId}-${seed}.json`,
    JSON.stringify(snapshots, null, 2),
  );
  const shops = result.decisions.filter((d) => d.kind === 'shop');
  report.economy.push({
    classId,
    seed,
    floor: result.floor,
    failure: result.failure,
    goldEarned: result.goldEarned,
    keysOpened: result.endless.keysOpened,
    shops,
    checkpoints: snapshots.map((r) => ({
      room: r.floor + 1,
      gold: r.gold,
      goldEarned: r.goldEarned,
      dps: firepower(r).dps,
      hp: r.maxHp,
      keysOpened: r.endless.keysOpened,
      keyLore: r.endless.keyLore,
    })),
  });
  console.log(
    classId,
    seed,
    result.floor,
    'earned',
    result.goldEarned,
    'keys',
    result.endless.keysOpened,
    shops.flatMap((d) =>
      (d.purchaseLog || [])
        .filter((p) => p.id === 'relic-square_key')
        .map((p) => ({ room: d.floor, ...p })),
    ),
  );
}
writeFileSync(
  'artifacts/v12-feedback-economy.json',
  JSON.stringify(report, null, 2),
);

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expedition, pilot } from './balance-sim.mjs';

const engineRoot = resolve(process.env.ENGINE_ROOT || 'lib');
const engine = (name) =>
  import(pathToFileURL(resolve(engineRoot, `${name}.ts`)).href);
const { armyLog, setArmy } = await engine('army');
const { createRun, firepower, stats } = await engine('game');
const { createBattle, spectacleDuration } = await engine('combat');
const { createDeveloperRun, DEVELOPER_PRESETS } = await engine('presets');
const { ENDLESS_CURVE } = await engine('endless');

const option = (name, fallback) =>
  process.argv
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.split('=')
    .slice(1)
    .join('=') ?? fallback;
const suite = option('suite', 'focused');
const label = option('label', 'current');
if (!['focused', 'opening', 'natural', 'all', 'curve'].includes(suite))
  throw new Error(`Unknown suite ${suite}`);
if (!/^[a-z0-9-]+$/i.test(label))
  throw new Error('Label must contain only letters, digits or hyphens.');
const classes = option('classes', 'knight,ranger,mage').split(',');
if (classes.some((id) => !['knight', 'ranger', 'mage'].includes(id)))
  throw new Error('Unknown class.');
const seed = Number(option('seed', '734'));
if (!Number.isSafeInteger(seed)) throw new Error('Seed must be an integer.');
const keys = option('keys', 'both');
if (!['both', 'yes', 'no'].includes(keys))
  throw new Error('Keys must be both, yes or no.');
const trials = option('trials', 'all');
if (!['all', 'elite'].includes(trials))
  throw new Error('Trials must be all or elite.');
const output = `artifacts/v123-balance-${label}-${suite}.json`;
mkdirSync('artifacts', { recursive: true });

const build = (run) => ({
  classId: run.classId,
  room: run.floor + 1,
  hp: run.hp,
  maxHp: run.maxHp,
  armor: stats(run).armor,
  armyArmor: stats(run).armyArmor ?? stats(run).armyDefense ?? null,
  armyLog: armyLog(run),
  dps: firepower(run).dps,
  weapon: run.weaponTier,
  gold: run.gold,
  earned: run.goldEarned,
  relics: { ...run.relics },
  endless: { ...run.endless },
});

const report = {
  version: '1.2.3',
  label,
  suite,
  trials,
  seed,
  engineRoot,
  createdAt: new Date().toISOString(),
  method:
    'Actual engine, the existing 150 ms visible-state movement/aim/skill pilot and actual offered menus. No invulnerability, injected heals or injected rewards. Frozen trials reuse the recorded genuine seed-734 room-46/76/91 builds; the 99/100 frozen trials explicitly transplant that room-91 build without awarding rooms 91–98. They are controlled comparisons, not a claim that the route naturally stops there. Opening and natural expeditions start with createRun and use real map choices. Stationary controls still shoot and use skills. No resurrection coins are automatically spent. These deterministic checks are not human win rates.',
  engineHashes: Object.fromEntries(
    [
      'game',
      'combat',
      'army',
      'endless',
      'presets',
      'bosses',
      'encounter-tuning',
    ].map((name) => [
      name,
      existsSync(resolve(engineRoot, `${name}.ts`))
        ? createHash('sha256')
            .update(readFileSync(resolve(engineRoot, `${name}.ts`)))
            .digest('hex')
        : null,
    ]),
  ),
  endlessCurve: ENDLESS_CURVE,
  encounterScale: [],
  independentOfArmy: [],
  curve: [],
  frozen: [],
  opening: [],
  natural: [],
};
const save = () =>
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');

if (existsSync(resolve(engineRoot, 'encounter-tuning.ts'))) {
  const tuning = await engine('encounter-tuning');
  for (const floor of [
    ...Array.from({ length: 18 }, (_, chapter) => chapter * 5),
    90,
    98,
    99,
  ]) {
    const run = { floor, difficulty: 'endless' };
    report.encounterScale.push({
      room: floor + 1,
      ordinaryPerWave: tuning.hordeSize(run, 4),
      troopHp: tuning.troopHealthTuning(run),
      eliteHp: tuning.rulerHealthTuning(run, false),
      chapterBossHp: tuning.rulerHealthTuning(run, true),
      damage: tuning.enemyDamageTuning(run),
      eliteArmor: tuning.eliteDamageReduction(run),
    });
  }
}
for (const floor of [0, 15, 45, 75, 89, 90, 98, 99]) {
  const run = createRun('ranger', seed, 'endless');
  run.floor = floor;
  run.node = {
    id: `independence-${floor}`,
    row: floor % 15,
    col: 1,
    next: [],
    kind: floor >= 90 || floor % 5 === 4 ? 'boss' : 'battle',
  };
  const inspect = (exponent) => {
    setArmy(run, { mantissa: 2.55, exponent });
    return createBattle(run)
      .entities.filter((e) => e.kind === 'enemy')
      .map((e) => ({
        hp: e.hp,
        armor: e.armor,
        damage: e.volleyDamage,
        x: e.x,
        start: e.start,
        encounterId: e.encounterId,
        mutation: e.mutation,
      }));
  };
  const low = inspect(4),
    high = inspect(136);
  const equal = JSON.stringify(low) === JSON.stringify(high);
  report.independentOfArmy.push({
    room: floor + 1,
    equal,
    enemies: low.length,
  });
  if (!equal)
    throw new Error(`Enemy numbers changed with army at room ${floor + 1}`);
}

// Use the actual stats function, including exponents far beyond Number's range.
for (const exponent of [
  0,
  3,
  6,
  12,
  24,
  42,
  60,
  136,
  300,
  10000,
  Number.MAX_SAFE_INTEGER,
]) {
  const run = createRun('ranger', seed, 'endless');
  setArmy(run, { mantissa: exponent === 136 ? 2.55 : 1, exponent });
  const logarithm = armyLog(run);
  const L = Math.max(0, logarithm - 3);
  const expectedArmyArmor = (0.4 * L) / (L + 24);
  const naked = stats(run).armor;
  run.relics.plate = 3;
  const plated = stats(run).armor;
  report.curve.push({
    exponent,
    logarithm,
    actualArmyArmor: naked,
    expectedArmyArmor,
    armorWithThreePlates: plated,
    expectedWithThreePlates: 1 - 0.76 * (1 - expectedArmyArmor),
    firepowerMultiplier: firepower(run).multiplier,
  });
  if (
    ![logarithm, naked, plated, firepower(run).multiplier].every(
      Number.isFinite,
    )
  )
    throw new Error(`Non-finite stats at exponent ${exponent}`);
}
save();

const summarize = (result) => ({
  state: result.state,
  time: result.time,
  cinematicTime: result.cinematicTime,
  bossTime: result.bossTime,
  skills: result.skills,
  damage: result.damage,
  leaks: result.leaks,
  missedChests: result.missedChests,
  hp: result.hp,
  shield: result.shield,
  pressurePulses: result.pressurePulses,
  deathCause: result.deathCause,
  bossDetails: result.bossDetails,
  gatesTaken: result.gatesTaken.map(
    ({ wave, op, value, trialStep, trialFinal }) => ({
      wave,
      op,
      value,
      trialStep,
      trialFinal,
    }),
  ),
});

function runFrozen(run, name, stationary = false) {
  const entry = build(run);
  const battle = createBattle(run);
  const ordinary = battle.entities.filter((e) => e.kind === 'enemy' && !e.boss);
  const initial = {
    enemies: ordinary.length,
    swarms: ordinary.filter((e) => e.swarm || e.variant === 'swarm').length,
    ordinaryHp: ordinary.reduce((sum, e) => sum + e.maxHp, 0),
    waves: battle.totalWaves,
    byWave: [...new Set(ordinary.map((e) => e.wave))].map(
      (wave) => ordinary.filter((e) => e.wave === wave).length,
    ),
    bosses: battle.entities
      .filter((e) => e.boss)
      .map((e) => ({
        id: e.encounterId,
        mutation: e.mutation,
        maxHp: e.maxHp,
        armor: e.armor,
        damage: e.volleyDamage,
        spectacleSeconds: spectacleDuration(e),
      })),
  };
  const result = pilot(battle, { maxTime: 300, stationary });
  const row = {
    name,
    stationary,
    entry,
    initial,
    ...summarize(result),
    passedAlive: ordinary.filter((e) => e.done && e.hp > 0).length,
    ending: build(battle.player),
  };
  report.frozen.push(row);
  save();
  console.log(
    `${label} ${name} ${run.classId}: ${result.state}, ${result.time.toFixed(1)}s, HP ${Math.round(result.hp)}, damage ${result.damage}, ${initial.enemies} enemies, ${row.passedAlive} passed alive`,
  );
}

if (suite === 'focused' || suite === 'all')
  for (const classId of classes) {
    const snapshots = JSON.parse(
      readFileSync(`artifacts/feedback-natural-${classId}-734.json`),
    );
    for (const floor of [45, 75]) {
      const original = snapshots.find((run) => run.floor === floor);
      if (!original)
        throw new Error(`Missing genuine ${classId} snapshot at ${floor}`);
      for (const kind of trials === 'elite' ? ['elite'] : ['battle', 'elite']) {
        const run = structuredClone(original);
        run.node = {
          id: `frozen-${floor}-${kind}`,
          row: floor % 15,
          col: 1,
          next: [],
          kind,
          enchanted: false,
        };
        run.phase = 'battle';
        delete run.devEncounter;
        run.devMode = false;
        runFrozen(run, `room-${floor + 1}-${kind}`);
        if (floor === 75 && kind === 'battle')
          runFrozen(structuredClone(run), 'room-76-stationary', true);
      }
    }
    if (trials === 'elite') continue;
    const staircase = snapshots.find((run) => run.floor === 90);
    if (!staircase) throw new Error(`Missing genuine ${classId} room-91 build`);
    for (const floor of [98, 99]) {
      const run = structuredClone(staircase);
      run.floor = floor;
      run.phase = 'battle';
      run.node = {
        id: `frozen-${floor}-boss`,
        row: floor - 90,
        col: 1,
        next: [],
        kind: 'boss',
      };
      run.devMode = false;
      delete run.devEncounter;
      runFrozen(run, `room-${floor + 1}-natural-build`);
    }
    const preset = createDeveloperRun(
      classId,
      DEVELOPER_PRESETS.find((p) => p.id === 'ascendant'),
      seed,
    );
    runFrozen(preset, 'room-99-developer');
  }

function runExpedition(
  classId,
  difficulty,
  maxFloors,
  category,
  noSquare = false,
) {
  const checkpoints = [];
  let ending;
  const result = expedition(classId, seed, 'coherent', {
    difficulty,
    maxFloors,
    maxTime: 300,
    noSquare,
    onCheckpoint: (run) => {
      if (run.floor % 5 === 0 || run.floor >= 90) checkpoints.push(build(run));
    },
    onFinish: (run) => {
      ending = build(run);
    },
  });
  const ordinary = result.rooms.filter((room) => room.kind !== 'boss');
  const row = {
    classId,
    seed,
    difficulty,
    noSquare,
    floor: result.floor,
    win: result.win,
    ending,
    failure: result.failure,
    hp: result.hp,
    maxHp: result.maxHp,
    checkpoints,
    ordinaryRooms: ordinary.length,
    ordinaryDamage: ordinary.reduce((sum, room) => sum + room.damage, 0),
    ordinaryLeaks: ordinary.reduce((sum, room) => sum + room.leaks, 0),
    rooms: result.rooms.map((room) => ({
      room: room.floor,
      kind: room.kind,
      entryHp: room.entryHp,
      ...summarize(room),
    })),
    decisions: result.decisions,
  };
  report[category].push(row);
  save();
  console.log(
    `${label} ${difficulty} ${classId}/${seed}${noSquare ? ' no-keys' : ''}: floor ${result.floor}, ${result.failure || 'completed'}, HP ${Math.round(result.hp)}, ordinary damage ${row.ordinaryDamage}`,
  );
}

if (suite === 'opening' || suite === 'all')
  for (const classId of classes) {
    for (const difficulty of ['normal', 'hard'])
      runExpedition(classId, difficulty, 15, 'opening');
  }
if (suite === 'natural' || suite === 'all')
  for (const classId of classes) {
    for (const noSquare of keys === 'both' ? [false, true] : [keys === 'no'])
      runExpedition(classId, 'endless', 100, 'natural', noSquare);
  }
save();
console.log(`Wrote ${output}`);

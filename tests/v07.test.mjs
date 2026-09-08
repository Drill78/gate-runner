import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun,
  addRelic,
  completeRoom,
  grantExperience,
  grantGold,
  stats,
  eventChoices,
  eventAction,
  chooseReward,
  restoreRun,
  REWARD_BY_ID,
  MAX_HP,
  MAX_LEVEL,
  MAX_WEAPON_LEVEL,
  HP_PER_LEVEL,
} from '../lib/game.ts';
import {
  createBattle,
  stepBattle,
  activateSkill,
  damagePlayer,
  attackDamage,
  worldY,
  targetVisible,
  skipBattleUpgrade,
  movePlayer,
  setMoveAxis,
} from '../lib/combat.ts';
import {
  emptyCollection,
  mergeCollection,
  parseCollection,
  hardModeUnlocked,
  getAchievementStates,
} from '../lib/collection.ts';
import { ENCOUNTERS } from '../lib/bosses.ts';
import { VIEW } from '../lib/view.ts';

function arena(floor = 4, difficulty = 'normal', classId = 'ranger') {
  const run = createRun(classId, 734, difficulty);
  run.floor = floor;
  run.node = run.nodes[floor][0];
  run.phase = 'battle';
  const b = createBattle(run);
  for (const e of b.entities) if (!e.boss) e.done = true;
  b.time = b.finalStart + 1;
  b.shootTimer = Infinity;
  return b;
}
function advance(b, seconds) {
  for (let i = 0; i < Math.ceil(seconds / 0.01); i++) {
    while (b.levelChoices.length) skipBattleUpgrade(b);
    stepBattle(b, 0.01);
  }
}
function eventRoom(id, floor = 2) {
  for (let seed = 0; seed < 100; seed++) {
    const r = createRun('mage', seed);
    r.floor = floor;
    r.phase = 'event';
    r.node = { ...r.nodes[floor][0], kind: 'event' };
    r.gold = 2000;
    if (eventChoices(r).some((o) => o.id === id)) return r;
  }
  throw new Error(`Missing event ${id}`);
}

test('legacy saves retain resources and unlock hard mode from an existing victory', () => {
  const run = createRun('ranger');
  run.phase = 'map';
  delete run.difficulty;
  delete run.goldEarned;
  delete run.doubleBossWins;
  delete run.flawlessBosses;
  const restored = restoreRun(JSON.stringify(run));
  assert.equal(restored.difficulty, 'normal');
  assert.equal(restored.goldEarned, 0);
  assert.equal(restored.hp, run.hp);
  const oldCollection = parseCollection(
    JSON.stringify({ version: 1, wins: { ranger: 1 } }),
  );
  assert.equal(hardModeUnlocked(oldCollection), true);
  assert.equal(hardModeUnlocked(emptyCollection()), false);
  restored.difficulty = 'hard';
  restored.weaponTier = MAX_WEAPON_LEVEL;
  restored.maxHp = restored.hp = 700;
  assert.deepEqual(restoreRun(JSON.stringify(restored)), restored);
  restored.difficulty = 'impossible';
  assert.equal(restoreRun(JSON.stringify(restored)), null);
});

test('levels and optional relics grow maximum health, heal only their growth, and respect the cap', () => {
  let run = createRun('mage');
  const base = run.maxHp;
  run.hp = 10;
  assert.equal(grantExperience(run, 1e6), MAX_LEVEL - 1);
  assert.equal(run.maxHp, base + (MAX_LEVEL - 1) * HP_PER_LEVEL);
  assert.equal(run.hp, 10 + (MAX_LEVEL - 1) * HP_PER_LEVEL);
  const before = run.maxHp;
  run = addRelic(run, 'constitution');
  assert.equal(run.maxHp, before + Math.ceil(before * 0.12));
  run = addRelic(run, 'lifebloom');
  run.node = run.nodes[0][0];
  const maxHp = run.maxHp;
  run = completeRoom(run, false);
  assert.equal(run.maxHp, maxHp + 3);
  assert.equal(completeRoom(run, false), run, 'no repeat room growth');
  run.maxHp = run.hp = MAX_HP - 1;
  run = addRelic(run, 'vitality');
  assert.equal(run.maxHp, MAX_HP);
  assert.equal(run.hp, MAX_HP);
});

test('draft offers are deterministic, reject unavailable choices, scale across acts and advance once', () => {
  for (const id of [
    'blood',
    'gold',
    'forge',
    'oath',
    'cache',
    'study',
    'mercy',
    'leave',
  ]) {
    const run = eventRoom(id);
    assert.deepEqual(eventChoices(run), eventChoices(structuredClone(run)));
    assert.equal(new Set(eventChoices(run).map((o) => o.id)).size, 3);
    assert.ok(eventChoices(run).some((o) => o.id === 'leave' && o.available));
    const absent = [
      'blood',
      'gold',
      'forge',
      'oath',
      'cache',
      'study',
      'mercy',
    ].find((v) => !eventChoices(run).some((o) => o.id === v));
    assert.equal(eventAction(run, absent), run);
    if (id === 'mercy') run.hp = 10;
    const next = eventAction(run, id);
    assert.equal(next.floor, run.floor + 1);
    assert.equal(next.path.length, run.path.length + 1);
    assert.equal(eventAction(next, id), next);
    if (id === 'blood') {
      assert.equal(next.phase, 'reward');
      assert.equal(next.reward.length, 3);
      assert.ok(
        next.reward.some((r) =>
          ['史诗', '传说'].includes(REWARD_BY_ID[r].rarity),
        ),
      );
      assert.equal(chooseReward(next, next.reward[0]).floor, next.floor);
    }
  }
  const early = eventRoom('gold', 2),
    later = eventRoom('gold', 12);
  early.squad = later.squad = 1e8;
  assert.ok(
    eventChoices(later).find((o) => o.id === 'gold').value >
      eventChoices(early).find((o) => o.id === 'gold').value,
  );
  const capped = eventRoom('forge');
  capped.weaponTier = MAX_WEAPON_LEVEL;
  assert.equal(eventAction(capped, 'forge'), capped);
  const poor = eventRoom('oath');
  poor.gold = 0;
  assert.equal(eventAction(poor, 'oath'), poor);
});

test('run collection milestones count earned gold after spending and retain dual and hard victories', () => {
  const run = createRun('ranger', 1, 'hard');
  grantGold(run, 1800);
  run.gold -= 1000;
  run.doubleBossWins = 2;
  run.flawlessBosses = 1;
  run.phase = 'victory';
  const collection = mergeCollection(emptyCollection(), run);
  const unlocked = new Set(
    getAchievementStates(collection)
      .filter((a) => a.unlocked)
      .map((a) => a.id),
  );
  for (const id of [
    'gold-1500',
    'duo-first',
    'duo-both',
    'hard-victory',
    'flawless',
  ])
    assert.ok(unlocked.has(id));
  assert.equal(collection.records.goldEarned, 1800);
  assert.equal(collection.hardWins.ranger, 1);
  run.phase = 'map';
  assert.equal(mergeCollection(collection, run).records.goldEarned, 1800);
});

test('hard first two chapters have independent health and require both bosses, with one shared deadline', () => {
  for (const floor of [4, 9]) {
    const normal = arena(floor),
      hard = arena(floor, 'hard');
    const bosses = hard.entities.filter((e) => e.boss);
    assert.equal(bosses.length, 2);
    assert.notEqual(bosses[0].encounterId, bosses[1].encounterId);
    assert.ok(bosses[0].x < 0 && bosses[1].x > 0);
    assert.ok(
      Math.abs(
        bosses.reduce((sum, e) => sum + e.maxHp, 0) /
          normal.entities.find((e) => e.boss).maxHp -
          1.32,
      ) < 1e-9,
    );
    const deadline = hard.pressure.nextAt;
    bosses[0].done = true;
    bosses[1].lastAttack = Infinity;
    stepBattle(hard, 0.01);
    assert.equal(hard.state, 'running');
    assert.equal(hard.pressure.bossId, bosses[1].id);
    assert.equal(hard.pressure.nextAt, deadline);
    bosses[1].hp = 1;
    hard.cooldown = 0;
    activateSkill(hard);
    advance(hard, 0.02);
    assert.equal(hard.state, 'won');
    assert.equal(hard.player.doubleBossWins, 1);
    assert.equal(hard.player.flawlessBosses, 1);
    const coins = hard.player.goldEarned;
    advance(hard, 1);
    assert.equal(hard.player.goldEarned, coins, 'victory rewards paid once');
  }
  assert.equal(arena(14, 'hard').entities.filter((e) => e.boss).length, 1);
  const damaged = arena(4, 'hard');
  damagePlayer(damaged, 1, 0);
  damaged.entities.forEach((e) => {
    e.done = true;
  });
  stepBattle(damaged, 0.01);
  assert.equal(damaged.player.flawlessBosses, 0);
});

test('top visible enemies can receive bullets and skills before reaching their old active line', () => {
  const b = arena(0);
  const sentinel = b.entities.find((e) => e.boss);
  sentinel.start = 1000;
  const target = b.entities.find((e) => !e.boss && e.kind === 'enemy');
  Object.assign(target, {
    done: false,
    start: 10,
    arrival: 14,
    x: 0,
    hp: 1000,
    maxHp: 1000,
    armor: 0,
    lastAttack: Infinity,
  });
  b.time = 9;
  assert.ok(worldY(target, b.time) < 0);
  assert.equal(targetVisible(target, b.time), true);
  b.bullets.push({
    id: 500,
    kind: 'arrow',
    x: 0,
    y: worldY(target, b.time) + 0.07,
    vx: 0,
    vy: -2,
    radius: 0.025,
    damage: 100,
    critical: false,
    pierceLeft: 0,
    hitIds: [],
    spawnAt: 8,
    originX: 0,
    originY: VIEW.playerY,
    canProc: true,
  });
  stepBattle(b, 0.05);
  assert.equal(target.hp, 900);
  activateSkill(b);
  assert.ok(target.hp < 900);
  assert.equal(sentinel.hp, sentinel.maxHp);
  b.cooldown = 0;
  target.start = 100;
  const hp = target.hp;
  activateSkill(b);
  assert.equal(target.hp, hp, 'unseen future enemy is untouched');
});

test('burn damage scales with current player firepower and focus changes physical bullet size', () => {
  const burn = (squad, weapon) => {
    const b = arena(0, 'normal', 'mage');
    const target = b.entities.find((e) => e.boss);
    b.player.relics = { ember: 2 };
    b.player.squad = squad;
    b.player.weaponTier = weapon;
    target.lastAttack = Infinity;
    target.burnUntil = b.time + 3;
    const expected = attackDamage(b) * 0.64 * 0.05;
    stepBattle(b, 0.05);
    assert.ok(Math.abs(target.maxHp - target.hp - expected) < 1e-8);
    return expected;
  };
  assert.ok(burn(1000, 20) > burn(10, 1) * 5);
  const run = createRun('mage');
  const base = stats(run).bulletRadius;
  run.relics.focus = 2;
  assert.ok(stats(run).bulletRadius > base * 2);
});

for (const profile of ENCOUNTERS)
  test(`${profile.id} has a distinct telegraphed signature and a surviving safe position`, () => {
    const b = arena(profile.kind === 'elite' ? 0 : profile.act * 5 + 4);
    const boss = b.entities.find((e) => e.boss);
    boss.encounterId = profile.id;
    boss.attackIndex = profile.id === 'king' ? 4 : 2;
    b.pressure = null;
    stepBattle(b, 0.01);
    boss.lastAttack = Infinity;
    const additions = b.entities.filter((e) => !e.done && !e.boss);
    assert.ok(
      b.threats.length +
        b.projectiles.length +
        b.zones.length +
        additions.length >
        0,
    );
    assert.ok(b.threats.every((t) => t.resolveAt - b.time >= 1));
    assert.ok(
      b.zones.every((z) => z.startsAt - b.time >= 1.2 && z.endsAt > z.startsAt),
    );
    // Isolated signature mechanics offer at least one fixed safe location over
    // their full resolution window. This does not assert arbitrary dual overlaps.
    if (profile.id === 'commander') {
      assert.equal(additions.length, 2);
      assert.ok(
        additions.every(
          (e) => e.variant === 'archer' && e.hp < boss.maxHp * 0.03,
        ),
      );
      return;
    }
    const safe = Array.from({ length: 61 }, (_, i) => -0.9 + i * 0.03).some(
      (x) => {
        const trial = structuredClone({ ...b, random: undefined });
        trial.random = () => 1;
        trial.x = x;
        const hp = trial.player.hp;
        advance(trial, 6);
        return trial.player.hp === hp;
      },
    );
    assert.ok(safe, 'signature has a real safe solution');
  });

test('soul lamps are destructible, shield their owner until both break, and cannot accumulate endlessly', () => {
  const b = arena(9);
  const boss = b.entities.find((e) => e.boss);
  boss.encounterId = 'lich';
  boss.attackIndex = 2;
  stepBattle(b, 0.01);
  const lamps = b.entities.filter((e) => e.guardianOf === boss.id);
  assert.equal(lamps.length, 2);
  assert.ok(lamps.every((e) => e.stationary && !e.boss));
  boss.attackIndex = 5;
  boss.lastAttack = b.time - 5;
  stepBattle(b, 0.01);
  assert.equal(b.entities.filter((e) => e.guardianOf === boss.id).length, 2);
  boss.lastAttack = Infinity;
  advance(b, 0.4);
  const hit = attackDamage(b) * 4;
  const before = boss.hp;
  activateSkill(b);
  assert.ok(Math.abs(before - boss.hp - hit * 0.55) < 1e-7);
  lamps.forEach((e) => {
    e.done = true;
  });
  b.cooldown = 0;
  const unwarded = boss.hp;
  activateSkill(b);
  assert.ok(Math.abs(unwarded - boss.hp - hit) < 1e-7);
});

test('web zones telegraph, slow movement, damage on ticks, and vanish when their owner dies', () => {
  const b = arena(0);
  const boss = b.entities.find((e) => e.boss);
  boss.encounterId = 'broodmother';
  boss.attackIndex = 2;
  stepBattle(b, 0.01);
  boss.lastAttack = Infinity;
  const zone = b.zones[0];
  b.x = zone.x;
  const hp = b.player.hp;
  advance(b, 1.3);
  assert.equal(b.player.hp, hp);
  advance(b, 0.2);
  assert.ok(b.player.hp < hp);
  const previous = b.x;
  setMoveAxis(b, 1);
  stepBattle(b, 0.05);
  assert.ok(Math.abs(b.x - previous - 2.2 * 0.65 * 0.05) < 1e-8);
  boss.done = true;
  stepBattle(b, 0.01);
  assert.equal(b.zones.length, 0);
});

test('final king transitions add staggered ground flames without increasing normal base durability', () => {
  const b = arena(14);
  const boss = b.entities.find((e) => e.boss);
  assert.equal(Math.round(boss.maxHp), 297321);
  boss.lastAttack = Infinity;
  boss.hp = boss.maxHp * 0.7;
  stepBattle(b, 0.01);
  assert.equal(boss.phase, 2);
  assert.equal(b.zones.length, 2);
  assert.ok(b.zones[1].startsAt > b.zones[0].startsAt);
  movePlayer(b, 0);
  const hp = b.player.hp;
  advance(b, 5);
  assert.equal(b.player.hp, hp);
});

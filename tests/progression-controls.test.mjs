import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun,
  grantExperience,
  experience,
  rollRewards,
  rollLevelChoices,
  chooseReward,
  RELIC_BY_ID,
  REWARD_BY_ID,
  restoreRun,
  stats,
} from '../lib/game.ts';
import {
  createBattle,
  stepBattle,
  activateSkill,
  chooseBattleUpgrade,
  skipBattleUpgrade,
  movePlayer,
  BALANCE,
} from '../lib/combat.ts';
import { createHeroTapTracker } from '../lib/controls.ts';
import { parseStorage } from '../lib/storage.ts';

function battle(floor = 0, kind = 'battle') {
  const run = createRun('knight', 734);
  run.phase = 'battle';
  run.floor = floor;
  run.node = { id: `${floor}-1`, floor, col: 1, kind };
  return createBattle(run);
}

test('level choices freeze every combat clock and consume one valid upgrade at a time', () => {
  const b = battle();
  grantExperience(b.player, 100);
  b.cooldown = 4;
  stepBattle(b, 0.05);
  assert.equal(experience(b.player).level, 3);
  assert.equal(b.levelChoices.length, 3);
  const frozen = [b.time, b.x, b.cooldown, b.shots];
  movePlayer(b, 0.9);
  assert.equal(activateSkill(b), false);
  for (let i = 0; i < 20; i++) stepBattle(b, 0.05);
  assert.deepEqual([b.time, b.x, b.cooldown, b.shots], frozen);
  assert.equal(chooseBattleUpgrade(b, 'square_key'), false);
  const first = b.levelChoices[0];
  assert.equal(chooseBattleUpgrade(b, first), true);
  assert.equal(b.player.relics[first], 1);
  assert.equal(b.player.talentPicks, 1);
  assert.equal(b.levelChoices.length, 3);
  assert.equal(skipBattleUpgrade(b), true);
  assert.equal(b.player.talentPicks, 2);
  assert.deepEqual(b.levelChoices, []);
  assert.equal(skipBattleUpgrade(b), false);
  stepBattle(b, 0.05);
  assert.equal(b.time, 0.05);
});

test('upgrades earned on a winning frame remain selectable before leaving the room', () => {
  const b = battle();
  grantExperience(b.player, 30);
  stepBattle(b, 0.01);
  b.state = 'won';
  assert.equal(chooseBattleUpgrade(b, b.levelChoices[0]), true);
  assert.equal(b.player.talentPicks, 1);
  assert.equal(b.levelChoices.length, 0);
  assert.equal(chooseBattleUpgrade(b, 'steel'), false);
  stepBattle(b, 0.05);
  assert.equal(b.time, 0);
});

test('level skills reject capped and foreign runes and legacy checkpoints do not grant retroactive picks', () => {
  const run = createRun('mage');
  grantExperience(run, 100);
  run.relics.split = RELIC_BY_ID.split.max;
  for (let seed = 0; seed < 100; seed++) {
    const choices = rollLevelChoices({ ...run, seed });
    assert.equal(new Set(choices).size, 3);
    assert.ok(!choices.includes('split') && !choices.includes('square_key'));
    assert.ok(
      choices.every((id) => ['all', 'mage'].includes(RELIC_BY_ID[id].family)),
    );
  }
  run.phase = 'map';
  const legacy = { ...run, version: 3 };
  delete legacy.talentPicks;
  const restored = restoreRun(JSON.stringify(legacy));
  assert.equal(restored.talentPicks, 2);
  assert.deepEqual(rollLevelChoices(restored), []);
  assert.equal(restoreRun(JSON.stringify({ ...run, talentPicks: 15 })), null);
});

test('post-room supplies share shop effects, preserve the build and are never offered when useless', () => {
  const run = createRun('knight');
  run.phase = 'reward';
  run.hp = 1;
  const supplies = new Set();
  for (let seed = 0; seed < 500; seed++) {
    const choices = rollRewards({ ...run, seed });
    assert.equal(new Set(choices).size, 3);
    assert.equal(REWARD_BY_ID[choices[0]].family, 'knight');
    for (const id of choices.filter((id) => id.startsWith('supply-'))) {
      supplies.add(id);
      const source = { ...run, reward: choices };
      const next = chooseReward(source, id);
      assert.equal(next.phase, 'map');
      assert.deepEqual(next.relics, {});
      if (id === 'supply-potion') assert.equal(next.hp, 41);
      if (id === 'supply-company') assert.equal(next.squad, 62);
      if (id === 'supply-weapon') assert.equal(next.weaponTier, 2);
      assert.equal(chooseReward(next, id), next);
    }
    const full = rollRewards({
      ...run,
      seed,
      hp: run.maxHp,
      weaponTier: 25,
      squad: Number.MAX_SAFE_INTEGER,
    });
    assert.ok(full.every((id) => !id.startsWith('supply-')));
  }
  assert.equal(supplies.size, 3);
});

test('legendary runes retain their mechanical effects while appearing less often', () => {
  for (const id of ['paladin', 'hunter', 'archmage', 'split'])
    assert.equal(RELIC_BY_ID[id].rarity, '传说');
  const counts = { legendary: 0, common: 0 };
  for (let seed = 0; seed < 1000; seed++) {
    const run = createRun('knight', seed);
    grantExperience(run, 30);
    for (const id of rollLevelChoices(run)) {
      if (RELIC_BY_ID[id].rarity === '传说') counts.legendary++;
      if (RELIC_BY_ID[id].rarity === '普通') counts.common++;
    }
  }
  assert.ok(counts.legendary > 0 && counts.legendary < counts.common / 4);
  const knight = createRun('knight');
  knight.relics.paladin = 1;
  assert.equal(stats(knight).cooldown, 8);
});

test('long-distance pointer movement crosses the arena in 150ms without teleporting', () => {
  const b = battle();
  b.x = -0.9;
  movePlayer(b, 0.9);
  stepBattle(b, 0.05);
  assert.ok(b.x > -0.9 && b.x < 0.9);
  stepBattle(b, 0.05);
  stepBattle(b, 0.05);
  assert.ok(Math.abs(b.x - 0.9) < 1e-9);
  assert.equal(BALANCE.pointerMaxSpeed, 12);
});

test('double tap casts only for two short stationary touches that begin on the hero', () => {
  const tracker = createHeroTapTracker();
  const point = (time, x = 100, y = 300) => ({ x, y, time });
  tracker.down(point(0), true);
  assert.equal(tracker.up(point(70)), false);
  tracker.down(point(170), true);
  assert.equal(tracker.up(point(220)), true);
  tracker.down(point(300), true);
  tracker.move(point(340, 180));
  tracker.move(point(360));
  assert.equal(
    tracker.up(point(400)),
    false,
    'a drag returning to its origin still cannot cast',
  );
  tracker.down(point(450), true);
  assert.equal(tracker.up(point(490)), false);
  tracker.down(point(550), false);
  assert.equal(tracker.up(point(600)), false);
  tracker.down(point(700), true);
  assert.equal(tracker.up(point(1000)), false, 'long press is not a tap');
  tracker.down(point(1050), true);
  tracker.up(point(1100));
  tracker.reset();
  tracker.down(point(1170), true);
  assert.equal(
    tracker.up(point(1220)),
    false,
    'pause or cancel resets the sequence',
  );
  assert.equal(parseStorage('').doubleTapSkill, false);
  assert.equal(parseStorage('{"doubleTapSkill":true}').doubleTapSkill, true);
});

test('the king ordinary chant can be dodged without damage; only chapter pressure is unavoidable', () => {
  for (const safe of [true, false]) {
    const b = battle(14, 'boss');
    const boss = b.entities.find((e) => e.boss);
    for (const e of b.entities) if (e !== boss) e.done = true;
    b.pressure = null;
    b.time = boss.start + 1;
    b.shootTimer = Infinity;
    boss.attackIndex = 1;
    stepBattle(b, 0.01);
    assert.ok(b.ritual);
    const cast = b.ritual;
    b.x = safe ? cast.safeX : cast.safeX < 0 ? 0.9 : -0.9;
    const healthAndShield = b.player.hp + b.shield;
    b.time = cast.resolveAt - 0.01;
    stepBattle(b, 0.02);
    if (safe) assert.equal(b.player.hp + b.shield, healthAndShield);
    else assert.ok(b.player.hp + b.shield < healthAndShield);
  }
  for (const kind of ['battle', 'elite'])
    assert.equal(battle(4, kind).pressure, null);
  assert.ok(battle(4, 'boss').pressure);
});

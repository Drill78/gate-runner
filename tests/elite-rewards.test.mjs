import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RELICS,
  REWARD_BY_ID,
  ELITE_FALLBACK_REWARDS,
  createRun,
  availableRelics,
  availableNodes,
  enterNode,
  completeRoom,
  addRelic,
  rollRewards,
  chooseReward,
  shopInventory,
  rollLevelChoices,
  grantExperience,
  restoreRun,
} from '../lib/game.ts';

const high = (id) => ['史诗', '传说'].includes(REWARD_BY_ID[id].rarity);
function assertElite(choices) {
  assert.equal(choices.length, 3);
  assert.equal(new Set(choices).size, 3);
  assert.ok(choices.some(high));
  assert.ok(!choices.includes('square_key'));
}
function maxRelics(run, predicate = () => true) {
  for (const relic of availableRelics(run).filter(predicate))
    run.relics[relic.id] = relic.max;
  return run;
}

test('elite three-choice rewards retain an epic or legendary through supply replacement', () => {
  let withSupply = 0;
  for (const classId of ['knight', 'ranger', 'mage']) {
    for (let seed = 0; seed < 200; seed++) {
      const run = createRun(classId, seed);
      run.floor = seed % 15;
      run.hp -= 20;
      const choices = rollRewards(run, true);
      assertElite(choices);
      if (choices.some((id) => id.startsWith('supply-'))) withSupply++;
      for (const id of choices.filter((id) => !id.startsWith('supply-')))
        assert.ok(availableRelics(run).some((relic) => relic.id === id));
    }
  }
  assert.ok(
    withSupply > 100,
    'the tested population actually includes supply replacements',
  );
});

test('ordinary and enchanted elite room completion share the guarantee', () => {
  for (const enchanted of [false, true]) {
    let run = createRun('mage', 734);
    run.phase = 'map';
    if (enchanted) run = addRelic(run, 'square_key');
    const elite = availableNodes(run).find((node) => node.kind === 'elite');
    run = enterNode(run, elite.id);
    assert.equal(Boolean(run.node.enchanted), enchanted);
    run = completeRoom(run);
    assertElite(run.reward);
    assert.ok(restoreRun(JSON.stringify(run)));
  }
});

test('remaining legendary relics satisfy the guarantee before a consumable fallback', () => {
  const run = maxRelics(createRun('knight', 123), (relic) => high(relic.id));
  delete run.relics.split;
  for (let seed = 0; seed < 50; seed++) {
    run.seed = seed;
    const choices = rollRewards(run, true);
    assertElite(choices);
    assert.ok(choices.includes('split'));
    assert.ok(!choices.includes('supply-epic-cache'));
  }
});

test('fully stacked high-tier relics produce a repeatable epic reward, not a capped relic', () => {
  const run = maxRelics(createRun('ranger', 123), (relic) => high(relic.id));
  const choices = rollRewards(run, true);
  assertElite(choices);
  assert.ok(choices.includes('supply-epic-cache'));
  for (const id of choices.filter((id) => !id.startsWith('supply-')))
    assert.ok(!high(id));
});

test('even fully exhausted pools present three distinct epic consumables with real effects', () => {
  let run = maxRelics(createRun('knight', 734));
  run.weaponTier = 25;
  run.squad = Number.MAX_SAFE_INTEGER;
  run.phase = 'reward';
  run.reward = rollRewards(run, true);
  assert.deepEqual(
    run.reward,
    ELITE_FALLBACK_REWARDS.map((reward) => reward.id),
  );
  assertElite(run.reward);
  const original = structuredClone(run);
  const cache = chooseReward(run, 'supply-epic-cache');
  assert.equal(cache.gold, run.gold + 120);
  assert.equal(cache.hp, run.hp);
  assert.deepEqual(cache.relics, run.relics);
  assert.equal(chooseReward(cache, 'supply-epic-cache'), cache);
  const vigor = chooseReward(run, 'supply-epic-vigor');
  assert.equal(vigor.maxHp, run.maxHp + 8);
  assert.equal(vigor.hp, run.hp + 8);
  const company = chooseReward(run, 'supply-epic-company');
  assert.equal(company.gold, run.gold + 60);
  assert.ok(company.squad > Number.MAX_SAFE_INTEGER);
  assert.deepEqual(
    run,
    original,
    'claim does not mutate the original checkpoint',
  );
  run = { ...cache, phase: 'reward', reward: rollRewards(cache, true) };
  assert.equal(chooseReward(run, 'supply-epic-cache').gold, cache.gold + 120);
});

test('fallback supplies remain outside permanent relic, shop and ordinary reward pools', () => {
  const fallbackIds = new Set(
    ELITE_FALLBACK_REWARDS.map((reward) => reward.id),
  );
  assert.ok(RELICS.every((relic) => !fallbackIds.has(relic.id)));
  for (let seed = 0; seed < 30; seed++) {
    const run = createRun('mage', seed);
    grantExperience(run, 30);
    assert.ok(rollRewards(run).every((id) => !fallbackIds.has(id)));
    assert.ok(rollLevelChoices(run).every((id) => !fallbackIds.has(id)));
    assert.ok(
      shopInventory(run).every(
        (item) => !fallbackIds.has(item.id) && !fallbackIds.has(item.relicId),
      ),
    );
  }
});

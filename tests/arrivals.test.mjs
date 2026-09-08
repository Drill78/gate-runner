import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, createRunMap } from '../lib/game.ts';
import { createBattle } from '../lib/combat.ts';
import { createDeveloperRun, DEVELOPER_PRESETS } from '../lib/presets.ts';
import { arrivalRoster } from '../lib/arrivals.ts';

test('hard chapter pairs each receive their own full portrait entrance', () => {
  for (const floor of [4, 9]) {
    const run = createRun('knight', 721604, 'hard');
    Object.assign(run, {
      floor,
      phase: 'map',
      nodes: createRunMap(run.seed, 'hard', floor),
    });
    run.node = run.nodes[floor].find((node) => node.kind === 'boss');
    assert.ok(run.node);
    run.phase = 'battle';
    const cards = arrivalRoster(createBattle(run));
    assert.equal(cards.length, 2);
    assert.equal(new Set(cards.map((card) => card.profile.id)).size, 2);
    assert.deepEqual(
      cards.map((card) => card.duration),
      [3, 3],
    );
  }
});

test('rush entrances show only the current group, including all three identically named kings', () => {
  const battle = createBattle(
    createDeveloperRun(
      'knight',
      DEVELOPER_PRESETS.find((preset) => preset.id === 'round-six'),
    ),
  );
  const expected = [
    ['watcher', 'lich'],
    ['wyvern', 'oracle'],
    ['king', 'king', 'king'],
  ];
  assert.equal(battle.totalWaves, 0);
  for (const [stage, ids] of expected.entries()) {
    battle.rushStage = stage;
    const cards = arrivalRoster(battle);
    assert.deepEqual(
      cards.map((card) => card.profile.id),
      ids,
    );
    assert.equal(new Set(cards.map((card) => card.key)).size, ids.length);
    assert.equal(
      cards.reduce((seconds, card) => seconds + card.duration, 0),
      stage === 2 ? 12 : 6,
    );
  }
  battle.entities
    .filter((entity) => entity.stage === 2)
    .forEach((entity) => {
      entity.done = true;
    });
  assert.deepEqual(arrivalRoster(battle), []);
  battle.epilogue = true;
  battle.rushStage = 0;
  assert.deepEqual(arrivalRoster(battle), []);
});

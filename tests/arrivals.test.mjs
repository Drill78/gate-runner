import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, createRunMap } from '../lib/game.ts';
import { createBattle, hitEntity, stepBattle } from '../lib/combat.ts';
import { createDeveloperRun, DEVELOPER_PRESETS } from '../lib/presets.ts';
import {
  arrivalRoster,
  ArrivalSequence,
  mandatoryArrivalRoom,
  seenArrivals,
  transitionArrivalCard,
  skipTransitionArrival,
} from '../lib/arrivals.ts';

function arena(floor, groups, defeated = {}) {
  const run = createRun('ranger', 734, 'endless');
  Object.assign(run, {
    floor,
    phase: 'battle',
    node: { id: `${floor}-2`, floor, col: 2, kind: 'boss', next: [] },
    devMode: true,
    devEncounter: { name: '演武', omen: '', groups, secondLives: true },
    encountersDefeated: defeated,
  });
  const battle = createBattle(run);
  battle.pressure = null;
  battle.shootTimer = Infinity;
  return battle;
}

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
    assert.ok(cards.every((card) => !card.skippable));
  }
});

test('known rulers may be skipped, but an unseen partner and the first new royal form keep their full entrance', () => {
  const battle = arena(19, [['watcher', 'lich']], { watcher: 2 });
  const shown = seenArrivals(battle);
  const cards = arrivalRoster(battle, shown);
  assert.deepEqual(
    cards.map((card) => card.skippable),
    [true, false],
  );
  assert.equal(
    shown.has('lich'),
    false,
    'planning a queue does not mark later cards as displayed',
  );
  const rebirth = {
    kind: 'revival',
    seq: 1,
    encounterId: 'king-reborn',
    duration: 4,
    remaining: 4,
  };
  shown.add('king');
  const first = transitionArrivalCard(battle, rebirth, shown);
  assert.equal(first.skippable, false);
  shown.add(first.identity);
  assert.equal(
    first.skippable,
    false,
    'showing a mandatory card cannot unlock it midway',
  );
  assert.equal(
    transitionArrivalCard(battle, { ...rebirth, seq: 2 }, shown).skippable,
    true,
  );
  shown.add('king-ascendant');
  const eclipse = transitionArrivalCard(
    battle,
    { ...rebirth, encounterId: 'king-ascendant', form: 'eclipse' },
    shown,
  );
  assert.equal(
    eclipse.skippable,
    false,
    'the solar portrait does not pre-discover its eclipse form',
  );
  assert.notEqual(eclipse.identity, 'king-ascendant');
  assert.equal(
    transitionArrivalCard(battle, { ...rebirth, kind: 'shatter' }, shown),
    null,
  );
});

test('all six round finales and every staircase room retain mandatory rush and revival entrances', () => {
  const rooms = [
    15,
    30,
    45,
    60,
    75,
    90,
    ...Array.from({ length: 10 }, (_, i) => 91 + i),
  ];
  for (const room of rooms) {
    const battle = arena(
      room - 1,
      [
        ['watcher', 'lich'],
        ['king', 'king', 'king'],
      ],
      {
        watcher: 2,
        lich: 2,
        king: 2,
        'king-reborn': 2,
      },
    );
    assert.equal(mandatoryArrivalRoom(battle), true);
    const shown = seenArrivals(battle);
    for (const stage of [0, 1]) {
      battle.rushStage = stage;
      const cards = arrivalRoster(battle, shown);
      assert.ok(
        cards.every((card) => !card.skippable),
        `room ${room}, stage ${stage}`,
      );
    }
    const transition = {
      kind: 'revival',
      seq: 1,
      encounterId: 'king-reborn',
      duration: 4,
      remaining: 4,
    };
    battle.transition = transition;
    const card = transitionArrivalCard(battle, transition, shown);
    assert.equal(card.skippable, false);
    assert.equal(skipTransitionArrival(battle, card, card.key), false);
    assert.equal(transition.remaining, 4);
  }
});

test('a skip consumes one visible card while unseen partners, stale input and paused timers remain protected', () => {
  const battle = arena(34, [
    ['watcher', 'watcher', 'lich'],
    ['watcher', 'wyvern'],
  ]);
  const shown = seenArrivals(battle),
    sequence = new ArrivalSequence(shown);
  sequence.start(arrivalRoster(battle, shown));
  const firstKey = sequence.current.key;
  assert.equal(sequence.current.skippable, false);
  assert.equal(sequence.skip(firstKey), false);
  assert.equal(sequence.tick(3, true), false);
  assert.equal(sequence.remaining, 3);
  assert.equal(sequence.tick(2.9), false);
  assert.equal(sequence.tick(0.1), true);
  const secondKey = sequence.current.key;
  assert.equal(sequence.current.profile.id, 'watcher');
  assert.equal(sequence.current.skippable, true);
  assert.equal(sequence.skip(firstKey), false);
  assert.equal(sequence.skip(secondKey, true), false);
  assert.equal(sequence.remaining, 3);
  assert.equal(sequence.skip(secondKey), true);
  assert.equal(sequence.current.profile.id, 'lich');
  assert.equal(sequence.current.skippable, false);
  assert.equal(sequence.remaining, 3);
  assert.equal(
    sequence.skip(secondKey),
    false,
    'a repeated click cannot advance the next card',
  );
  sequence.tick(3);
  assert.equal(sequence.current, null);
  battle.rushStage = 1;
  sequence.start(arrivalRoster(battle, shown));
  assert.equal(
    sequence.current.skippable,
    true,
    'the prior stage already introduced this ruler',
  );
  sequence.skip(sequence.current.key);
  assert.equal(sequence.current.profile.id, 'wyvern');
  assert.equal(sequence.current.skippable, false);
  assert.equal(battle.time, 0);
  assert.deepEqual(battle.player.encountersDefeated, {});
});

test('skipping a known royal revival lets the real engine advance exactly one transition without advancing combat', () => {
  const battle = arena(34, [['king', 'king']], { king: 1, 'king-reborn': 1 });
  const royal = battle.entities[0];
  battle.time = royal.start + 13;
  for (let i = 0; i < 40 && !battle.transition; i++)
    hitEntity(battle, royal, royal.maxHp * 100, false, false, 0.9);
  assert.equal(battle.transition.kind, 'revival');
  const originalTime = battle.time,
    originalCombatTime = battle.player.combatTime;
  const card = transitionArrivalCard(
    battle,
    battle.transition,
    seenArrivals(battle),
  );
  assert.equal(card.skippable, true);
  const next = {
    kind: 'revival',
    seq: 100,
    encounterId: 'deity',
    duration: 3,
    remaining: 3,
  };
  battle.transitionQueue.push(next);
  assert.equal(skipTransitionArrival(battle, card, card.key, true), false);
  assert.equal(battle.transition.remaining, 4);
  assert.equal(skipTransitionArrival(battle, card, 'stale-key'), false);
  assert.equal(skipTransitionArrival(battle, card, card.key), true);
  assert.equal(skipTransitionArrival(battle, card, card.key), false);
  stepBattle(battle, 0.05);
  assert.equal(battle.time, originalTime);
  assert.equal(battle.player.combatTime, originalCombatTime);
  assert.equal(battle.transition.encounterId, 'deity');
  assert.equal(battle.transition.remaining, 3);
  assert.equal(battle.transitionQueue.length, 0);
  assert.equal(skipTransitionArrival(battle, card, card.key), false);
  const unseen = transitionArrivalCard(
    battle,
    battle.transition,
    seenArrivals(battle),
  );
  assert.equal(unseen.skippable, false);
  assert.equal(skipTransitionArrival(battle, unseen, unseen.key), false);
  assert.equal(battle.state, 'running');
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { ACT_LENGTH, createRun } from '../lib/game.ts';
import { createBattle, worldY } from '../lib/combat.ts';
import { VIEW, screenX, screenY, pointerToWorldX } from '../lib/view.ts';

const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≈ ${expected}`);

test('the wider forward view places the commander at 77–79% on portrait screens', () => {
  for (const height of [667, 740, 844, 900, 1024]) {
    const fraction = screenY(VIEW.playerY, height) / height;
    assert.ok(fraction >= 0.77 && fraction <= 0.79, `${height}px: ${fraction}`);
    assert.ok(screenY(VIEW.playerY, height) + 45 < height - VIEW.controlSpace);
  }
  const forwardGain = (VIEW.playerY - VIEW.far) / (0.8 - -0.45) - 1;
  assert.ok(forwardGain >= 0.15 && forwardGain <= 0.2);
});

test('horizontal pointer input exactly inverts the shared projection', () => {
  for (const width of [320, 390, 560, 1024]) {
    for (const x of [-1, -0.9, -0.25, 0, 0.45, 0.9, 1]) {
      close(pointerToWorldX(screenX(x, width), width), x);
    }
    close(screenX(-1, width), width * 0.035);
    close(screenX(1, width), width * 0.965);
    assert.ok(pointerToWorldX(0, width) < -1);
    assert.ok(pointerToWorldX(width, width) > 1);
  }
  assert.equal(pointerToWorldX(1, 0), 0);
  assert.equal(pointerToWorldX(Number.NaN, 390), 0);
});

test('world projection is linear at every depth and preserves the bottom strip', () => {
  for (const height of [390, 667, 844, 1024]) {
    close(screenY(VIEW.far, height), 0);
    close(screenY(VIEW.near, height), height - VIEW.controlSpace);
    const displacement = screenY(0.1, height) - screenY(0, height);
    for (const y of [-0.6, -0.2, 0.3, 0.7, 1]) {
      close(screenY(y + 0.1, height) - screenY(y, height), displacement);
    }
  }
});

test('all acts expose negative-progress previews and retain the player collision line', () => {
  close(VIEW.previewSeconds / 1.25, 1.2);
  for (const floor of [0, ACT_LENGTH, ACT_LENGTH * 2]) {
    const run = createRun('knight', 734);
    run.floor = floor;
    run.phase = 'battle';
    run.node = run.nodes[floor].find((node) => node.kind === 'elite');
    assert.ok(run.node);
    const battle = createBattle(run);
    const entity = battle.entities.find((e) => e.kind === 'gate');
    const earliestY = worldY(entity, entity.start - VIEW.previewSeconds);
    assert.ok(earliestY < worldY(entity, entity.start));
    for (const height of [390, 667, 844]) {
      assert.ok(screenY(earliestY, height) > 0);
      close(
        screenY(worldY(entity, entity.arrival), height),
        screenY(VIEW.playerY, height),
      );
      const earlySpeed =
        screenY(worldY(entity, entity.start + 0.25), height) -
        screenY(worldY(entity, entity.start), height);
      const lateSpeed =
        screenY(worldY(entity, entity.arrival), height) -
        screenY(worldY(entity, entity.arrival - 0.25), height);
      close(earlySpeed, lateSpeed);
    }
  }
});

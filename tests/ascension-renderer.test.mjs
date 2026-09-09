import test from 'node:test';
import assert from 'node:assert/strict';
import { addRelic, createRun, effectiveGate, gateLabel } from '../lib/game.ts';
import {
  createBattle,
  DEITY_SKILLS,
  syncEpiloguePlayback,
  stepBattle,
} from '../lib/combat.ts';
import { drawBattle } from '../lib/renderer.ts';
import {
  drawAscensionBoss,
  drawHolyThreat,
} from '../lib/ascension-renderer.ts';
import { screenX, screenY, VIEW } from '../lib/view.ts';
import {
  advanceEpilogueCelebration,
  canStartEpilogueGif,
  emptyEpilogueCelebration,
  EPILOGUE_GIF_CYCLE_SECONDS,
  EPILOGUE_GIF_HOLD_SECONDS,
  EPILOGUE_GIF_LIFETIME,
  EPILOGUE_GIF_LIMIT,
  EPILOGUE_GIF_SPACING,
  EPILOGUE_DURATION_SECONDS,
} from '../lib/epilogue.ts';

function recorder() {
  const calls = [],
    points = [],
    stack = [];
  let matrix = [1, 0, 0, 1, 0, 0];
  const state = { fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1 };
  const multiply = (m) => {
    const [a, b, c, d, x, y] = matrix;
    matrix = [
      a * m[0] + c * m[1],
      b * m[0] + d * m[1],
      a * m[2] + c * m[3],
      b * m[2] + d * m[3],
      a * m[4] + c * m[5] + x,
      b * m[4] + d * m[5] + y,
    ];
  };
  const point = (x, y) =>
    points.push([
      matrix[0] * x + matrix[2] * y + matrix[4],
      matrix[1] * x + matrix[3] * y + matrix[5],
    ]);
  const api = {
    save() {
      stack.push({ matrix: [...matrix], state: { ...state } });
    },
    restore() {
      const saved = stack.pop();
      assert.ok(saved, 'Canvas restore must have a matching save');
      matrix = saved.matrix;
      Object.assign(state, saved.state);
    },
    translate(x, y) {
      multiply([1, 0, 0, 1, x, y]);
    },
    scale(x, y) {
      multiply([x, 0, 0, y, 0, 0]);
    },
    rotate(a) {
      multiply([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]);
    },
    createLinearGradient() {
      return { addColorStop() {} };
    },
    createRadialGradient() {
      return { addColorStop() {} };
    },
    measureText(text) {
      return { width: text.length * 8 };
    },
  };
  const methods = new Set([
    'beginPath',
    'closePath',
    'moveTo',
    'lineTo',
    'bezierCurveTo',
    'quadraticCurveTo',
    'arc',
    'ellipse',
    'roundRect',
    'rect',
    'clip',
    'fill',
    'stroke',
    'fillRect',
    'strokeRect',
    'clearRect',
    'setLineDash',
    'fillText',
    'strokeText',
    'drawImage',
  ]);
  const ctx = new Proxy(api, {
    get(target, key) {
      if (key in target) return target[key];
      if (!methods.has(key)) return state[key];
      return (...args) => {
        for (const value of args.flat()) {
          if (typeof value === 'number')
            assert.ok(
              Number.isFinite(value),
              `${String(key)} must use finite coordinates`,
            );
        }
        calls.push({
          method: key,
          args,
          fill: state.fillStyle,
          stroke: state.strokeStyle,
        });
        if (key === 'moveTo' || key === 'lineTo') point(args[0], args[1]);
      };
    },
    set(_target, key, value) {
      state[key] = value;
      return true;
    },
  });
  return { ctx, calls, points, stack };
}

function arena(id, classId = 'mage') {
  const run = createRun(classId, 734, 'endless');
  run.floor = 99;
  run.node = { id: 'visual-test', floor: 99, col: 0, kind: 'boss', next: [] };
  run.phase = 'battle';
  run.devMode = true;
  run.devEncounter = {
    name: '试炼',
    omen: '',
    groups: [[id]],
    mutations: [[]],
    secondLives: false,
  };
  const b = createBattle(run);
  b.time = b.finalStart + 1;
  b.entities = b.entities.filter((e) => e.boss);
  b.pressure = null;
  b.threats = [];
  b.zones = [];
  return b;
}

test('new bosses remain procedural even when old portrait bitmaps are supplied', () => {
  const bitmap = { complete: true, naturalWidth: 1024, naturalHeight: 1536 };
  for (const id of ['king-reborn', 'king-ascendant', 'deity']) {
    for (const reduced of [false, true]) {
      const b = arena(id);
      const rec = recorder();
      drawBattle(rec.ctx, 390, 667, b, reduced, undefined, {
        reborn: bitmap,
        ascendant: bitmap,
        deity: bitmap,
      });
      assert.equal(
        rec.calls.filter((c) => c.method === 'drawImage').length,
        0,
        id,
      );
      assert.ok(
        rec.points.length > 150,
        `${id} has a complete procedural silhouette`,
      );
      assert.equal(rec.stack.length, 0, `${id} leaves Canvas state balanced`);
    }
  }
});

test('the deity spans the field at phone and desktop widths without clipping its wings', () => {
  for (const width of [320, 390, 520, 900]) {
    const rec = recorder(),
      scale = Math.max(0.86, Math.min(1.18, width / 520));
    rec.ctx.translate(width / 2, 180);
    rec.ctx.scale(scale, scale);
    const e = arena('deity').entities[0];
    drawAscensionBoss(rec.ctx, e, 2, true, width, scale);
    const xs = rec.points.map((p) => p[0]);
    const min = Math.min(...xs),
      max = Math.max(...xs);
    assert.ok(max - min >= width * 0.9, `${width}: full-width presence`);
    assert.ok(
      min >= 0 && max <= width,
      `${width}: all articulated geometry stays on screen`,
    );
  }
});

test('the second ascendant life changes armor and silhouette; reduced motion freezes idle animation', () => {
  const e = arena('king-ascendant').entities[0];
  const solar = recorder(),
    eclipse = recorder();
  drawAscensionBoss(solar.ctx, e, 2, false, 520, 1);
  e.life = 2;
  e.ascendantForm = 'eclipse';
  drawAscensionBoss(eclipse.ctx, e, 2, false, 520, 1);
  assert.notDeepEqual(solar.points, eclipse.points);
  assert.notDeepEqual(
    new Set(solar.calls.map((c) => c.fill)),
    new Set(eclipse.calls.map((c) => c.fill)),
  );
  for (const id of ['king-reborn', 'king-ascendant', 'deity']) {
    const boss = arena(id).entities[0],
      a = recorder(),
      z = recorder();
    drawAscensionBoss(a.ctx, boss, 1, true, 520, 1);
    drawAscensionBoss(z.ctx, boss, 9, true, 520, 1);
    assert.deepEqual(
      a.points,
      z.points,
      `${id}: idle stays still with reduced motion`,
    );
  }
});

test('all eleven deity casts render, and the five additions have distinct silhouettes', () => {
  assert.ok(DEITY_SKILLS.length >= 11);
  const boss = arena('deity').entities[0];
  const shapes = new Map();
  for (const name of DEITY_SKILLS) {
    const rec = recorder();
    boss.castName = name;
    boss.castStartedAt = 0;
    boss.castUntil = 5.7;
    drawAscensionBoss(rec.ctx, boss, 2.5, false, 520, 1);
    assert.equal(rec.stack.length, 0);
    shapes.set(name, JSON.stringify(rec.calls));
  }
  const fresh = ['万象之弦', '天平圣约', '逐星织路', '寂静钟鸣', '破雾终曲'];
  assert.equal(new Set(fresh.map((name) => shapes.get(name))).size, 5);
  const rest = recorder(),
    cast = recorder();
  boss.castName = '天平圣约';
  drawAscensionBoss(rest.ctx, boss, 8, false, 520, 1);
  drawAscensionBoss(cast.ctx, boss, 2.5, false, 520, 1);
  assert.notDeepEqual(
    rest.points,
    cast.points,
    'cast timers drive the hand gestures',
  );
});

test('holy ornaments stay clipped to actual threat lanes and no longer draw ground circles', () => {
  for (const name of [
    '弑神圣枪',
    '逐星织路',
    '寂静钟鸣',
    '天平圣约',
    '破雾终曲',
  ]) {
    for (const width of [4, 18, 90]) {
      const rec = recorder();
      drawHolyThreat(rec.ctx, name, 30, 30 + width, 80, 530, 1.5, false);
      const clip = rec.calls.findIndex((c) => c.method === 'clip');
      assert.ok(clip > 0);
      assert.deepEqual(rec.calls[clip - 1].args, [30, 80, width, 450]);
      assert.equal(
        rec.calls.some((c) => c.method === 'ellipse' || c.method === 'arc'),
        false,
      );
      assert.equal(rec.stack.length, 0);
    }
  }
});

test('holy feathers render through preflight, travel and impact without changing projectile state', () => {
  for (const eclipse of [false, true]) {
    for (const elapsed of [-0.2, 0, 0.5, 2.2]) {
      const b = arena('king-ascendant'),
        rec = recorder();
      b.entities[0].ascendantForm = eclipse ? 'eclipse' : 'solar';
      b.projectiles = [
        {
          ownerId: b.entities[0].id,
          id: 1,
          volleyId: 1,
          kind: 'ember',
          fromX: -0.3,
          fromY: -0.1,
          toX: 0.4,
          spawnAt: b.time - elapsed,
          impactAt: b.time - elapsed + 2,
          radius: 0.04,
          damage: 10,
          sway: 0.08,
          phase: 0,
          resolved: elapsed >= 2,
        },
      ];
      const before = structuredClone(b.projectiles);
      drawBattle(rec.ctx, 390, 667, b);
      assert.deepEqual(b.projectiles, before);
      assert.equal(rec.stack.length, 0);
      if (elapsed >= 0 && elapsed < 2) {
        const tint = eclipse ? '#f4b2a2' : '#fff0c9';
        assert.ok(
          rec.calls.some((c) => c.method === 'fill' && c.fill === tint),
        );
      }
    }
  }
});

test('ritual safe corridors preserve exact collision bounds while skill flashes add no foot rings', () => {
  for (const hero of ['knight', 'ranger', 'mage']) {
    const b = arena('deity', hero),
      rec = recorder();
    const width = 390,
      height = 667,
      py = screenY(VIEW.playerY, height);
    b.skillFlash = 0.4;
    b.shield = 100;
    b.ritual = {
      name: '寂静钟鸣',
      bossId: b.entities[0].id,
      startedAt: b.time - 1,
      resolveAt: b.time + 2,
      damage: 10,
      interruptible: false,
      breakMax: 0,
      breakRemaining: 0,
      safeX: 0.3,
      safeWidth: 0.6,
    };
    const before = structuredClone(b.ritual);
    drawBattle(rec.ctx, width, height, b);
    assert.deepEqual(
      b.ritual,
      before,
      'rendering never changes the attack state',
    );
    const green = rec.calls.find(
      (c) => c.method === 'fillRect' && c.fill === '#47bc7845',
    );
    assert.ok(green);
    assert.equal(green.args[0], screenX(0, width));
    assert.ok(
      Math.abs(green.args[2] - (screenX(0.6, width) - screenX(0, width))) <
        1e-9,
    );
    const danger = rec.calls.filter(
      (c) => c.method === 'fillRect' && c.fill === '#c4453930',
    );
    assert.equal(danger.length, 2);
    assert.equal(danger[0].args[0] + danger[0].args[2], green.args[0]);
    assert.equal(danger[1].args[0], green.args[0] + green.args[2]);
    assert.equal(
      rec.calls.some(
        (c) =>
          (c.method === 'ellipse' || c.method === 'arc') &&
          c.args[2] > 25 &&
          Math.abs(c.args[1] - py) < 50,
      ),
      false,
      `${hero}: no false circular footprint`,
    );
  }
});

test('the curtain call renders the Chinese infinity gag without numeric or reward labels', () => {
  const run = createRun('mage', 734, 'endless');
  Object.assign(run, {
    floor: 100,
    phase: 'battle',
    ascended: true,
    node: { id: '100-2', floor: 100, col: 2, kind: 'treasure', next: [] },
  });
  const b = createBattle(run);
  syncEpiloguePlayback(b, 40);
  stepBattle(b, 0.05);
  assert.equal(b.epilogueInfinity, true);
  const before = structuredClone(b.player);
  const rec = recorder();
  drawBattle(rec.ctx, 390, 640, b);
  const words = rec.calls
    .filter((call) => call.method === 'fillText')
    .map((call) => call.args[0]);
  assert.ok(words.includes('无限大'));
  assert.ok(
    words.every((text) => ['无限大', 'x²', '恭喜', '谢谢'].includes(text)),
    JSON.stringify(words),
  );
  assert.deepEqual(b.player, before);
});

test('ordinary thorns are curved tangled branches clipped to the actual collision width', () => {
  for (const width of [320, 390, 720]) {
    for (const reduced of [false, true]) {
      const b = arena('deity');
      const thorn = {
        ...b.entities[0],
        id: 87,
        kind: 'hazard',
        variant: 'hazard',
        name: '荆棘',
        boss: false,
        encounterId: undefined,
        width: 0.38,
        x: -0.23,
        start: b.time - 1,
        arrival: b.time + 3,
      };
      b.entities = [thorn];
      const before = structuredClone(thorn),
        rec = recorder();
      drawBattle(rec.ctx, width, 667, b, reduced);
      const clipIndex = rec.calls.findIndex((c) => c.method === 'clip');
      assert.ok(clipIndex > 0);
      const [left, , span] = rec.calls[clipIndex - 1].args;
      assert.ok(
        Math.abs(left - screenX(thorn.x - thorn.width / 2, width)) < 1e-9,
      );
      assert.ok(
        Math.abs(span - thorn.width * width * VIEW.horizontalScale) < 1e-9,
      );
      assert.ok(
        rec.calls.filter((c) => c.method === 'quadraticCurveTo').length > 20,
      );
      assert.ok(rec.calls.some((c) => c.method === 'bezierCurveTo'));
      assert.equal(rec.stack.length, 0);
      assert.deepEqual(thorn, before);
    }
  }
});

test('gate rarity changes the edge treatment without replacing the effective inscription', () => {
  const colors = { rare: '#83dfef', epic: '#d0a1f4', legendary: '#f7d37f' };
  for (const [rarity, color] of Object.entries(colors)) {
    const b = arena('deity');
    b.player = addRelic(b.player, 'mirror');
    const choice = { op: '×', value: 2, left: -0.5, right: 0.5, rarity };
    b.entities = [
      {
        ...b.entities[0],
        kind: 'gate',
        boss: false,
        variant: 'gate',
        gate: [choice],
        encounterId: undefined,
        start: b.time - 1,
        arrival: b.time + 3,
      },
    ];
    const rec = recorder();
    drawBattle(rec.ctx, 390, 667, b, true);
    assert.ok(
      rec.calls.some((c) => c.method === 'stroke' && c.stroke === color),
    );
    const labels = rec.calls
      .filter((c) => c.method === 'fillText')
      .map((c) => c.args[0]);
    assert.ok(labels.includes(gateLabel(effectiveGate(b.player, choice))));
    assert.ok(
      !labels.includes(gateLabel(choice)),
      'the visible value includes the mirror relic',
    );
    assert.ok(labels.every((text) => !['稀有', '史诗', '传说'].includes(text)));
  }
});

test('dense applause preserves every admitted image for a full cycle while keeping six unique slots', () => {
  assert.equal(EPILOGUE_GIF_CYCLE_SECONDS, 18.2);
  assert.ok(EPILOGUE_GIF_HOLD_SECONDS >= EPILOGUE_GIF_CYCLE_SECONDS);
  let state = emptyEpilogueCelebration();
  const events = [],
    starts = new Map(),
    finished = [],
    admissions = [];
  let peak = 0;
  for (let step = 1; step <= 410; step++) {
    const time = step * 0.2;
    // The view removes only clips whose CSS full hold+fade has finished.
    const expired = state.slots.filter(
      (slot) => time - starts.get(slot.event.id) >= EPILOGUE_GIF_LIFETIME,
    );
    finished.push(...expired.map((slot) => time - starts.get(slot.event.id)));
    state = {
      ...state,
      slots: state.slots.filter((slot) => !expired.includes(slot)),
    };
    const activeBefore = [...state.slots];
    events.push({
      id: step,
      time,
      x: 0.5,
      y: 0.4,
      text: step % 2 ? '恭喜' : '谢谢',
    });
    // Stress the combat cap: source events vanish after just 6.4 seconds.
    state = advanceEpilogueCelebration(state, events.slice(-32), time);
    assert.equal(
      state.feedback.id,
      step,
      'every batch still gets immediate text feedback',
    );
    for (const slot of activeBefore)
      assert.ok(
        state.slots.includes(slot),
        'new hits never evict playing GIFs',
      );
    for (const slot of state.slots) {
      if (!starts.has(slot.event.id)) {
        starts.set(slot.event.id, time);
        admissions.push(time);
      }
    }
    assert.ok(state.slots.length <= EPILOGUE_GIF_LIMIT);
    assert.equal(
      new Set(state.slots.map((slot) => slot.slot)).size,
      state.slots.length,
    );
    assert.ok(
      !state.pending || state.pending.id <= step,
      'pending applause is a single latest event',
    );
    peak = Math.max(peak, state.slots.length);
  }
  assert.equal(peak, 6);
  assert.ok(finished.length > 12);
  assert.ok(
    finished.every((duration) => duration >= EPILOGUE_GIF_CYCLE_SECONDS),
  );
  for (let i = 1; i < admissions.length; i++) {
    assert.ok(admissions[i] - admissions[i - 1] >= EPILOGUE_GIF_SPACING - 1e-9);
  }
  assert.ok(
    admissions.every(
      (time) => time + EPILOGUE_GIF_LIFETIME + 1 <= EPILOGUE_DURATION_SECONDS,
    ),
  );
  assert.equal(state.pending, null);
});

test('late blessings remain textual, and rewinding a new curtain call resets its prior slots', () => {
  const event = { id: 1, time: 1, x: 0.5, y: 0.4, text: '恭喜' };
  const initial = advanceEpilogueCelebration(
    emptyEpilogueCelebration(),
    [event],
    1,
  );
  assert.equal(initial.slots.length, 1);
  const late = advanceEpilogueCelebration(
    initial,
    [{ ...event, id: 9, time: 76 }],
    76,
  );
  assert.equal(canStartEpilogueGif(76), false);
  assert.equal(
    late.slots[0],
    initial.slots[0],
    'even late feedback does not truncate an existing image',
  );
  assert.equal(late.feedback.id, 9);
  assert.equal(late.pending, null);
  const reset = advanceEpilogueCelebration(late, [], 0);
  assert.equal(reset.slots.length, 0);
  assert.equal(reset.lastSeenId, 0);
});

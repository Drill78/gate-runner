import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root = process.env.ENGINE_ROOT || resolve(process.cwd(), 'lib');
const g = await import(pathToFileURL(root + '/game.ts').href);
const c = await import(pathToFileURL(root + '/combat.ts').href);
const {
  createRun,
  availableNodes,
  enterNode,
  completeRoom,
  chooseReward,
  restAction,
  eventAction,
  shopBuy,
  stats,
  RELIC_BY_ID,
} = g;
const { BALANCE, createBattle, movePlayer, stepBattle, activateSkill } = c;
export const priorities = {
  knight: [
    'bash',
    'paladin',
    'aegis',
    'bulwark',
    'steel',
    'plate',
    'vampire',
    'vitality',
    'mirror',
    'army',
    'thorns',
    'recruit',
    'bounty',
  ],
  ranger: [
    'hunter',
    'quiver',
    'keen',
    'deadeye',
    'steel',
    'vampire',
    'vitality',
    'ricochet',
    'mirror',
    'army',
    'ambush',
    'recruit',
    'bounty',
  ],
  mage: [
    'archmage',
    'surge',
    'echo',
    'ward',
    'steel',
    'vampire',
    'vitality',
    'ember',
    'mirror',
    'army',
    'summon',
    'recruit',
    'bounty',
  ],
};
function value(run, gate) {
  const s = stats(run);
  return Math.max(
    1,
    (gate.op === '+'
      ? run.squad + gate.value + s.gateAdd
      : gate.op === '×'
        ? Math.floor(run.squad * (gate.value + s.gateMult))
        : gate.op === '-'
          ? run.squad - gate.value
          : Math.floor(run.squad / gate.value)) + s.summon,
  );
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function future(x, target, t) {
  return (
    x +
    Math.sign(target - x) *
      Math.min(Math.abs(target - x), t * BALANCE.moveSpeed)
  );
}
// 150 ms observation/decision interval; only currently visible entities and announced attacks.
// All motion goes through movePlayer and the real engine's speed clamp.
export function pilot(
  b,
  { reaction = 0.15, stationary = false, maxTime = 220 } = {},
) {
  let nextDecision = 0,
    skills = 0,
    damage = 0,
    leaks = 0,
    missedChests = 0,
    gateMisses = 0,
    distance = 0;
  while (b.state === 'running' && b.time < maxTime) {
    if (b.time >= nextDecision) {
      nextDecision = b.time + reaction;
      const visible = b.entities.filter((e) => !e.done && e.start <= b.time);
      const targets = visible
        .filter((e) => e.hp > 0)
        .sort((a, z) => a.arrival - z.arrival);
      const target = targets[0];
      const gate = visible.find((e) => e.kind === 'gate');
      const bestGate = gate?.gate
        .slice()
        .sort((a, z) => value(b.player, z) - value(b.player, a))[0];
      const gateX = bestGate
        ? clamp(b.x, bestGate.left + 0.045, bestGate.right - 0.045)
        : b.x;
      const gateDue =
        gate &&
        gate.arrival - b.time <
          Math.abs(gateX - b.x) / BALANCE.moveSpeed + reaction + 0.19;
      const hazards = visible.filter(
        (e) => e.kind === 'hazard' && e.arrival - b.time < 1.0,
      );
      const threats = b.threats.filter((t) => t.resolveAt - b.time < 1.3);
      let bestX = b.x,
        bestScore = -Infinity;
      const candidates = [
        b.x,
        gateX,
        target?.x ?? b.x,
        ...Array.from({ length: 61 }, (_, i) => -0.9 + i * 0.03),
      ];
      for (const x of candidates) {
        let score = -Math.abs(x - b.x) * 1.2;
        if (target) {
          const aim = BALANCE.aimWidth + target.width / 2 - 0.015;
          const attackDelay = Math.max(
            0,
            (Math.abs(x - target.x) - aim) / BALANCE.moveSpeed,
          );
          const endX = future(b.x, x, 0.3);
          score +=
            Math.abs(endX - target.x) < aim
              ? 5
              : Math.max(-4, 1 - Math.abs(x - target.x) * 4);
          score -= attackDelay;
        }
        if (gateDue) {
          const gx = future(b.x, x, gate.arrival - b.time - 0.03);
          const selected = gate.gate.find(
            (s) => gx >= s.left + 0.008 && gx <= s.right - 0.008,
          );
          score += selected
            ? 12 +
              12 *
                Math.log2(value(b.player, selected) / value(b.player, bestGate))
            : -18;
        }
        for (const t of threats) {
          const delay = t.resolveAt - b.time;
          const xx = future(b.x, x, delay - 0.035);
          if (Math.abs(xx - t.x) < t.width / 2 + 0.075)
            score -= 70 / (0.4 + delay);
        }
        for (const h of hazards) {
          const delay = h.arrival - b.time;
          const xx = future(b.x, x, delay - 0.035);
          if (Math.abs(xx - h.x) < h.width / 2 + 0.075)
            score -= 65 / (0.4 + delay);
        }
        if (score > bestScore) {
          bestScore = score;
          bestX = x;
        }
      }
      if (!stationary) movePlayer(b, bestX);
      if (b.cooldown === 0 && targets.length) {
        // Saving a burst while only a tiny target remains is a realistic, visible-state decision.
        if (
          b.player.classId === 'knight' ||
          targets.some((e) => e.boss) ||
          targets.reduce((n, e) => n + e.hp, 0) > c.attackDamage(b) * 2 ||
          targets.some((e) => e.arrival - b.time < 1)
        ) {
          if (activateSkill(b)) skills++;
        }
      }
    }
    const oldHp = b.player.hp,
      oldX = b.x;
    const imminent = b.entities.filter(
      (e) => !e.done && e.arrival >= b.time && e.arrival < b.time + 0.051,
    );
    stepBattle(b, 0.05);
    damage += Math.max(0, oldHp - b.player.hp);
    distance += Math.abs(b.x - oldX);
    for (const e of imminent) {
      if (e.done && e.hp > 0) {
        if (e.kind === 'enemy') leaks++;
        if (e.kind === 'chest') missedChests++;
      }
    }
  }
  return {
    state: b.state,
    time: b.time,
    skills,
    damage,
    leaks,
    missedChests,
    gateMisses,
    distance,
    hp: b.player.hp,
    squad: b.player.squad,
    shield: b.shield,
    weapon: b.player.weaponTier,
  };
}
function scoreRelic(run, id, mode) {
  const list = priorities[run.classId];
  if (mode === 'weak')
    return (
      (RELIC_BY_ID[id].family === 'all' ? 100 : 0) +
      (id === 'bounty'
        ? 50
        : id === 'recruit'
          ? 40
          : id === 'mirror'
            ? 30
            : id === 'army'
              ? 20
              : 0)
    );
  let value = 100 - list.indexOf(id) * 5;
  if (id === 'vitality' && run.hp < run.maxHp * 0.6) value += 60;
  if (id === 'vampire' && !run.relics.vampire && run.floor < 9) value += 30;
  if (id === 'bash' && !run.relics.bash) value += 35;
  if (id === 'aegis' && !run.relics.aegis && run.relics.bash) value += 30;
  return value;
}
export function expedition(classId, seed, mode = 'coherent', options = {}) {
  let run = createRun(classId, seed);
  run.phase = 'map';
  const rooms = [];
  while (run.floor < 12 && run.phase !== 'defeat') {
    const choices = availableNodes(run);
    // Fixed route policy, no future-room knowledge or reward previews.
    const node =
      choices.find((n) => n.kind === 'rest') ||
      choices.find((n) => n.kind === 'treasure') ||
      choices.find((n) => n.kind === 'battle') ||
      choices.find((n) => n.kind === 'shop') ||
      choices[0];
    run = enterNode(run, node.id);
    if (run.phase === 'battle') {
      const b = createBattle(run);
      const result = pilot(b, options);
      rooms.push({ floor: run.floor + 1, kind: node.kind, ...result });
      if (b.state !== 'won') {
        run = b.player;
        break;
      }
      run = completeRoom(b.player);
    } else if (run.phase === 'rest')
      run = restAction(run, run.hp < run.maxHp * 0.75 ? 'heal' : 'forge');
    else if (run.phase === 'shop') {
      if (run.hp < run.maxHp - 20) run = shopBuy(run, 'potion');
      if (mode !== 'none') run = shopBuy(run, 'relic');
      run = shopBuy(run, 'weapon');
      run = completeRoom(run, false);
    } else if (run.phase === 'event')
      run = eventAction(
        run,
        mode === 'coherent' && run.hp > run.maxHp * 0.8 ? 'blood' : 'leave',
      );
    if (run.phase === 'reward') {
      if (mode === 'none') {
        run.phase = 'map';
        run.reward = [];
      } else {
        const selected = run.reward
          .slice()
          .sort(
            (a, z) => scoreRelic(run, z, mode) - scoreRelic(run, a, mode),
          )[0];
        run = chooseReward(run, selected);
      }
    }
  }
  return {
    classId,
    seed,
    mode,
    win: run.phase === 'victory',
    floor: run.floor,
    hp: run.hp,
    squad: run.squad,
    weapon: run.weaponTier,
    relics: run.relics,
    rooms,
  };
}
export function summarize(results) {
  const rows = [];
  for (const classId of ['knight', 'ranger', 'mage'])
    for (const mode of ['none', 'weak', 'coherent']) {
      const runs = results.filter(
        (r) => r.classId === classId && r.mode === mode,
      );
      if (!runs.length) continue;
      const rooms = runs.flatMap((r) => r.rooms);
      const won = runs.filter((r) => r.win);
      const avg = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
      rows.push({
        classId,
        mode,
        n: runs.length,
        winRate: won.length / runs.length,
        avgFloor: avg(runs.map((r) => r.floor)),
        avgFinalHp: avg(won.map((r) => r.hp)),
        avgDamagePerRoom: avg(rooms.map((r) => r.damage)),
        avgLeaksPerRoom: avg(rooms.map((r) => r.leaks)),
        avgBossTime: avg(
          rooms.filter((r) => r.kind === 'boss').map((r) => r.time),
        ),
        maxRoomTime: Math.max(...rooms.map((r) => r.time)),
        avgWeapon: avg(runs.map((r) => r.weapon)),
      });
    }
  return rows;
}
if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  mkdirSync(new URL('../artifacts/', import.meta.url), { recursive: true });
  const n = Number(process.argv[2] || 24);
  const results = [];
  for (const classId of (
    process.env.CLASS_FILTER || 'knight,ranger,mage'
  ).split(','))
    for (const mode of (process.env.MODE_FILTER || 'none,weak,coherent').split(
      ',',
    ))
      for (let i = 0; i < n; i++)
        results.push(
          expedition(classId, 734 + i * 1009, mode, {
            reaction: Number(process.env.PILOT_REACTION || 0.15),
            stationary: process.env.STATIONARY === '1',
          }),
        );
  const out = {
    balance: BALANCE,
    priorities,
    summary: summarize(results),
    results,
  };
  writeFileSync(
    process.env.RESULT_FILE ||
      new URL('../artifacts/balance-results.json', import.meta.url),
    JSON.stringify(out, null, 2),
  );
  console.table(out.summary);
}

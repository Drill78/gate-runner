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
const {
  BALANCE,
  createBattle,
  movePlayer,
  stepBattle,
  activateSkill,
  brace,
  projectilePosition,
} = c;
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
function future(b, target, t) {
  t = Math.max(0, t);
  const guarded = Math.min(t, Math.max(0, b.guardUntil - b.time));
  const distance = BALANCE.moveSpeed * (t - guarded * 0.4);
  return (
    b.x + Math.sign(target - b.x) * Math.min(Math.abs(target - b.x), distance)
  );
}
// 150 ms observation/decision interval; only currently visible entities and announced attacks.
// All motion goes through movePlayer and the real engine's speed clamp.
export function pilot(
  b,
  { reaction = 0.15, stationary = false, maxTime = 220, defense = true } = {},
) {
  let nextDecision = 0,
    skills = 0,
    damage = 0,
    leaks = 0,
    missedChests = 0,
    gateMisses = 0,
    distance = 0,
    braces = 0,
    projectileHits = 0,
    threatHits = 0,
    ritualsStarted = 0,
    ritualsResolved = 0,
    ritualsGuarded = 0,
    ritualsInterrupted = 0,
    ritualsKilled = 0,
    guardedTroopLoss = 0,
    flankShots = 0;
  const seenRituals = new Set();
  while (b.state === 'running' && b.time < maxTime) {
    if (b.time >= nextDecision) {
      nextDecision = b.time + reaction;
      const visible = b.entities.filter((e) => !e.done && e.start <= b.time);
      const targets = visible
        .filter((e) => e.hp > 0)
        .sort((a, z) => a.arrival - z.arrival);
      const ritualBoss = b.ritual?.interruptible
        ? targets.find((e) => e.id === b.ritual.bossId)
        : null;
      const target = ritualBoss || targets[0];
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
      // No reading queued projectiles before spawnAt: only already visible trajectories.
      const projectiles = b.projectiles.filter(
        (p) =>
          !p.resolved &&
          p.spawnAt <= b.time &&
          p.impactAt > b.time &&
          p.impactAt - b.time < 2.0,
      );
      let bestX = b.x,
        bestScore = -Infinity;
      const candidates = [
        b.x,
        gateX,
        target?.x ?? b.x,
        clamp((target?.x || 0) - 0.36, -0.9, 0.9),
        clamp((target?.x || 0) + 0.36, -0.9, 0.9),
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
          const endX = future(b, x, 0.3);
          score +=
            Math.abs(endX - target.x) < aim
              ? 5
              : Math.max(-4, 1 - Math.abs(x - target.x) * 4);
          score -= attackDelay;
          if (target.guardUntil > b.time && Math.abs(endX - target.x) < 0.335)
            score -= 9;
          if (ritualBoss && Math.abs(endX - target.x) < aim) score += 7;
        }
        if (gateDue) {
          const gx = future(b, x, gate.arrival - b.time - 0.03);
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
          const xx = future(b, x, delay - 0.035);
          if (Math.abs(xx - t.x) < t.width / 2 + 0.075)
            score -= 70 / (0.4 + delay);
        }
        for (const p of projectiles) {
          const delay = p.impactAt - b.time,
            landing = projectilePosition(p, p.impactAt);
          const xx = future(b, x, delay - 0.035);
          if (Math.abs(xx - landing.x) < p.radius + 0.07)
            score -= 75 / (0.4 + delay);
        }
        for (const h of hazards) {
          const delay = h.arrival - b.time;
          const xx = future(b, x, delay - 0.035);
          if (Math.abs(xx - h.x) < h.width / 2 + 0.075)
            score -= 65 / (0.4 + delay);
        }
        if (score > bestScore) {
          bestScore = score;
          bestX = x;
        }
      }
      if (!stationary) movePlayer(b, bestX);
      const castDue = b.ritual && b.ritual.resolveAt - b.time <= 0.3;
      const actualTarget = stationary ? b.x : bestX;
      const hitDue =
        projectiles.some(
          (p) =>
            p.impactAt - b.time <= 0.25 &&
            Math.abs(future(b, actualTarget, p.impactAt - b.time) - p.toX) <
              p.radius + 0.05,
        ) ||
        threats.some(
          (t) =>
            t.resolveAt - b.time <= 0.25 &&
            Math.abs(future(b, actualTarget, t.resolveAt - b.time) - t.x) <
              t.width / 2 + 0.045,
        );
      if (
        defense &&
        b.guardCooldown === 0 &&
        (castDue || (!b.ritual && hitDue))
      ) {
        if (brace(b)) braces++;
      }
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
      oldX = b.x,
      oldSquad = b.player.squad,
      oldShots = b.shots,
      oldGates = b.player.gates,
      oldRitual = b.ritual,
      oldHitVolleys = new Set(b.hitVolleys || []);
    if (oldRitual && !seenRituals.has(oldRitual.startedAt)) {
      seenRituals.add(oldRitual.startedAt);
      ritualsStarted++;
    }
    const dueProjectiles = b.projectiles.filter(
      (p) => !p.resolved && p.impactAt <= b.time + 0.05000001,
    );
    const dueThreats = b.threats.filter(
      (t) => t.resolveAt <= b.time + 0.05000001,
    );
    const guarded = b.guardUntil > b.time + 0.05;
    const guardedBoss = b.entities.find(
      (e) => e.boss && !e.done && e.guardUntil > b.time,
    );
    const imminent = b.entities.filter(
      (e) => !e.done && e.arrival >= b.time && e.arrival < b.time + 0.051,
    );
    stepBattle(b, 0.05);
    damage += Math.max(0, oldHp - b.player.hp);
    distance += Math.abs(b.x - oldX);
    for (const p of dueProjectiles) {
      const fraction = clamp((p.impactAt - (b.time - 0.05)) / 0.05, 0, 1);
      const xx = oldX + (b.x - oldX) * fraction;
      if (
        p.resolved &&
        Math.abs(xx - p.toX) < p.radius + 0.04 &&
        !oldHitVolleys.has(p.volleyId)
      ) {
        projectileHits++;
        if (p.volleyId !== undefined) oldHitVolleys.add(p.volleyId);
      }
    }
    threatHits += dueThreats.filter(
      (t) => Math.abs(b.x - t.x) < t.width / 2 + 0.035,
    ).length;
    if (oldRitual && !b.ritual) {
      if (oldRitual.resolveAt <= b.time + 0.000001) {
        ritualsResolved++;
        if (guarded) ritualsGuarded++;
      } else if (b.entities.find((e) => e.id === oldRitual.bossId)?.done)
        ritualsKilled++;
      else ritualsInterrupted++;
    }
    if (guarded && b.player.squad < oldSquad)
      guardedTroopLoss += oldSquad - b.player.squad;
    if (
      guardedBoss &&
      b.shots > oldShots &&
      Math.abs(b.x - guardedBoss.x) >= 0.3
    )
      flankShots++;
    if (
      imminent.some((e) => e.kind === 'gate' && e.done) &&
      b.player.gates === oldGates
    )
      gateMisses++;
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
    bossTime: Math.max(0, b.time - b.finalStart),
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
    level: g.experience(b.player).level,
    xp: b.player.xp,
    braces,
    projectileHits,
    threatHits,
    ritualsStarted,
    ritualsResolved,
    ritualsGuarded,
    ritualsInterrupted,
    ritualsKilled,
    guardedTroopLoss,
    flankShots,
    bossAttacks: b.entities.find((e) => e.boss)?.attackIndex || 0,
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
    level: g.experience(run).level,
    xp: run.xp,
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
          rooms.filter((r) => r.kind === 'boss').map((r) => r.bossTime),
        ),
        maxRoomTime: Math.max(...rooms.map((r) => r.time)),
        avgWeapon: avg(runs.map((r) => r.weapon)),
        avgLevel: avg(runs.map((r) => r.level)),
        projectileHits: rooms.reduce((n, r) => n + r.projectileHits, 0),
        ritualsStarted: rooms.reduce((n, r) => n + r.ritualsStarted, 0),
        ritualsGuarded: rooms.reduce((n, r) => n + r.ritualsGuarded, 0),
        ritualsInterrupted: rooms.reduce((n, r) => n + r.ritualsInterrupted, 0),
      });
    }
  return rows;
}
if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
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
            defense: process.env.DEFENSE !== '0',
          }),
        );
  const out = {
    balance: BALANCE,
    options: {
      reaction: Number(process.env.PILOT_REACTION || 0.15),
      stationary: process.env.STATIONARY === '1',
      defense: process.env.DEFENSE !== '0',
    },
    priorities,
    summary: summarize(results),
    results,
  };
  mkdirSync('artifacts', { recursive: true });
  writeFileSync(
    process.env.RESULT_FILE || 'artifacts/balance-results.json',
    JSON.stringify(out, null, 2),
  );
  console.table(out.summary);
}

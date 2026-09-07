import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
const root = process.env.ENGINE_ROOT || resolve(process.cwd(), 'lib');
const g = await import(pathToFileURL(root + '/game.ts').href);
const c = await import(pathToFileURL(root + '/combat.ts').href);
const { VIEW } = await import(pathToFileURL(root + '/view.ts').href);
const {
  createRun,
  availableNodes,
  enterNode,
  completeRoom,
  chooseReward,
  restAction,
  eventAction,
  shopBuy,
  shopInventory,
  canBuyShopItem,
  stats,
  safeTroops,
  RELIC_BY_ID,
} = g;
const {
  BALANCE,
  createBattle,
  movePlayer,
  stepBattle,
  activateSkill,
  projectilePosition,
} = c;
const engineHashes = Object.fromEntries(
  ['game.ts', 'combat.ts', 'view.ts'].map((file) => [
    file,
    createHash('sha256')
      .update(readFileSync(resolve(root, file)))
      .digest('hex'),
  ]),
);
export const priorities = {
  knight: [
    'bash',
    'paladin',
    'aegis',
    'bulwark',
    'split',
    'steel',
    'heavy',
    'focus',
    'plate',
    'vampire',
    'vitality',
    'velocity',
    'execute',
    'pierce',
    'blast',
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
    'split',
    'steel',
    'heavy',
    'focus',
    'vampire',
    'vitality',
    'velocity',
    'execute',
    'pierce',
    'blast',
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
    'split',
    'ward',
    'steel',
    'heavy',
    'focus',
    'vampire',
    'vitality',
    'velocity',
    'execute',
    'pierce',
    'blast',
    'ember',
    'mirror',
    'army',
    'summon',
    'recruit',
    'bounty',
  ],
};
export function gateValue(run, gate) {
  const s = stats(run);
  return safeTroops(
    (gate.op === '+'
      ? run.squad + gate.value + s.gateAdd
      : gate.op === '×'
        ? Math.floor(run.squad * (gate.value + s.gateMult))
        : gate.op === '-'
          ? run.squad - gate.value
          : gate.op === '²'
            ? run.squad * run.squad
            : gate.op === '√'
              ? Math.floor(Math.sqrt(run.squad))
              : Math.floor(run.squad / gate.value)) + s.summon,
  );
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function future(b, target, t, stationary = false) {
  if (stationary) return b.x;
  t = Math.max(0, t);
  // Every candidate is a proposed movePlayer command, hence pointer speed.
  const speed = BALANCE.pointerMaxSpeed;
  return (
    b.x + Math.sign(target - b.x) * Math.min(Math.abs(target - b.x), t * speed)
  );
}
function predictTarget(b, target, observations, shotDelay, angle = 0) {
  const s = stats(b.player, b.shield);
  const currentY = c.worldY(target, b.time);
  const observation = observations.get(target.id);
  const elapsed = observation ? b.time - observation.time : 0;
  const vx =
    elapsed > 0 ? clamp((target.x - observation.x) / elapsed, -0.3, 0.3) : 0;
  const vy =
    elapsed > 0 ? clamp((currentY - observation.y) / elapsed, 0, 0.4) : 0;
  const originY = VIEW.playerY - 0.035;
  const verticalRadius = (target.boss ? 0.065 : 0.045) + s.bulletRadius * 0.45;
  const flight = Math.max(
    0,
    (originY - currentY - vy * shotDelay - verticalRadius) /
      (Math.cos(angle) * s.bulletSpeed + vy),
  );
  return {
    x: clamp(target.x + vx * (shotDelay + flight), -0.9, 0.9),
    offset: Math.sin(angle) * s.bulletSpeed * flight,
    flight,
  };
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
    distance = 0,
    projectileHits = 0,
    threatHits = 0,
    ritualsStarted = 0,
    ritualsResolved = 0,
    ritualsInterrupted = 0,
    ritualsKilled = 0,
    flankShots = 0,
    pressurePulses = 0,
    pressureHpLoss = 0,
    pressureShieldLoss = 0,
    pressureOverlapFrames = 0,
    playerBulletImpacts = 0,
    playerBulletsEmitted = 0,
    squaresTaken = 0,
    rootsTaken = 0,
    deathCause = null;
  const seenRituals = new Set();
  const observations = new Map();
  const gatesTaken = [];
  const seenSquareGates = new Set();
  const squareEvents = [];
  while (b.state === 'running' && b.time < maxTime) {
    const observedRitual = b.ritual;
    if (observedRitual && !seenRituals.has(observedRitual.startedAt)) {
      seenRituals.add(observedRitual.startedAt);
      ritualsStarted++;
    }
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
        .sort((a, z) => gateValue(b.player, z) - gateValue(b.player, a))[0];
      const gateX = bestGate
        ? clamp(b.x, bestGate.left + 0.045, bestGate.right - 0.045)
        : b.x;
      const speed = BALANCE.pointerMaxSpeed;
      const shotDelay = 0.2;
      const prediction = target
        ? predictTarget(b, target, observations, shotDelay)
        : null;
      const s = stats(b.player, b.shield);
      const sidePredictions = target
        ? Array.from({ length: s.extraPairs }, (_, i) => i + 1).flatMap(
            (pair) =>
              [-1, 1].map((side) =>
                predictTarget(
                  b,
                  target,
                  observations,
                  shotDelay,
                  side * pair * 0.17,
                ),
              ),
          )
        : [];
      const gateDue =
        gate &&
        gate.arrival - b.time < Math.abs(gateX - b.x) / speed + reaction + 0.19;
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
        prediction?.x ?? b.x,
        clamp((prediction?.x || 0) - 0.24, -0.9, 0.9),
        clamp((prediction?.x || 0) + 0.24, -0.9, 0.9),
        ...Array.from({ length: 61 }, (_, i) => -0.9 + i * 0.03),
      ];
      for (const x of candidates) {
        let score = -Math.abs(x - b.x) * 1.2;
        if (target) {
          const aim = target.width / 2 + s.bulletRadius - 0.025;
          const attackDelay = Math.max(
            0,
            (Math.abs(x - prediction.x) - aim) / speed,
          );
          const endX = future(b, x, shotDelay, stationary);
          const connects = Math.abs(endX - prediction.x) < aim;
          const shielded =
            target.guardUntil > b.time + shotDelay + prediction.flight &&
            Math.abs(endX - prediction.x) < 0.17;
          const hitScore = shielded ? 1.8 : 6;
          score += connects
            ? hitScore
            : Math.max(-4, 1 - Math.abs(x - prediction.x) * 5);
          if (connects)
            score += Math.max(0, 1 - Math.abs(endX - prediction.x) / aim) * 0.7;
          // Side rounds use their actual public angle; no target-lock aim allowance.
          for (const side of sidePredictions)
            if (Math.abs(endX + side.offset - side.x) < aim)
              score += shielded ? 0.9 : 3;
          score -= attackDelay;
          if (
            !target.boss &&
            target.arrival - b.time < shotDelay + prediction.flight
          )
            score -= 4;
          if (ritualBoss && connects) score += 7;
        }
        if (gateDue) {
          const gx = future(b, x, gate.arrival - b.time, stationary);
          const selected = gate.gate.find(
            (s) => gx >= s.left + 0.008 && gx <= s.right - 0.008,
          );
          score += selected
            ? 12 +
              12 *
                Math.log2(
                  gateValue(b.player, selected) / gateValue(b.player, bestGate),
                )
            : -18;
        }
        for (const t of threats) {
          const delay = t.resolveAt - b.time;
          const xx = future(b, x, delay, stationary);
          if (Math.abs(xx - t.x) < t.width / 2 + 0.075)
            score -= 70 / (0.4 + delay);
        }
        for (const p of projectiles) {
          const delay = p.impactAt - b.time,
            landing = projectilePosition(p, p.impactAt);
          const xx = future(b, x, delay, stationary);
          if (Math.abs(xx - landing.x) < p.radius + 0.07)
            score -= 75 / (0.4 + delay);
        }
        for (const h of hazards) {
          const delay = h.arrival - b.time;
          const xx = future(b, x, delay, stationary);
          if (Math.abs(xx - h.x) < h.width / 2 + 0.075)
            score -= 65 / (0.4 + delay);
        }
        if (score > bestScore) {
          bestScore = score;
          bestX = x;
        }
      }
      for (const e of visible)
        observations.set(e.id, {
          time: b.time,
          x: e.x,
          y: c.worldY(e, b.time),
        });
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
      oldShield = b.shield,
      oldSquad = b.player.squad,
      oldX = b.x,
      oldShots = b.shots,
      oldBulletSeq = b.bulletSeq,
      oldEffects = new Set(b.effects),
      oldGates = b.player.gates,
      oldRitual = observedRitual,
      ritualEndedBySkill = oldRitual && !b.ritual,
      oldPressure = b.pressure,
      oldHitVolleys = new Set(b.hitVolleys || []),
      oldPulses = b.pressure?.pulses || 0;
    const dueProjectiles = b.projectiles.filter(
      (p) => !p.resolved && p.impactAt <= b.time + 0.05000001,
    );
    const dueThreats = b.threats.filter(
      (t) => t.resolveAt <= b.time + 0.05000001,
    );
    const shieldedBoss = b.entities.find(
      (e) => e.boss && !e.done && e.guardUntil > b.time,
    );
    const imminent = b.entities.filter(
      (e) => !e.done && e.arrival >= b.time && e.arrival < b.time + 0.051,
    );
    stepBattle(b, 0.05);
    for (const e of b.entities) {
      if (
        !e.gate?.some((gate) => gate.op === '²') ||
        e.start > b.time + VIEW.previewSeconds ||
        seenSquareGates.has(e.id)
      )
        continue;
      seenSquareGates.add(e.id);
      squareEvents.push({
        floor: b.player.floor + 1,
        wave: e.wave,
        time: b.time,
        weapon: b.player.weaponTier,
        squareKey: b.player.relics.square_key || 0,
        squareGateSeen: Boolean(b.player.squareGateSeen),
        gates: e.gate.map((gate) => ({
          op: gate.op,
          value: gate.value,
          width: gate.right - gate.left,
        })),
      });
    }
    playerBulletsEmitted += b.bulletSeq - oldBulletSeq;
    playerBulletImpacts += b.effects.filter(
      (e) => e.type === 'impact' && !oldEffects.has(e),
    ).length;
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
      if (!ritualEndedBySkill && oldRitual.resolveAt <= b.time + 0.000001) {
        ritualsResolved++;
      } else if (b.entities.find((e) => e.id === oldRitual.bossId)?.done)
        ritualsKilled++;
      else ritualsInterrupted++;
    }
    if ((oldPressure?.pulses || 0) > oldPulses) {
      pressurePulses += oldPressure.pulses - oldPulses;
      pressureHpLoss += Math.max(0, oldHp - b.player.hp);
      pressureShieldLoss += Math.max(0, oldShield - b.shield);
      if (
        dueProjectiles.length ||
        dueThreats.length ||
        imminent.some((e) => e.kind === 'enemy' || e.kind === 'hazard')
      )
        pressureOverlapFrames++;
    }
    if (
      shieldedBoss &&
      b.shots > oldShots &&
      Math.abs(b.x - shieldedBoss.x) >= 0.16
    )
      flankShots++;
    if (
      imminent.some((e) => e.kind === 'gate' && e.done) &&
      b.player.gates === oldGates
    )
      gateMisses++;
    for (const e of imminent) {
      if (e.kind !== 'gate' || !e.done || b.player.gates === oldGates) continue;
      const selected = c.gateAt(e.gate, b.x);
      if (selected) {
        gatesTaken.push({
          wave: e.wave,
          op: selected.op,
          value: selected.value,
          trialStep: e.trialStep || null,
          trialFinal: Boolean(e.trialFinal),
          squadBefore: oldSquad,
          squadAfter: b.player.squad,
        });
        if (selected.op === '²') squaresTaken++;
        if (selected.op === '√') rootsTaken++;
      }
    }
    for (const e of imminent) {
      if (e.done && e.hp > 0) {
        if (e.kind === 'enemy') leaks++;
        if (e.kind === 'chest') missedChests++;
      }
    }
    if (b.state === 'lost') {
      deathCause =
        (oldPressure?.pulses || 0) > oldPulses
          ? 'pressure'
          : b.time < b.finalStart ||
              imminent.some(
                (e) => e.kind === 'enemy' && !e.boss && e.done && e.hp > 0,
              )
            ? 'waves'
            : oldRitual && oldRitual.resolveAt <= b.time && !b.ritual
              ? 'ritual_or_same_frame_attack'
              : 'boss_attack';
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
    projectileHits,
    threatHits,
    ritualsStarted,
    ritualsResolved,
    ritualsInterrupted,
    ritualsKilled,
    flankShots,
    pressurePulses,
    pressureHpLoss,
    pressureShieldLoss,
    pressureOverlapFrames,
    playerBulletsEmitted,
    playerBulletImpacts,
    squaresTaken,
    rootsTaken,
    gatesTaken,
    squareEvents,
    squareGatesSeen: squareEvents.length,
    deathCause: b.state === 'running' ? 'timeout' : deathCause,
    bossAttacks: b.entities.find((e) => e.boss)?.attackIndex || 0,
  };
}
export function scoreRelic(run, id, mode) {
  const list = priorities[run.classId];
  if (id === 'square_key') return 200;
  if (mode === 'economy' || mode === 'weak') {
    const economic = [
      'bounty',
      'recruit',
      'mirror',
      'army',
      'summon',
      'ambush',
    ];
    const rank = economic.indexOf(id);
    return rank >= 0
      ? 150 - rank * 8
      : RELIC_BY_ID[id].family === 'all'
        ? 60
        : 20;
  }
  const rank = list.indexOf(id);
  let value = rank < 0 ? 10 : 100 - rank * 3;
  if (id === 'vitality' && run.hp < run.maxHp * 0.6) value += 60;
  if (id === 'vampire' && !run.relics.vampire && run.floor < 9) value += 30;
  if (id === 'bash' && !run.relics.bash) value += 35;
  if (id === 'aegis' && !run.relics.aegis && run.relics.bash) value += 30;
  if (id === 'split' && !run.relics.split) value += 15;
  return value;
}
function visitShop(run, mode) {
  const purchases = [];
  const buy = (id) => {
    const next = shopBuy(run, id);
    if (next !== run) purchases.push(id);
    run = next;
  };
  const missing = run.maxHp - run.hp;
  if (missing >= 55 && canBuyShopItem(run, 'tonic')) buy('tonic');
  else if (missing >= 20 && canBuyShopItem(run, 'potion')) buy('potion');
  // Choose from the actual current stock; never inspect random-relic outcomes.
  const score = (item) => {
    if (item.kind === 'heal') return run.hp < run.maxHp * 0.6 ? 160 : -Infinity;
    if (item.kind === 'relic')
      return mode === 'none' ? -Infinity : scoreRelic(run, item.relicId, mode);
    if (item.kind === 'random-relic')
      return mode === 'none' ? -Infinity : mode === 'economy' ? 45 : 42;
    if (item.kind === 'weapon') return mode === 'economy' ? 30 : 48;
    if (item.kind === 'recruits')
      return (
        (mode === 'economy' ? 120 : 38) * Math.min(1, item.amount / run.squad)
      );
    return -Infinity;
  };
  for (let i = 0; i < shopInventory(run).length; i++) {
    const candidate = shopInventory(run)
      .filter((item) => canBuyShopItem(run, item.id) && score(item) > 1)
      .sort((a, z) => score(z) - score(a) || a.cost - z.cost)[0];
    if (!candidate) break;
    buy(candidate.id);
  }
  return { run, purchases };
}
export function expedition(classId, seed, mode = 'coherent', options = {}) {
  if (mode === 'weak') mode = 'economy';
  let run = createRun(classId, seed);
  run.phase = 'map';
  const rooms = [];
  const decisions = [];
  while (run.floor < 12 && run.phase !== 'defeat') {
    const choices = availableNodes(run);
    // Fixed route policy, no future-room knowledge or reward previews.
    const act = Math.floor(run.floor / 4);
    const tookElite = decisions.some(
      (d) => d.kind === 'elite' && Math.floor((d.floor - 1) / 4) === act,
    );
    const unopenedTrial = run.relics.square_key && !run.squareGateSeen;
    const node =
      (run.hp < run.maxHp * 0.6
        ? choices.find((n) => n.kind === 'rest')
        : null) ||
      ((!tookElite || unopenedTrial) && run.hp >= run.maxHp * 0.8
        ? choices.find((n) => n.kind === 'elite')
        : null) ||
      (run.gold >= 125 ? choices.find((n) => n.kind === 'shop') : null) ||
      choices.find((n) => n.kind === 'rest') ||
      choices.find((n) => n.kind === 'treasure') ||
      choices.find((n) => n.kind === 'battle') ||
      choices.find((n) => n.kind === 'shop') ||
      choices[0];
    const decision = {
      floor: run.floor + 1,
      nodeId: node.id,
      kind: node.kind,
      choices: choices.map((n) => ({ id: n.id, kind: n.kind })),
      hpBefore: run.hp,
      squadBefore: run.squad,
      weaponBefore: run.weaponTier,
      relicsBefore: { ...run.relics },
      squareGateSeenBefore: Boolean(run.squareGateSeen),
    };
    decisions.push(decision);
    run = enterNode(run, node.id);
    if (run.phase === 'battle') {
      const b = createBattle(run);
      const result = pilot(b, options);
      rooms.push({
        floor: run.floor + 1,
        kind: node.kind,
        entryHp: run.hp,
        entrySquad: run.squad,
        entryRelics: { ...run.relics },
        entrySquareSeen: Boolean(run.squareGateSeen),
        ...result,
      });
      if (b.state !== 'won') {
        run = b.player;
        break;
      }
      run = completeRoom(b.player);
    } else if (run.phase === 'rest')
      run = restAction(run, run.hp < run.maxHp * 0.75 ? 'heal' : 'forge');
    else if (run.phase === 'shop') {
      const shop = visitShop(run, mode);
      run = shop.run;
      decision.purchases = shop.purchases;
      run = completeRoom(run, false);
    } else if (run.phase === 'event')
      run = eventAction(
        run,
        mode === 'coherent' && run.hp > run.maxHp * 0.85 ? 'blood' : 'leave',
      );
    if (run.phase === 'reward') {
      decision.rewardChoices = [...run.reward];
      if (mode === 'none') {
        decision.rewardChosen = null;
        run.phase = 'map';
        run.reward = [];
      } else {
        const selected = run.reward
          .slice()
          .sort(
            (a, z) => scoreRelic(run, z, mode) - scoreRelic(run, a, mode),
          )[0];
        run = chooseReward(run, selected);
        decision.rewardChosen = selected;
      }
    }
    decision.hpAfter = run.hp;
    decision.squadAfter = run.squad;
    decision.relicsAfter = { ...run.relics };
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
    squareGateSeen: Boolean(run.squareGateSeen),
    level: g.experience(run).level,
    xp: run.xp,
    rooms,
    decisions,
    failure:
      run.phase === 'victory' ? null : rooms.at(-1)?.deathCause || 'incomplete',
  };
}
export function summarize(results) {
  const rows = [];
  for (const classId of ['knight', 'ranger', 'mage'])
    for (const mode of ['coherent', 'economy', 'none']) {
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
        wins: won.length,
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
        ritualsResolved: rooms.reduce((n, r) => n + r.ritualsResolved, 0),
        ritualsInterrupted: rooms.reduce((n, r) => n + r.ritualsInterrupted, 0),
        pressurePulses: rooms.reduce((n, r) => n + r.pressurePulses, 0),
        pressureDeaths: runs.filter((r) => r.failure === 'pressure').length,
        waveDeaths: runs.filter((r) => r.failure === 'waves').length,
        bossAttackDeaths: runs.filter(
          (r) =>
            r.failure === 'boss_attack' ||
            r.failure === 'ritual_or_same_frame_attack',
        ).length,
        timeoutRuns: runs.filter((r) => r.failure === 'timeout').length,
        squaresTaken: rooms.reduce((n, r) => n + r.squaresTaken, 0),
        rootsTaken: rooms.reduce((n, r) => n + r.rootsTaken, 0),
        squareGatesSeen: rooms.reduce((n, r) => n + r.squareGatesSeen, 0),
        squareSeenRuns: runs.filter((r) => r.squareGateSeen).length,
        avgFinalSquad: avg(runs.map((r) => r.squad)),
        cappedRuns: runs.filter((r) => r.squad === Number.MAX_SAFE_INTEGER)
          .length,
        namedShopPurchases: runs.reduce(
          (n, r) =>
            n +
            r.decisions
              .flatMap((d) => d.purchases || [])
              .filter((id) => id.startsWith('relic-')).length,
          0,
        ),
        bosses: [4, 8, 12].map((floor) => {
          const attempts = rooms.filter(
            (r) => r.kind === 'boss' && r.floor === floor && r.bossTime > 0,
          );
          const kills = attempts.filter((r) => r.state === 'won');
          return {
            floor,
            attempts: attempts.length,
            kills: kills.length,
            avgKillSeconds: kills.length
              ? avg(kills.map((r) => r.bossTime))
              : null,
            maxKillSeconds: kills.length
              ? Math.max(...kills.map((r) => r.bossTime))
              : null,
            pressurePulses: attempts.reduce((n, r) => n + r.pressurePulses, 0),
            pressureDeaths: attempts.filter((r) => r.deathCause === 'pressure')
              .length,
          };
        }),
      });
    }
  return rows;
}
if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  const n = Number(process.argv[2] || 8);
  if (!Number.isInteger(n) || n < 1)
    throw new Error('Sample count must be a positive integer.');
  const results = [];
  for (const classId of (
    process.env.CLASS_FILTER || 'knight,ranger,mage'
  ).split(',')) {
    for (const mode of (
      process.env.MODE_FILTER || 'coherent,economy,none'
    ).split(',')) {
      for (let i = 0; i < n; i++)
        results.push(
          expedition(classId, 734 + i * 1009, mode, {
            reaction: Number(process.env.PILOT_REACTION || 0.15),
            stationary: process.env.STATIONARY === '1',
          }),
        );
      const group = results.filter(
        (r) =>
          r.classId === classId &&
          r.mode === (mode === 'weak' ? 'economy' : mode),
      );
      console.log(
        `${classId} / ${mode}: ${group.filter((r) => r.win).length}/${group.length} complete`,
      );
    }
  }
  const out = {
    audit: 'physical-projectiles-square-key-boss-1700',
    createdAt: new Date().toISOString(),
    engineHashes,
    balance: BALANCE,
    view: VIEW,
    troopMultipliers: [12, 1000, 10000, 1000000, Number.MAX_SAFE_INTEGER].map(
      (squad) => ({ squad, multiplier: g.troopMultiplier(squad) }),
    ),
    options: {
      reaction: Number(process.env.PILOT_REACTION || 0.15),
      stationary: process.env.STATIONARY === '1',
      timestep: 0.05,
      maxRoomSeconds: 220,
      seeds: Array.from({ length: n }, (_, i) => 734 + i * 1009),
    },
    priorities,
    priorityOverrides: { square_key: 200 },
    summary: summarize(results),
    results,
  };
  const outputFile = resolve(
    process.env.RESULT_FILE || 'artifacts/balance-results.json',
  );
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, JSON.stringify(out, null, 2));
  const table = out.summary.map(
    ({
      classId,
      mode,
      n,
      wins,
      avgFloor,
      pressureDeaths,
      waveDeaths,
      bossAttackDeaths,
      squaresTaken,
      namedShopPurchases,
    }) => ({
      classId,
      mode,
      n,
      wins,
      avgFloor: Number(avgFloor.toFixed(2)),
      pressureDeaths,
      waveDeaths,
      bossAttackDeaths,
      squaresTaken,
      namedShopPurchases,
    }),
  );
  console.table(table);
  const keys = Object.keys(table[0]);
  writeFileSync(
    outputFile.replace(/\.json$/i, '') + '.csv',
    [
      keys.join(','),
      ...table.map((row) => keys.map((key) => row[key]).join(',')),
    ].join('\n') + '\n',
  );
  console.log(`Saved ${outputFile}`);
}

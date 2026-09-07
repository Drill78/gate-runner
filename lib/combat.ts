import {
  HEROES,
  ACT_LENGTH,
  stats,
  firepower,
  applyGate,
  gateLabel,
  logRun,
  safeTroops,
  grantExperience,
  experience,
  rollLevelChoices,
  chooseLevelUpgrade,
  formatNumber,
  type Run,
  type GateChoice,
} from './game.ts';
import { VIEW } from './view.ts';
import { bossProfile } from './bosses.ts';

export const BALANCE = {
  moveSpeed: 2.2,
  pointerMaxSpeed: 12,
  minX: -0.9,
  maxX: 0.9,
  aimWidth: 0.205,
  travel: [3.9, 3.5, 3.1],
  spacing: [3.15, 2.95, 2.75],
  waves: [8, 10, 12],
  hpGrowth: 1.27,
  bossGrowth: 1.26,
  enemyBaseHp: 110,
  bossBaseHp: 3400,
  commanderBaseHp: 1290,
  eliteCommanderBaseHp: 1650,
  laterEnemyHpMultiplier: 1.15,
  superEliteHpMultiplier: 1.75,
  superEliteCommanderHp: 3300,
  enemyActMultiplier: [1, 1.05, 1.12],
  commanderActMultiplier: [1, 1.1, 1.2],
  bossActMultiplier: [1.25, 1.65, 2.15],
  finalBossHpMultiplier: 1.6,
  finalBossDamageMultiplier: 1.2,
  finalBossAttackIntervals: [4, 3.5, 3],
  commanderAttackInterval: 3.2,
  chapterAttackInterval: 4.4,
  pressureGrace: [22, 17, 17],
  pressureInterval: [8, 7, 6],
  pressureDamage: [10, 16, 24],
  pressureRamp: [3, 4, 6],
  enrageAfter: 22,
} as const;

export interface GateSegment extends GateChoice {
  left: number;
  right: number;
}
export interface Entity {
  id: number;
  kind: 'gate' | 'chest' | 'enemy' | 'hazard';
  x: number;
  width: number;
  start: number;
  arrival: number;
  hp: number;
  maxHp: number;
  armor: number;
  done: boolean;
  gate?: GateSegment[];
  gatePrepared?: boolean;
  trialStep?: number;
  trialFraction?: number;
  trialFinal?: boolean;
  boss?: boolean;
  encounterId?: string;
  phase?: number;
  variant:
    | 'soldier'
    | 'guard'
    | 'archer'
    | 'boss'
    | 'chest'
    | 'gate'
    | 'hazard';
  name: string;
  burnUntil: number;
  lastAttack: number;
  volleyDamage: number;
  reward: 'gold' | 'weapon';
  wave: number;
  attackIndex: number;
  guardUntil: number;
}
export interface Threat {
  id: number;
  x: number;
  width: number;
  resolveAt: number;
  damage: number;
  name: string;
}
export interface Projectile {
  id: number;
  volleyId: number;
  kind: 'axe' | 'star' | 'ember';
  fromX: number;
  fromY: number;
  toX: number;
  spawnAt: number;
  impactAt: number;
  radius: number;
  damage: number;
  sway: number;
  phase: number;
  resolved: boolean;
}
export interface PlayerBullet {
  id: number;
  kind: 'blade' | 'arrow' | 'bolt' | 'shard';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  critical: boolean;
  pierceLeft: number;
  hitIds: number[];
  spawnAt: number;
  originX: number;
  originY: number;
  canProc: boolean;
}
export interface Ritual {
  name: string;
  bossId: number;
  startedAt: number;
  resolveAt: number;
  damage: number;
  interruptible: boolean;
  breakMax: number;
  breakRemaining: number;
  safeX: number;
  safeWidth: number;
}
export interface Effect {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  type: 'text' | 'shot' | 'burst' | 'impact';
  targetX?: number;
  targetY?: number;
}
export interface BossPressure {
  name: string;
  bossId: number;
  nextAt: number;
  interval: number;
  baseDamage: number;
  ramp: number;
  pulses: number;
  flashUntil: number;
}
export interface Battle {
  player: Run;
  levelChoices: string[];
  encounterKills: Record<string, number>;
  time: number;
  inputLocked: boolean;
  x: number;
  inputAxis: number;
  targetX: number | null;
  entities: Entity[];
  effects: Effect[];
  threats: Threat[];
  projectiles: Projectile[];
  bullets: PlayerBullet[];
  bulletSeq: number;
  ritual: Ritual | null;
  pressure: BossPressure | null;
  projectileSeq: number;
  hitVolleys: Set<number>;
  shield: number;
  cooldown: number;
  buffUntil: number;
  shootTimer: number;
  shots: number;
  random: () => number;
  state: 'running' | 'won' | 'lost';
  flash: number;
  skillFlash: number;
  message: string;
  messageUntil: number;
  lastSound: string;
  soundSeq: number;
  wave: number;
  totalWaves: number;
  duration: number;
  finalStart: number;
  enrage: boolean;
  threatSeq: number;
}

export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
export function makeGate(
  random: () => number,
  wave: number,
  floor: number,
  elite = false,
  squareTrial = false,
): GateSegment[] {
  if (squareTrial || (elite && wave === 2)) {
    const choices: { choice: GateChoice; width: number }[] = [
      {
        choice: squareTrial ? { op: '²', value: 2 } : { op: '×', value: 1.45 },
        width: squareTrial ? 0.18 : 0.64,
      },
      { choice: { op: '√', value: 2 }, width: squareTrial ? 0.88 : 0.65 },
      {
        choice: { op: '+', value: 10 + floor },
        width: squareTrial ? 0.88 : 0.65,
      },
    ];
    const offset = Math.floor(random() * 3);
    if (random() < 0.5) choices.reverse();
    let left = -0.97;
    return [0, 1, 2].map((i) => {
      const item = choices[(i + offset) % 3];
      const g = {
        ...item.choice,
        left: left + 0.016,
        right: left + item.width - 0.016,
      };
      left += item.width;
      return g;
    });
  }
  const three = wave > 0 && random() < 0.6;
  const splits = three
    ? [
        [-0.97, -0.42, 0.36, 0.97],
        [-0.97, -0.2, 0.23, 0.97],
        [-0.97, -0.57, 0.12, 0.97],
      ][Math.floor(random() * 3)]
    : [
        [-0.97, -0.28, 0.97],
        [-0.97, 0.32, 0.97],
        [-0.97, 0.04, 0.97],
      ][Math.floor(random() * 3)];
  const add = 6 + Math.floor(floor * 0.65);
  const sets: GateChoice[][] = [
    [
      { op: '+', value: add },
      { op: '×', value: 1.18 },
    ],
    [
      { op: '+', value: add + 4 },
      { op: '×', value: 1.28 },
    ],
    [
      { op: '-', value: Math.max(4, add - 1) },
      { op: '÷', value: 1.2 },
    ],
    [
      { op: '+', value: add + 1 },
      { op: '×', value: 1.12 },
    ],
  ];
  let pair =
    wave === 0 && floor === 0
      ? sets[0]
      : sets[Math.floor(random() * sets.length)];
  if (random() > 0.5) pair = [pair[1], pair[0]];
  const choices = three
    ? [
        pair[0],
        {
          op: '×' as const,
          value: 1.36 + Math.floor(floor / ACT_LENGTH) * 0.04,
        },
        pair[1],
      ]
    : pair;
  return choices.map((g, i) => ({
    ...g,
    left: splits[i] + 0.016,
    right: splits[i + 1] - 0.016,
  }));
}
export function scaleGateNumbers(
  gates: GateSegment[],
  squad: number,
  floor: number,
) {
  if (floor < 1) return gates;
  const depth = Math.min(8, floor);
  return gates.map((g) => {
    if (g.op !== '+' && g.op !== '-') return g;
    const base = 6 + Math.floor(floor * 0.65);
    const variation = Math.max(0.85, Math.min(1.25, g.value / base));
    const ratio = g.op === '+' ? 0.14 + depth * 0.01 : 0.12 + depth * 0.02;
    const raw = Math.max(g.value, squad * ratio * variation);
    const step = Math.pow(10, Math.max(0, Math.floor(Math.log10(raw)) - 1));
    return { ...g, value: Math.max(g.value, Math.round(raw / step) * step) };
  });
}
export function createBattle(run: Run): Battle {
  const player = structuredClone(run),
    act = Math.floor(player.floor / ACT_LENGTH),
    random = seededRandom(
      player.seed + player.floor * 719 + (player.node?.col || 0) * 103,
    );
  const travel = BALANCE.travel[act],
    spacing = BALANCE.spacing[act],
    waves = BALANCE.waves[act] + (player.node?.enchanted ? 2 : 0);
  const superElite = Boolean(player.node?.enchanted),
    elite = player.node?.kind === 'elite' || superElite,
    bossRoom = player.node?.kind === 'boss',
    treasure = player.node?.kind === 'treasure';
  const difficulty =
    Math.pow(BALANCE.hpGrowth, player.floor) *
    (elite ? 1.24 : 1) *
    (superElite ? BALANCE.superEliteHpMultiplier : 1) *
    (treasure ? 0.85 : 1);
  const profile = bossProfile(player);
  const entities: Entity[] = [];
  function put(
    kind: Entity['kind'],
    start: number,
    x: number,
    hp: number,
    variant: Entity['variant'],
    name: string,
    wave: number,
    boss = false,
  ) {
    const entity: Entity = {
      id: entities.length,
      kind,
      x,
      width: boss
        ? 0.56
        : kind === 'hazard'
          ? 0.48
          : variant === 'guard'
            ? 0.36
            : kind === 'enemy'
              ? 0.3
              : 0.23,
      start,
      arrival: start + travel,
      hp,
      maxHp: hp,
      armor: variant === 'guard' ? 0.22 : 0,
      done: false,
      boss,
      variant,
      name,
      burnUntil: 0,
      lastAttack: boss
        ? start -
          (bossRoom
            ? BALANCE.chapterAttackInterval
            : BALANCE.commanderAttackInterval) +
          0.9
        : variant === 'archer'
          ? start - 2.7
          : start + 1.5,
      volleyDamage: 8 + player.floor * 1.3,
      reward: 'gold',
      wave,
      attackIndex: 0,
      guardUntil: 0,
    };
    entities.push(entity);
    return entity;
  }
  for (let i = 0; i < waves; i++) {
    const t = i * spacing;
    if (i % 2 === 0) {
      const g = put('gate', t, 0, 0, 'gate', '命运之门', i + 1);
      g.gate = makeGate(random, i, player.floor, elite);
    }
    const variant = i % 4 === 2 ? 'archer' : i % 4 === 3 ? 'guard' : 'soldier';
    const x = (random() * 0.72 + 0.1) * (random() > 0.5 ? 1 : -1);
    put(
      'enemy',
      t + 1.0,
      x,
      BALANCE.enemyBaseHp *
        difficulty *
        (player.floor > 0 ? BALANCE.laterEnemyHpMultiplier : 1) *
        BALANCE.enemyActMultiplier[act] *
        (variant === 'guard' ? 1.45 : variant === 'archer' ? 0.82 : 1) *
        (1 + random() * 0.16),
      variant,
      variant === 'guard'
        ? '黑甲盾卫'
        : variant === 'archer'
          ? '幽林弓手'
          : '骸骨先锋',
      i + 1,
    );
    if (i === 2 || i === 5 || (treasure && i === 7)) {
      const chest = put(
        'chest',
        t + 0.35,
        -x,
        60 * difficulty,
        'chest',
        i === 5 ? '兵装秘匣' : '遗落宝箱',
        i + 1,
      );
      chest.reward = i === 5 || treasure ? 'weapon' : 'gold';
    }
    if (i % 4 === 3)
      put('hazard', t - 0.25, -x, 0, 'hazard', '荆棘地带', i + 1);
    if (elite && i % 3 === 2)
      put(
        'enemy',
        t + 1.9,
        -x,
        65 *
          difficulty *
          BALANCE.enemyActMultiplier[act] *
          (player.floor > 0 ? BALANCE.laterEnemyHpMultiplier : 1),
        'soldier',
        '精英斥候',
        i + 1,
      );
  }
  let finalStart = waves * spacing + 1;
  if (superElite && player.relics.square_key) {
    player.squareGateSeen = true;
    // The ritual begins after the ordinary waves have left. Its fixed sequence
    // can then be forecast once without changing any number in front of a player.
    const trialStart =
      Math.max(...entities.map((e) => e.arrival)) + VIEW.previewSeconds + 0.25;
    const steps = [
      { op: '-' as const, value: 1, fraction: 0.18 },
      { op: '÷' as const, value: 1.3, fraction: 0 },
      { op: '-' as const, value: 1, fraction: 0.22 },
      { op: '÷' as const, value: 1.35, fraction: 0 },
      { op: '-' as const, value: 1, fraction: 0.25 },
    ];
    steps.forEach((s, index) => {
      const g = put(
        'gate',
        trialStart + index * 0.95,
        0,
        0,
        'gate',
        `禁术红门 ${index + 1}/5`,
        waves,
      );
      g.gate = [{ op: s.op, value: s.value, left: -1, right: 1 }];
      g.trialStep = index + 1;
      g.trialFraction = s.fraction;
    });
    const secret = put(
      'gate',
      trialStart + 5 * 0.95 + 0.4,
      0,
      0,
      'gate',
      '禁术秘门',
      waves,
    );
    secret.gate = makeGate(random, 0, player.floor, false, true);
    secret.trialFinal = true;
    finalStart = secret.arrival + 1;
  }
  const final = put(
    'enemy',
    finalStart,
    0,
    (bossRoom
      ? BALANCE.bossBaseHp
      : superElite
        ? BALANCE.superEliteCommanderHp
        : elite
          ? BALANCE.eliteCommanderBaseHp
          : BALANCE.commanderBaseHp) *
      Math.pow(BALANCE.bossGrowth, player.floor) *
      (bossRoom
        ? BALANCE.bossActMultiplier[act]
        : BALANCE.commanderActMultiplier[act]) *
      (profile.id === 'king' ? BALANCE.finalBossHpMultiplier : 1),
    'boss',
    profile.name,
    waves,
    true,
  );
  final.encounterId = profile.id;
  final.phase = 1;
  final.volleyDamage =
    (bossRoom ? 17 + player.floor * 1.6 : 12 + player.floor * 1.4) *
    (profile.id === 'king' ? BALANCE.finalBossDamageMultiplier : 1);
  player.squad = safeTroops(player.squad + (player.relics.ambush || 0) * 8);
  return {
    player,
    levelChoices: rollLevelChoices(player),
    encounterKills: {},
    time: 0,
    inputLocked: false,
    x: 0,
    inputAxis: 0,
    targetX: null,
    entities,
    effects: [],
    threats: [],
    projectiles: [],
    bullets: [],
    bulletSeq: 0,
    ritual: null,
    pressure: bossRoom
      ? {
          name:
            profile.id === 'wyvern'
              ? '风暴侵蚀'
              : profile.id === 'oracle'
                ? '命运收束'
                : ['荆棘蚀血', '蚀月凋零', '王权震荡'][act],
          bossId: final.id,
          nextAt: finalStart + BALANCE.pressureGrace[act],
          interval: BALANCE.pressureInterval[act],
          baseDamage: BALANCE.pressureDamage[act],
          ramp: BALANCE.pressureRamp[act],
          pulses: 0,
          flashUntil: 0,
        }
      : null,
    projectileSeq: 0,
    hitVolleys: new Set(),
    shield: stats(player).shieldStart,
    cooldown: 0,
    buffUntil: 0,
    shootTimer: 0,
    shots: 0,
    random,
    state: 'running',
    flash: 0,
    skillFlash: 0,
    message: '横移瞄准 · 自动向前发射弹幕',
    messageUntil: 4,
    wave: 1,
    totalWaves: waves,
    duration: finalStart + travel,
    finalStart,
    enrage: false,
    threatSeq: 0,
    lastSound: '',
    soundSeq: 0,
  };
}
export function progress(e: Entity, time: number) {
  return Math.min(e.boss ? 0 : 1.12, (time - e.start) / (e.arrival - e.start));
}
export function worldY(e: Entity, time: number) {
  return -0.1 + progress(e, time) * 0.9;
}
export function movePlayer(b: Battle, x: number) {
  if (b.inputLocked || b.levelChoices.length || !Number.isFinite(x)) return;
  b.targetX = Math.max(BALANCE.minX, Math.min(BALANCE.maxX, x));
  b.inputAxis = 0;
}
export function setMoveAxis(b: Battle, axis: number) {
  if ((b.inputLocked || b.levelChoices.length) && axis !== 0) return;
  b.inputAxis = Math.sign(axis);
  b.targetX = null;
}
function prepareLevelChoice(b: Battle) {
  if (
    b.state === 'lost' ||
    b.levelChoices.length ||
    b.player.talentPicks >= experience(b.player).level - 1
  )
    return;
  b.levelChoices = rollLevelChoices(b.player);
  if (b.levelChoices.length) {
    b.inputAxis = 0;
    b.targetX = null;
  } else if (b.player.talentPicks < experience(b.player).level - 1) {
    // Fully completed builds must never leave combat waiting on an empty menu.
    b.player.talentPicks = experience(b.player).level - 1;
  }
}
export function chooseBattleUpgrade(b: Battle, id: string) {
  if (b.state === 'lost' || !b.levelChoices.includes(id)) return false;
  const next = chooseLevelUpgrade(b.player, id);
  if (next === b.player) return false;
  b.player = next;
  b.levelChoices = [];
  prepareLevelChoice(b);
  return true;
}
export function skipBattleUpgrade(b: Battle) {
  if (b.state === 'lost' || !b.levelChoices.length) return false;
  b.player.talentPicks++;
  b.levelChoices = [];
  prepareLevelChoice(b);
  return true;
}
export function gateAt(gates: GateSegment[], x: number) {
  return gates.find((g) => x >= g.left && x <= g.right);
}
function sound(b: Battle, name: string) {
  b.lastSound = name;
  b.soundSeq++;
}
function message(b: Battle, text: string, _color = '#ebd292') {
  b.message = text;
  b.messageUntil = b.time + 1.9;
}
function hitEntity(
  b: Battle,
  e: Entity,
  damage: number,
  critical = false,
  show = true,
  sourceX = b.x,
) {
  if (e.done || e.hp <= 0) return;
  const frontalShield = e.guardUntil > b.time && Math.abs(sourceX - e.x) < 0.16;
  const actual = damage * (1 - e.armor) * (frontalShield ? 0.3 : 1);
  e.hp -= actual;
  if (b.ritual?.interruptible && b.ritual.bossId === e.id) {
    b.ritual.breakRemaining -= actual;
    if (b.ritual.breakRemaining <= 0) {
      b.ritual = null;
      e.lastAttack = b.time + 1;
      message(b, '吟唱打断 · 王权崩解', '#bdecb8');
      sound(b, 'skill');
    }
  }
  if (show)
    b.effects.push({
      type: 'text',
      x: e.x,
      y: worldY(e, b.time),
      text: `${critical ? '✦ ' : ''}${Math.ceil(actual)}`,
      color: critical ? '#ffe19a' : '#f4edd7',
      life: 0.65,
    });
  if (e.hp > 0) return;
  e.done = true;
  b.effects.push({
    type: 'burst',
    x: e.x,
    y: worldY(e, b.time),
    text: '',
    color: e.kind === 'chest' ? '#ffd58a' : '#d49a83',
    life: 0.65,
  });
  if (e.kind === 'chest') {
    b.player.chests++;
    if (e.reward === 'weapon') {
      b.player.weaponTier = Math.min(10, b.player.weaponTier + 1);
      message(b, `兵装秘匣 · 武器 Lv.${b.player.weaponTier}`);
    } else {
      b.player.gold += 22;
      b.player.squad = safeTroops(b.player.squad + 4);
      message(b, '宝箱击破 · +22 金币 / +4 兵力');
    }
    logRun(
      b.player,
      e.reward === 'weapon' ? '兵装秘匣 · 武器升级' : '宝箱击破 · 金币与援军',
    );
    sound(b, 'chest');
  } else {
    b.player.kills++;
    if (e.encounterId) {
      b.encounterKills[e.encounterId] =
        (b.encounterKills[e.encounterId] || 0) + 1;
      b.player.encountersDefeated[e.encounterId] =
        (b.player.encountersDefeated[e.encounterId] || 0) + 1;
    }
    b.player.gold += 4;
    b.player.hp = Math.min(
      b.player.maxHp,
      b.player.hp + (b.player.relics.vampire || 0) * 3,
    );
    const xp = e.boss
      ? b.player.node?.kind === 'boss'
        ? 45
        : 20
      : e.variant === 'guard'
        ? 10
        : e.variant === 'archer'
          ? 8
          : 6;
    const gained = grantExperience(b.player, xp);
    b.effects.push({
      type: 'text',
      x: e.x,
      y: worldY(e, b.time) + 0.07,
      text: `+4 金 · +${xp} XP`,
      color: '#acdfba',
      life: 1.2,
    });
    if (gained) {
      message(
        b,
        `升至 Lv.${experience(b.player).level} · 攻击 +${gained * 2}% / 生命 +${gained * 2}`,
        '#d4eeb8',
      );
      sound(b, 'level');
    } else sound(b, 'kill');
  }
}
export function damagePlayer(b: Battle, amount: number, troopLoss = 0.08) {
  if (b.state !== 'running') return;
  const reduced = Math.ceil(amount * (1 - stats(b.player, b.shield).armor));
  const absorbed = Math.min(reduced, b.shield);
  b.shield -= absorbed;
  b.player.hp = Math.max(0, b.player.hp - reduced + absorbed);
  const lost =
    absorbed === reduced
      ? 0
      : Math.min(b.player.squad - 1, Math.ceil(b.player.squad * troopLoss));
  b.player.squad = safeTroops(b.player.squad - lost);
  b.flash = 0.3;
  sound(b, 'hurt');
  message(
    b,
    absorbed === reduced
      ? `护盾吸收 ${reduced}`
      : `生命 −${reduced - absorbed} · 兵力 −${lost}`,
    '#ffb3a4',
  );
  if (b.player.hp <= 0) {
    b.state = 'lost';
    b.player.phase = 'defeat';
    logRun(b.player, '防线崩溃 · 远征落幕');
    return;
  }
  if (b.player.relics.thorns)
    for (const e of b.entities)
      if (e.kind === 'enemy' && !e.done && e.start < b.time)
        hitEntity(b, e, 40 * b.player.relics.thorns);
}
export function attackDamage(b: Battle) {
  return (
    firepower(b.player, b.shield).volley * (b.buffUntil > b.time ? 1.5 : 1)
  );
}
function emitBullet(
  b: Battle,
  x: number,
  y: number,
  angle: number,
  damage: number,
  critical: boolean,
  delay = 0,
  fragment = false,
  skipId?: number,
) {
  // A bounded pool keeps dense builds predictable on phones.
  if (b.bullets.length >= 180) return;
  const s = stats(b.player, b.shield);
  b.bullets.push({
    id: b.bulletSeq++,
    kind: fragment
      ? 'shard'
      : b.player.classId === 'knight'
        ? 'blade'
        : b.player.classId === 'ranger'
          ? 'arrow'
          : 'bolt',
    x,
    y,
    originX: x,
    originY: y,
    vx: Math.sin(angle) * s.bulletSpeed,
    vy: -Math.cos(angle) * s.bulletSpeed,
    radius: s.bulletRadius * (fragment ? 0.8 : 1),
    damage,
    critical,
    pierceLeft: fragment ? 0 : s.pierceCount,
    hitIds: skipId === undefined ? [] : [skipId],
    spawnAt: b.time + delay,
    canProc: !fragment,
  });
}
function firePlayerVolley(b: Battle) {
  const s = stats(b.player, b.shield);
  const critical = b.random() < s.crit;
  const damage = attackDamage(b) * (critical ? s.critMult : 1);
  b.shots++;
  sound(b, 'shoot');
  emitBullet(b, b.x, VIEW.playerY - 0.035, 0, damage, critical);
  for (let pair = 1; pair <= s.extraPairs; pair++) {
    for (const side of [-1, 1])
      emitBullet(
        b,
        b.x,
        VIEW.playerY - 0.035,
        side * pair * 0.17,
        damage * 0.5,
        critical,
      );
  }
  if (b.player.relics.echo && b.shots % 3 === 0)
    emitBullet(
      b,
      b.x,
      VIEW.playerY - 0.035,
      0,
      damage * 0.8 * b.player.relics.echo,
      critical,
      0.1,
    );
}
// Slab intersection over the full travelled segment prevents fast rounds from
// jumping through a target. Coordinates are relative to the moving enemy.
function segmentHit(
  ax: number,
  ay: number,
  zx: number,
  zy: number,
  rx: number,
  ry: number,
) {
  let enter = 0,
    leave = 1;
  for (const [a, delta, radius] of [
    [ax, zx - ax, rx],
    [ay, zy - ay, ry],
  ]) {
    if (Math.abs(delta) < 1e-9) {
      if (Math.abs(a) > radius) return null;
    } else {
      const t1 = (-radius - a) / delta,
        t2 = (radius - a) / delta;
      enter = Math.max(enter, Math.min(t1, t2));
      leave = Math.min(leave, Math.max(t1, t2));
      if (enter > leave) return null;
    }
  }
  return enter;
}
function enemyXAt(b: Battle, e: Entity, time: number) {
  return e.boss &&
    b.player.node?.kind === 'boss' &&
    Math.floor(b.player.floor / ACT_LENGTH) === 1
    ? Math.sin((time - e.start) * 0.8) * 0.18
    : e.x;
}
function stepPlayerBullets(b: Battle, oldTime: number) {
  const s = stats(b.player, b.shield);
  const color = HEROES.find((h) => h.id === b.player.classId)!.color;
  // Fragments created on impact begin travelling next frame, never recursively.
  const activeCount = b.bullets.length;
  for (let index = 0; index < activeCount; index++) {
    const bullet = b.bullets[index];
    const fromTime = Math.max(oldTime, bullet.spawnAt);
    const elapsed = b.time - fromTime;
    if (elapsed <= 0) continue;
    const fromX = bullet.x,
      fromY = bullet.y;
    const toX = fromX + bullet.vx * elapsed,
      toY = fromY + bullet.vy * elapsed;
    const hits: { e: Entity; t: number }[] = [];
    for (const e of b.entities) {
      if (
        e.done ||
        e.hp <= 0 ||
        !['enemy', 'chest'].includes(e.kind) ||
        bullet.hitIds.includes(e.id)
      )
        continue;
      // The entrance frame belongs to the portrait pause, before combat resumes.
      const activeFrom = Math.max(fromTime, e.start + 1e-6);
      const activeTo = Math.min(b.time, e.boss ? b.time : e.arrival);
      if (activeFrom > activeTo) continue;
      const begin = (activeFrom - fromTime) / elapsed,
        end = (activeTo - fromTime) / elapsed;
      const ax = fromX + (toX - fromX) * begin - enemyXAt(b, e, activeFrom);
      const ay = fromY + (toY - fromY) * begin - worldY(e, activeFrom);
      const zx = fromX + (toX - fromX) * end - enemyXAt(b, e, activeTo);
      const zy = fromY + (toY - fromY) * end - worldY(e, activeTo);
      const t = segmentHit(
        ax,
        ay,
        zx,
        zy,
        e.width / 2 + bullet.radius,
        (e.boss ? 0.065 : 0.045) + bullet.radius * 0.45,
      );
      if (t !== null) hits.push({ e, t: begin + t * (end - begin) });
    }
    hits.sort((a, z) => a.t - z.t);
    for (const { e, t } of hits) {
      if (e.done) continue;
      const x = fromX + (toX - fromX) * t,
        y = fromY + (toY - fromY) * t;
      const damage =
        bullet.damage * (e.hp / e.maxHp < 0.3 ? 1 + s.execute * 0.2 : 1);
      bullet.hitIds.push(e.id);
      hitEntity(b, e, damage, bullet.critical, true, bullet.originX);
      b.effects.push({ type: 'impact', x, y, color, text: '', life: 0.26 });
      if (bullet.canProc) {
        if (!e.done && b.player.relics.ember) e.burnUntil = b.time + 3;
        if (s.blast) {
          b.effects.push({ type: 'burst', x, y, color, text: '', life: 0.4 });
          for (const other of b.entities)
            if (
              other !== e &&
              !other.done &&
              other.hp > 0 &&
              other.start <= b.time &&
              Math.hypot(
                enemyXAt(b, other, b.time) - x,
                (worldY(other, b.time) - y) * 1.5,
              ) < 0.26
            )
              hitEntity(
                b,
                other,
                bullet.damage *
                  s.blast *
                  0.3 *
                  (other.hp / other.maxHp < 0.3 ? 1 + s.execute * 0.2 : 1),
                false,
                true,
                bullet.originX,
              );
        }
        if (bullet.critical && b.player.relics.ricochet)
          for (const side of [-1, 1])
            emitBullet(
              b,
              x,
              y - 0.015,
              side * 0.55,
              bullet.damage * 0.3 * b.player.relics.ricochet,
              false,
              0,
              true,
              e.id,
            );
      }
      if (bullet.pierceLeft <= 0) {
        bullet.damage = 0;
        break;
      }
      bullet.pierceLeft--;
      bullet.damage *= 0.75;
    }
    bullet.x = toX;
    bullet.y = toY;
  }
  b.bullets = b.bullets.filter(
    (p) =>
      p.damage > 0 &&
      p.y > VIEW.far - 0.15 &&
      Math.abs(p.x) < 1.2 &&
      b.time - p.spawnAt < 3,
  );
}
export function activateSkill(b: Battle) {
  if (
    b.state !== 'running' ||
    b.inputLocked ||
    b.levelChoices.length ||
    b.cooldown > 0
  )
    return false;
  b.cooldown = stats(b.player).cooldown;
  b.skillFlash = 0.7;
  sound(b, 'skill');
  if (b.player.classId === 'knight') {
    b.shield = Math.min(
      250,
      b.shield + 18 + (b.player.relics.paladin || 0) * 12,
    );
    b.buffUntil = b.time + 6;
    message(b, '不破誓约 · 护盾 / 伤害 +50%');
  } else {
    for (const e of b.entities)
      if (!e.done && e.hp > 0 && e.start < b.time)
        hitEntity(
          b,
          e,
          attackDamage(b) * (b.player.classId === 'mage' ? 4.5 : 4),
        );
    if (b.player.classId === 'mage')
      b.player.squad = safeTroops(
        b.player.squad + 3 + (b.player.relics.archmage || 0) * 8,
      );
    message(
      b,
      b.player.classId === 'mage'
        ? '秘火新星 · 全屏震击'
        : '箭雨齐射 · 全屏箭雨',
    );
  }
  prepareLevelChoice(b);
  return true;
}
function warn(
  b: Battle,
  x: number,
  width: number,
  delay: number,
  damage: number,
  name: string,
) {
  b.threats.push({
    id: b.threatSeq++,
    x,
    width,
    resolveAt: b.time + delay,
    damage,
    name,
  });
}
export function projectilePosition(p: Projectile, time: number) {
  const t = Math.max(0, (time - p.spawnAt) / (p.impactAt - p.spawnAt));
  return {
    x:
      p.fromX +
      (p.toX - p.fromX) * t +
      Math.sin(t * Math.PI * 3 + p.phase) *
        p.sway *
        Math.sin(Math.min(1, t) * Math.PI),
    y: p.fromY + (VIEW.playerY - p.fromY) * t,
  };
}
function volley(
  b: Battle,
  e: Entity,
  kind: Projectile['kind'],
  targets: number[],
  delay: number,
  flight: number,
  damage: number,
  fromX = e.x,
) {
  const volleyId = b.projectileSeq;
  for (const [i, toX] of targets.entries())
    b.projectiles.push({
      id: b.projectileSeq++,
      volleyId,
      kind,
      fromX,
      fromY: worldY(e, b.time),
      toX,
      spawnAt: b.time + delay,
      impactAt: b.time + delay + flight,
      radius: kind === 'star' ? 0.034 : 0.046,
      damage,
      sway: kind === 'star' ? 0.1 : 0,
      phase: i * 0.9,
      resolved: false,
    });
}
export function kingPhase(e: Entity): 1 | 2 | 3 {
  return e.hp <= e.maxHp * 0.35 ? 3 : e.hp <= e.maxHp * 0.7 ? 2 : 1;
}
function ritual(b: Battle, e: Entity) {
  const phase = kingPhase(e);
  const breakMax = e.maxHp * 0.055;
  b.ritual = {
    name: phase === 3 ? '终末敕令' : '末日敕令',
    bossId: e.id,
    startedAt: b.time,
    resolveAt: b.time + (phase === 3 ? 2.65 : 3.2),
    damage: e.volleyDamage * (0.85 + (phase - 1) * 0.1) * (b.enrage ? 1.75 : 1),
    interruptible: true,
    breakMax,
    breakRemaining: breakMax,
    safeX: [-0.58, 0, 0.58][e.attackIndex % 3],
    safeWidth: phase === 3 ? 0.36 : 0.48,
  };
  message(b, `${b.ritual.name} · 集火打断或移入绿色安全区`, '#ffd0a1');
}
function enemyAttack(b: Battle, e: Entity) {
  if (!e.boss) {
    warn(b, b.x, 0.29, 1.05, e.volleyDamage, '弓手狙击');
    return;
  }
  const act = Math.floor(b.player.floor / ACT_LENGTH),
    isActBoss = b.player.node?.kind === 'boss',
    index = e.attackIndex++;
  const damage = e.volleyDamage * (b.enrage ? 1.75 : 1),
    secondPhase = e.hp < e.maxHp * 0.5;
  if (!isActBoss) {
    if (e.encounterId === 'hexblade') {
      warn(b, b.x, 0.34, 1.1, damage * 0.75, '咒刃烙印');
      warn(
        b,
        Math.max(-0.7, Math.min(0.7, -b.x)),
        0.38,
        1.8,
        damage * 0.7,
        '镜影追斩',
      );
      if (secondPhase)
        volley(
          b,
          e,
          'star',
          [-0.65, -0.22, 0.22, 0.65],
          0.5,
          1.8,
          damage * 0.45,
        );
      message(b, '咒刃双斩 · 先离开烙印，再避开镜影');
      return;
    }
    if (e.encounterId === 'stonewarden') {
      e.guardUntil = b.time + 2;
      const gap = index % 2 ? -0.42 : 0.42;
      warn(
        b,
        (-1 + gap - 0.24) / 2,
        gap + 0.76,
        1.4,
        damage * 0.85,
        '裂地震击',
      );
      warn(b, (1 + gap + 0.24) / 2, 0.76 - gap, 1.4, damage * 0.85, '裂地震击');
      message(b, '石誓裂地 · 向未标红的空隙移动');
      return;
    }
    if (e.encounterId === 'broodmother') {
      volley(
        b,
        e,
        'star',
        [-0.78, -0.39, 0, 0.39, 0.78],
        0.3,
        1.65,
        damage * 0.55,
      );
      if (secondPhase)
        volley(
          b,
          e,
          'star',
          [-0.58, -0.19, 0.19, 0.58],
          0.95,
          1.65,
          damage * 0.45,
        );
      warn(b, b.x, 0.32, 1.25, damage * 0.65, '蛛网缠地');
      message(b, '蛛巢毒雨 · 脱离蛛网并穿过弹隙');
      return;
    }
    if (index % 2 === 0) {
      volley(
        b,
        e,
        'axe',
        [-0.72, -0.36, 0, 0.36, 0.72],
        0.3,
        1.6,
        damage * 0.75,
      );
      if (secondPhase)
        volley(b, e, 'axe', [-0.54, 0, 0.54], 1.05, 1.6, damage * 0.6);
      message(
        b,
        secondPhase ? '暴怒追斧 · 留意第二轮' : '五向散斧 · 从弹隙穿过',
      );
    } else {
      if (e.encounterId === 'commander') e.guardUntil = b.time + 2.2;
      warn(b, b.x, 0.42, 1.1, damage, '斩首重击');
    }
    return;
  }
  if (e.encounterId === 'wyvern') {
    if (index % 2 === 0) {
      warn(b, b.x, secondPhase ? 0.72 : 0.6, 1.45, damage, '风暴龙息');
      volley(b, e, 'ember', [-0.76, -0.25, 0.25, 0.76], 0.5, 1.8, damage * 0.5);
      message(b, '岚翼龙息 · 离开落点，从风刃间穿行');
    } else {
      for (const [i, x] of [-0.68, 0, 0.68].entries())
        warn(b, x, 0.34, 1.05 + i * 0.35, damage * 0.7, '风暴踏击');
      message(b, '风暴踏击 · 三道震波依次落下');
    }
    return;
  }
  if (e.encounterId === 'oracle') {
    warn(b, b.x, 0.38, 1.2, damage * 0.7, '预言烙印');
    volley(
      b,
      e,
      'star',
      index % 2 ? [-0.72, -0.24, 0.24, 0.72] : [-0.88, -0.44, 0, 0.44, 0.88],
      0.55,
      1.9,
      damage * 0.55,
    );
    if (secondPhase) warn(b, -b.x, 0.32, 2.1, damage * 0.6, '命运回声');
    message(b, '星盘预言 · 离开旧位置，留意延迟回声');
    return;
  }
  if (act === 0) {
    if (index % 2 === 0) {
      volley(
        b,
        e,
        'axe',
        secondPhase
          ? [-0.84, -0.56, -0.28, 0, 0.28, 0.56, 0.84]
          : [-0.72, -0.36, 0, 0.36, 0.72],
        0.45,
        secondPhase ? 1.5 : 1.7,
        damage * 0.75,
      );
      message(b, '荆棘散斧 · 从弹隙穿过', '#f1cf9b');
    } else {
      e.guardUntil = b.time + 3.2;
      warn(b, b.x, 0.46, 1.1, damage, '盾卫重斧');
      message(b, '正面举盾 · 移向侧翼开火', '#e4d3aa');
    }
  } else if (act === 1) {
    const spread = [-0.81, -0.54, -0.27, 0, 0.27, 0.54, 0.81];
    volley(b, e, 'star', spread, 0.35, 1.8, damage * 0.45);
    volley(
      b,
      e,
      'star',
      [-0.675, -0.405, -0.135, 0.135, 0.405, 0.675],
      secondPhase ? 0.85 : 1.05,
      1.8,
      damage * 0.45,
    );
    message(
      b,
      secondPhase ? '蚀月盛放 · 双重星雨' : '星环绽放 · 交错弹幕',
      '#d9c7ff',
    );
  } else if (index % 4 === 0) {
    const phase = kingPhase(e);
    const force = damage * (1 + (phase - 1) * 0.12);
    volley(
      b,
      e,
      'ember',
      [-0.84, -0.56, -0.28, 0, 0.28, 0.56, 0.84],
      0.35,
      1.65,
      force * 0.62,
    );
    if (phase >= 2)
      volley(
        b,
        e,
        'ember',
        [-0.7, -0.42, -0.14, 0.14, 0.42, 0.7],
        0.95,
        1.65,
        force * 0.54,
      );
    message(
      b,
      phase >= 2 ? '碎日王冠 · 第二轮火环即将降临' : '碎日王冠 · 穿过七重火环',
      '#ffcf88',
    );
  } else if (index % 4 === 1) ritual(b, e);
  else if (index % 4 === 2) {
    const phase = kingPhase(e);
    const order = phase === 3 ? [0, -0.7, 0.7] : [-0.7, 0, 0.7];
    for (const [i, x] of order.entries())
      warn(
        b,
        x,
        phase === 3 ? 0.46 : 0.4,
        1.05 + i * 0.48,
        damage * (0.85 + phase * 0.06),
        '陨火葬城',
      );
    message(b, '陨火葬城 · 三道陨火依次落下', '#ffb79a');
  } else {
    const phase = kingPhase(e);
    volley(
      b,
      e,
      'ember',
      [-0.65, -0.18, 0.3, 0.75],
      0.35,
      1.7,
      damage * (0.55 + phase * 0.04),
      -0.64,
    );
    volley(
      b,
      e,
      'ember',
      [-0.75, -0.3, 0.18, 0.65],
      0.8,
      1.7,
      damage * (0.55 + phase * 0.04),
      0.64,
    );
    message(b, '交叉焚风 · 留意两侧来弹', '#ffc899');
  }
}
export function stepBattle(b: Battle, dt: number) {
  if (b.state !== 'running' || b.inputLocked) return;
  prepareLevelChoice(b);
  if (b.levelChoices.length) return;
  dt = Math.min(0.05, Math.max(0, dt));
  const oldTime = b.time,
    oldX = b.x;
  b.time += dt;
  const dx =
    b.targetX === null
      ? b.inputAxis * BALANCE.moveSpeed * dt
      : Math.sign(b.targetX - b.x) *
        Math.min(Math.abs(b.targetX - b.x), BALANCE.pointerMaxSpeed * dt);
  b.x = Math.max(BALANCE.minX, Math.min(BALANCE.maxX, b.x + dx));
  b.cooldown = Math.max(0, b.cooldown - dt);
  b.flash = Math.max(0, b.flash - dt);
  b.skillFlash = Math.max(0, b.skillFlash - dt);
  b.effects = b.effects.filter((e) => (e.life -= dt) > 0);
  const redTrial = b.entities.find((e) => e.trialStep === 1);
  if (
    redTrial &&
    !redTrial.gatePrepared &&
    redTrial.start <= b.time + VIEW.previewSeconds
  ) {
    const forecast = structuredClone(b.player);
    for (const e of b.entities
      .filter((e) => e.trialStep)
      .sort((a, z) => a.trialStep! - z.trialStep!)) {
      const gate = e.gate![0];
      if (e.trialFraction)
        gate.value = Math.max(1, Math.ceil(forecast.squad * e.trialFraction));
      applyGate(forecast, gate, 0);
      e.gatePrepared = true;
    }
    b.player.secretDiscovered = true;
    message(b, '禁术试炼 · 5道红门无法绕开', '#ffb3a4');
  }
  for (const e of b.entities) {
    if (e.gate && !e.gatePrepared && e.start <= b.time + VIEW.previewSeconds) {
      e.gate = scaleGateNumbers(e.gate, b.player.squad, b.player.floor);
      e.gatePrepared = true;
      if (e.trialFinal) message(b, '禁术秘门 · 瞄准极窄平方通道', '#e6c2ff');
    }
  }
  b.wave = Math.min(
    b.totalWaves,
    1 +
      Math.floor(
        b.time / BALANCE.spacing[Math.floor(b.player.floor / ACT_LENGTH)],
      ),
  );
  b.enrage = b.time > b.finalStart + BALANCE.enrageAfter;
  if (b.ritual && b.time >= b.ritual.resolveAt) {
    const cast = b.ritual;
    b.ritual = null;
    const boss = b.entities.find((e) => e.id === cast.bossId);
    if (boss && !boss.done && Math.abs(b.x - cast.safeX) > cast.safeWidth / 2) {
      boss.lastAttack = b.time;
      damagePlayer(b, cast.damage, 0.08);
    }
  }
  if (b.state !== 'running') return;
  for (const p of b.projectiles) {
    if (p.resolved || p.impactAt > b.time) continue;
    p.resolved = true;
    const crossingX =
      oldX +
      (b.x - oldX) *
        Math.max(0, Math.min(1, (p.impactAt - oldTime) / (dt || 1)));
    if (
      Math.abs(crossingX - p.toX) < p.radius + 0.04 &&
      !b.hitVolleys.has(p.volleyId)
    ) {
      b.hitVolleys.add(p.volleyId);
      damagePlayer(b, p.damage, 0.06);
    }
  }
  b.projectiles = b.projectiles.filter((p) => b.time < p.impactAt + 0.45);
  if (b.state !== 'running') return;
  for (const threat of b.threats) {
    if (threat.resolveAt > b.time) continue;
    if (Math.abs(b.x - threat.x) < threat.width / 2 + 0.035)
      damagePlayer(b, threat.damage, 0.1);
    else
      b.effects.push({
        type: 'burst',
        x: threat.x,
        y: 0.8,
        text: '',
        color: '#d27255',
        life: 0.5,
      });
  }
  b.threats = b.threats.filter((t) => t.resolveAt > b.time);
  if (b.state !== 'running') return;
  b.shootTimer -= dt;
  if (b.shootTimer <= 0) {
    firePlayerVolley(b);
    b.shootTimer += 1 / stats(b.player, b.shield).rate;
  }
  stepPlayerBullets(b, oldTime);
  for (const e of b.entities) {
    if (e.done || e.start > b.time) continue;
    if (
      e.boss &&
      b.player.node?.kind === 'boss' &&
      Math.floor(b.player.floor / ACT_LENGTH) === 1
    )
      e.x = Math.sin((b.time - e.start) * 0.8) * 0.18;
    if (e.burnUntil > b.time && e.hp > 0)
      hitEntity(b, e, 14 * (b.player.relics.ember || 0) * dt, false, false);
    if (e.done) continue;
    if (e.encounterId === 'king' && e.phase !== kingPhase(e)) {
      e.phase = kingPhase(e);
      message(
        b,
        e.phase === 2
          ? '王冠破碎 · 灰烬之王进入第二阶段'
          : '终焉燃尽 · 最后的王权',
        '#ffcf88',
      );
      b.effects.push({
        type: 'burst',
        x: e.x,
        y: worldY(e, b.time),
        color: '#ffbc6a',
        text: '',
        life: 0.7,
      });
    }
    if (
      (e.boss || e.variant === 'archer') &&
      (e.boss || progress(e, b.time) > 0.2) &&
      !b.ritual &&
      b.time - e.lastAttack >
        (e.boss
          ? b.player.node?.kind === 'boss'
            ? e.encounterId === 'king'
              ? BALANCE.finalBossAttackIntervals[kingPhase(e) - 1]
              : BALANCE.chapterAttackInterval
            : BALANCE.commanderAttackInterval
          : 3.6)
    ) {
      e.lastAttack = b.time;
      enemyAttack(b, e);
    }
    if (b.time < e.arrival) continue;
    if (e.kind === 'gate') {
      const selected = gateAt(e.gate!, b.x);
      if (selected) {
        const result = applyGate(b.player, selected, b.shield);
        b.shield = result.shield;
        message(
          b,
          `${e.trialStep ? `红门 ${e.trialStep}/5 · ` : ''}${gateLabel(selected)} · 兵力 ${result.delta >= 0 ? '+' : '−'}${formatNumber(Math.abs(result.delta))}`,
          result.delta >= 0 ? '#c2f5a9' : '#ffa89c',
        );
        sound(b, 'gate');
      } else message(b, '擦过门隙 · 没有获得增益', '#c4c5b0');
      e.done = true;
    } else if (e.kind === 'hazard') {
      if (Math.abs(b.x - e.x) < e.width / 2 + 0.035)
        damagePlayer(b, 18 + b.player.floor * 1.8, 0.13);
      e.done = true;
    } else if (e.kind === 'chest') {
      e.done = true;
      message(b, '宝箱远去 · 需要持续瞄准', '#b6bda6');
    } else if (!e.boss) {
      const collision = Math.abs(b.x - e.x) < e.width / 2 + 0.05;
      damagePlayer(
        b,
        (collision ? 14 : 8) + b.player.floor * 1.25,
        collision ? 0.14 : 0.07,
      );
      e.done = true;
    }
    if (b.state !== 'running') return;
  }
  if (b.player.hp <= 0) {
    b.state = 'lost';
    b.player.phase = 'defeat';
    return;
  }
  // Resolve pressure after attacks: a kill at the deadline prevents the pulse.
  const pressure = b.pressure;
  if (
    pressure &&
    b.time >= pressure.nextAt &&
    !b.entities[pressure.bossId].done
  ) {
    const damage = pressure.baseDamage + pressure.pulses * pressure.ramp;
    pressure.pulses++;
    pressure.nextAt += pressure.interval;
    pressure.flashUntil = b.time + 0.7;
    damagePlayer(b, damage, 0);
    if (b.state !== 'running') return;
    message(b, `${pressure.name} · 第 ${pressure.pulses} 次冲击`, '#ffc5ab');
  }
  if (b.entities.find((e) => e.boss)!.done) {
    b.state = 'won';
    b.player.gold +=
      (b.player.node?.enchanted
        ? 90
        : b.player.node?.kind === 'elite'
          ? 55
          : b.player.node?.kind === 'boss'
            ? 80
            : 28) +
      (b.player.relics.bounty || 0) * 20;
    logRun(b.player, '防线突破 · 选择强化');
    b.threats = [];
    b.projectiles = [];
    b.bullets = [];
    b.ritual = null;
    b.pressure = null;
  }
  prepareLevelChoice(b);
}

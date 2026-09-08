import {
  HEROES,
  ACT_LENGTH,
  HP_PER_LEVEL,
  grantGold,
  stats,
  firepower,
  applyGate,
  gateLabel,
  effectiveGate,
  logRun,
  grantExperience,
  experience,
  rollLevelChoices,
  chooseLevelUpgrade,
  type Run,
  type GateChoice,
} from './game.ts';
import { VIEW } from './view.ts';
import {
  type ArmyState,
  armyMagnitude,
  magnitude,
  multiplyMagnitude,
  projectMagnitude,
  normalize,
  addArmy,
  multiplyArmy,
  trackArmyPeak,
  formatMagnitude,
} from './army.ts';
import { bossProfile, ENCOUNTERS } from './bosses.ts';
import {
  actIndex,
  localFloor,
  isEndless,
  healthGrowth,
  depthDamage,
  weaponLimit,
  endlessEncounter,
  type BossMutation,
  type EndlessEncounter,
} from './endless.ts';

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
  commanderBaseHp: 1580,
  eliteCommanderBaseHp: 2250,
  laterEnemyHpMultiplier: 1.15,
  superEliteHpMultiplier: 1.75,
  superEliteCommanderHp: 4100,
  enemyActMultiplier: [1, 1.05, 1.12],
  commanderActMultiplier: [1, 1.15, 1.5],
  bossActMultiplier: [1.6, 2.2, 2.15],
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
  ascendantForm?: 'solar' | 'eclipse';
  castName?: string;
  castStartedAt?: number;
  castUntil?: number;
  pendingRebirth?: boolean;
  life?: number;
  secondLife?: boolean;
  angelRevived?: boolean;
  angelBroken?: boolean;
  rageUntil?: number;
  invulnerableUntil?: number;
  mutationShield?: number;
  mutationShieldMax?: number;
  healingUntil?: number;
  healingPool?: number;
  healingRate?: number;
  healingFlashUntil?: number;
  angelHealingSpent?: number;
  damageTakenTotal?: number;
  lifeStartedAt?: number;
  blessing?: string;
  stage?: number;
  mutation?: BossMutation;
  fusionId?: string;
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
  anchorX?: number;
  guardianOf?: number;
  stationary?: boolean;
}
export interface Threat {
  ownerId?: number;
  id: number;
  x: number;
  width: number;
  resolveAt: number;
  damage: number;
  name: string;
  push?: number;
  kind?: 'cleave' | 'meteor' | 'rune';
}
export interface GroundZone {
  id: number;
  ownerId: number;
  x: number;
  width: number;
  startsAt: number;
  endsAt: number;
  nextTick: number;
  damage: number;
  kind: 'thorn' | 'web' | 'ember' | 'shadow';
}
export interface Projectile {
  ownerId?: number;
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
  kind: 'blade' | 'arrow' | 'bolt' | 'shard' | 'fireball';
  targetId?: number;
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
  transition: BattleTransition | null;
  transitionQueue: BattleTransition[];
  transitionSeq: number;
  cinematicTime: number;
  attackSourceId?: number;
  epilogue: boolean;
  rushStage: number;
  rushStages: number;
  nextBossCast: number;
  nextAllyAttack: number;
  encounterName: string;
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
  zones: GroundZone[];
  bossDamageTaken: number;
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

export interface BattleTransition {
  seq: number;
  kind: 'revival' | 'shatter';
  encounterId: string;
  remaining: number;
  duration: number;
  entityId?: number;
  form?: Entity['ascendantForm'];
}

export const ANGELIC_DAMAGE_TAKEN = 0.2;
export const ASCENDANT_SOLAR_SKILLS = [
  '日冕合拢',
  '弑神圣枪',
  '破晓敕令',
  '天火星河',
  '逆光王座',
  '万光归冕',
] as const;
export const ASCENDANT_ECLIPSE_SKILLS = [
  '无光圣轨',
  '碎冠枪雨',
  '黑日敕令',
  '坠日逆流',
  '蚀光牢笼',
  '王座归零',
] as const;
export const DEITY_SKILLS = [
  '创世光柱',
  '星河巡礼',
  '慈悲敕令',
  '晨曦回响',
  '六翼合奏',
  '黎明归途',
  '万象之弦',
  '天平圣约',
  '逐星织路',
  '寂静钟鸣',
  '破雾终曲',
] as const;

export const EPILOGUE_BLESSINGS = [
  '愿你归途有灯，长夜有星。',
  '你曾照亮无人问津的道路。',
  '那些未熄的火，终于迎来了黎明。',
  '向你致敬，不肯屈服的远征者。',
  '你的名字，值得被温柔地记住。',
  '世界因你，少了一分寒冷。',
  '愿你所爱的人，也能看见今日的光。',
  '走过了最暗的夜，愿往后皆有晴空。',
  '不必再举盾了，这里没有敌人。',
  '每一次重新站起，都成为了你的冠冕。',
  '勇气有了形状，正是你走来的模样。',
  '愿失败的旧日，也能化作温暖的故事。',
  '你守住的微光，足够点亮整片天穹。',
  '谢谢你，走完了这段漫长的路。',
  '所有失落的誓言，都向你献上祝福。',
  '群星不再遥远，它们正在为你闪耀。',
  '愿下一场旅途，有朋友与你同行。',
  '王座不会定义你，你的选择才会。',
  '你配得上掌声，也配得上休息。',
  '风带来花的消息，雾已经散了。',
  '没有任何一份坚持，是徒劳的。',
  '黎明为你而来，请收下这份光。',
  '愿你平凡的每一天，也闪着金色。',
  '曾经的小小火种，已成为不落的太阳。',
  '你让这个世界，有了圆满的结局。',
  '愿你仍然好奇，仍然敢于启程。',
  '请将这份勇气，带回你自己的世界。',
  '无人再索取你的牺牲，今日只为你欢庆。',
  '愿远方的你，一切都好。',
  '破除迷雾，终究登神。',
  '感谢相遇，感谢你玩到这里。',
  '绿色咸咸圈&GPT-6 Astra · 献给每位远征者。',
] as const;

export function battleEncounter(run: Run): EndlessEncounter | null {
  return run.devMode && run.devEncounter
    ? run.devEncounter
    : endlessEncounter(run);
}

export function arrivalDuration(encounterId?: string) {
  return encounterId?.startsWith('king') ? 4 : 3;
}

export function spectacleDuration(e: Entity) {
  return e.encounterId === 'deity'
    ? 72
    : e.encounterId === 'king-ascendant'
      ? e.ascendantForm === 'eclipse'
        ? 30
        : 24
      : e.encounterId === 'king-reborn'
        ? 18
        : e.encounterId === 'king' && e.secondLife
          ? 12
          : e.mutation === 'angelic' && !e.angelRevived
            ? 6
            : e.mutation &&
                ['watcher', 'wyvern', 'lich', 'oracle'].includes(
                  e.encounterId || '',
                )
              ? 8
              : 0;
}

export function bossAttackInterval(e: Entity, chapterBoss = true) {
  if (!chapterBoss) return BALANCE.commanderAttackInterval;
  if (e.encounterId === 'deity') return 5.8;
  if (e.encounterId === 'king-ascendant')
    return e.ascendantForm === 'eclipse' ? 3.9 : 4.8;
  return e.encounterId?.startsWith('king')
    ? BALANCE.finalBossAttackIntervals[kingPhase(e) - 1]
    : BALANCE.chapterAttackInterval;
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
  squad: number | ArmyState,
  floor: number,
) {
  if (floor < 1) return gates;
  const depth = Math.min(8, floor);
  return gates.map((g) => {
    if (g.op !== '+' && g.op !== '-') return g;
    const base = 6 + Math.floor(floor * 0.65);
    const variation = Math.max(0.85, Math.min(1.25, g.value / base));
    const ratio = g.op === '+' ? 0.14 + depth * 0.01 : 0.12 + depth * 0.02;
    const amount =
      typeof squad === 'number' ? magnitude(squad) : armyMagnitude(squad);
    if (amount.exponent >= 15) {
      const value = multiplyMagnitude(amount, ratio * variation);
      const armyValue = normalize(
        Math.round(value.mantissa * 10) / 10,
        value.exponent,
      );
      return { ...g, value: projectMagnitude(armyValue), armyValue };
    }
    const raw = Math.max(g.value, projectMagnitude(amount) * ratio * variation);
    const step = Math.pow(10, Math.max(0, Math.floor(Math.log10(raw)) - 1));
    return { ...g, value: Math.max(g.value, Math.round(raw / step) * step) };
  });
}
export function createBattle(run: Run): Battle {
  const player = structuredClone(run),
    act = actIndex(player),
    random = seededRandom(
      player.seed + player.floor * 719 + (player.node?.col || 0) * 103,
    );
  const epilogue = isEndless(player) && player.floor === 100;
  const directEncounter =
    !epilogue &&
    ((isEndless(player) && player.floor >= 90) ||
      !!(player.devMode && player.devEncounter));
  const travel = BALANCE.travel[act],
    spacing = epilogue ? 1.5 : BALANCE.spacing[act],
    waves = directEncounter
      ? 0
      : epilogue
        ? 16
        : BALANCE.waves[act] + (player.node?.enchanted ? 2 : 0);
  const superElite = Boolean(player.node?.enchanted),
    elite = player.node?.kind === 'elite' || superElite,
    bossRoom = player.node?.kind === 'boss',
    treasure = player.node?.kind === 'treasure';
  const difficulty =
    healthGrowth(player, BALANCE.hpGrowth) *
    (elite ? 1.24 : 1) *
    (superElite ? BALANCE.superEliteHpMultiplier : 1) *
    (treasure ? 0.85 : 1) *
    (player.difficulty === 'hard' ? 1.1 : 1);
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
      volleyDamage:
        (8 + Math.min(14, player.floor) * 1.3) *
        depthDamage(player) *
        (player.difficulty === 'hard' ? 1.08 : 1),
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
    if (epilogue) {
      if (i % 2 === 0) {
        const gate = put('gate', t, 0, 0, 'gate', '晨曦赐福', i + 1);
        gate.gate = [{ op: '×', value: 1.25 + i * 0.05, left: -1, right: 1 }];
        gate.gatePrepared = true;
      }
      for (let side = 0; side < 2; side++) {
        const chest = put(
          'chest',
          t + 0.25 + side * 0.35,
          side ? 0.36 : -0.36,
          Math.max(1, firepower(player).volley * 0.15),
          'chest',
          '黎明礼匣',
          i + 1,
        );
        chest.blessing = EPILOGUE_BLESSINGS[i * 2 + side];
      }
      continue;
    }
    if (i % 2 === 0) {
      const g = put('gate', t, 0, 0, 'gate', '命运之门', i + 1);
      g.gate = makeGate(random, i, localFloor(player), elite);
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
      { op: '-' as const, value: 1, fraction: 0.14 },
      { op: '÷' as const, value: 1.22, fraction: 0 },
      { op: '-' as const, value: 1, fraction: 0.17 },
      { op: '÷' as const, value: 1.25, fraction: 0 },
      { op: '-' as const, value: 1, fraction: 0.2 },
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
      healthGrowth(player, BALANCE.bossGrowth) *
      (isEndless(player) && player.floor >= 15 && bossRoom ? 1.4 : 1) *
      (bossRoom
        ? BALANCE.bossActMultiplier[act]
        : BALANCE.commanderActMultiplier[act]) *
      (profile.id === 'king' ? BALANCE.finalBossHpMultiplier : 1) *
      (player.difficulty === 'hard' ? 1.1 : 1),
    'boss',
    profile.name,
    waves,
    true,
  );
  final.encounterId = profile.id;
  if (!bossRoom && act === 2) final.attackIndex = 2;
  final.phase = 1;
  final.volleyDamage =
    (bossRoom
      ? 17 + Math.min(14, player.floor) * 1.6
      : 12 + Math.min(14, player.floor) * 1.4) *
    depthDamage(player) *
    (profile.id === 'king' ? BALANCE.finalBossDamageMultiplier : 1.1) *
    (player.difficulty === 'hard' ? 1.08 : 1);
  if (player.difficulty === 'hard' && bossRoom && act < 2) {
    const partner = ENCOUNTERS.find(
      (e) => e.kind === 'boss' && e.act === act && e.id !== profile.id,
    )!;
    // Shared encounter budget, separate health pools and attack identities.
    final.x = final.anchorX = -0.46;
    final.hp = final.maxHp = final.maxHp * 0.6;
    final.width = 0.42;
    final.volleyDamage *= 0.78;
    const second = put(
      'enemy',
      finalStart,
      0.46,
      final.maxHp,
      'boss',
      partner.name,
      waves,
      true,
    );
    second.anchorX = 0.46;
    second.encounterId = partner.id;
    second.phase = 1;
    second.width = 0.42;
    second.volleyDamage = final.volleyDamage;
    second.lastAttack += 2.2;
  }
  const encounter = epilogue ? null : battleEncounter(player);
  final.secondLife =
    final.encounterId === 'king' && player.difficulty === 'hard';
  final.life = 1;
  if (encounter) {
    const budget = final.maxHp;
    const attack = final.volleyDamage;
    for (const [stage, group] of encounter.groups.entries()) {
      for (const [index, id] of group.entries()) {
        const profile = ENCOUNTERS.find((p) => p.id === id)!;
        const start = stage === 0 ? finalStart : 1e12;
        const x =
          group.length === 1
            ? 0
            : group.length === 2
              ? index
                ? 0.46
                : -0.46
              : (index - 1) * 0.6;
        const hp =
          (budget * (encounter.groups.length > 1 ? 0.7 : 1.15)) /
          Math.sqrt(group.length);
        const e =
          stage === 0 && index === 0
            ? final
            : put('enemy', start, x, hp, 'boss', profile.name, waves, true);
        Object.assign(e, {
          x,
          anchorX: x,
          start,
          arrival: start + travel,
          hp,
          maxHp: hp,
          encounterId: id,
          stage,
          phase: 1,
          width: group.length > 1 ? 0.38 : 0.56,
          mutation: encounter.mutation,
          secondLife: !!encounter.secondLives && id.startsWith('king'),
          life: 1,
          fusionId: id === 'king' ? 'lich' : 'king',
          volleyDamage: attack * (group.length > 1 ? 0.7 : 1),
          lastAttack: start - 2.5 + index * 1.35,
        });
        e.mutation =
          encounter.mutations?.[stage]?.[index] ?? encounter.mutation;
        if (e.mutation === 'hollow') e.mutation = 'golden';
        if (id === 'king-ascendant') e.ascendantForm = 'solar';
        if (id === 'king-reborn') {
          e.secondLife = false;
          e.life = 2;
        }
        if (id === 'deity') {
          e.width = 1.85;
          e.volleyDamage = Math.min(
            e.volleyDamage,
            Math.max(15, player.maxHp * 0.1),
          );
        }
        const prefix =
          e.mutation === 'fusion'
            ? '合葬'
            : e.mutation === 'ashen'
              ? '黯化'
              : e.mutation === 'frenzied'
                ? '血月'
                : e.mutation === 'golden'
                  ? '金身'
                  : e.mutation === 'angelic'
                    ? '天使化'
                    : '';
        e.name = `${prefix}${prefix ? '·' : ''}${profile.name}${group.filter((other) => other === id).length > 1 ? `·${index + 1}` : ''}`;
      }
    }
  } else if (isEndless(player) && player.floor >= 30 && elite && !superElite) {
    final.mutation = ['ashen', 'frenzied', 'golden'][
      (player.seed + player.floor) % 3
    ] as BossMutation;
    final.name = `${final.mutation === 'ashen' ? '黯化' : final.mutation === 'frenzied' ? '血月' : '金身'}·${final.name}`;
  }
  if (epilogue) {
    final.done = true;
    final.hp = 0;
    final.boss = false;
    final.kind = 'chest';
    final.encounterId = undefined;
    final.blessing = undefined;
  }
  addArmy(player, (player.relics.ambush || 0) * 8);
  return {
    transition: null,
    transitionQueue: [],
    transitionSeq: 0,
    cinematicTime: 0,
    epilogue,
    rushStage: 0,
    rushStages: encounter?.groups.length || 1,
    nextBossCast: 0,
    nextAllyAttack: 8,
    encounterName: encounter?.name || '',
    player,
    levelChoices: epilogue ? [] : rollLevelChoices(player),
    encounterKills: {},
    time: 0,
    inputLocked: false,
    x: 0,
    inputAxis: 0,
    targetX: null,
    entities,
    effects: [],
    threats: [],
    zones: [],
    bossDamageTaken: 0,
    projectiles: [],
    bullets: [],
    bulletSeq: 0,
    ritual: null,
    pressure:
      bossRoom && !epilogue && !entities.some((e) => e.encounterId === 'deity')
        ? {
            name:
              profile.id === 'wyvern'
                ? '风暴侵蚀'
                : profile.id === 'oracle'
                  ? '命运收束'
                  : ['荆棘蚀血', '蚀月凋零', '王权震荡'][act],
            bossId: final.id,
            nextAt:
              finalStart +
              BALANCE.pressureGrace[act] +
              (player.difficulty === 'hard' && act < 2 ? 6 : 0),
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
    message: epilogue
      ? '黎明归途 · 此刻，所有祝福都属于你'
      : encounter?.omen || '横移瞄准 · 自动向前发射弹幕',
    messageUntil: encounter ? 8 : 4,
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
  return Math.min(
    e.boss || e.stationary ? 0 : 1.12,
    (time - e.start) / (e.arrival - e.start),
  );
}
export function targetVisible(e: Entity, time: number) {
  return (
    !e.done &&
    e.hp > 0 &&
    time >= e.start - (e.boss ? 0 : VIEW.previewSeconds) &&
    worldY(e, time) >= VIEW.far - 0.08
  );
}
export function worldY(e: Entity, time: number) {
  return -0.1 + progress(e, time) * 0.9;
}
export function movePlayer(b: Battle, x: number) {
  if (
    b.inputLocked ||
    b.transition ||
    b.levelChoices.length ||
    !Number.isFinite(x)
  )
    return;
  b.targetX = Math.max(BALANCE.minX, Math.min(BALANCE.maxX, x));
  b.inputAxis = 0;
}
export function setMoveAxis(b: Battle, axis: number) {
  if ((b.inputLocked || b.transition || b.levelChoices.length) && axis !== 0)
    return;
  b.inputAxis = Math.sign(axis);
  b.targetX = null;
}
function prepareLevelChoice(b: Battle) {
  if (b.epilogue) return;
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
function beginTransition(b: Battle, kind: BattleTransition['kind'], e: Entity) {
  const duration = kind === 'shatter' ? 1.15 : arrivalDuration(e.encounterId);
  const next: BattleTransition = {
    seq: ++b.transitionSeq,
    kind,
    encounterId: e.encounterId || '',
    remaining: duration,
    duration,
    entityId: e.id,
    form: e.ascendantForm,
  };
  if (b.transition) b.transitionQueue.push(next);
  else {
    b.transition = next;
    sound(b, kind === 'shatter' ? 'time-shatter' : 'boss-arrival');
  }
  b.inputAxis = 0;
  b.targetX = null;
  b.threats = [];
  b.zones = [];
  b.projectiles = [];
  b.bullets = [];
  b.ritual = null;
}

function reigniteKing(b: Battle, e: Entity) {
  e.life = 2;
  e.secondLife = false;
  e.pendingRebirth = false;
  e.encounterId =
    e.encounterId === 'king-ascendant' ? 'king-ascendant' : 'king-reborn';
  if (e.encounterId === 'king-ascendant') {
    e.ascendantForm = 'eclipse';
    e.x = e.anchorX = b.x >= 0 ? -0.52 : 0.52;
  }
  if (e.mutation === 'angelic' && e.angelBroken) e.mutation = undefined;
  const profile = ENCOUNTERS.find((p) => p.id === e.encounterId)!;
  const prefix =
    e.mutation === 'ashen'
      ? '黯化·'
      : e.mutation === 'frenzied'
        ? '血月·'
        : e.mutation === 'golden'
          ? '金身·'
          : e.mutation === 'fusion'
            ? '合葬·'
            : '';
  const suffix = /·\d+$/.exec(e.name)?.[0] || '';
  e.name =
    prefix +
    (e.ascendantForm === 'eclipse' ? '灰烬之王·蚀日终誓' : profile.name) +
    suffix;
  e.hp = e.maxHp = e.maxHp * 0.85;
  e.lifeStartedAt = b.time;
  e.damageTakenTotal = 0;
  e.phase = 1;
  e.attackIndex = 0;
  e.burnUntil = 0;
  e.guardUntil = 0;
  e.invulnerableUntil = 0;
  e.rageUntil = 0;
  e.healingPool = 0;
  e.mutationShield = 0;
  e.castName = undefined;
  e.castUntil = 0;
  e.lastAttack = b.time;
  for (const ward of b.entities)
    if (ward.guardianOf === e.id) {
      ward.done = true;
      ward.hp = 0;
    }
  b.finalStart = b.time;
  b.nextBossCast = b.time + 2.4;
  if (b.pressure) {
    b.pressure.nextAt = b.time + 25;
    b.pressure.pulses = 0;
  }
  beginTransition(b, 'revival', e);
  message(
    b,
    e.ascendantForm === 'eclipse'
      ? '日冕熄灭 · 无光的王誓仍在燃烧'
      : '焚誓重生 · 王座尚未落幕',
    profile.color,
  );
}

export function hitEntity(
  b: Battle,
  e: Entity,
  damage: number,
  critical = false,
  show = true,
  sourceX = b.x,
) {
  if (
    e.done ||
    e.hp <= 0 ||
    b.transition ||
    (e.invulnerableUntil || 0) > b.time
  )
    return;
  const frontalShield = e.guardUntil > b.time && Math.abs(sourceX - e.x) < 0.16;
  const soulWard = b.entities.some(
    (other) => other.guardianOf === e.id && !other.done && other.hp > 0,
  );
  let actual =
    damage *
    (1 - e.armor) *
    (frontalShield ? 0.3 : 1) *
    (soulWard ? 0.55 : 1) *
    (e.mutation === 'angelic' && !e.angelBroken ? ANGELIC_DAMAGE_TAKEN : 1);
  const spectacle = spectacleDuration(e);
  if (spectacle) {
    // One shared, time-based budget covers every projectile, DOT and active skill.
    // A giant army may reach the budget sooner, but cannot skip the encounter's spectacles.
    const allowed =
      e.maxHp *
      Math.min(
        1,
        Math.max(0, b.time - (e.lifeStartedAt ?? e.start)) / spectacle,
      );
    const remaining = Math.max(0, allowed - (e.damageTakenTotal || 0));
    actual = Math.min(
      actual,
      e.maxHp * (e.encounterId === 'deity' ? 0.032 : 0.12),
      allowed >= e.maxHp && remaining <= e.maxHp * 1e-12 ? e.hp : remaining,
    );
    e.damageTakenTotal = (e.damageTakenTotal || 0) + actual;
  }
  if ((e.mutationShield || 0) > 0) {
    const absorbed = Math.min(actual, e.mutationShield!);
    e.mutationShield! -= absorbed;
    actual -= absorbed;
    if (e.mutationShield! <= 0) message(b, '金身破裂 · 护盾已击碎');
  }
  if (actual <= 0) return;
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
      text: `${critical ? '✦ ' : ''}${actual >= 1e7 ? formatMagnitude(magnitude(actual)) : Math.ceil(actual)}`,
      color: critical ? '#ffe19a' : '#f4edd7',
      life: 0.65,
    });
  if (e.hp > 0) return;
  if (e.mutation === 'angelic' && !e.angelRevived) {
    e.angelRevived = true;
    e.pendingRebirth =
      !!e.secondLife &&
      (e.life || 1) === 1 &&
      !!e.encounterId?.startsWith('king');
    e.hp = e.maxHp * 0.7;
    if (e.encounterId === 'king') e.phase = kingPhase(e);
    e.rageUntil = e.invulnerableUntil = b.time + 10;
    e.lastAttack = b.time - 2;
    e.burnUntil = 0;
    e.healingPool = 0;
    if (b.pressure)
      b.pressure.nextAt = Math.max(b.pressure.nextAt, b.time + 18);
    message(b, '天使复生 · 十息狂怒，静候羽翼破碎', '#ffffff');
    b.messageUntil = b.time + 3;
    sound(b, 'angel-revive');
    return;
  }
  if (e.secondLife && (e.life || 1) === 1) {
    reigniteKing(b, e);
    return;
  }
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
    if (e.blessing) {
      message(b, e.blessing, '#fff0b2');
      b.messageUntil = b.time + 3.5;
      b.effects.push({
        type: 'text',
        x: e.x,
        y: worldY(e, b.time),
        text: '✦ 愿光与你同在 ✦',
        color: '#fff0b2',
        life: 1.8,
      });
      sound(b, 'chest');
      return;
    }
    if (e.reward === 'weapon') {
      b.player.weaponTier = Math.min(
        weaponLimit(b.player),
        b.player.weaponTier + 1,
      );
      message(b, `兵装秘匣 · 武器 Lv.${b.player.weaponTier}`);
    } else {
      grantGold(b.player, 22 + actIndex(b.player) * 12);
      addArmy(b.player, 4);
      message(b, `宝箱击破 · +${22 + actIndex(b.player) * 12} 金币 / +4 兵力`);
    }
    logRun(
      b.player,
      e.reward === 'weapon' ? '兵装秘匣 · 武器升级' : '宝箱击破 · 金币与援军',
    );
    sound(b, 'chest');
  } else {
    b.player.kills++;
    if (e.encounterId) {
      const identities =
        e.encounterId === 'king-reborn'
          ? ['king', 'king-reborn']
          : [e.encounterId];
      for (const identity of identities) {
        b.encounterKills[identity] = (b.encounterKills[identity] || 0) + 1;
        b.player.encountersDefeated[identity] =
          (b.player.encountersDefeated[identity] || 0) + 1;
      }
    }
    grantGold(b.player, 4 + actIndex(b.player) * 2);
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
      text: `+${4 + actIndex(b.player) * 2} 金 · +${xp} XP`,
      color: '#acdfba',
      life: 1.2,
    });
    if (gained) {
      message(
        b,
        `升至 Lv.${experience(b.player).level} · 攻击 +${gained * 2}% / 生命上限 +${gained * HP_PER_LEVEL}`,
        '#d4eeb8',
      );
      sound(b, 'level');
    } else sound(b, 'kill');
  }
}
export function damagePlayer(
  b: Battle,
  amount: number,
  troopLoss = 0.08,
  sourceId?: number,
) {
  if (b.state !== 'running' || b.transition || b.epilogue) return;
  const reduced = Math.ceil(amount * (1 - stats(b.player, b.shield).armor));
  const absorbed = Math.min(reduced, b.shield);
  if (b.time >= b.finalStart) b.bossDamageTaken += reduced - absorbed;
  b.shield -= absorbed;
  b.player.hp = Math.max(0, b.player.hp - reduced + absorbed);
  const source =
    sourceId === undefined
      ? undefined
      : b.entities.find((e) => e.id === sourceId);
  const healthHit = reduced - absorbed;
  if (
    healthHit > 0 &&
    source?.mutation === 'frenzied' &&
    !source.done &&
    source.hp > 0
  ) {
    const recovered =
      source.maxHp *
      0.025 *
      Math.min(1, healthHit / Math.max(1, b.player.maxHp * 0.08));
    source.healingPool = Math.min(
      source.maxHp * 0.08,
      (source.healingPool || 0) + recovered,
    );
    source.healingRate = source.healingPool / 4;
    source.healingUntil = b.time + 4;
    source.healingFlashUntil = b.time + 4;
    b.effects.push({
      type: 'shot',
      x: b.x,
      y: VIEW.playerY,
      targetX: source.x,
      targetY: worldY(source, b.time),
      color: '#f26b88',
      text: '',
      life: 0.9,
    });
  }
  const lost =
    absorbed === reduced
      ? 0
      : Math.min(b.player.squad - 1, Math.ceil(b.player.squad * troopLoss));
  const lostMagnitude =
    armyMagnitude(b.player).exponent >= 15
      ? multiplyMagnitude(
          armyMagnitude(b.player),
          absorbed === reduced ? 0 : troopLoss,
        )
      : magnitude(lost);
  addArmy(b.player, lostMagnitude, true);
  b.flash = 0.3;
  sound(b, 'hurt');
  message(
    b,
    absorbed === reduced
      ? `护盾吸收 ${reduced}`
      : `生命 −${reduced - absorbed} · 兵力 −${formatMagnitude(lostMagnitude)}`,
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
      if (e.kind === 'enemy' && targetVisible(e, b.time))
        hitEntity(b, e, attackDamage(b) * 0.8 * b.player.relics.thorns);
}
export function attackDamage(b: Battle) {
  return (
    firepower(b.player, b.shield).volley *
    (b.player.classId === 'knight' && b.buffUntil > b.time
      ? 1.25 + (b.player.relics.paladin || 0) * 0.15
      : 1)
  );
}
export function combatStats(b: Battle) {
  return stats(b.player, b.shield, b.buffUntil > b.time);
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
  const s = combatStats(b);
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
export function enemyXAt(b: Battle, e: Entity, time: number) {
  return e.boss && b.player.node?.kind === 'boss' && actIndex(b.player) === 1
    ? (e.anchorX || 0) +
        Math.sin((time - e.start) * 0.8) * (e.anchorX ? 0.1 : 0.18)
    : e.x;
}
function stepPlayerBullets(b: Battle, oldTime: number) {
  const s = stats(b.player, b.shield);
  const color = HEROES.find((h) => h.id === b.player.classId)!.color;
  // Fragments created on impact begin travelling next frame, never recursively.
  const activeCount = b.bullets.length;
  for (let index = 0; index < activeCount; index++) {
    if (b.transition) return;
    const bullet = b.bullets[index];
    const fromTime = Math.max(oldTime, bullet.spawnAt);
    const elapsed = b.time - fromTime;
    if (elapsed <= 0) continue;
    if (bullet.kind === 'fireball') {
      // Acquire at launch, then follow that target until it falls or leaves view.
      if (oldTime <= bullet.spawnAt) {
        bullet.x = b.x;
        bullet.originX = b.x;
      }
      let target = b.entities.find(
        (e) => e.id === bullet.targetId && targetVisible(e, b.time),
      );
      if (!target) {
        const visible = b.entities.filter(
          (e) =>
            (e.kind === 'enemy' || e.kind === 'chest') &&
            targetVisible(e, b.time),
        );
        const enemies = visible.filter((e) => e.kind === 'enemy');
        const distance = (e: Entity) =>
          Math.hypot(
            enemyXAt(b, e, b.time) - bullet.x,
            (worldY(e, b.time) - bullet.y) * 1.5,
          );
        target = (enemies.length ? enemies : visible).sort(
          (a, z) => distance(a) - distance(z),
        )[0];
        bullet.targetId = target?.id;
      }
      if (target) {
        const dx = enemyXAt(b, target, b.time) - bullet.x;
        const dy = worldY(target, b.time) - bullet.y;
        const distance = Math.hypot(dx, dy) || 1;
        const speed = Math.min(2.6, distance / elapsed);
        bullet.vx = (dx / distance) * speed;
        bullet.vy = (dy / distance) * speed;
      }
    }
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
      if (
        bullet.kind === 'fireball' &&
        bullet.targetId !== undefined &&
        e.id !== bullet.targetId
      )
        continue;
      // The entrance frame belongs to the portrait pause, before combat resumes.
      const activeFrom = Math.max(
        fromTime,
        e.start - (e.boss ? 0 : VIEW.previewSeconds) + 1e-6,
      );
      const activeTo = Math.min(
        b.time,
        e.boss || e.stationary ? b.time : e.arrival,
      );
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
      if (b.transition) return;
      b.effects.push({
        type: bullet.kind === 'fireball' ? 'burst' : 'impact',
        x,
        y,
        color: bullet.kind === 'fireball' ? '#ffa663' : color,
        text: '',
        life: 0.26,
      });
      if (bullet.kind === 'fireball' && !e.done && b.player.relics.ember)
        e.burnUntil = b.time + 3;
      if (bullet.canProc) {
        if (!e.done && b.player.relics.ember) e.burnUntil = b.time + 3;
        if (s.blast) {
          b.effects.push({ type: 'burst', x, y, color, text: '', life: 0.4 });
          if (!e.done)
            hitEntity(
              b,
              e,
              bullet.damage * s.blast * 0.2,
              false,
              false,
              bullet.originX,
            );
          for (const other of b.entities)
            if (
              other !== e &&
              !other.done &&
              other.hp > 0 &&
              targetVisible(other, b.time) &&
              Math.hypot(
                enemyXAt(b, other, b.time) - x,
                (worldY(other, b.time) - y) * 1.5,
              ) <
                0.38 + s.blast * 0.03
            )
              hitEntity(
                b,
                other,
                bullet.damage *
                  s.blast *
                  0.65 *
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
      if (b.transition) return;
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
    b.transition ||
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
      b.shield +
        18 +
        Math.floor(b.player.maxHp * 0.1) +
        (b.player.relics.paladin || 0) * 12,
    );
    b.buffUntil = b.time + 5;
    message(
      b,
      `不破誓约 · 护盾 / 5秒伤害 +${b.player.relics.paladin ? 40 : 25}%`,
    );
  } else if (b.player.classId === 'ranger') {
    for (const e of b.entities)
      if (targetVisible(e, b.time))
        hitEntity(b, e, attackDamage(b) * (b.player.relics.hunter ? 6 : 4));
    b.buffUntil = b.time + 5;
    b.shootTimer = Math.min(b.shootTimer, 1 / combatStats(b).rate);
    message(b, '箭雨齐射 · 5秒疾射 / 必定暴击 / 余势化为致命一击');
  } else {
    const empowered = Boolean(b.player.relics.archmage);
    const count = empowered ? 9 : 6;
    multiplyArmy(b.player, empowered ? 1.08 : 1.05, true);
    // Damage snapshots the reinforced army once; six impacts never multiply it again.
    const damage = attackDamage(b) * 1.5;
    for (let i = 0; i < count; i++)
      b.bullets.push({
        id: b.bulletSeq++,
        kind: 'fireball',
        x: b.x,
        y: VIEW.playerY - 0.035,
        vx: 0,
        vy: -2.6,
        radius: stats(b.player).bulletRadius * 1.5,
        damage,
        critical: false,
        pierceLeft: 0,
        hitIds: [],
        spawnAt: b.time + i * 0.12,
        originX: b.x,
        originY: VIEW.playerY - 0.035,
        canProc: false,
      });
    message(
      b,
      `秘火连星 · ${count}星追猎 / 军势 ×${empowered ? '1.08' : '1.05'}`,
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
    ownerId: b.attackSourceId,
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
      ownerId: e.id,
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
function groundZone(
  b: Battle,
  e: Entity,
  x: number,
  width: number,
  kind: GroundZone['kind'],
  delay = 1.3,
  duration = 2.8,
) {
  b.zones.push({
    id: b.threatSeq++,
    ownerId: e.id,
    x,
    width,
    kind,
    startsAt: b.time + delay,
    endsAt: b.time + delay + duration,
    nextTick: b.time + delay,
    damage: e.volleyDamage * 0.22,
  });
}
function summonGuard(b: Battle, e: Entity, x: number, stationary = false) {
  if (b.entities.filter((v) => v.guardianOf === e.id && !v.done).length >= 2)
    return;
  const hp = e.maxHp * (stationary ? 0.018 : 0.024);
  b.entities.push({
    ...e,
    id: b.entities.length,
    boss: false,
    encounterId: undefined,
    kind: 'enemy',
    variant: stationary ? 'guard' : 'archer',
    x,
    anchorX: undefined,
    hp,
    maxHp: hp,
    armor: 0,
    done: false,
    name: stationary ? '蚀月魂灯' : '铁誓援军',
    start: b.time + 0.35,
    arrival: b.time + 5,
    lastAttack: b.time,
    volleyDamage: e.volleyDamage * 0.3,
    width: 0.23,
    guardUntil: 0,
    guardianOf: stationary ? e.id : undefined,
    stationary,
    burnUntil: 0,
    secondLife: false,
    mutation: undefined,
    mutationShield: 0,
    invulnerableUntil: 0,
    healingPool: 0,
    rageUntil: 0,
  });
}
function signatureAttack(
  b: Battle,
  e: Entity,
  index: number,
  damage: number,
): boolean {
  if (index % 3 !== 2 || e.encounterId === 'king') return false;
  const side = index % 2 ? -1 : 1;
  switch (e.encounterId) {
    case 'executioner':
      [-0.65, 0, 0.65].forEach((x, i) =>
        warn(b, x * side, 0.42, 1.1 + i * 0.55, damage * 0.8, '处刑巡礼'),
      );
      volley(
        b,
        e,
        'axe',
        [-0.75, -0.25, 0.25, 0.75],
        1.7,
        1.8,
        damage * 0.45,
        -side * 0.8,
      );
      message(b, '处刑巡礼 · 顺着斧痕移动，留意回旋斧');
      break;
    case 'commander':
      summonGuard(b, e, -0.56);
      summonGuard(b, e, 0.56);
      e.guardUntil = b.time + 2.4;
      warn(b, 0, 0.45, 1.4, damage * 0.8, '军阵突刺');
      message(b, '铁誓军阵 · 清除弓手援军，侧击统领');
      break;
    case 'hexblade':
      groundZone(b, e, b.x, 0.42, 'shadow', 1.25, 3.2);
      warn(b, -b.x, 0.42, 2.2, damage * 0.9, '镜界处决');
      e.x = side * 0.48;
      message(b, '镜界裂隙 · 咒刃换位，影痕会持续灼伤');
      break;
    case 'stonewarden':
      groundZone(b, e, side * 0.6, 0.62, 'thorn', 1.5, 3.1);
      warn(b, -side * 0.4, 0.34, 2.4, damage * 0.9, '石心震荡');
      e.guardUntil = b.time + 1.4;
      message(b, '断层之誓 · 先离开碎石，再躲开震心');
      break;
    case 'broodmother':
      groundZone(b, e, -0.62, 0.42, 'web', 1.4, 3.4);
      groundZone(b, e, 0.62, 0.42, 'web', 1.4, 3.4);
      volley(b, e, 'star', [-0.24, 0.24], 0.75, 1.9, damage * 0.55);
      message(b, '蛛巢围猎 · 蛛网减速，中央毒弹留有缺口');
      break;
    case 'watcher':
      groundZone(b, e, side * 0.54, 0.82, 'thorn', 1.45, 3.0);
      warn(b, -side * 0.58, 0.32, 2.5, damage * 0.7, '荆棘追猎');
      message(b, '荆棘围城 · 根墙持续生长，别停在追猎印记上');
      break;
    case 'wyvern': {
      warn(b, 0, 1.35, 1.5, damage * 0.45, '暴风推击');
      b.threats[b.threats.length - 1].push = side * 0.34;
      groundZone(b, e, side * 0.72, 0.34, 'ember', 1.8, 2.6);
      message(b, '暴风推击 · 向风暴侧翼躲避，别被推入龙焰');
      break;
    }
    case 'lich':
      summonGuard(b, e, -0.61, true);
      summonGuard(b, e, 0.61, true);
      volley(b, e, 'star', [-0.8, -0.4, 0, 0.4, 0.8], 0.5, 2.1, damage * 0.5);
      message(b, '蚀月魂灯 · 击破两盏魂灯，解除巫妖护佑');
      break;
    case 'oracle':
      groundZone(b, e, b.x, 0.42, 'shadow', 1.5, 2.6);
      warn(b, -b.x, 0.4, 2.1, damage * 0.8, '逆命回响');
      volley(b, e, 'star', [-0.72, 0, 0.72], 1.1, 2, damage * 0.45);
      message(b, '逆命星盘 · 预言留下裂痕，下一击来自镜像');
      break;
    default:
      return false;
  }
  return true;
}
function enemyAttack(b: Battle, e: Entity) {
  if (!e.boss) {
    warn(b, b.x, 0.29, 1.05, e.volleyDamage, '弓手狙击');
    return;
  }
  const attackProfile = ENCOUNTERS.find(
    (profile) => profile.id === e.encounterId,
  );
  const act = attackProfile?.act ?? actIndex(b.player),
    isActBoss = attackProfile?.kind === 'boss',
    index = e.attackIndex++;
  const damage = e.volleyDamage * (b.enrage ? 1.75 : 1),
    secondPhase = e.hp < e.maxHp * 0.5;
  if (e.encounterId === 'king-reborn') {
    rebornAttack(b, e, index, damage);
    return;
  }
  if (e.encounterId === 'king-ascendant') {
    ascendantAttack(b, e, index, damage);
    return;
  }
  if (e.encounterId === 'deity') {
    deityAttack(b, e, index);
    return;
  }
  if (signatureAttack(b, e, index, damage)) return;
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
  } else if (index % 5 === 4) {
    const side = index % 2 ? -1 : 1;
    groundZone(b, e, side * 0.6, 0.62, 'ember', 1.5, 3.5);
    groundZone(b, e, -side * 0.65, 0.4, 'ember', 2.8, 2.2);
    warn(b, 0, 0.35, 2.2, damage * 0.8, '王座断界');
    message(b, '王座断界 · 黑焰依次封路，穿过裂隙');
  } else if (index % 5 === 0) {
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
  } else if (index % 5 === 1) ritual(b, e);
  else if (index % 5 === 2) {
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

function safeCorridor(
  b: Battle,
  center: number,
  width: number,
  delay: number,
  damage: number,
  name: string,
) {
  const left = center - width / 2,
    right = center + width / 2;
  if (left > -1) warn(b, (-1 + left) / 2, left + 1, delay, damage, name);
  if (right < 1) warn(b, (1 + right) / 2, 1 - right, delay, damage, name);
}

function rebornAttack(b: Battle, e: Entity, index: number, damage: number) {
  const side = index % 2 ? -1 : 1;
  markCast(
    b,
    e,
    ['焚誓巡礼', '王誓残碑', '不灭敕令', '双翼焚风', '焚魂回声'][index % 5],
    5.2,
  );
  switch (index % 5) {
    case 0:
      [-0.65, 0, 0.65].forEach((x, i) => {
        warn(b, x * side, 0.47, 1.65 + i * 0.85, damage * 0.75, '焚誓巡礼');
        groundZone(b, e, x * side, 0.4, 'ember', 1.9 + i * 0.85, 0.65);
      });
      message(b, '焚誓巡礼 · 跟随熄灭的火痕，逐段穿行');
      break;
    case 1:
      summonGuard(b, e, -0.61, true);
      summonGuard(b, e, 0.61, true);
      for (const ward of b.entities.filter(
        (v) => v.guardianOf === e.id && !v.done,
      ))
        ward.name = '王誓残碑';
      volley(b, e, 'ember', [-0.82, -0.4, 0.4, 0.82], 0.65, 2.25, damage * 0.5);
      warn(b, b.x, 0.36, 2.2, damage * 0.7, '余烬索命');
      message(b, '王誓残碑 · 击碎残碑，解除王权护佑');
      break;
    case 2: {
      const breakMax = e.maxHp * 0.045;
      b.ritual = {
        name: '不灭敕令',
        bossId: e.id,
        startedAt: b.time,
        resolveAt: b.time + 3.25,
        damage: damage * 0.9,
        interruptible: true,
        breakMax,
        breakRemaining: breakMax,
        safeX: side * 0.55,
        safeWidth: 0.48,
      };
      warn(b, side * 0.55, 0.44, 4.45, damage * 0.65, '敕令余震');
      message(b, '不灭敕令 · 先入绿区，敕令后立即离开余震');
      break;
    }
    case 3:
      volley(
        b,
        e,
        'ember',
        [-0.8, -0.38, 0.08, 0.6],
        0.4,
        2,
        damage * 0.5,
        -0.82,
      );
      volley(
        b,
        e,
        'ember',
        [-0.6, -0.08, 0.38, 0.8],
        1.45,
        2,
        damage * 0.5,
        0.82,
      );
      safeCorridor(b, -side * 0.35, 0.7, 3.95, damage * 0.65, '逆行陨火');
      message(b, '双翼焚风 · 穿过来弹，再进入陨火生路');
      break;
    default:
      groundZone(b, e, b.x, 0.35, 'shadow', 1.7, 2.1);
      warn(b, -b.x * 0.75, 0.38, 2.9, damage * 0.75, '焚魂回声');
      volley(b, e, 'ember', [-0.85, -0.45, 0.45, 0.85], 1.6, 2, damage * 0.4);
      message(b, '焚魂回声 · 离开旧影，避开镜像追猎');
  }
}

function markCast(b: Battle, e: Entity, name: string, duration: number) {
  e.castName = name;
  e.castStartedAt = b.time;
  e.castUntil = b.time + duration;
}

function eclipseAttack(b: Battle, e: Entity, index: number, damage: number) {
  const spell = index % ASCENDANT_ECLIPSE_SKILLS.length,
    side = index % 2 ? -1 : 1;
  markCast(b, e, ASCENDANT_ECLIPSE_SKILLS[spell], 4.9);
  // The broken crown moves between side altars; fire no longer comes from a
  // fixed central throne, and each oath has several readable movement beats.
  e.x = e.anchorX = [-0.52, 0.52, 0][index % 3];
  switch (spell) {
    case 0:
      [-0.56, 0, 0.56].forEach((x, i) =>
        safeCorridor(
          b,
          x * side,
          0.5,
          1.75 + i * 1.2,
          damage * 0.8,
          '无光圣轨',
        ),
      );
      message(b, '无光圣轨 · 侧翼、中央、彼岸，沿裂开的光前行');
      break;
    case 1:
      [-0.72, -0.24].forEach((x) =>
        warn(b, x * side, 0.34, 1.7, damage * 0.75, '碎冠枪雨'),
      );
      [0.24, 0.72].forEach((x) =>
        warn(b, x * side, 0.34, 2.85, damage * 0.75, '碎冠枪雨'),
      );
      warn(b, b.x, 0.36, 4.1, damage * 0.7, '追身残冠');
      message(b, '碎冠枪雨 · 左右枪阵先后落下，残冠最后追向旧影');
      break;
    case 2: {
      const breakMax = e.maxHp * 0.05;
      b.ritual = {
        name: '黑日敕令',
        bossId: e.id,
        startedAt: b.time,
        resolveAt: b.time + 3.1,
        damage: damage * 0.9,
        interruptible: true,
        breakMax,
        breakRemaining: breakMax,
        safeX: side * 0.55,
        safeWidth: 0.48,
      };
      groundZone(b, e, 0, 0.4, 'shadow', 1.65, 2.3);
      warn(b, side * 0.55, 0.42, 4.4, damage * 0.7, '黑日余震');
      message(b, '黑日敕令 · 绕过中央暗域，敕令后离开余震');
      break;
    }
    case 3:
      volley(
        b,
        e,
        'ember',
        [-0.82, -0.41, 0, 0.41, 0.82],
        0.4,
        2.05,
        damage * 0.52,
        -0.82,
      );
      volley(
        b,
        e,
        'star',
        [-0.62, -0.2, 0.2, 0.62],
        1.45,
        2.05,
        damage * 0.52,
        0.82,
      );
      warn(b, b.x, 0.36, 4.65, damage * 0.65, '坠日烙印');
      message(b, '坠日逆流 · 暗火与残星交错，最后离开烙印');
      break;
    case 4:
      groundZone(b, e, -0.72, 0.46, 'shadow', 1.7, 2.7);
      groundZone(b, e, 0.72, 0.46, 'shadow', 1.7, 2.7);
      warn(b, 0, 0.35, 2.9, damage * 0.8, '蚀光牢笼');
      safeCorridor(b, 0, 0.64, 4.8, damage * 0.75, '牢笼坍缩');
      message(b, '蚀光牢笼 · 避开正中裂隙，随后回到中央');
      break;
    default:
      warn(b, 0, 0.64, 1.7, damage * 0.8, '王座归零');
      safeCorridor(b, 0, 0.56, 3.0, damage * 0.8, '王座归零');
      safeCorridor(b, side * 0.5, 0.5, 4.5, damage * 0.8, '无王之门');
      message(b, '王座归零 · 离开王座、回到中心，再踏向最后的光隙');
  }
}

function ascendantAttack(b: Battle, e: Entity, index: number, damage: number) {
  if (e.ascendantForm === 'eclipse' || (e.life || 1) >= 2) {
    e.ascendantForm = 'eclipse';
    eclipseAttack(b, e, index, damage);
    return;
  }
  const side = index % 2 ? -1 : 1;
  markCast(
    b,
    e,
    ASCENDANT_SOLAR_SKILLS[index % ASCENDANT_SOLAR_SKILLS.length],
    4.8,
  );
  switch (index % 6) {
    case 0:
      safeCorridor(b, side * 0.45, 0.66, 2.0, damage * 0.75, '日冕合拢');
      safeCorridor(b, -side * 0.45, 0.66, 3.6, damage * 0.75, '日冕回环');
      message(b, '日冕合拢 · 两重日轮依次降下，随光转移');
      break;
    case 1:
      [-0.72, -0.24, 0.24, 0.72].forEach((x, i) =>
        warn(b, x * side, 0.33, 1.65 + i * 0.6, damage * 0.62, '弑神圣枪'),
      );
      message(b, '弑神圣枪 · 圣枪依序降临，勿逆向穿行');
      break;
    case 2: {
      const breakMax = e.maxHp * 0.045;
      b.ritual = {
        name: '破晓敕令',
        bossId: e.id,
        startedAt: b.time,
        resolveAt: b.time + 3.5,
        damage: damage * 0.8,
        interruptible: true,
        breakMax,
        breakRemaining: breakMax,
        safeX: side * 0.5,
        safeWidth: 0.55,
      };
      message(b, '破晓敕令 · 击碎圣约，或进入晨曦庇护');
      break;
    }
    case 3:
      volley(
        b,
        e,
        'star',
        [-0.85, -0.5, -0.15, 0.2, 0.55, 0.9],
        0.6,
        2.5,
        damage * 0.4,
        -0.75,
      );
      volley(
        b,
        e,
        'ember',
        [-0.9, -0.55, -0.2, 0.15, 0.5, 0.85],
        1.8,
        2.5,
        damage * 0.4,
        0.75,
      );
      message(b, '天火星河 · 光与灰烬交织，从两轮空隙穿行');
      break;
    case 4:
      groundZone(b, e, side * 0.66, 0.5, 'ember', 1.8, 2.3);
      warn(b, -side * 0.5, 0.35, 3.0, damage * 0.7, '逆光王座');
      message(b, '逆光王座 · 避开圣痕，最后返回熄灭的道路');
      break;
    default:
      summonGuard(b, e, -0.62, true);
      summonGuard(b, e, 0.62, true);
      for (const ward of b.entities.filter(
        (v) => v.guardianOf === e.id && !v.done,
      ))
        ward.name = '窃日圣痕';
      safeCorridor(b, 0, 0.78, 2.5, damage * 0.65, '万光归冕');
      message(b, '万光归冕 · 击碎两侧圣痕，结束他的神话');
  }
}

function deityAttack(b: Battle, e: Entity, index: number) {
  // The finale favours legible, long sequences over stacked damage or attrition.
  const damage = e.volleyDamage,
    side = index % 2 ? -1 : 1;
  markCast(b, e, DEITY_SKILLS[index % DEITY_SKILLS.length], 5.7);
  switch (index % DEITY_SKILLS.length) {
    case 0:
      safeCorridor(b, 0, 0.82, 2.6, damage, '创世光柱');
      safeCorridor(b, side * 0.45, 0.76, 4.5, damage, '黎明初现');
      message(b, '创世光柱 · 先守中央，再随晨光移向一侧');
      break;
    case 1:
      volley(
        b,
        e,
        'star',
        [-0.84, -0.42, 0.42, 0.84],
        0.8,
        3.1,
        damage * 0.7,
        -0.7,
      );
      volley(
        b,
        e,
        'star',
        [-0.65, -0.2, 0.2, 0.65],
        2.2,
        3.1,
        damage * 0.7,
        0.7,
      );
      message(b, '星河巡礼 · 两道星河缓缓交汇，寻找空隙');
      break;
    case 2:
      b.ritual = {
        name: '慈悲敕令',
        bossId: e.id,
        startedAt: b.time,
        resolveAt: b.time + 4.2,
        damage,
        interruptible: false,
        breakMax: 0,
        breakRemaining: 0,
        safeX: side * 0.45,
        safeWidth: 0.78,
      };
      message(b, '慈悲敕令 · 圣约不可打断，走入宽阔的绿光');
      break;
    case 3:
      [-0.7, 0, 0.7].forEach((x, i) =>
        warn(b, x * side, 0.38, 2.2 + i * 0.95, damage * 0.75, '晨曦回响'),
      );
      message(b, '晨曦回响 · 光柱依次落下，从容换位');
      break;
    case 4:
      volley(b, e, 'ember', [-0.85, -0.4, 0.4, 0.85], 0.6, 3.1, damage * 0.6);
      safeCorridor(b, 0, 0.7, 4.8, damage * 0.8, '六翼合奏');
      message(b, '六翼合奏 · 穿越羽光，回到中央的生路');
      break;
    case 5:
      safeCorridor(b, -0.45, 0.76, 2.3, damage * 0.7, '黎明归途');
      safeCorridor(b, 0.45, 0.76, 4.4, damage * 0.7, '黎明归途');
      message(b, '黎明归途 · 左侧的光将熄灭，向右迎接曙光');
      break;
    case 6:
      volley(
        b,
        e,
        'star',
        [-0.78, -0.36, 0.36, 0.78],
        0.55,
        2.8,
        damage * 0.55,
        -0.92,
      );
      volley(
        b,
        e,
        'star',
        [-0.78, -0.36, 0.36, 0.78],
        1.65,
        2.8,
        damage * 0.55,
        0.92,
      );
      warn(b, side * 0.62, 0.34, 5.2, damage * 0.65, '万象之弦');
      message(b, '万象之弦 · 两端琴弦轻拂星海，中央留有空隙');
      break;
    case 7:
      safeCorridor(b, -side * 0.43, 0.82, 2.4, damage * 0.75, '天平圣约');
      safeCorridor(b, side * 0.43, 0.82, 4.6, damage * 0.75, '天平圣约');
      message(b, '天平圣约 · 跟随倾斜的圣光，从一端走向另一端');
      break;
    case 8:
      [-0.78, -0.3, 0.18].forEach((x, i) =>
        warn(b, x * side, 0.36, 2.1 + i * 1.05, damage * 0.7, '逐星织路'),
      );
      volley(b, e, 'ember', [-0.85, -0.4, 0.4, 0.85], 1.3, 3.0, damage * 0.45);
      message(b, '逐星织路 · 星柱逐次织成道路，彼岸仍有生路');
      break;
    case 9:
      b.ritual = {
        name: '寂静钟鸣',
        bossId: e.id,
        startedAt: b.time,
        resolveAt: b.time + 3.45,
        damage: damage * 0.75,
        interruptible: false,
        breakMax: 0,
        breakRemaining: 0,
        safeX: 0,
        safeWidth: 0.9,
      };
      warn(b, 0, 0.38, 5.15, damage * 0.65, '余音圣痕');
      message(b, '寂静钟鸣 · 先听中央的钟声，再离开余音圣痕');
      break;
    default:
      volley(
        b,
        e,
        'star',
        [-0.86, -0.43, 0.43, 0.86],
        0.6,
        2.9,
        damage * 0.45,
        -0.8,
      );
      volley(
        b,
        e,
        'ember',
        [-0.86, -0.43, 0.43, 0.86],
        1.7,
        2.9,
        damage * 0.45,
        0.8,
      );
      safeCorridor(b, 0, 0.9, 5.3, damage * 0.65, '破雾终曲');
      message(b, '破雾终曲 · 穿越两翼的光，迎向中央的黎明');
  }
  b.messageUntil = b.time + 3.8;
}

export function stepBattle(b: Battle, dt: number) {
  if (b.state !== 'running' || b.inputLocked) return;
  dt = Math.min(0.05, Math.max(0, dt));
  if (b.transition) {
    b.cinematicTime += dt;
    b.transition.remaining = Math.max(0, b.transition.remaining - dt);
    if (b.transition.remaining <= 1e-8) {
      const finished = b.transition;
      b.transition = null;
      const entity = b.entities.find((e) => e.id === finished.entityId);
      if (finished.kind === 'shatter' && entity?.pendingRebirth && !entity.done)
        reigniteKing(b, entity);
      if (!b.transition && b.transitionQueue.length) {
        b.transition = b.transitionQueue.shift()!;
        b.transition.seq = ++b.transitionSeq;
        sound(
          b,
          b.transition.kind === 'shatter' ? 'time-shatter' : 'boss-arrival',
        );
      }
    }
    return;
  }
  prepareLevelChoice(b);
  if (b.levelChoices.length) return;
  const oldTime = b.time,
    oldX = b.x;
  b.time += dt;
  b.player.combatTime = (b.player.combatTime || 0) + dt;
  trackArmyPeak(b.player);
  if (
    isEndless(b.player) &&
    b.player.endless.allies.length &&
    b.time >= b.nextAllyAttack
  ) {
    const targets = b.entities.filter(
      (e) => e.kind === 'enemy' && targetVisible(e, b.time),
    );
    if (targets.length) {
      b.nextAllyAttack = b.time + 8;
      for (const [index, ally] of b.player.endless.allies.entries()) {
        const target = targets[index % targets.length];
        const profile = ENCOUNTERS.find((p) => p.id === ally);
        hitEntity(b, target, firepower(b.player, b.shield).dps * 2.8, true);
        b.effects.push({
          type: 'shot',
          x: index ? 0.3 : -0.3,
          y: 0.83,
          targetX: target.x,
          targetY: worldY(target, b.time),
          text: '',
          color: profile?.color || '#d8c08e',
          life: 0.7,
        });
        message(b, `${profile?.name || '失冠者'} · 盟誓援击`);
      }
    }
  }
  if (b.transition) return;
  const slowed = b.zones.some(
    (z) =>
      z.kind === 'web' &&
      z.startsAt <= b.time &&
      z.endsAt > b.time &&
      Math.abs(b.x - z.x) < z.width / 2,
  );
  const mobility = slowed ? 0.65 : 1;
  const dx =
    b.targetX === null
      ? b.inputAxis * BALANCE.moveSpeed * mobility * dt
      : Math.sign(b.targetX - b.x) *
        Math.min(
          Math.abs(b.targetX - b.x),
          BALANCE.pointerMaxSpeed * mobility * dt,
        );
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
      if (e.trialFraction) {
        gate.value = Math.max(1, Math.ceil(forecast.squad * e.trialFraction));
        if (armyMagnitude(forecast).exponent >= 15)
          gate.armyValue = multiplyMagnitude(
            armyMagnitude(forecast),
            e.trialFraction,
          );
      }
      applyGate(forecast, gate, 0);
      e.gatePrepared = true;
    }
    b.player.secretDiscovered = true;
    message(b, '禁术试炼 · 5道红门无法绕开', '#ffb3a4');
  }
  for (const e of b.entities) {
    if (e.gate && !e.gatePrepared && e.start <= b.time + VIEW.previewSeconds) {
      e.gate = scaleGateNumbers(e.gate, b.player, b.player.floor);
      e.gatePrepared = true;
      if (e.trialFinal) message(b, '禁术秘门 · 瞄准极窄平方通道', '#e6c2ff');
    }
  }
  b.wave = Math.min(
    b.totalWaves,
    1 + Math.floor(b.time / BALANCE.spacing[actIndex(b.player)]),
  );
  b.enrage =
    !b.entities.some((e) => e.encounterId === 'deity') &&
    b.time > b.finalStart + BALANCE.enrageAfter;
  if (b.ritual && b.time >= b.ritual.resolveAt) {
    const cast = b.ritual;
    b.ritual = null;
    const boss = b.entities.find((e) => e.id === cast.bossId);
    if (boss && !boss.done && Math.abs(b.x - cast.safeX) > cast.safeWidth / 2) {
      boss.lastAttack = b.time;
      damagePlayer(b, cast.damage, 0.08, cast.bossId);
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
      damagePlayer(b, p.damage, 0.06, p.ownerId);
    }
  }
  b.projectiles = b.projectiles.filter((p) => b.time < p.impactAt + 0.45);
  if (b.state !== 'running') return;
  for (const threat of b.threats) {
    if (threat.resolveAt > b.time) continue;
    if (Math.abs(b.x - threat.x) < threat.width / 2 + 0.035) {
      damagePlayer(b, threat.damage, 0.1, threat.ownerId);
      if (threat.push)
        b.x = Math.max(BALANCE.minX, Math.min(BALANCE.maxX, b.x + threat.push));
    } else
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
  b.zones = b.zones.filter(
    (z) => z.endsAt > b.time && !b.entities[z.ownerId]?.done,
  );
  for (const zone of b.zones) {
    if (zone.nextTick > b.time) continue;
    zone.nextTick += 0.8;
    if (Math.abs(b.x - zone.x) < zone.width / 2 + 0.035)
      damagePlayer(b, zone.damage, 0.025, zone.ownerId);
  }
  if (b.state !== 'running') return;
  b.shootTimer -= dt;
  if (b.shootTimer <= 0) {
    firePlayerVolley(b);
    b.shootTimer += 1 / combatStats(b).rate;
  }
  stepPlayerBullets(b, oldTime);
  if (b.transition) return;
  for (const e of b.entities) {
    if (e.guardianOf !== undefined && b.entities[e.guardianOf]?.done)
      e.done = true;
    if (e.done) continue;
    if (e.start <= b.time && e.hp > 0) {
      if ((e.healingUntil || 0) > b.time && (e.healingPool || 0) > 0) {
        const heal = Math.min(
          e.healingPool!,
          (e.healingRate || 0) * dt,
          e.maxHp - e.hp,
        );
        e.hp += heal;
        e.healingPool! -= heal;
      }
      if (e.mutation === 'angelic' && !e.angelRevived) {
        const heal = Math.min(
          e.maxHp * 0.003 * dt,
          e.maxHp * 0.15 - (e.angelHealingSpent || 0),
          e.maxHp - e.hp,
        );
        e.hp += heal;
        e.angelHealingSpent = (e.angelHealingSpent || 0) + heal;
        if (heal > 0) e.healingFlashUntil = b.time + 0.15;
      }
      if (
        e.mutation === 'angelic' &&
        e.angelRevived &&
        !e.angelBroken &&
        b.time >= (e.rageUntil || 0)
      ) {
        const fallenAngels = b.entities.filter(
          (angel) =>
            !angel.done &&
            angel.start <= b.time &&
            angel.mutation === 'angelic' &&
            angel.angelRevived &&
            !angel.angelBroken &&
            b.time >= (angel.rageUntil || 0),
        );
        for (const angel of fallenAngels) {
          angel.angelBroken = true;
          angel.invulnerableUntil = 0;
          angel.healingPool = 0;
          angel.guardUntil = 0;
          angel.lastAttack = b.time;
          beginTransition(b, 'shatter', angel);
        }
        message(b, '时停 · 圣翼崩解，凡躯再现', '#ffc4be');
        return;
      }
    }
    if (e.burnUntil > b.time && targetVisible(e, b.time))
      hitEntity(
        b,
        e,
        attackDamage(b) * 0.32 * (b.player.relics.ember || 0) * dt,
        false,
        false,
      );
    if (b.transition) return;
    if (e.done || e.start > b.time) continue;
    if (e.boss && b.player.node?.kind === 'boss' && actIndex(b.player) === 1)
      e.x = enemyXAt(b, e, b.time);
    if (e.done) continue;
    if (e.encounterId === 'king' && e.phase !== kingPhase(e)) {
      e.phase = kingPhase(e);
      message(
        b,
        e.phase === 2
          ? '王冠破碎 · 封存的王权正在解放'
          : '终焉燃尽 · 最后的王权',
        '#ffcf88',
      );
      const side = e.phase === 2 ? -1 : 1;
      groundZone(b, e, side * 0.65, 0.5, 'ember', 1.8, 3);
      groundZone(b, e, -side * 0.65, 0.5, 'ember', 2.6, 2.4);
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
      (!e.boss ||
        !isEndless(b.player) ||
        (b.time >= b.nextBossCast && b.threats.length < 6)) &&
      b.time - e.lastAttack >
        (e.boss ? bossAttackInterval(e, b.player.node?.kind === 'boss') : 3.6) *
          (e.mutation === 'frenzied' ? 0.76 : 1) *
          ((e.rageUntil || 0) > b.time ? 0.62 : 1)
    ) {
      e.lastAttack = b.time;
      if (e.boss) b.nextBossCast = b.time + 1.35;
      const identity = e.encounterId;
      if (e.mutation === 'fusion' && e.attackIndex % 2 === 1)
        e.encounterId = e.fusionId;
      b.attackSourceId = e.id;
      enemyAttack(b, e);
      b.attackSourceId = undefined;
      e.encounterId = identity;
      if (e.mutation === 'ashen' && e.attackIndex % 2 === 0)
        groundZone(b, e, b.x, 0.32, 'shadow', 2, 3.2);
      if (
        (e.mutation === 'golden' || e.mutation === 'hollow') &&
        e.attackIndex % 3 === 1
      ) {
        e.invulnerableUntil = b.time + 2.2;
        e.guardUntil = b.time + 5;
        e.mutationShield = e.mutationShieldMax = e.maxHp * 0.1;
        message(b, '金身显圣 · 两息不坏，随后击碎金甲');
      }
    }
    if (b.time < e.arrival || e.stationary) continue;
    if (e.kind === 'gate') {
      const selected = gateAt(e.gate!, b.x);
      if (selected) {
        const result = applyGate(b.player, selected, b.shield);
        if (e.trialFinal && selected.op === '²' && isEndless(b.player)) {
          b.player.endless.keysOpened++;
          delete b.player.relics.square_key;
        }
        b.shield = result.shield;
        message(
          b,
          `${e.trialStep ? `红门 ${e.trialStep}/5 · ` : ''}${gateLabel(effectiveGate(b.player, selected))} · 兵力 ${result.delta >= 0 ? '+' : '−'}${result.deltaLabel}`,
          result.delta >= 0 ? '#c2f5a9' : '#ffa89c',
        );
        sound(b, 'gate');
      } else message(b, '擦过门隙 · 没有获得增益', '#c4c5b0');
      e.done = true;
    } else if (e.kind === 'hazard') {
      if (Math.abs(b.x - e.x) < e.width / 2 + 0.035)
        damagePlayer(b, 18 + Math.min(100, b.player.floor) * 1.8, 0.13);
      e.done = true;
    } else if (e.kind === 'chest') {
      e.done = true;
      if (e.blessing) {
        message(b, e.blessing, '#fff0b2');
        b.messageUntil = b.time + 2.7;
        sound(b, 'chest');
      } else message(b, '宝箱远去 · 需要持续瞄准', '#b6bda6');
    } else if (!e.boss) {
      const collision = Math.abs(b.x - e.x) < e.width / 2 + 0.05;
      damagePlayer(
        b,
        (collision ? 14 : 8) + Math.min(100, b.player.floor) * 1.25,
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
  if (
    b.rushStage + 1 < b.rushStages &&
    b.entities
      .filter((e) => e.boss && (e.stage || 0) === b.rushStage)
      .every((e) => e.done)
  ) {
    b.rushStage++;
    const arrival = b.time + 3.5;
    const group = b.entities.filter((e) => e.boss && e.stage === b.rushStage);
    group.forEach((e, index) => {
      e.start = arrival;
      e.arrival = arrival + 3.1;
      e.lastAttack = arrival - 2 + index * 1.35;
    });
    for (const e of b.entities)
      if (e.guardianOf !== undefined) {
        e.done = true;
        e.hp = 0;
      }
    b.threats = [];
    b.zones = [];
    b.projectiles = [];
    b.bullets = [];
    b.ritual = null;
    b.finalStart = arrival;
    b.enrage = false;
    b.player.hp = Math.min(b.player.maxHp, b.player.hp + b.player.maxHp * 0.12);
    if (b.pressure) {
      b.pressure.bossId = group[0].id;
      b.pressure.nextAt = arrival + 24;
      b.pressure.pulses = 0;
    }
    message(
      b,
      `追猎未止 · 第 ${b.rushStage + 1} / ${b.rushStages} 幕 · ${group.map((e) => e.name).join('、')}`,
    );
    b.messageUntil = arrival + 2;
  }
  const pressure = b.pressure;
  if (pressure && b.entities[pressure.bossId].done) {
    const survivor = b.entities.find(
      (e) => e.boss && !e.done && e.start <= b.time,
    );
    if (survivor) pressure.bossId = survivor.id;
  }
  if (
    pressure &&
    b.time >= pressure.nextAt &&
    !b.entities[pressure.bossId].done
  ) {
    const damage = pressure.baseDamage + pressure.pulses * pressure.ramp;
    pressure.pulses++;
    pressure.nextAt += pressure.interval;
    pressure.flashUntil = b.time + 0.7;
    damagePlayer(b, damage, 0, pressure.bossId);
    if (b.state !== 'running') return;
    message(b, `${pressure.name} · 第 ${pressure.pulses} 次冲击`, '#ffc5ab');
  }
  if (b.epilogue && b.time >= b.duration && b.entities.every((e) => e.done)) {
    b.state = 'won';
    b.message = '绿色咸咸圈&GPT-6 Astra · 感谢你，远征者。游戏通关！';
    b.messageUntil = b.time + 20;
    logRun(b.player, '黎明归途 · 游戏通关');
    return;
  }
  if (!b.epilogue && b.entities.filter((e) => e.boss).every((e) => e.done)) {
    b.state = 'won';
    if (b.player.node?.kind === 'boss' && b.bossDamageTaken === 0)
      b.player.flawlessBosses++;
    if (
      b.player.node?.kind === 'boss' &&
      b.entities.filter((e) => e.boss).length >= 2
    )
      b.player.doubleBossWins++;
    grantGold(
      b.player,
      (b.player.node?.enchanted
        ? 90
        : b.player.node?.kind === 'elite'
          ? 55
          : b.player.node?.kind === 'boss'
            ? 80
            : 28) +
        (b.player.relics.bounty || 0) * 20,
    );
    logRun(b.player, '防线突破 · 选择强化');
    b.threats = [];
    b.zones = [];
    b.projectiles = [];
    b.bullets = [];
    b.ritual = null;
    b.pressure = null;
  }
  prepareLevelChoice(b);
}

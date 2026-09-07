import {
  HEROES,
  ACTS,
  stats,
  firepower,
  applyGate,
  gateLabel,
  logRun,
  safeTroops,
  type Run,
  type GateChoice,
} from './game.ts';

export const BALANCE = {
  moveSpeed: 1.45,
  minX: -0.9,
  maxX: 0.9,
  aimWidth: 0.24,
  travel: [3.9, 3.5, 3.1],
  spacing: [3.15, 2.95, 2.75],
  waves: [8, 10, 12],
  hpGrowth: 1.34,
  bossGrowth: 1.34,
  enemyBaseHp: 110,
  bossBaseHp: 850,
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
  boss?: boolean;
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
}
export interface Threat {
  id: number;
  x: number;
  width: number;
  resolveAt: number;
  damage: number;
  name: string;
}
export interface Effect {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  type: 'text' | 'shot' | 'burst';
  targetX?: number;
  targetY?: number;
}
export interface Battle {
  player: Run;
  time: number;
  x: number;
  inputAxis: number;
  targetX: number | null;
  entities: Entity[];
  effects: Effect[];
  threats: Threat[];
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
): GateSegment[] {
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
        { op: '×' as const, value: 1.36 + Math.floor(floor / 4) * 0.04 },
        pair[1],
      ]
    : pair;
  return choices.map((g, i) => ({
    ...g,
    left: splits[i] + 0.016,
    right: splits[i + 1] - 0.016,
  }));
}
export function createBattle(run: Run): Battle {
  const player = structuredClone(run),
    act = Math.floor(player.floor / 4),
    random = seededRandom(
      player.seed + player.floor * 719 + (player.node?.col || 0) * 103,
    );
  const travel = BALANCE.travel[act],
    spacing = BALANCE.spacing[act],
    waves = BALANCE.waves[act];
  const elite = player.node?.kind === 'elite',
    bossRoom = player.node?.kind === 'boss',
    treasure = player.node?.kind === 'treasure';
  const difficulty =
    Math.pow(BALANCE.hpGrowth, player.floor) *
    (elite ? 1.24 : 1) *
    (treasure ? 0.85 : 1);
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
      width: boss ? 0.45 : kind === 'hazard' ? 0.48 : 0.23,
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
      lastAttack: variant === 'archer' ? start - 2.7 : start + 1.5,
      volleyDamage: 8 + player.floor * 1.3,
      reward: 'gold',
      wave,
    };
    entities.push(entity);
    return entity;
  }
  for (let i = 0; i < waves; i++) {
    const t = i * spacing;
    if (i % 2 === 0) {
      const g = put('gate', t, 0, 0, 'gate', '命运之门', i + 1);
      g.gate = makeGate(random, i, player.floor);
    }
    const variant = i % 4 === 2 ? 'archer' : i % 4 === 3 ? 'guard' : 'soldier';
    const x = (random() * 0.72 + 0.1) * (random() > 0.5 ? 1 : -1);
    put(
      'enemy',
      t + 1.0,
      x,
      BALANCE.enemyBaseHp *
        difficulty *
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
      put('enemy', t + 1.9, -x, 65 * difficulty, 'soldier', '精英斥候', i + 1);
  }
  const finalStart = waves * spacing + 1;
  const final = put(
    'enemy',
    finalStart,
    0,
    (bossRoom ? BALANCE.bossBaseHp : elite ? 425 : 310) *
      Math.pow(BALANCE.bossGrowth, player.floor),
    'boss',
    bossRoom ? ACTS[act].boss : elite ? '黑甲统领' : '荒野刽子手',
    waves,
    true,
  );
  final.volleyDamage = bossRoom
    ? 17 + player.floor * 1.6
    : 12 + player.floor * 1.4;
  player.squad = safeTroops(player.squad + (player.relics.ambush || 0) * 8);
  return {
    player,
    time: 0,
    x: 0,
    inputAxis: 0,
    targetX: null,
    entities,
    effects: [],
    threats: [],
    shield: stats(player).shieldStart,
    cooldown: 0,
    buffUntil: 0,
    shootTimer: 0,
    shots: 0,
    random,
    state: 'running',
    flash: 0,
    skillFlash: 0,
    message: '按住 A / D 自由移动 · 瞄准目标自动攻击',
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
  return Math.min(
    e.boss ? 0.73 : 1.12,
    (time - e.start) / (e.arrival - e.start),
  );
}
export function worldY(e: Entity, time: number) {
  return -0.1 + progress(e, time) * 0.9;
}
export function movePlayer(b: Battle, x: number) {
  b.targetX = Math.max(BALANCE.minX, Math.min(BALANCE.maxX, x));
  b.inputAxis = 0;
}
export function setMoveAxis(b: Battle, axis: number) {
  b.inputAxis = Math.sign(axis);
  b.targetX = null;
}
export function gateAt(gates: GateSegment[], x: number) {
  return gates.find((g) => x >= g.left && x <= g.right);
}
function sound(b: Battle, name: string) {
  b.lastSound = name;
  b.soundSeq++;
}
function message(b: Battle, text: string, color = '#ebd292') {
  b.message = text;
  b.messageUntil = b.time + 1.9;
  b.effects.push({ type: 'text', x: b.x, y: 0.76, text, color, life: 1.3 });
}
function hitEntity(
  b: Battle,
  e: Entity,
  damage: number,
  critical = false,
  show = true,
) {
  if (e.done || e.hp <= 0) return;
  const actual = damage * (1 - e.armor);
  e.hp -= actual;
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
    b.player.gold += 4;
    b.player.hp = Math.min(
      b.player.maxHp,
      b.player.hp + (b.player.relics.vampire || 0) * 3,
    );
    sound(b, 'kill');
  }
}
export function damagePlayer(b: Battle, amount: number, troopLoss = 0.08) {
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
      ? `护盾格挡 ${reduced}`
      : `生命 −${reduced - absorbed} · 兵力 −${lost}`,
    '#ffb3a4',
  );
  if (b.player.relics.thorns)
    for (const e of b.entities)
      if (e.kind === 'enemy' && !e.done && e.start < b.time)
        hitEntity(b, e, 40 * b.player.relics.thorns);
  if (b.player.hp <= 0) {
    b.state = 'lost';
    b.player.phase = 'defeat';
    logRun(b.player, '防线崩溃 · 远征落幕');
  }
}
export function attackDamage(b: Battle) {
  return (
    firepower(b.player, b.shield).volley * (b.buffUntil > b.time ? 1.5 : 1)
  );
}
export function activateSkill(b: Battle) {
  if (b.state !== 'running' || b.cooldown > 0) return false;
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
function enemyAttack(b: Battle, e: Entity) {
  const act = Math.floor(b.player.floor / 4),
    isActBoss = b.player.node?.kind === 'boss';
  if (e.boss) {
    const multiplier = b.enrage ? 1.75 : 1;
    if (isActBoss && act === 1) {
      const safe = Math.floor(b.random() * 3);
      [-0.63, 0, 0.63].forEach((x, i) => {
        if (i !== safe)
          warn(b, x, 0.6, 1.0, e.volleyDamage * multiplier, '月蚀符印');
      });
    } else if (isActBoss && act === 2) {
      warn(b, b.x, 0.44, 0.85, e.volleyDamage * multiplier, '余烬追猎');
      warn(
        b,
        b.x > 0 ? -0.63 : 0.63,
        0.46,
        0.85,
        e.volleyDamage * 0.7 * multiplier,
        '王座焚风',
      );
    } else warn(b, b.x, 0.48, 1.1, e.volleyDamage * multiplier, '重斧落点');
  } else warn(b, b.x, 0.29, 1.05, e.volleyDamage, '弓手狙击');
}
export function stepBattle(b: Battle, dt: number) {
  if (b.state !== 'running') return;
  dt = Math.min(0.05, Math.max(0, dt));
  b.time += dt;
  const dx =
    b.targetX === null
      ? b.inputAxis * BALANCE.moveSpeed * dt
      : Math.sign(b.targetX - b.x) *
        Math.min(Math.abs(b.targetX - b.x), BALANCE.moveSpeed * dt);
  b.x = Math.max(BALANCE.minX, Math.min(BALANCE.maxX, b.x + dx));
  b.cooldown = Math.max(0, b.cooldown - dt);
  b.flash = Math.max(0, b.flash - dt);
  b.skillFlash = Math.max(0, b.skillFlash - dt);
  b.effects = b.effects.filter((e) => (e.life -= dt) > 0);
  b.wave = Math.min(
    b.totalWaves,
    1 + Math.floor(b.time / BALANCE.spacing[Math.floor(b.player.floor / 4)]),
  );
  b.enrage = b.time > b.finalStart + BALANCE.enrageAfter;
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
  for (const e of b.entities) {
    if (e.done || e.start > b.time) continue;
    if (e.burnUntil > b.time && e.hp > 0)
      hitEntity(b, e, 14 * (b.player.relics.ember || 0) * dt, false, false);
    if (e.done) continue;
    if (
      (e.boss || e.variant === 'archer') &&
      progress(e, b.time) > 0.2 &&
      b.time - e.lastAttack > (e.boss ? 2.65 : 3.6)
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
          `${gateLabel(selected)} · 兵力 ${result.delta >= 0 ? '+' : ''}${result.delta}`,
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
  b.shootTimer -= dt;
  if (b.shootTimer <= 0) {
    const targets = b.entities
      .filter(
        (e) =>
          !e.done &&
          e.hp > 0 &&
          b.time > e.start + 0.12 &&
          Math.abs(e.x - b.x) < BALANCE.aimWidth + e.width / 2,
      )
      .sort((a, c) => a.arrival - c.arrival);
    if (targets.length) {
      const target = targets[0],
        s = stats(b.player, b.shield),
        critical = b.random() < s.crit;
      const damage = attackDamage(b) * (critical ? s.critMult : 1);
      b.shots++;
      sound(b, 'shoot');
      hitEntity(b, target, damage, critical);
      b.effects.push({
        type: 'shot',
        x: b.x,
        y: 0.8,
        text: '',
        color: HEROES.find((h) => h.id === b.player.classId)!.color,
        life: 0.13,
        targetX: target.x,
        targetY: worldY(target, b.time),
      });
      if (!target.done && b.player.relics.ember) target.burnUntil = b.time + 3;
      if (!target.done && b.player.relics.echo && b.shots % 3 === 0)
        hitEntity(b, target, damage * 0.8 * b.player.relics.echo);
      if (critical && b.player.relics.ricochet) {
        const other = b.entities.find(
          (e) => e !== target && !e.done && e.hp > 0 && e.start < b.time,
        );
        if (other) hitEntity(b, other, damage * 0.6 * b.player.relics.ricochet);
      }
    }
    b.shootTimer = 1 / stats(b.player, b.shield).rate;
  }
  if (b.player.hp <= 0) {
    b.state = 'lost';
    b.player.phase = 'defeat';
    return;
  }
  if (b.entities.find((e) => e.boss)!.done) {
    b.state = 'won';
    b.player.gold +=
      (b.player.node?.kind === 'elite'
        ? 55
        : b.player.node?.kind === 'boss'
          ? 80
          : 28) +
      (b.player.relics.bounty || 0) * 20;
    logRun(b.player, '防线突破 · 选择强化');
    b.threats = [];
  }
}

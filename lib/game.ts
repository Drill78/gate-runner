export type ClassId = 'knight' | 'ranger' | 'mage';
export type Phase =
  | 'setup'
  | 'map'
  | 'battle'
  | 'reward'
  | 'rest'
  | 'shop'
  | 'event'
  | 'victory'
  | 'defeat';
export type NodeKind =
  | 'battle'
  | 'elite'
  | 'treasure'
  | 'rest'
  | 'shop'
  | 'event'
  | 'boss';
export type Lane = -1 | 1;
export interface Hero {
  id: ClassId;
  name: string;
  sub: string;
  color: string;
  tags: string;
  desc: string;
  hp: number;
  squad: number;
  weapon: string;
  skill: string;
  skillDesc: string;
  passive: string;
}
export const HEROES: Hero[] = [
  {
    id: 'knight',
    name: '誓约骑士',
    sub: 'THE OATHKEEPER',
    color: '#d5af68',
    tags: '坚韧 · 护盾 · 反击',
    desc: '以钢铁守护誓言，让每一面盾成为利刃。',
    hp: 120,
    squad: 12,
    weapon: '卫士长剑',
    skill: '不破誓约',
    skillDesc: '获得 24 护盾，6 秒内伤害提高 50%。',
    passive: '每场战斗获得 15 护盾；护甲减伤 12%。',
  },
  {
    id: 'ranger',
    name: '灰林游侠',
    sub: 'THE WAYFARER',
    color: '#8cb5a0',
    tags: '敏捷 · 暴击 · 连射',
    desc: '自迷雾中拉弓，让箭矢替你选择命运。',
    hp: 90,
    squad: 15,
    weapon: '灰木长弓',
    skill: '箭雨齐射',
    skillDesc: '对所有可见敌人和宝箱造成 5 倍单次伤害。',
    passive: '初始暴击率 20%；攻击速度更快。',
  },
  {
    id: 'mage',
    name: '秘火法师',
    sub: 'THE ARCANIST',
    color: '#aea1d9',
    tags: '奥术 · 弹幕 · 召唤',
    desc: '穿过禁忌之门，将余烬化作无尽秘火。',
    hp: 80,
    squad: 10,
    weapon: '秘火法杖',
    skill: '秘火新星',
    skillDesc: '对所有可见目标造成 6 倍单次伤害，召唤 3 名队员。',
    passive: '每经过一道门，额外召唤 2 名队员。',
  },
];
export const ACTS = [
  {
    name: '荆棘边境',
    sub: '废墟之中，古老的誓言尚未熄灭。',
    boss: '荆棘守望者',
    roman: 'Ⅰ',
    color: '#8fb29a',
  },
  {
    name: '月蚀回廊',
    sub: '月光消逝的地方，回响仍在低语。',
    boss: '蚀月巫妖',
    roman: 'Ⅱ',
    color: '#aba1ca',
  },
  {
    name: '余烬王座',
    sub: '最后一道门后，灰烬正等待新王。',
    boss: '灰烬之王',
    roman: 'Ⅲ',
    color: '#d49c75',
  },
];
export const NODE_INFO: Record<NodeKind, { name: string; desc: string }> = {
  battle: {
    name: '荒野遭遇',
    desc: '穿越数值门，击退敌军。战后获得一项强化。',
  },
  elite: { name: '精英哨站', desc: '更强的敌人，更多金币；战后必含稀有强化。' },
  treasure: {
    name: '遗落宝库',
    desc: '三只可击破的宝箱。瞄准它们，升级你的武器。',
  },
  rest: { name: '旅人营火', desc: '恢复生命，或磨砺武器。' },
  shop: { name: '渡鸦商人', desc: '用金币购买补给、队员或遗物。' },
  event: { name: '命运邂逅', desc: '一座无人供奉的祭坛，等待你做出选择。' },
  boss: { name: '守关首领', desc: '击败这一幕的守护者，前往更高处。' },
};
export interface Relic {
  id: string;
  name: string;
  family: ClassId | 'all';
  tag: string;
  rarity: '普通' | '稀有' | '史诗';
  desc: string;
  max: number;
  icon: string;
}
export const RELICS: Relic[] = [
  {
    id: 'recruit',
    name: '集结号角',
    family: 'all',
    tag: '军团',
    rarity: '普通',
    desc: '加法门额外招募 5 名队员。',
    max: 3,
    icon: 'flag',
  },
  {
    id: 'mirror',
    name: '双生印记',
    family: 'all',
    tag: '军团',
    rarity: '稀有',
    desc: '正向乘法门的倍率 +0.25。',
    max: 3,
    icon: 'copy',
  },
  {
    id: 'steel',
    name: '淬火钢刃',
    family: 'all',
    tag: '锋刃',
    rarity: '普通',
    desc: '基础伤害 +20%。',
    max: 3,
    icon: 'sword',
  },
  {
    id: 'vitality',
    name: '橡木之心',
    family: 'all',
    tag: '生存',
    rarity: '普通',
    desc: '最大生命 +20，立即恢复 20 生命。',
    max: 3,
    icon: 'heart',
  },
  {
    id: 'vampire',
    name: '血饮护符',
    family: 'all',
    tag: '生存',
    rarity: '稀有',
    desc: '击败敌人时恢复 6 生命。',
    max: 3,
    icon: 'heart',
  },
  {
    id: 'bounty',
    name: '渡鸦钱币',
    family: 'all',
    tag: '财富',
    rarity: '普通',
    desc: '战后金币 +20，立即获得 30 金币。',
    max: 3,
    icon: 'coin',
  },
  {
    id: 'army',
    name: '王者战旗',
    family: 'all',
    tag: '军团',
    rarity: '史诗',
    desc: '立即获得 20 队员；每次过门再招募 3 人。',
    max: 1,
    icon: 'flag',
  },
  {
    id: 'bulwark',
    name: '圣誓壁垒',
    family: 'knight',
    tag: '圣盾',
    rarity: '普通',
    desc: '每场战斗的初始护盾 +15。',
    max: 3,
    icon: 'shield',
  },
  {
    id: 'bash',
    name: '盾锋相映',
    family: 'knight',
    tag: '圣盾',
    rarity: '稀有',
    desc: '每点当前护盾提供 1% 额外伤害。',
    max: 3,
    icon: 'sword',
  },
  {
    id: 'aegis',
    name: '誓言回响',
    family: 'knight',
    tag: '圣盾',
    rarity: '普通',
    desc: '每次通过正向门时获得 8 护盾。',
    max: 3,
    icon: 'shield',
  },
  {
    id: 'thorns',
    name: '荆棘冠冕',
    family: 'knight',
    tag: '圣盾',
    rarity: '稀有',
    desc: '受到攻击时，对全部可见敌人反击 40 伤害。',
    max: 3,
    icon: 'spark',
  },
  {
    id: 'plate',
    name: '不朽板甲',
    family: 'knight',
    tag: '圣盾',
    rarity: '普通',
    desc: '护甲减伤 +8 个百分点，上限 60%。',
    max: 3,
    icon: 'shield',
  },
  {
    id: 'paladin',
    name: '不灭圣约',
    family: 'knight',
    tag: '圣盾',
    rarity: '史诗',
    desc: '主动技能冷却缩短 4 秒，技能护盾额外 +30。',
    max: 1,
    icon: 'crown',
  },
  {
    id: 'keen',
    name: '鹰隼之眼',
    family: 'ranger',
    tag: '猎杀',
    rarity: '普通',
    desc: '暴击率 +12 个百分点，上限 85%。',
    max: 3,
    icon: 'eye',
  },
  {
    id: 'quiver',
    name: '疾风箭袋',
    family: 'ranger',
    tag: '猎杀',
    rarity: '普通',
    desc: '攻击速度 +20%。',
    max: 3,
    icon: 'bow',
  },
  {
    id: 'deadeye',
    name: '致命瞄准',
    family: 'ranger',
    tag: '猎杀',
    rarity: '稀有',
    desc: '暴击伤害倍率 +0.6。',
    max: 3,
    icon: 'target',
  },
  {
    id: 'ricochet',
    name: '追猎回响',
    family: 'ranger',
    tag: '猎杀',
    rarity: '稀有',
    desc: '暴击时，对另一个可见目标造成 60% 伤害。',
    max: 3,
    icon: 'spark',
  },
  {
    id: 'ambush',
    name: '林间伏击',
    family: 'ranger',
    tag: '猎杀',
    rarity: '普通',
    desc: '每场战斗额外获得 8 名队员。',
    max: 3,
    icon: 'flag',
  },
  {
    id: 'hunter',
    name: '月神之弦',
    family: 'ranger',
    tag: '猎杀',
    rarity: '史诗',
    desc: '主动技能冷却缩短 4 秒；暴击率 +15 个百分点。',
    max: 1,
    icon: 'bow',
  },
  {
    id: 'ember',
    name: '秘火余烬',
    family: 'mage',
    tag: '奥术',
    rarity: '普通',
    desc: '攻击使目标灼烧，每秒造成 10 伤害，持续 3 秒。',
    max: 3,
    icon: 'flame',
  },
  {
    id: 'echo',
    name: '法术回响',
    family: 'mage',
    tag: '奥术',
    rarity: '稀有',
    desc: '每三次攻击触发一次 80% 伤害的额外命中。',
    max: 3,
    icon: 'spark',
  },
  {
    id: 'summon',
    name: '星界契约',
    family: 'mage',
    tag: '奥术',
    rarity: '普通',
    desc: '每次过门时额外召唤 3 名队员。',
    max: 3,
    icon: 'users',
  },
  {
    id: 'surge',
    name: '魔力奔涌',
    family: 'mage',
    tag: '奥术',
    rarity: '普通',
    desc: '基础伤害 +25%。',
    max: 3,
    icon: 'wand',
  },
  {
    id: 'ward',
    name: '符文护体',
    family: 'mage',
    tag: '奥术',
    rarity: '普通',
    desc: '每场战斗获得 18 护盾。',
    max: 3,
    icon: 'shield',
  },
  {
    id: 'archmage',
    name: '群星之核',
    family: 'mage',
    tag: '奥术',
    rarity: '史诗',
    desc: '主动技能冷却缩短 4 秒；主动技能额外召唤 8 人。',
    max: 1,
    icon: 'star',
  },
];
export const RELIC_BY_ID = Object.fromEntries(
  RELICS.map((r) => [r.id, r]),
) as Record<string, Relic>;
export interface RouteNode {
  id: string;
  floor: number;
  col: number;
  kind: NodeKind;
}
export interface Run {
  version: 1;
  phase: Phase;
  classId: ClassId;
  seed: number;
  floor: number;
  hp: number;
  maxHp: number;
  squad: number;
  gold: number;
  weaponTier: number;
  relics: Record<string, number>;
  nodes: RouteNode[][];
  path: string[];
  node: RouteNode | null;
  reward: string[];
  purchases: string[];
  kills: number;
  chests: number;
  gates: number;
  log: string[];
}
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function createMap(seed: number): RouteNode[][] {
  const random = rng(seed);
  return Array.from({ length: 12 }, (_, floor) => {
    if (floor % 4 === 3)
      return [{ id: `${floor}-1`, floor, col: 1, kind: 'boss' }];
    const patterns: NodeKind[][] =
      floor % 4 === 0
        ? [
            ['battle', 'elite', 'battle'],
            ['battle', 'event', 'elite'],
          ]
        : floor % 4 === 1
          ? [
              ['battle', 'treasure', 'elite'],
              ['treasure', 'battle', 'battle'],
            ]
          : [
              ['rest', 'shop', 'event'],
              ['event', 'rest', 'shop'],
            ];
    const kinds = patterns[Math.floor(random() * patterns.length)];
    return kinds.map((kind, col) => ({
      id: `${floor}-${col}`,
      floor,
      col,
      kind,
    }));
  });
}
export function createRun(classId: ClassId, seed = 12345): Run {
  const h = HEROES.find((h) => h.id === classId)!;
  return {
    version: 1,
    phase: 'setup',
    classId,
    seed,
    floor: 0,
    hp: h.hp,
    maxHp: h.hp,
    squad: h.squad,
    gold: 40,
    weaponTier: 1,
    relics: {},
    nodes: createMap(seed),
    path: [],
    node: null,
    reward: [],
    purchases: [],
    kills: 0,
    chests: 0,
    gates: 0,
    log: ['新的远征，即将启程。'],
  };
}
export function logRun(run: Run, message: string) {
  run.log = [message, ...run.log].slice(0, 8);
}
export function availableNodes(run: Run): RouteNode[] {
  if (run.floor >= 12) return [];
  const lastId = run.path.at(-1);
  const last = run.nodes.flat().find((n) => n.id === lastId);
  return run.nodes[run.floor].filter(
    (n) =>
      !last ||
      last.kind === 'boss' ||
      n.kind === 'boss' ||
      Math.abs(n.col - last.col) <= 1,
  );
}
export function enterNode(run: Run, nodeId: string): Run {
  const node = availableNodes(run).find((n) => n.id === nodeId);
  if (run.phase !== 'map' || !node) return run;
  const next = structuredClone(run);
  next.node = node;
  next.purchases = [];
  next.phase = ['rest', 'shop', 'event'].includes(node.kind)
    ? (node.kind as Phase)
    : 'battle';
  logRun(
    next,
    `第 ${node.floor + 1} 层 · ${node.kind === 'boss' ? ACTS[Math.floor(node.floor / 4)].boss : NODE_INFO[node.kind].name}`,
  );
  return next;
}
export function familyCount(run: Run) {
  return Object.entries(run.relics).reduce(
    (sum, [id, n]) => sum + (RELIC_BY_ID[id]?.family === run.classId ? n : 0),
    0,
  );
}
export function stats(run: Run, shield = 0) {
  const r = (id: string) => run.relics[id] || 0;
  const synergy = familyCount(run) >= 3;
  const warrior = run.classId === 'knight';
  const ranger = run.classId === 'ranger';
  return {
    damage:
      (warrior ? 6.8 : ranger ? 5.2 : 8.3) *
      (1 + (run.weaponTier - 1) * 0.22) *
      (1 + r('steel') * 0.2 + r('surge') * 0.25) *
      (1 + shield * r('bash') * 0.01) *
      (synergy && warrior ? 1.15 : 1),
    rate:
      (ranger ? 3 : 2.1) *
      (1 + r('quiver') * 0.2 + (synergy && run.classId === 'mage' ? 0.2 : 0)),
    crit: Math.min(
      0.85,
      (ranger ? 0.2 : 0.05) +
        r('keen') * 0.12 +
        r('hunter') * 0.15 +
        (synergy && ranger ? 0.1 : 0),
    ),
    critMult: 2 + r('deadeye') * 0.6,
    armor: Math.min(0.6, (warrior ? 0.12 : 0) + r('plate') * 0.08),
    shieldStart: (warrior ? 15 : 0) + r('bulwark') * 15 + r('ward') * 18,
    gateAdd: r('recruit') * 5,
    gateMult: r('mirror') * 0.25,
    summon: (run.classId === 'mage' ? 2 : 0) + r('summon') * 3 + r('army') * 3,
    cooldown: 12 - (r('paladin') + r('hunter') + r('archmage')) * 4,
    synergy,
  };
}
export function rollRewards(run: Run, elite = false): string[] {
  const random = rng(
    run.seed + run.floor * 233 + run.path.length * 19 + run.gold,
  );
  const pool = RELICS.filter(
    (r) =>
      (r.family === 'all' || r.family === run.classId) &&
      (run.relics[r.id] || 0) < r.max,
  );
  const out: string[] = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const weighted = pool.filter((r) =>
      i === 0
        ? r.family === run.classId
        : i === 1 && elite
          ? r.rarity !== '普通'
          : true,
    );
    const candidates = weighted.length ? weighted : pool;
    const chosen = candidates[Math.floor(random() * candidates.length)];
    out.push(chosen.id);
    pool.splice(pool.indexOf(chosen), 1);
  }
  return out;
}
export function addRelic(run: Run, id: string): Run {
  const relic = RELIC_BY_ID[id];
  if (!relic || (run.relics[id] || 0) >= relic.max) return run;
  const n = structuredClone(run);
  n.relics[id] = (n.relics[id] || 0) + 1;
  if (id === 'vitality') {
    n.maxHp += 20;
    n.hp = Math.min(n.maxHp, n.hp + 20);
  }
  if (id === 'army') n.squad = Math.min(999, n.squad + 20);
  if (id === 'bounty') n.gold += 30;
  logRun(n, `获得强化 · ${relic.name}`);
  return n;
}
export function completeRoom(run: Run, reward = true): Run {
  const n = structuredClone(run);
  if (!n.node || n.node.floor !== n.floor) return run;
  n.path.push(n.node.id);
  n.floor++;
  if (n.floor === 12) {
    n.phase = 'victory';
    logRun(n, '灰烬王座已被征服。');
    return n;
  }
  n.phase = reward ? 'reward' : 'map';
  n.reward = reward
    ? rollRewards(n, n.node.kind === 'elite' || n.node.kind === 'boss')
    : [];
  return n;
}
export function chooseReward(run: Run, id: string): Run {
  if (run.phase !== 'reward' || !run.reward.includes(id)) return run;
  const n = addRelic(run, id);
  return { ...n, phase: 'map', reward: [] };
}
export function restAction(run: Run, action: 'heal' | 'forge'): Run {
  if (run.phase !== 'rest') return run;
  const n = structuredClone(run);
  if (action === 'heal') {
    const amount = Math.min(n.maxHp - n.hp, Math.ceil(n.maxHp * 0.4));
    n.hp += amount;
    logRun(n, `营火休整 · 恢复 ${amount} 生命`);
  } else {
    n.weaponTier = Math.min(10, n.weaponTier + 1);
    logRun(n, '磨砺武器 · 武器等级 +1');
  }
  return completeRoom(n, false);
}
export const SHOP_ITEMS = [
  {
    id: 'potion',
    name: '绯红药剂',
    desc: '恢复 40 生命',
    cost: 35,
    icon: 'heart',
  },
  {
    id: 'soldiers',
    name: '佣兵契约',
    desc: '招募 18 名队员',
    cost: 45,
    icon: 'users',
  },
  {
    id: 'weapon',
    name: '精工锻造',
    desc: '武器等级 +1',
    cost: 70,
    icon: 'sword',
  },
  {
    id: 'relic',
    name: '神秘遗物',
    desc: '获得一项随机职业强化',
    cost: 85,
    icon: 'spark',
  },
];
export function shopBuy(run: Run, id: string): Run {
  const item = SHOP_ITEMS.find((i) => i.id === id);
  if (
    run.phase !== 'shop' ||
    !item ||
    run.purchases.includes(id) ||
    run.gold < item.cost ||
    (id === 'weapon' && run.weaponTier >= 10) ||
    (id === 'potion' && run.hp === run.maxHp)
  )
    return run;
  let n = structuredClone(run);
  n.gold -= item.cost;
  n.purchases.push(id);
  if (id === 'potion') n.hp = Math.min(n.maxHp, n.hp + 40);
  if (id === 'soldiers') n.squad = Math.min(999, n.squad + 18);
  if (id === 'weapon') n.weaponTier++;
  if (id === 'relic') {
    const candidate = rollRewards(n, true)[0];
    if (candidate) n = addRelic(n, candidate);
  }
  logRun(n, `购买 · ${item.name}`);
  return n;
}
export function eventAction(run: Run, action: 'blood' | 'gold' | 'leave'): Run {
  if (
    run.phase !== 'event' ||
    (action === 'blood' && run.hp <= 18) ||
    (action === 'gold' && run.gold < 35)
  )
    return run;
  let n = structuredClone(run);
  if (action === 'blood') {
    n.hp -= 18;
    const choice = rollRewards(n, true)[0];
    if (choice) n = addRelic(n, choice);
    logRun(n, '血誓祭坛 · 付出 18 生命，获得遗物');
  }
  if (action === 'gold') {
    n.gold -= 35;
    n.squad = Math.min(999, n.squad + 22);
    logRun(n, '唤醒沉眠者 · 获得 22 名队员');
  }
  if (action === 'leave') {
    n.gold += 12;
    logRun(n, '拾取祭坛边的 12 金币，安然离去');
  }
  return completeRoom(n, false);
}
export function weaponName(run: Run) {
  const base = HEROES.find((h) => h.id === run.classId)!.weapon;
  return run.weaponTier < 3
    ? base
    : run.weaponTier < 6
      ? { knight: '破晓圣刃', ranger: '猎风战弓', mage: '星火权杖' }[
          run.classId
        ]
      : { knight: '不灭誓约', ranger: '月神之弦', mage: '群星终焉' }[
          run.classId
        ];
}
export interface GateChoice {
  op: '+' | '×' | '-' | '÷';
  value: number;
}
export function gateLabel(g: GateChoice) {
  return `${g.op}${g.value}`;
}
export function applyGate(
  run: Run,
  gate: GateChoice,
  shield: number,
): { shield: number; delta: number } {
  const old = run.squad;
  const s = stats(run, shield);
  if (gate.op === '+') run.squad += gate.value + s.gateAdd;
  if (gate.op === '×')
    run.squad = Math.floor(run.squad * (gate.value + s.gateMult));
  if (gate.op === '-') run.squad -= gate.value;
  if (gate.op === '÷') run.squad = Math.floor(run.squad / gate.value);
  run.squad = Math.max(1, Math.min(999, run.squad + s.summon));
  if (gate.op === '+' || gate.op === '×') shield += 8 * (run.relics.aegis || 0);
  run.gates++;
  logRun(run, `${gateLabel(gate)} 之门 · 队伍 ${old} → ${run.squad}`);
  return { shield: Math.min(250, shield), delta: run.squad - old };
}
export interface Entity {
  id: number;
  kind: 'gate' | 'chest' | 'enemy' | 'hazard';
  lane: Lane | 0;
  start: number;
  arrival: number;
  hp: number;
  maxHp: number;
  done: boolean;
  gate?: [GateChoice, GateChoice];
  boss?: boolean;
  name?: string;
  burnUntil: number;
  lastAttack: number;
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
  lane: Lane;
  visualLane: number;
  entities: Entity[];
  effects: Effect[];
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
}
export function createBattle(run: Run): Battle {
  const p = structuredClone(run);
  const random = rng(p.seed + p.floor * 719 + (p.node?.col || 0) * 13);
  const elite = p.node?.kind === 'elite',
    boss = p.node?.kind === 'boss';
  const scale = (1 + p.floor * 0.35) * (elite ? 1.4 : 1);
  const entities: Entity[] = [];
  function put(
    kind: Entity['kind'],
    start: number,
    lane: Lane | 0,
    hp = 0,
    name?: string,
    bossFlag = false,
  ) {
    entities.push({
      id: entities.length,
      kind,
      start,
      arrival: start + 6,
      lane,
      hp,
      maxHp: hp,
      done: false,
      name,
      boss: bossFlag,
      burnUntil: 0,
      lastAttack: 0,
    });
    return entities.at(-1)!;
  }
  const choices: [GateChoice, GateChoice][] = [
    [
      { op: '+', value: 10 },
      { op: '×', value: 2 },
    ],
    [
      { op: '+', value: 14 },
      { op: '×', value: 1.5 },
    ],
    [
      { op: '-', value: 8 },
      { op: '÷', value: 2 },
    ],
    [
      { op: '+', value: 8 },
      { op: '×', value: 2 },
    ],
    [
      { op: '×', value: 1.5 },
      { op: '+', value: 20 },
    ],
  ];
  [0, 10, 20].forEach((t, i) => {
    const e = put('gate', t, 0);
    const pair =
      i === 0 && p.floor === 0
        ? choices[0]
        : choices[Math.floor(random() * choices.length)];
    e.gate = (random() > 0.5 && p.floor > 0 ? [pair[1], pair[0]] : pair).map(
      (g) => ({ ...g }),
    ) as [GateChoice, GateChoice];
  });
  put('chest', 4, random() > 0.5 ? 1 : -1, 55 * scale, '遗落宝箱');
  put('enemy', 7, random() > 0.5 ? 1 : -1, 85 * scale, '骸骨卫兵');
  put('hazard', 13, random() > 0.5 ? 1 : -1, 0, '荆棘陷阱');
  put('chest', 16, random() > 0.5 ? 1 : -1, 80 * scale, '符文宝箱');
  if (p.node?.kind === 'treasure')
    put('chest', 11, random() > 0.5 ? 1 : -1, 65 * scale, '镀金宝箱');
  else
    put(
      'enemy',
      17,
      random() > 0.5 ? 1 : -1,
      110 * scale,
      elite ? '黑甲禁卫' : '荒野劫掠者',
    );
  put(
    'enemy',
    25,
    0,
    (boss ? 410 : elite ? 235 : 175) * scale,
    boss ? ACTS[Math.floor(p.floor / 4)].boss : elite ? '黑甲统领' : '拦路兽人',
    true,
  );
  p.squad = Math.min(999, p.squad + (p.relics.ambush || 0) * 8);
  return {
    player: p,
    time: 0,
    lane: -1,
    visualLane: -1,
    entities,
    effects: [],
    shield: stats(p).shieldStart,
    cooldown: 0,
    buffUntil: 0,
    shootTimer: 0,
    shots: 0,
    random,
    state: 'running',
    flash: 0,
    skillFlash: 0,
    message: '选择数值门 · 对准目标自动攻击',
    messageUntil: 5,
    lastSound: '',
    soundSeq: 0,
  };
}
export function progress(e: Entity, time: number) {
  return Math.min(e.boss ? 0.84 : 1.2, (time - e.start) / 6);
}
function sound(b: Battle, name: string) {
  b.lastSound = name;
  b.soundSeq++;
}
function message(b: Battle, text: string, color = '#dfc280') {
  b.message = text;
  b.messageUntil = b.time + 2.4;
  b.effects.push({
    type: 'text',
    x: b.lane * 0.24,
    y: 0.79,
    text,
    color,
    life: 1.5,
  });
}
function hitEntity(
  b: Battle,
  e: Entity,
  damage: number,
  critical = false,
  showDamage = true,
) {
  if (e.done || e.hp <= 0) return;
  e.hp -= damage;
  if (showDamage)
    b.effects.push({
      type: 'text',
      x: e.lane * 0.25,
      y: 0.28 + Math.max(0, progress(e, b.time)) * 0.5,
      text: `${critical ? '✦ ' : ''}${Math.ceil(damage)}`,
      color: critical ? '#ffe09b' : '#e4e8d1',
      life: 0.7,
    });
  if (e.hp <= 0) {
    e.done = true;
    b.effects.push({
      type: 'burst',
      x: e.lane * 0.25,
      y: 0.28 + progress(e, b.time) * 0.5,
      text: '',
      color: e.kind === 'chest' ? '#eac073' : '#cba199',
      life: 0.65,
    });
    if (e.kind === 'chest') {
      b.player.chests++;
      b.player.weaponTier = Math.min(10, b.player.weaponTier + 1);
      b.player.gold += 12;
      message(b, `宝箱击破 · 武器 Lv.${b.player.weaponTier} · +12 金币`);
      logRun(b.player, '击破宝箱 · 武器升级');
      sound(b, 'chest');
    } else {
      b.player.kills++;
      b.player.gold += 8;
      b.player.hp = Math.min(
        b.player.maxHp,
        b.player.hp + (b.player.relics.vampire || 0) * 6,
      );
      sound(b, 'kill');
      if (e.boss) message(b, `${e.name} 已击败`);
    }
  }
}
export function damagePlayer(b: Battle, amount: number) {
  const reduced = Math.ceil(amount * (1 - stats(b.player, b.shield).armor));
  const absorbed = Math.min(reduced, b.shield);
  b.shield -= absorbed;
  b.player.hp = Math.max(0, b.player.hp - (reduced - absorbed));
  b.flash = 0.35;
  sound(b, 'hurt');
  message(
    b,
    absorbed === reduced
      ? `护盾抵挡 ${reduced}`
      : `受到 ${reduced - absorbed} 伤害`,
    '#efaca0',
  );
  if (b.player.relics.thorns)
    for (const e of b.entities)
      if (e.kind === 'enemy' && e.start <= b.time && !e.done)
        hitEntity(b, e, 40 * b.player.relics.thorns);
  if (b.player.hp <= 0) {
    b.state = 'lost';
    b.player.phase = 'defeat';
    logRun(b.player, '远征落幕，但余烬仍在。');
  }
}
export function attackDamage(b: Battle) {
  return (
    stats(b.player, b.shield).damage *
    Math.sqrt(Math.max(1, b.player.squad)) *
    (b.buffUntil > b.time ? 1.5 : 1)
  );
}
export function setBattleLane(b: Battle, lane: Lane) {
  b.lane = lane;
}

export function activateSkill(b: Battle) {
  if (b.state !== 'running' || b.cooldown > 0) return false;
  b.cooldown = stats(b.player).cooldown;
  b.skillFlash = 0.8;
  sound(b, 'skill');
  if (b.player.classId === 'knight') {
    b.shield = Math.min(
      250,
      b.shield + 24 + (b.player.relics.paladin || 0) * 30,
    );
    b.buffUntil = b.time + 6;
    message(b, '不破誓约 · 圣盾降临');
  } else {
    for (const e of b.entities)
      if (
        e.start <= b.time &&
        !e.done &&
        (e.kind === 'enemy' || e.kind === 'chest')
      )
        hitEntity(
          b,
          e,
          attackDamage(b) * (b.player.classId === 'mage' ? 6 : 5),
        );
    if (b.player.classId === 'mage')
      b.player.squad = Math.min(
        999,
        b.player.squad + 3 + (b.player.relics.archmage || 0) * 8,
      );
    message(
      b,
      b.player.classId === 'mage'
        ? '秘火新星 · 星火燎原'
        : '箭雨齐射 · 万箭穿心',
    );
  }
  return true;
}
export function stepBattle(b: Battle, dt: number) {
  if (b.state !== 'running') return;
  dt = Math.min(0.05, Math.max(0, dt));
  b.time += dt;
  b.cooldown = Math.max(0, b.cooldown - dt);
  b.flash = Math.max(0, b.flash - dt);
  b.skillFlash = Math.max(0, b.skillFlash - dt);
  b.visualLane += (b.lane - b.visualLane) * Math.min(1, dt * 12);
  b.effects = b.effects.filter((e) => (e.life -= dt) > 0);
  for (const e of b.entities) {
    if (e.done || b.time < e.start) continue;
    if (e.burnUntil > b.time && e.hp > 0)
      hitEntity(b, e, 10 * (b.player.relics.ember || 0) * dt, false, false);
    if (e.done) continue;
    if (b.time >= e.arrival) {
      if (e.kind === 'gate') {
        const result = applyGate(
          b.player,
          e.gate![b.lane === -1 ? 0 : 1],
          b.shield,
        );
        b.shield = result.shield;
        message(
          b,
          `队伍 ${result.delta >= 0 ? '+' : ''}${result.delta}`,
          result.delta >= 0 ? '#b8edb9' : '#f5ada2',
        );
        sound(b, 'gate');
        e.done = true;
      } else if (e.kind === 'hazard') {
        if (e.lane === b.lane) {
          damagePlayer(b, 15 + b.player.floor * 2);
          b.player.squad = Math.max(1, b.player.squad - 5);
        }
        e.done = true;
      } else if (e.kind === 'chest') {
        e.done = true;
        message(b, '错过宝箱 · 提前换道瞄准', '#bdbca5');
      } else if (e.boss) {
        if (b.time - e.lastAttack >= 3.2) {
          e.lastAttack = b.time;
          damagePlayer(b, 15 + b.player.floor * 2.8);
        }
      } else {
        damagePlayer(b, (e.lane === b.lane ? 18 : 9) + b.player.floor * 1.5);
        b.player.squad = Math.max(
          1,
          b.player.squad - (e.lane === b.lane ? 5 : 2),
        );
        e.done = true;
      }
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
          b.time > e.start + 0.45 &&
          (e.lane === b.lane || e.lane === 0),
      )
      .sort((a, c) => a.arrival - c.arrival);
    if (targets.length) {
      const target = targets[0];
      const s = stats(b.player, b.shield);
      const critical = b.random() < s.crit;
      const damage = attackDamage(b) * (critical ? s.critMult : 1);
      b.shots++;
      sound(b, 'shoot');
      hitEntity(b, target, damage, critical);
      b.effects.push({
        type: 'shot',
        x: b.visualLane * 0.25,
        y: 0.86,
        text: '',
        color: HEROES.find((h) => h.id === b.player.classId)!.color,
        life: 0.18,
        targetX: target.lane * 0.25,
        targetY: 0.28 + progress(target, b.time) * 0.5,
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
  const final = b.entities.find((e) => e.boss)!;
  if (final.done && b.time > 26) {
    b.state = 'won';
    b.player.gold +=
      (b.player.node?.kind === 'elite'
        ? 55
        : b.player.node?.kind === 'boss'
          ? 85
          : 30) +
      (b.player.relics.bounty || 0) * 20;
    logRun(b.player, '战斗胜利 · 选择你的下一项强化');
  }
}
export function restoreRun(text: string): Run | null {
  try {
    const r = JSON.parse(text) as Run;
    if (
      r.version !== 1 ||
      !HEROES.some((h) => h.id === r.classId) ||
      !['map', 'reward', 'rest', 'shop', 'event'].includes(r.phase) ||
      !Number.isInteger(r.seed) ||
      !Number.isInteger(r.floor) ||
      r.floor < 0 ||
      r.floor >= 12 ||
      !Array.isArray(r.path) ||
      r.path.length !== r.floor ||
      !Array.isArray(r.log) ||
      !Array.isArray(r.purchases) ||
      !Array.isArray(r.reward) ||
      !r.relics ||
      typeof r.relics !== 'object'
    )
      return null;
    for (const key of [
      'hp',
      'maxHp',
      'squad',
      'gold',
      'weaponTier',
      'kills',
      'chests',
      'gates',
    ] as const)
      if (!Number.isFinite(r[key]) || r[key] < 0) return null;
    if (
      r.hp <= 0 ||
      r.hp > r.maxHp ||
      r.maxHp > 500 ||
      r.squad < 1 ||
      r.squad > 999 ||
      r.weaponTier < 1 ||
      r.weaponTier > 10
    )
      return null;
    if (
      Object.entries(r.relics).some(
        ([id, count]) =>
          !RELIC_BY_ID[id] ||
          !Number.isInteger(count) ||
          count < 1 ||
          count > RELIC_BY_ID[id].max,
      )
    )
      return null;
    r.nodes = createMap(r.seed);
    if (r.path.some((id, i) => !r.nodes[i].some((n) => n.id === id)))
      return null;
    if (r.node) {
      const known = r.nodes.flat().find((n) => n.id === r.node!.id);
      if (!known) return null;
      r.node = known;
    }
    if (
      ['rest', 'shop', 'event'].includes(r.phase) &&
      (!r.node || r.node.floor !== r.floor || r.node.kind !== r.phase)
    )
      return null;
    if (r.reward.some((id) => !RELIC_BY_ID[id])) return null;
    return r;
  } catch {
    return null;
  }
}

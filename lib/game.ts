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
  person: string;
  quote: string;
}
export const HEROES: Hero[] = [
  {
    id: 'knight',
    person: '阿德里克·维恩',
    quote: '我会让最后一个人，也走过这道门。',
    name: '誓约骑士',
    sub: 'THE OATHKEEPER',
    color: '#d5af68',
    tags: '坚韧 · 护盾 · 反击',
    desc: '以钢铁守护誓言，让每一面盾成为利刃。',
    hp: 120,
    squad: 12,
    weapon: '卫士长剑',
    skill: '不破誓约',
    skillDesc: '获得 18 护盾，6 秒内伤害提高 50%。',
    passive: '每场战斗获得 15 护盾；护甲减伤 12%。',
  },
  {
    id: 'ranger',
    person: '希尔雯·暮叶',
    quote: '门会欺骗你，箭不会。',
    name: '灰林游侠',
    sub: 'THE WAYFARER',
    color: '#8cb5a0',
    tags: '敏捷 · 暴击 · 连射',
    desc: '自迷雾中拉弓，让箭矢替你选择命运。',
    hp: 90,
    squad: 15,
    weapon: '灰木长弓',
    skill: '箭雨齐射',
    skillDesc: '对所有可见敌人和宝箱造成 4 倍单次伤害。',
    passive: '初始暴击率 20%；攻击速度更快。',
  },
  {
    id: 'mage',
    person: '瑟兰·灰烛',
    quote: '每一点火光，都曾有一个名字。',
    name: '秘火法师',
    sub: 'THE ARCANIST',
    color: '#aea1d9',
    tags: '奥术 · 弹幕 · 召唤',
    desc: '穿过禁忌之门，将余烬化作无尽秘火。',
    hp: 80,
    squad: 10,
    weapon: '秘火法杖',
    skill: '秘火新星',
    skillDesc: '对所有可见目标造成 4.5 倍单次伤害，召唤 3 名队员。',
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
    desc: '正向乘法门的倍率 +0.08。',
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
    desc: '击败敌人时恢复 3 生命。',
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
    desc: '每点当前护盾提供 0.5% 额外伤害。',
    max: 3,
    icon: 'sword',
  },
  {
    id: 'aegis',
    name: '誓言回响',
    family: 'knight',
    tag: '圣盾',
    rarity: '普通',
    desc: '每次通过正向门时获得 6 护盾。',
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
    desc: '主动技能冷却缩短 4 秒，技能护盾额外 +12。',
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
    desc: '攻击使目标灼烧，每秒造成 14 伤害，持续 3 秒。',
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
  version: 3;
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
  xp: number;
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
    version: 3,
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
    xp: 0,
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
export function experience(run: Pick<Run, 'xp'>) {
  let level = 1,
    current = run.xp,
    needed = 30;
  while (current >= needed && level < 12) {
    current -= needed;
    level++;
    needed = 30 + (level - 1) * 14;
  }
  return {
    level,
    current,
    needed,
    progress: level === 12 ? 100 : (current / needed) * 100,
  };
}
export function grantExperience(run: Run, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const before = experience(run).level;
  run.xp = Math.min(Number.MAX_SAFE_INTEGER, run.xp + Math.floor(amount));
  const gained = experience(run).level - before;
  run.maxHp += gained * 2;
  run.hp = Math.min(run.maxHp, run.hp + gained * 2);
  return gained;
}
export function stats(run: Run, shield = 0) {
  const r = (id: string) => run.relics[id] || 0;
  const synergy = familyCount(run) >= 3;
  const warrior = run.classId === 'knight';
  const ranger = run.classId === 'ranger';
  return {
    damage:
      (warrior ? 7.2 : ranger ? 5.4 : 8.8) *
      (1 + (experience(run).level - 1) * 0.02) *
      (1 + (run.weaponTier - 1) * 0.1) *
      (1 + r('steel') * 0.2 + r('surge') * 0.25) *
      (1 + shield * r('bash') * 0.005) *
      (synergy && warrior ? 1.15 : 1),
    rate:
      (ranger ? 3.5 : 2.7) *
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
    gateMult: r('mirror') * 0.08,
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
  if (id === 'army') n.squad = safeTroops(n.squad + 20);
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
  if (id === 'soldiers') n.squad = safeTroops(n.squad + 18);
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
    n.squad = safeTroops(n.squad + 22);
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
      : { knight: '不灭誓约', ranger: '蚀月猎弓', mage: '群星终焉' }[
          run.classId
        ];
}
export function safeTroops(n: number) {
  return Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(n)));
}
export function troopMultiplier(squad: number) {
  return 1 + Math.log2(1 + squad / 12);
}
export function firepower(run: Run, shield = 0) {
  const s = stats(run, shield);
  const multiplier = troopMultiplier(run.squad);
  const volley = s.damage * multiplier;
  return {
    multiplier,
    volley,
    dps: volley * s.rate * (1 + s.crit * (s.critMult - 1)),
  };
}
export function formatNumber(n: number) {
  return n >= 100000000
    ? `${(n / 100000000).toFixed(1)}亿`
    : n >= 10000
      ? `${(n / 10000).toFixed(1)}万`
      : Math.round(n).toLocaleString('zh-CN');
}
export interface GateChoice {
  op: '+' | '×' | '-' | '÷';
  value: number;
}
export function gateLabel(g: GateChoice) {
  return `${g.op}${Number.isInteger(g.value) ? g.value : g.value.toFixed(2).replace(/0$/, '')}`;
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
  run.squad = safeTroops(run.squad + s.summon);
  if (gate.op === '+' || gate.op === '×') shield += 6 * (run.relics.aegis || 0);
  run.gates++;
  logRun(run, `${gateLabel(gate)} 之门 · 队伍 ${old} → ${run.squad}`);
  return { shield: Math.min(250, shield), delta: run.squad - old };
}
export function restoreRun(text: string): Run | null {
  try {
    const raw = JSON.parse(text);
    if (!raw || typeof raw !== 'object') return null;
    // v0.2 checkpoints remain playable; prior kills grant no retroactive XP.
    if (raw.version === 2) {
      raw.version = 3;
      raw.xp = 0;
    }
    const r = raw as Run;
    if (
      r.version !== 3 ||
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
      'xp',
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
      !Number.isSafeInteger(r.xp) ||
      r.hp <= 0 ||
      r.hp > r.maxHp ||
      r.maxHp > 500 ||
      r.squad < 1 ||
      !Number.isSafeInteger(r.squad) ||
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

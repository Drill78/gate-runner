import {
  ENDLESS_REWARDS,
  ENDLESS_ECONOMY,
  ENDLESS_KEY_PRICES,
  canLearnKeyLore,
  reforgeGain,
  freshEndless,
  isEndless,
  hpLimit,
  weaponLimit,
  boundedProduct,
  depthIncome,
  covenantChoices,
  type EndlessState,
  type EndlessEncounter,
} from './endless.ts';
import {
  type Magnitude,
  type ArmyState,
  ARMY_PROJECTION_LIMIT,
  validMagnitude,
  armyMagnitude,
  projectMagnitude,
  magnitude,
  multiplyMagnitude,
  powerMagnitude,
  addMagnitude,
  compareMagnitude,
  setArmy,
  addArmy,
  multiplyArmy,
  trackArmyPeak,
  formatArmy,
  formatMagnitude,
} from './army.ts';
export type ClassId = 'knight' | 'ranger' | 'mage';
export const ACT_LENGTH = 5;
export const TOTAL_FLOORS = ACT_LENGTH * 3;
export const MAX_LEVEL = 15;
export const MAX_WEAPON_LEVEL = 25;
export const MAX_HP = 1200;
export const HP_PER_LEVEL = 6;
export type Difficulty = 'normal' | 'hard' | 'endless';
export type Phase =
  | 'ascension'
  | 'fallen'
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
    skillDesc: '获得 18 + 生命上限10%的护盾，5 秒内伤害提高 25%。',
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
    skillDesc:
      '箭雨对所有可见目标造成4倍单次伤害；随后5秒攻速翻倍、暴击率+100个百分点。溢出暴击率等量转为暴击伤害。',
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
    skill: '秘火连星',
    skillDesc:
      '兵力×1.05（向上取整），随后六发秘火追踪最近敌军；每发造成1.5倍单次伤害，随强化后的兵力成长。',
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
  elite: {
    name: '精英哨站',
    desc: '更强的敌人，更多金币；战后三选一必含史诗或传说。',
  },
  treasure: {
    name: '遗落宝库',
    desc: '三只可击破的宝箱。瞄准它们，升级你的武器。',
  },
  rest: { name: '旅人营火', desc: '恢复生命，或磨砺武器。' },
  shop: { name: '渡鸦商人', desc: '用金币购买补给、队员或遗物。' },
  event: {
    name: '命运邂逅',
    desc: '从命运递来的两份契约中选一份，或带走旅费。',
  },
  boss: { name: '守关首领', desc: '击败这一幕的守护者，前往更高处。' },
};
export interface Relic {
  id: string;
  name: string;
  family: ClassId | 'all';
  tag: string;
  rarity: '普通' | '稀有' | '史诗' | '传说';
  desc: string;
  max: number;
  icon: string;
}
export const RELICS: Relic[] = [
  {
    id: 'constitution',
    name: '不灭心脏',
    family: 'all',
    tag: '生存',
    rarity: '稀有',
    desc: '当前生命上限提高12%，并恢复等量生命。',
    max: 3,
    icon: 'heart',
  },
  {
    id: 'lifebloom',
    name: '余烬生息',
    family: 'all',
    tag: '生存',
    rarity: '史诗',
    desc: '每完成一关，生命上限+3/层，并恢复等量生命。',
    max: 2,
    icon: 'heart',
  },
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
    id: 'split',
    name: '双翼符印',
    family: 'all',
    tag: '散射',
    rarity: '传说',
    desc: '每层增加左右一对斜向副弹，每枚造成主弹 50% 伤害。',
    max: 2,
    icon: 'copy',
  },
  {
    id: 'pierce',
    name: '贯阵尖锥',
    family: 'all',
    tag: '穿透',
    rarity: '稀有',
    desc: '每层多穿透 1 个目标，每次穿透后保留 75% 伤害。',
    max: 3,
    icon: 'sword',
  },
  {
    id: 'velocity',
    name: '疾风导环',
    family: 'all',
    tag: '弹速',
    rarity: '普通',
    desc: '弹体飞行速度 +25%。',
    max: 2,
    icon: 'spark',
  },
  {
    id: 'blast',
    name: '炼金火芯',
    family: 'all',
    tag: '爆裂',
    rarity: '稀有',
    desc: '命中额外造成 20% 弹体伤害，周围目标受到 65%/层范围伤害。',
    max: 3,
    icon: 'flame',
  },
  {
    id: 'heavy',
    name: '铅铸重弹',
    family: 'all',
    tag: '重击',
    rarity: '普通',
    desc: '主弹伤害 +25%，攻击速度 −10%。',
    max: 2,
    icon: 'sword',
  },
  {
    id: 'focus',
    name: '聚能刻印',
    family: 'all',
    tag: '稳准',
    rarity: '普通',
    desc: '弹体半径 +65%，伤害 +10%。',
    max: 2,
    icon: 'target',
  },
  {
    id: 'execute',
    name: '终猎契印',
    family: 'all',
    tag: '斩杀',
    rarity: '稀有',
    desc: '对生命低于 30% 的目标，额外伤害 +20%。',
    max: 2,
    icon: 'target',
  },
  {
    id: 'square_key',
    name: '神秘钥匙',
    family: 'all',
    tag: '未知',
    rarity: '史诗',
    desc: '一枚来历不明的古老秘钥。握住它时，仿佛听见遥远的低语。',
    max: 1,
    icon: 'key',
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
    desc: '受到攻击时，对全部可见敌人反击 80%/层基础齐射伤害。',
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
    rarity: '传说',
    desc: '誓约冷却缩短4秒，护盾额外+12；5秒增伤由25%升至40%。',
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
    desc: '暴击命中后向前两侧发射 2 枚 30%/层伤害碎片，不再次分裂。',
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
    rarity: '传说',
    desc: '箭雨冷却缩短4秒，箭雨伤害由4倍升至6倍；常驻暴击率+15个百分点，溢出部分转为暴击伤害。',
    max: 1,
    icon: 'bow',
  },
  {
    id: 'ember',
    name: '秘火余烬',
    family: 'mage',
    tag: '奥术',
    rarity: '普通',
    desc: '攻击使目标灼烧，每秒造成 32%/层基础齐射伤害，持续 3 秒。',
    max: 3,
    icon: 'flame',
  },
  {
    id: 'echo',
    name: '法术回响',
    family: 'mage',
    tag: '奥术',
    rarity: '稀有',
    desc: '每三次齐射，沿原轨迹追加 1 枚 80%/层伤害弹体。',
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
    rarity: '传说',
    desc: '秘火冷却缩短4秒，追踪火球由6发增至9发；施法后的兵力倍率由×1.05升至×1.08。',
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
  next: string[];
  enchanted?: boolean;
}
export interface Run {
  version: 4;
  ruleset?: 'ascension-v1';
  devMode?: boolean;
  battleResume?: boolean;
  devEncounter?: EndlessEncounter;
  ascended?: boolean;
  revivalCoins?: number;
  revivalCoinsEarned?: number;
  revivalsUsed?: number;
  checkpointStart?: number;
  legacyPendingCheckpoint?: 45 | 90;
  legacyContinuation?: boolean;
  journey?: {
    room: number;
    hp: number;
    maxHp: number;
    armyLog: number;
    seconds: number;
  }[];
  runId: string;
  combatTime: number;
  peakSquad: number;
  squadMagnitude?: Magnitude;
  peakSquadMagnitude?: Magnitude;
  endless: EndlessState;
  retired?: boolean;
  difficulty: Difficulty;
  goldEarned: number;
  doubleBossWins: number;
  flawlessBosses: number;
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
  squareGateSeen: boolean;
  encountersDefeated: Record<string, number>;
  secretDiscovered: boolean;
  nodes: RouteNode[][];
  path: string[];
  node: RouteNode | null;
  reward: string[];
  purchases: string[];
  xp: number;
  talentPicks: number;
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
export function createMap(seed: number, offset = 0): RouteNode[][] {
  const random = rng(seed + offset * 7919);
  const columns = [[0, 2, 4], [0, 1, 3, 4], [0, 2, 4], [1, 3], [2]];
  // Order-preserving edges can merge at a node but never cross between rows.
  const links = [
    [
      [0, 1],
      [1, 3],
      [3, 4],
    ],
    [[0], [0, 2], [2, 4], [4]],
    [[1], [1, 3], [3]],
    [[2], [2]],
    [[0, 2, 4]],
  ];
  const patterns: NodeKind[][][] = [
    [
      ['battle', 'event', 'elite'],
      ['elite', 'battle', 'battle'],
    ],
    [
      ['treasure', 'battle', 'event', 'shop'],
      ['shop', 'event', 'battle', 'treasure'],
    ],
    [
      ['elite', 'battle', 'treasure'],
      ['treasure', 'battle', 'elite'],
    ],
    [
      ['rest', 'event'],
      ['event', 'rest'],
    ],
    [['boss']],
  ];
  return Array.from({ length: TOTAL_FLOORS }, (_, floor) => {
    const depth = floor % ACT_LENGTH;
    const choices = patterns[depth];
    const kinds = choices[Math.floor(random() * choices.length)];
    return columns[depth].map((col, index) => ({
      id: `${floor + offset}-${col}`,
      floor: floor + offset,
      col,
      kind: kinds[index],
      next:
        floor + 1 === TOTAL_FLOORS
          ? []
          : links[depth][index].map(
              (nextCol) => `${floor + offset + 1}-${nextCol}`,
            ),
    }));
  });
}
export function createRun(
  classId: ClassId,
  seed = 12345,
  difficulty: Difficulty = 'normal',
): Run {
  const h = HEROES.find((h) => h.id === classId)!;
  return {
    version: 4,
    ruleset: 'ascension-v1',
    ascended: false,
    revivalCoins: 0,
    revivalCoinsEarned: 0,
    revivalsUsed: 0,
    checkpointStart: 0,
    journey: [],
    runId: '',
    combatTime: 0,
    peakSquad: h.squad,
    endless: freshEndless(),
    difficulty,
    goldEarned: 0,
    doubleBossWins: 0,
    flawlessBosses: 0,
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
    squareGateSeen: false,
    encountersDefeated: {},
    secretDiscovered: false,
    nodes: createMap(seed),
    path: [],
    node: null,
    reward: [],
    purchases: [],
    xp: 0,
    talentPicks: 0,
    kills: 0,
    chests: 0,
    gates: 0,
    log: ['新的远征，即将启程。'],
  };
}
export function logRun(run: Run, message: string) {
  run.log = [message, ...run.log].slice(0, 8);
}
export function grantGold(run: Run, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const earned = Math.floor(amount * depthIncome(run));
  run.gold = Math.min(Number.MAX_SAFE_INTEGER, run.gold + earned);
  run.goldEarned = Math.min(
    Number.MAX_SAFE_INTEGER,
    (run.goldEarned || 0) + earned,
  );
}
export function availableNodes(run: Run): RouteNode[] {
  if (
    (!isEndless(run) && run.floor >= TOTAL_FLOORS) ||
    run.floor < 0 ||
    run.floor > 100
  )
    return [];
  const lastId = run.path.at(-1);
  const last = run.nodes.flat().find((n) => n.id === lastId);
  return (run.nodes.find((row) => row[0]?.floor === run.floor) || [])
    .filter((node) =>
      last
        ? last.floor === run.floor - 1 && last.next.includes(node.id)
        : !lastId &&
          (run.floor % ACT_LENGTH === 0 ||
            run.legacyPendingCheckpoint === run.floor + 1),
    )
    .map((node) => ({
      ...node,
      next: [...node.next],
      ...(node.kind === 'elite' && run.relics.square_key && !run.squareGateSeen
        ? { enchanted: true }
        : {}),
    }));
}
export function enterNode(run: Run, nodeId: string): Run {
  const node = availableNodes(run).find((n) => n.id === nodeId);
  if (run.phase !== 'map' || !node) return run;
  const next = structuredClone(run);
  next.node = node;
  if (node.enchanted) {
    next.squareGateSeen = true;
  }
  next.purchases = [];
  next.phase = ['rest', 'shop', 'event'].includes(node.kind)
    ? (node.kind as Phase)
    : 'battle';
  logRun(
    next,
    `第 ${node.floor + 1} 关 · ${node.kind === 'boss' ? '章节首领' : node.enchanted ? '禁术精英哨站' : NODE_INFO[node.kind].name}`,
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
  while (current >= needed && level < MAX_LEVEL) {
    current -= needed;
    level++;
    needed = 30 + (level - 1) * 14 + 6 * Math.max(0, level - 5) ** 2;
  }
  return {
    level,
    current,
    needed,
    progress: level === MAX_LEVEL ? 100 : (current / needed) * 100,
  };
}
export function grantExperience(run: Run, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const before = experience(run).level;
  run.xp = Math.min(Number.MAX_SAFE_INTEGER, run.xp + Math.floor(amount));
  const gained = experience(run).level - before;
  run.maxHp = Math.min(hpLimit(run), run.maxHp + gained * HP_PER_LEVEL);
  run.hp = Math.min(run.maxHp, run.hp + gained * HP_PER_LEVEL);
  return gained;
}
export function stats(run: Run, shield = 0, skillActive = false) {
  const r = (id: string) => run.relics[id] || 0;
  const synergy = familyCount(run) >= 3;
  const warrior = run.classId === 'knight';
  const ranger = run.classId === 'ranger';
  const criticalChance =
    (ranger ? 0.2 : 0.05) +
    r('keen') * 0.12 +
    r('hunter') * 0.15 +
    (synergy && ranger ? 0.1 : 0) +
    (skillActive && ranger ? 1 : 0);
  return {
    damage:
      (warrior ? 7.2 : ranger ? 5.9 : 8.8) *
      (1 + (experience(run).level - 1) * 0.02) *
      (1 +
        (Math.min(10, run.weaponTier) - 1) * 0.1 +
        Math.max(0, run.weaponTier - 10) * 0.055) *
      (1 + r('steel') * 0.2 + r('surge') * 0.25) *
      (1 + r('heavy') * 0.25 + r('focus') * 0.1) *
      (1 + shield * r('bash') * 0.005) *
      (synergy && warrior ? 1.15 : 1) *
      (isEndless(run) ? run.endless.power : 1),
    rate:
      (ranger ? 3.5 : 2.7) *
      (1 + r('quiver') * 0.2 + (synergy && run.classId === 'mage' ? 0.2 : 0)) *
      (1 - r('heavy') * 0.1) *
      (skillActive && ranger ? 2 : 1),
    crit: Math.min(1, criticalChance),
    critMult: 2 + r('deadeye') * 0.6 + Math.max(0, criticalChance - 1),
    armor: Math.min(0.6, (warrior ? 0.12 : 0) + r('plate') * 0.08),
    shieldStart: (warrior ? 15 : 0) + r('bulwark') * 15 + r('ward') * 18,
    gateAdd: r('recruit') * 5,
    gateMult: r('mirror') * 0.08,
    summon: (run.classId === 'mage' ? 2 : 0) + r('summon') * 3 + r('army') * 3,
    cooldown: 12 - (r('paladin') + r('hunter') + r('archmage')) * 4,
    bulletSpeed: 1.7 * (1 + r('velocity') * 0.25),
    bulletRadius: 0.025 * (1 + r('focus') * 0.65),
    extraPairs: r('split'),
    pierceCount: r('pierce'),
    blast: r('blast'),
    execute: r('execute'),
    synergy,
  };
}
export function availableRelics(run: Run): Relic[] {
  return RELICS.filter(
    (r) =>
      r.id !== 'square_key' &&
      (r.family === 'all' || r.family === run.classId) &&
      (run.relics[r.id] || 0) < r.max,
  );
}
export function rollRelicRewards(run: Run, elite = false): string[] {
  const random = rng(
    run.seed + run.floor * 233 + run.path.length * 19 + run.gold,
  );
  const pool = availableRelics(run);
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
    const weights = { 普通: 1, 稀有: 0.7, 史诗: 0.35, 传说: 0.12 };
    let roll =
      random() * candidates.reduce((sum, r) => sum + weights[r.rarity], 0);
    const chosen =
      candidates.find((r) => (roll -= weights[r.rarity]) < 0) ||
      candidates.at(-1)!;
    out.push(chosen.id);
    pool.splice(pool.indexOf(chosen), 1);
  }
  return out;
}
export const SUPPLY_REWARDS: Relic[] = [
  {
    id: 'supply-potion',
    name: '绯红药剂',
    family: 'all',
    tag: '战地补给',
    rarity: '普通',
    desc: '立即恢复 40 生命。',
    max: 1,
    icon: 'heart',
  },
  {
    id: 'supply-company',
    name: '整编佣兵团',
    family: 'all',
    tag: '战地补给',
    rarity: '普通',
    desc: '立即招募 50 名队员。',
    max: 1,
    icon: 'users',
  },
  {
    id: 'supply-weapon',
    name: '精工锻造',
    family: 'all',
    tag: '战地补给',
    rarity: '稀有',
    desc: '本局武器等级 +1。',
    max: 1,
    icon: 'sword',
  },
];
// Repeatable consumables keep elite rewards useful when high-tier relics are full.
// Ordinary reward rolls, level menus and shops exclude these. Exhausted event
// drafts may use them so all three promises remain claimable.
export const ELITE_FALLBACK_REWARDS: Relic[] = [
  {
    id: 'supply-epic-cache',
    name: '史诗军资',
    family: 'all',
    tag: '精英战利品',
    rarity: '史诗',
    desc: '获得 120 金币，立即恢复 50 生命。',
    max: 1,
    icon: 'coins',
  },
  {
    id: 'supply-epic-vigor',
    name: '不屈精粹',
    family: 'all',
    tag: '精英战利品',
    rarity: '史诗',
    desc: '最大生命 +8（上限 1200），立即恢复 50 生命。',
    max: 1,
    icon: 'heart',
  },
  {
    id: 'supply-epic-company',
    name: '王庭援军',
    family: 'all',
    tag: '精英战利品',
    rarity: '史诗',
    desc: '获得 60 金币，立即招募 100 名队员。',
    max: 1,
    icon: 'users',
  },
];
export const REWARD_BY_ID: Record<string, Relic> = {
  ...RELIC_BY_ID,
  ...Object.fromEntries(SUPPLY_REWARDS.map((r) => [r.id, r])),
  ...Object.fromEntries(ELITE_FALLBACK_REWARDS.map((r) => [r.id, r])),
  ...Object.fromEntries(ENDLESS_REWARDS.map((r) => [r.id, r])),
};
export function rollRewards(run: Run, elite = false): string[] {
  if (isEndless(run) && run.floor >= 15 && run.floor % 5 === 0)
    return covenantChoices(run);
  const choices = rollRelicRewards(run, elite);
  const supplies = SUPPLY_REWARDS.filter((r) =>
    r.id === 'supply-potion'
      ? run.hp < run.maxHp
      : r.id === 'supply-weapon'
        ? run.weaponTier < weaponLimit(run)
        : run.squad < 1e14,
  );
  const random = rng(run.seed + run.floor * 439 + run.gold + 617);
  if (supplies.length && (choices.length < 3 || random() < 0.45)) {
    const supply = supplies[Math.floor(random() * supplies.length)].id;
    if (choices.length >= 3) choices[2] = supply;
    else choices.push(supply);
  }
  if (elite) {
    const highTier = (id: string) =>
      ['史诗', '传说'].includes(REWARD_BY_ID[id].rarity);
    // Enforce after all ordinary supply replacement so the guarantee cannot be lost.
    if (!choices.some(highTier)) {
      const pool = availableRelics(run).filter((r) => highTier(r.id));
      const select = rng(
        run.seed + run.floor * 1459 + run.path.length * 61 + run.gold + 1237,
      );
      let roll =
        select() *
        pool.reduce((sum, r) => sum + (r.rarity === '传说' ? 0.12 : 0.35), 0);
      const guaranteed =
        pool.find((r) => (roll -= r.rarity === '传说' ? 0.12 : 0.35) < 0)?.id ||
        pool.at(-1)?.id ||
        'supply-epic-cache';
      if (choices.length < 3) choices.push(guaranteed);
      else choices[1] = guaranteed;
    }
    // Even an exhausted relic pool still presents three distinct, claimable items.
    for (const item of [...supplies, ...ELITE_FALLBACK_REWARDS]) {
      if (choices.length === 3) break;
      if (!choices.includes(item.id)) choices.push(item.id);
    }
  }
  return choices;
}
export function rollLevelChoices(run: Run): string[] {
  if (run.talentPicks >= experience(run).level - 1) return [];
  return rollRelicRewards({
    ...run,
    seed: run.seed + (run.talentPicks + 1) * 7919,
  });
}
export function chooseLevelUpgrade(run: Run, id: string): Run {
  if (!rollLevelChoices(run).includes(id)) return run;
  const next = addRelic(run, id);
  if (next === run) return run;
  next.talentPicks++;
  logRun(next, `升级研习 · ${RELIC_BY_ID[id].name}`);
  return next;
}
export function addRelic(run: Run, id: string): Run {
  const relic = RELIC_BY_ID[id];
  if (!relic || (run.relics[id] || 0) >= relic.max) return run;
  const n = structuredClone(run);
  n.relics[id] = (n.relics[id] || 0) + 1;
  if (id === 'vitality') {
    n.maxHp = Math.min(hpLimit(n), n.maxHp + 20);
    n.hp = Math.min(n.maxHp, n.hp + 20);
  }
  if (id === 'army') addArmy(n, 20);
  if (id === 'bounty') grantGold(n, 30);
  if (id === 'constitution') {
    const growth = Math.ceil(n.maxHp * 0.12);
    n.maxHp = Math.min(hpLimit(n), n.maxHp + growth);
    n.hp = Math.min(n.maxHp, n.hp + growth);
  }
  logRun(n, `获得强化 · ${relic.name}`);
  return n;
}
export function completeRoom(run: Run, reward = true): Run {
  const n = structuredClone(run);
  if (!n.node || n.node.floor !== n.floor) return run;
  n.battleResume = false;
  n.path.push(n.node.id);
  // The curtain call changes only navigation. Its pretend gates and gifts must
  // never alter the hundredth-room score, health, army or growth history.
  if (isEndless(n) && n.floor === 100) {
    n.floor = 101;
    n.phase = 'victory';
    n.reward = [];
    logRun(n, '绿色咸咸圈&GPT-6 Astra · 谢谢！');
    return n;
  }
  if (n.relics.lifebloom) {
    const growth = n.relics.lifebloom * 3;
    n.maxHp = Math.min(hpLimit(n), n.maxHp + growth);
    n.hp = Math.min(n.maxHp, n.hp + growth);
  }
  n.floor++;
  if (n.legacyPendingCheckpoint === n.floor && n.node.kind === 'boss')
    delete n.legacyPendingCheckpoint;
  trackArmyPeak(n);
  const army = armyMagnitude(n);
  n.journey = [
    ...(n.journey || []),
    {
      room: n.floor,
      hp: n.hp,
      maxHp: n.maxHp,
      armyLog: army.exponent + Math.log10(army.mantissa),
      seconds: n.combatTime,
    },
  ].slice(-101);
  if (n.devMode && n.devEncounter) {
    n.phase = 'victory';
    n.reward = [];
    logRun(n, '独立演武完成 · 可返回演武场选择下一场试炼。');
    return n;
  }
  if (
    n.node.kind === 'boss' &&
    n.floor % ACT_LENGTH === 0 &&
    (isEndless(n) || n.floor < TOTAL_FLOORS)
  ) {
    const restored = Math.min(n.maxHp - n.hp, n.maxHp * 0.5);
    n.hp += restored;
    logRun(
      n,
      `章末余火 · 恢复 ${formatNumber(restored)} 生命，下一段誓约已开启。`,
    );
  }
  if (
    isEndless(n) &&
    [15, 45, 75].includes(n.floor) &&
    (n.revivalCoinsEarned || 0) < 3
  ) {
    n.revivalCoins = (n.revivalCoins || 0) + 1;
    n.revivalCoinsEarned = (n.revivalCoinsEarned || 0) + 1;
    logRun(n, '不灭余烬凝成归魂币 · 陨落时可重燃此战。');
  }
  if (isEndless(n) && n.floor === 100) {
    n.ascended = true;
    n.phase = 'ascension';
    n.reward = [];
    n.nodes = createRunMap(n.seed, n.difficulty, 100);
    n.path = [];
    n.node = null;
    logRun(n, '迷雾终破，凡躯登神。感谢你，把这束火带到了最后。');
    return n;
  }
  if (n.floor === TOTAL_FLOORS && !isEndless(n)) {
    n.phase = 'victory';
    logRun(n, '灰烬王座已被征服。');
    return n;
  }
  n.phase = reward ? 'reward' : 'map';
  n.reward = reward
    ? rollRewards(n, n.node.kind === 'elite' || n.node.kind === 'boss')
    : [];
  if (isEndless(n) && n.floor % TOTAL_FLOORS === 0) {
    n.nodes = createRunMap(n.seed, n.difficulty, n.floor);
    n.path = [];
    n.node = null;
  }
  return n;
}
/** The final ten trials share one straight map; the celebration has one last node. */
export function createRunMap(
  seed: number,
  difficulty: Difficulty,
  floor: number,
): RouteNode[][] {
  if (difficulty !== 'endless') return createMap(seed);
  if (floor >= 100)
    return [[{ id: '100-2', floor: 100, col: 2, kind: 'treasure', next: [] }]];
  if (floor >= 90)
    return Array.from({ length: 10 }, (_, index) => [
      {
        id: `${90 + index}-2`,
        floor: 90 + index,
        col: 2,
        kind: 'boss' as const,
        next: index < 9 ? [`${91 + index}-2`] : [],
      },
    ]);
  return createMap(seed, Math.floor(floor / TOTAL_FLOORS) * TOTAL_FLOORS);
}
export function reviveRun(run: Run): Run {
  if (
    run.phase !== 'fallen' ||
    !isEndless(run) ||
    (run.revivalCoins || 0) < 1 ||
    !run.node
  )
    return run;
  const next = structuredClone(run);
  next.revivalCoins = (next.revivalCoins || 0) - 1;
  next.revivalsUsed = (next.revivalsUsed || 0) + 1;
  next.hp = next.maxHp;
  next.phase = 'battle';
  next.battleResume = true;
  logRun(next, '归魂币燃尽 · 此战重启，誓言未断。');
  return next;
}
export function acceptDefeat(run: Run): Run {
  return run.phase === 'fallen' ? { ...run, phase: 'defeat' } : run;
}
export function beginEpilogue(run: Run): Run {
  if (run.phase !== 'ascension' || !run.ascended || run.floor !== 100)
    return run;
  return enterNode({ ...run, phase: 'map' }, '100-2');
}
export function chooseReward(run: Run, id: string): Run {
  if (run.phase !== 'reward' || !run.reward.includes(id)) return run;
  // Previous saves may still contain the old key reward; it is now shop-only.
  if (id === 'square_key') return run;
  if (id.startsWith('abyss-')) return chooseCovenant(run, id);
  let n: Run;
  if (id.startsWith('supply-') && REWARD_BY_ID[id]) {
    n = structuredClone(run);
    if (id === 'supply-potion') n.hp = Math.min(n.maxHp, n.hp + 40);
    if (id === 'supply-company') addArmy(n, 50);
    if (id === 'supply-weapon')
      n.weaponTier = Math.min(weaponLimit(n), n.weaponTier + 1);
    if (id === 'supply-epic-cache') {
      grantGold(n, 120);
      n.hp = Math.min(n.maxHp, n.hp + 50);
    }
    if (id === 'supply-epic-vigor') {
      n.maxHp = Math.min(hpLimit(n), n.maxHp + 8);
      n.hp = Math.min(n.maxHp, n.hp + 50);
    }
    if (id === 'supply-epic-company') {
      grantGold(n, 60);
      addArmy(n, 100);
    }
    logRun(n, `获得补给 · ${REWARD_BY_ID[id].name}`);
  } else n = addRelic(run, id);
  return { ...n, phase: 'map', reward: [] };
}
export function skipReward(run: Run): Run {
  return run.phase === 'reward' ? { ...run, phase: 'map', reward: [] } : run;
}
function chooseCovenant(run: Run, id: string): Run {
  if (isEndless(run) && id === 'abyss-lore' && !canLearnKeyLore(run)) {
    const next = structuredClone(run);
    next.reward = covenantChoices(next);
    logRun(next, '残章已读尽 · 烛火映出了新的契约。');
    return next;
  }
  if (!isEndless(run) || !covenantChoices(run).includes(id)) return run;
  let n = structuredClone(run);
  const e = n.endless;
  if (id === 'abyss-flame')
    e.power = boundedProduct(e.power, 1 + ENDLESS_ECONOMY.flameGain);
  if (id === 'abyss-legion') {
    e.legion = boundedProduct(e.legion, 1.3);
    multiplyArmy(n, 1.5);
  }
  if (id === 'abyss-heart') {
    n.maxHp = Math.min(hpLimit(n), Math.ceil(n.maxHp * 1.22));
    n.hp = Math.min(n.maxHp, n.hp + n.maxHp * 0.45);
  }
  if (id === 'abyss-lore') e.keyLore++;
  if (id === 'abyss-bind') {
    const pool = Object.keys(n.encountersDefeated).filter(
      (boss) => !e.allies.includes(boss),
    );
    const ally = pool[(n.seed + n.floor) % pool.length];
    if (!ally) return run;
    e.allies.push(ally);
  }
  if (id === 'abyss-reforge') {
    const layers = Object.entries(n.relics).reduce(
      (sum, [key, count]) => sum + (key === 'square_key' ? 0 : count),
      0,
    );
    e.power = boundedProduct(e.power, 1 + reforgeGain(layers, e.reforges));
    e.embers += layers;
    e.reforges++;
    const key = n.relics.square_key;
    n.relics = key ? { square_key: key } : {};
    for (let i = 0; i < 3; i++) n = addRelic(n, 'steel');
    const family = RELICS.filter((r) => r.family === n.classId).slice(0, 3);
    for (const relic of family) n = addRelic(n, relic.id);
    n.hp = Math.min(n.maxHp, n.hp + n.maxHp * 0.3);
  }
  n.endless.covenantAt = n.floor;
  trackArmyPeak(n);
  logRun(n, `长夜盟约 · ${REWARD_BY_ID[id].name}`);
  return { ...n, phase: 'map', reward: [] };
}
export function retireEndless(run: Run): Run {
  if (!isEndless(run) || run.phase !== 'map' || run.floor < 1) return run;
  return {
    ...structuredClone(run),
    phase: 'defeat',
    retired: true,
    log: ['火种已归还。长夜将记住你的足迹。', ...run.log].slice(0, 8),
  };
}
export function restAction(run: Run, action: 'heal' | 'forge'): Run {
  if (run.phase !== 'rest') return run;
  const n = structuredClone(run);
  if (action === 'heal') {
    const amount = Math.min(n.maxHp - n.hp, Math.ceil(n.maxHp * 0.4));
    n.hp += amount;
    logRun(n, `营火休整 · 恢复 ${amount} 生命`);
  } else {
    n.weaponTier = Math.min(weaponLimit(n), n.weaponTier + 1);
    logRun(n, '磨砺武器 · 武器等级 +1');
  }
  return completeRoom(n, false);
}
export type ShopCategory = '补给' | '弹幕' | '职业';
interface ShopItemBase {
  id: string;
  name: string;
  desc: string;
  cost: number;
  icon: string;
  category: ShopCategory;
}
export type ShopItem = ShopItemBase &
  (
    | { kind: 'heal' | 'recruits'; amount: number }
    | { kind: 'weapon' | 'random-relic' }
    | { kind: 'relic'; relicId: string }
  );

function relicWare(
  relicId: string,
  cost: number,
  category: ShopCategory = '弹幕',
): ShopItem {
  const relic = RELIC_BY_ID[relicId];
  return {
    id: `relic-${relicId}`,
    name: relic.name,
    desc: relic.desc,
    cost,
    icon: relic.icon,
    category,
    kind: 'relic',
    relicId,
  };
}

export const SHOP_ITEMS: readonly ShopItem[] = [
  {
    id: 'potion',
    name: '绯红药剂',
    desc: '恢复 40 生命',
    cost: 35,
    icon: 'heart',
    category: '补给',
    kind: 'heal',
    amount: 40,
  },
  {
    id: 'soldiers',
    name: '佣兵契约',
    desc: '招募 18 名队员',
    cost: 45,
    icon: 'users',
    category: '补给',
    kind: 'recruits',
    amount: 18,
  },
  {
    id: 'weapon',
    name: '精工锻造',
    desc: '武器等级 +1',
    cost: 70,
    icon: 'sword',
    category: '补给',
    kind: 'weapon',
  },
  {
    id: 'relic',
    name: '神秘遗物',
    desc: '获得一项随机强化，优先本职业',
    cost: 85,
    icon: 'spark',
    category: '职业',
    kind: 'random-relic',
  },
  {
    id: 'tonic',
    name: '琥珀复苏酿',
    desc: '恢复 80 生命',
    cost: 60,
    icon: 'heart',
    category: '补给',
    kind: 'heal',
    amount: 80,
  },
  {
    id: 'company',
    name: '整编佣兵团',
    desc: '招募 50 名队员',
    cost: 100,
    icon: 'users',
    category: '补给',
    kind: 'recruits',
    amount: 50,
  },
  relicWare('vitality', 95, '补给'),
  relicWare('split', 155),
  relicWare('pierce', 125),
  relicWare('velocity', 75),
  relicWare('blast', 145),
  relicWare('heavy', 85),
  relicWare('focus', 85),
  relicWare('execute', 110),
  relicWare('bash', 145, '职业'),
  relicWare('deadeye', 145, '职业'),
  relicWare('echo', 145, '职业'),
  relicWare('square_key', 666, '补给'),
];

export function shopInventory(
  run: Pick<
    Run,
    'classId' | 'seed' | 'floor' | 'node' | 'relics' | 'squareGateSeen'
  > &
    Partial<Pick<Run, 'difficulty' | 'endless'>>,
): ShopItem[] {
  const pool = SHOP_ITEMS.filter((item) => {
    if (item.id === 'relic-square_key') return false;
    if (item.kind !== 'relic') return true;
    const relic = RELIC_BY_ID[item.relicId];
    return relic && (relic.family === 'all' || relic.family === run.classId);
  });
  const random = rng(
    run.seed + run.floor * 3571 + (run.node?.col || 0) * 101 + 911,
  );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const stock = pool.slice(0, 5).map((item) => ({ ...item }));
  if (
    !run.relics.square_key &&
    !run.squareGateSeen &&
    (run.difficulty !== 'endless' ||
      !run.endless ||
      run.endless.keysOpened === 0)
  )
    stock.push(SHOP_ITEMS.find((item) => item.id === 'relic-square_key')!);
  if (run.difficulty === 'endless' && run.endless) {
    if (
      run.squareGateSeen &&
      !run.relics.square_key &&
      run.endless.keysOpened > 0 &&
      run.endless.keysOpened < ENDLESS_KEY_PRICES.length &&
      run.endless.keyLore >= run.endless.keysOpened
    ) {
      const tier = run.endless.keysOpened;
      stock.push({
        ...SHOP_ITEMS.find((item) => item.id === 'relic-square_key')!,
        name: `禁忌秘钥 · 第${tier + 1}重`,
        cost: ENDLESS_KEY_PRICES[tier],
      });
    }
    for (const item of stock) {
      if (item.kind === 'heal') {
        item.amount = Math.max(
          item.amount,
          Math.ceil((run as Run).maxHp * 0.35),
        );
        item.desc = `恢复 ${formatNumber(item.amount)} 生命`;
      }
    }
  }
  return stock;
}

export function shopItemAvailability(
  run: Run,
  id: string,
): { available: boolean; reason: string } {
  const item =
    shopInventory(run).find((entry) => entry.id === id) ||
    SHOP_ITEMS.find((entry) => entry.id === id);
  const unavailable = (reason: string) => ({ available: false, reason });
  if (!item) return unavailable('商品不存在');
  if (run.phase !== 'shop') return unavailable('当前不在商店');
  if (run.purchases.includes(id)) return unavailable('本店已购买');
  if (item.kind === 'heal' && run.hp >= run.maxHp)
    return unavailable('生命已满');
  if (item.kind === 'weapon' && run.weaponTier >= weaponLimit(run))
    return unavailable('武器已满级');
  if (
    item.kind === 'recruits' &&
    safeTroops(run.squad + item.amount) <= run.squad
  )
    return unavailable('这支援军已难改变军势');
  if (item.kind === 'relic') {
    const relic = RELIC_BY_ID[item.relicId];
    if (!relic || (relic.family !== 'all' && relic.family !== run.classId))
      return unavailable('该职业无法使用');
    if ((run.relics[relic.id] || 0) >= relic.max)
      return unavailable('强化已满层');
    if (relic.id === 'square_key' && run.squareGateSeen && !isEndless(run))
      return unavailable('已售罄');
  }
  if (item.kind === 'random-relic' && availableRelics(run).length === 0)
    return unavailable('可用强化已全部满层');
  if (!shopInventory(run).some((entry) => entry.id === id))
    return unavailable('本店未陈列');
  if (run.gold < item.cost) return unavailable('金币不足');
  return { available: true, reason: '' };
}

export function canBuyShopItem(run: Run, id: string): boolean {
  return shopItemAvailability(run, id).available;
}

export function shopBuy(run: Run, id: string): Run {
  const item = shopInventory(run).find((i) => i.id === id);
  if (!item || !canBuyShopItem(run, id)) return run;
  let n = structuredClone(run);
  n.gold -= item.cost;
  if (item.kind === 'heal') n.hp = Math.min(n.maxHp, n.hp + item.amount);
  if (item.kind === 'recruits') addArmy(n, item.amount);
  if (item.kind === 'weapon') n.weaponTier++;
  if (item.kind === 'relic') n = addRelic(n, item.relicId);
  if (item.kind === 'relic' && item.relicId === 'square_key' && isEndless(n))
    n.squareGateSeen = false;
  if (item.kind === 'random-relic') {
    const candidate = rollRelicRewards(n, true)[0];
    if (!candidate) return run;
    n = addRelic(n, candidate);
  }
  n.purchases.push(id);
  logRun(n, `购买 · ${item.name}`);
  return n;
}
export type EventId =
  | 'blood'
  | 'gold'
  | 'leave'
  | 'forge'
  | 'oath'
  | 'cache'
  | 'study'
  | 'mercy'
  | 'legacy'
  | 'pilgrim';
export interface EventChoice {
  id: EventId;
  name: string;
  description: string;
  icon: string;
  available: boolean;
  goldCost: number;
  hpCost: number;
  value: number;
  armyValue?: Magnitude;
}
export function eventChoices(run: Run): EventChoice[] {
  const act = Math.min(2, Math.floor(run.floor / ACT_LENGTH));
  const blood = Math.ceil(run.maxHp * 0.08);
  const income = depthIncome(run);
  const price = (base: number) => Math.ceil((base + act * 20) * income);
  const recruits = Math.max(
    60 + act * 60,
    Math.ceil(run.squad * (0.5 + act * 0.15)),
  );
  const recruitMagnitude =
    armyMagnitude(run).exponent >= 15
      ? multiplyMagnitude(armyMagnitude(run), 0.5 + act * 0.15)
      : magnitude(recruits);
  const coins = 180 + run.floor * 24;
  const growth = Math.min(
    hpLimit(run) - run.maxHp,
    Math.max(30 + act * 20, Math.ceil(run.maxHp * 0.22)),
  );
  const forge = Math.min(
    weaponLimit(run) - run.weaponTier,
    Math.max(3, Math.ceil(run.weaponTier * 0.12)),
  );
  const study = Math.ceil(
    experience(run).needed -
      experience(run).current +
      experience(run).needed * 0.5,
  );
  const legacy = { knight: 'paladin', ranger: 'hunter', mage: 'archmage' }[
    run.classId
  ];
  const pool: EventChoice[] = [
    {
      id: 'blood',
      name: '血誓遗藏',
      description: `献出${blood}生命，从三份珍藏中选一份，必含史诗或传说。`,
      icon: 'heart',
      available: run.hp > blood,
      goldCost: 0,
      hpCost: blood,
      value: 0,
    },
    {
      id: 'gold',
      name: '沉眠军团',
      description: `支付${formatNumber(price(35))}金币，唤醒${formatMagnitude(recruitMagnitude)}兵力。军团越盛，回应誓言的亡魂越多。`,
      icon: 'users',
      available: run.gold >= price(35),
      goldCost: price(35),
      hpCost: 0,
      value: recruits,
      armyValue:
        armyMagnitude(run).exponent >= 15
          ? multiplyMagnitude(armyMagnitude(run), 0.5 + act * 0.15)
          : undefined,
    },
    {
      id: 'forge',
      name: '流浪铸剑师',
      description: `支付${formatNumber(price(40))}金币，武器提升${forge}级。炉火会顺应现有兵刃的品阶。`,
      icon: 'sword',
      available: run.gold >= price(40) && forge > 0,
      goldCost: price(40),
      hpCost: 0,
      value: forge,
    },
    {
      id: 'oath',
      name: '生命之井',
      description: `支付${formatNumber(price(40))}金币，生命上限+${formatNumber(growth)}，并恢复等量生命与原有伤势的三成。`,
      icon: 'heart',
      available: run.gold >= price(40) && growth > 0,
      goldCost: price(40),
      hpCost: 0,
      value: growth,
    },
    {
      id: 'cache',
      name: '烙印宝库',
      description: `献出${formatNumber(blood)}生命，带走${formatNumber(Math.floor(coins * income))}金币。沉睡的王室金库终于回应了你。`,
      icon: 'coins',
      available: run.hp > blood,
      goldCost: 0,
      hpCost: blood,
      value: coins,
    },
    {
      id: 'study',
      name: '无名贤者',
      description: `支付${formatNumber(price(25))}金币，获得${formatNumber(study)}经验，至少晋升一级；下次交战时研习新的强化。`,
      icon: 'star',
      available: run.gold >= price(25) && experience(run).level < MAX_LEVEL,
      goldCost: price(25),
      hpCost: 0,
      value: study,
    },
    {
      id: 'mercy',
      name: '旅人的回礼',
      description: `不取分文，恢复${formatNumber(Math.min(run.maxHp - run.hp, Math.ceil(run.maxHp * 0.6)))}生命。你曾替陌生人守过一夜火。`,
      icon: 'heart',
      available: run.hp < run.maxHp,
      goldCost: 0,
      hpCost: 0,
      value: Math.ceil(run.maxHp * 0.6),
    },
    {
      id: 'legacy',
      name: '先誓者的遗言',
      icon: 'crown',
      description: `献出${formatNumber(blood)}生命，继承「${RELIC_BY_ID[legacy].name}」，令你的主动誓术觉醒。`,
      available: run.hp > blood && !run.relics[legacy],
      goldCost: 0,
      hpCost: blood,
      value: 0,
    },
    {
      id: 'pilgrim',
      name: '无名者的薪火',
      icon: 'star',
      description:
        '免费从三份遗物与补给中取走一份，并恢复生命上限的15%。愿下一位旅人也能找到火光。',
      available: true,
      goldCost: 0,
      hpCost: 0,
      value: Math.ceil(run.maxHp * 0.15),
    },
  ];
  const random = rng(run.seed + run.floor * 8191 + (run.node?.col || 0) * 97);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return [
    ...pool.slice(0, 3),
    {
      id: 'leave',
      name: '守夜人的路资',
      description: `收下${formatNumber(Math.floor((70 + run.floor * 12) * income))}金币，继续前行。总有人记得守门者的恩情。`,
      icon: 'coins',
      available: true,
      goldCost: 0,
      hpCost: 0,
      value: 70 + run.floor * 12,
    },
  ];
}
export function eventAction(run: Run, action: EventId): Run {
  if (run.phase !== 'event') return run;
  const choice = eventChoices(run).find((item) => item.id === action);
  if (!choice?.available) return run;
  let n = structuredClone(run);
  n.gold -= choice.goldCost;
  n.hp -= choice.hpCost;
  if (action === 'gold') addArmy(n, choice.armyValue || choice.value);
  if (action === 'forge')
    n.weaponTier = Math.min(weaponLimit(n), n.weaponTier + choice.value);
  if (action === 'oath') {
    const recovery = Math.ceil((n.maxHp - n.hp) * 0.3);
    n.maxHp = Math.min(hpLimit(n), n.maxHp + choice.value);
    n.hp = Math.min(n.maxHp, n.hp + choice.value + recovery);
  }
  if (action === 'mercy') n.hp = Math.min(n.maxHp, n.hp + choice.value);
  if (action === 'study') grantExperience(n, choice.value);
  if (action === 'cache' || action === 'leave') grantGold(n, choice.value);
  if (action === 'legacy')
    n = addRelic(
      n,
      { knight: 'paladin', ranger: 'hunter', mage: 'archmage' }[n.classId],
    );
  if (action === 'pilgrim') n.hp = Math.min(n.maxHp, n.hp + choice.value);
  trackArmyPeak(n);
  logRun(n, `命运之约 · ${choice.name}`);
  n = completeRoom(n, false);
  if (action === 'blood' || action === 'pilgrim') {
    n.reward = rollRewards(n, action === 'blood');
    for (const fallback of ELITE_FALLBACK_REWARDS) {
      if (n.reward.length >= 3) break;
      if (!n.reward.includes(fallback.id)) n.reward.push(fallback.id);
    }
    n.phase = 'reward';
  }
  return n;
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
  return Math.max(1, Math.min(ARMY_PROJECTION_LIMIT, Math.floor(n)));
}
export function troopMultiplier(squad: number | ArmyState) {
  const army =
    typeof squad === 'number' ? magnitude(squad) : armyMagnitude(squad);
  return army.exponent < 15
    ? 1 + Math.log2(1 + projectMagnitude(army) / 12)
    : 1 +
        (army.exponent + Math.log10(army.mantissa) - Math.log10(12)) *
          Math.LOG2E *
          Math.LN10;
}
export function firepower(run: Run, shield = 0) {
  const s = stats(run, shield);
  const multiplier = boundedProduct(
    troopMultiplier(run),
    isEndless(run) ? run.endless.legion : 1,
  );
  const volley = s.damage * multiplier;
  return {
    multiplier,
    volley,
    dps: volley * s.rate * (1 + s.crit * (s.critMult - 1)),
  };
}
export function formatNumber(n: number) {
  if (n >= 1e16) return n.toExponential(2).replace('e+', '×10^');
  return n >= 1000000000000
    ? `${(n / 1000000000000).toFixed(1)}兆`
    : n >= 100000000
      ? `${(n / 100000000).toFixed(1)}亿`
      : n >= 10000
        ? `${(n / 10000).toFixed(1)}万`
        : Math.round(n).toLocaleString('zh-CN');
}
export interface GateChoice {
  op: '+' | '×' | '-' | '÷' | '²' | '√';
  value: number;
  armyValue?: Magnitude;
}
export function gateLabel(g: GateChoice) {
  if (g.op === '²') return 'x²';
  if (g.op === '√') return '√x';
  if (g.op === '+' || g.op === '-')
    return `${g.op}${g.armyValue ? formatMagnitude(g.armyValue) : formatNumber(g.value)}`;
  return `${g.op}${Number.isInteger(g.value) ? g.value : g.value.toFixed(2).replace(/0$/, '')}`;
}
// Keep the rolled gate immutable: new runes also affect gates already on screen.
// Both the inscription and crossing resolve this same effective value once.
export function effectiveGate(run: Run, gate: GateChoice): GateChoice {
  const s = stats(run);
  return {
    ...gate,
    armyValue:
      gate.op === '+' && gate.armyValue
        ? addMagnitude(gate.armyValue, magnitude(s.gateAdd))
        : gate.armyValue,
    value:
      gate.op === '×'
        ? Math.round((gate.value + s.gateMult) * 100) / 100
        : gate.op === '+'
          ? gate.value + s.gateAdd
          : gate.value,
  };
}
export function applyGate(
  run: Run,
  gate: GateChoice,
  shield: number,
): { shield: number; delta: number; deltaLabel: string } {
  const old = armyMagnitude(run);
  const oldLabel = formatArmy(run);
  const s = stats(run, shield);
  gate = effectiveGate(run, gate);
  if (gate.op === '+') addArmy(run, gate.armyValue || gate.value);
  if (gate.op === '×') multiplyArmy(run, gate.value);
  if (gate.op === '-') addArmy(run, gate.armyValue || gate.value, true);
  if (gate.op === '÷') multiplyArmy(run, 1 / gate.value);
  if (gate.op === '²') setArmy(run, powerMagnitude(armyMagnitude(run), 2));
  if (gate.op === '√') setArmy(run, powerMagnitude(armyMagnitude(run), 0.5));
  addArmy(run, s.summon);
  trackArmyPeak(run);
  if (gate.op === '+' || gate.op === '×' || gate.op === '²')
    shield += 6 * (run.relics.aegis || 0);
  run.gates++;
  logRun(
    run,
    `${gateLabel(gate)} 之门 · 队伍 ${oldLabel} → ${formatArmy(run)}`,
  );
  const next = armyMagnitude(run);
  const sign = compareMagnitude(next, old);
  const difference =
    sign >= 0 ? addMagnitude(next, old, true) : addMagnitude(old, next, true);
  return {
    shield: Math.min(250, shield),
    delta: sign * projectMagnitude(difference),
    deltaLabel: formatMagnitude(difference),
  };
}
export function restoreRun(text: string): Run | null {
  try {
    const raw = JSON.parse(text);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const legacy = raw.version === 2 || raw.version === 3;
    if (
      (!legacy && raw.version !== 4) ||
      !Number.isInteger(raw.floor) ||
      raw.floor < 0 ||
      raw.floor >=
        (raw.difficulty === 'endless' ? 1000000 : legacy ? 12 : TOTAL_FLOORS) ||
      !Array.isArray(raw.path) ||
      (legacy && raw.path.length !== raw.floor)
    )
      return null;
    const oldFloor = raw.floor;
    if (raw.version === 2 && !Object.hasOwn(raw, 'xp')) raw.xp = 0;
    if (!Object.hasOwn(raw, 'squareGateSeen')) raw.squareGateSeen = false;
    if (!Object.hasOwn(raw, 'encountersDefeated')) raw.encountersDefeated = {};
    if (!Object.hasOwn(raw, 'secretDiscovered')) raw.secretDiscovered = false;
    if (!Object.hasOwn(raw, 'difficulty')) raw.difficulty = 'normal';
    for (const field of ['goldEarned', 'doubleBossWins', 'flawlessBosses']) {
      if (!Object.hasOwn(raw, field)) raw[field] = 0;
      if (!Number.isSafeInteger(raw[field]) || raw[field] < 0) return null;
    }
    if (!['normal', 'hard', 'endless'].includes(raw.difficulty)) return null;
    if (!Object.hasOwn(raw, 'runId')) raw.runId = '';
    if (!Object.hasOwn(raw, 'combatTime')) raw.combatTime = 0;
    if (!Object.hasOwn(raw, 'peakSquad')) raw.peakSquad = raw.squad;
    if (!Object.hasOwn(raw, 'endless')) raw.endless = freshEndless();
    if (raw.devMode === true) return null;
    if (raw.difficulty === 'endless' && raw.ruleset !== 'ascension-v1') {
      if (typeof raw.runId !== 'string' || raw.runId.length > 80) return null;
      // A legacy server record retains its original ruleset and history. The
      // carried build starts a separate private continuation in the new rules.
      raw.runId = crypto.randomUUID();
      raw.legacyContinuation = true;
      raw.ascended = false;
      raw.revivalCoins = raw.revivalCoinsEarned = raw.revivalsUsed = 0;
      raw.checkpointStart = 0;
      raw.journey = [];
      if (raw.floor >= 45) {
        raw.legacyPendingCheckpoint = raw.floor >= 90 ? 90 : 45;
        raw.floor = raw.legacyPendingCheckpoint - 1;
        raw.path = [];
        raw.node = null;
        raw.phase = 'map';
        raw.reward = [];
        raw.purchases = [];
        raw.battleResume = false;
      }
      const message = raw.legacyPendingCheckpoint
        ? `旧长夜的誓装已保留，请重新跨过第${raw.legacyPendingCheckpoint}关的王庭。此行另记私人履历。`
        : '旧长夜的誓装与足迹已保留。新章另记私人履历，旧史册仍在。';
      raw.log = [message, ...(Array.isArray(raw.log) ? raw.log : [])].slice(
        0,
        8,
      );
    }
    raw.ruleset = 'ascension-v1';
    if (
      raw.legacyContinuation !== undefined &&
      (typeof raw.legacyContinuation !== 'boolean' ||
        raw.difficulty !== 'endless')
    )
      return null;
    if (
      raw.legacyPendingCheckpoint !== undefined &&
      (![45, 90].includes(raw.legacyPendingCheckpoint) ||
        raw.difficulty !== 'endless' ||
        raw.floor !== raw.legacyPendingCheckpoint - 1)
    )
      return null;
    for (const field of [
      'revivalCoins',
      'revivalCoinsEarned',
      'revivalsUsed',
      'checkpointStart',
    ]) {
      if (!Object.hasOwn(raw, field)) raw[field] = 0;
      if (!Number.isSafeInteger(raw[field]) || raw[field] < 0) return null;
    }
    if (
      raw.revivalCoinsEarned > 3 ||
      raw.revivalCoins > raw.revivalCoinsEarned ||
      raw.revivalsUsed > 3 ||
      ![0, 46, 91].includes(raw.checkpointStart)
    )
      return null;
    if (!Object.hasOwn(raw, 'ascended')) raw.ascended = false;
    if (
      typeof raw.ascended !== 'boolean' ||
      (raw.ascended && (raw.difficulty !== 'endless' || raw.floor < 100))
    )
      return null;
    if (!Object.hasOwn(raw, 'journey')) raw.journey = [];
    if (
      !Array.isArray(raw.journey) ||
      raw.journey.length > 101 ||
      raw.journey.some(
        (point: Run['journey'] extends (infer P)[] | undefined ? P : never) =>
          !point ||
          !Number.isInteger(point.room) ||
          point.room < 1 ||
          point.room > 101 ||
          ![point.hp, point.maxHp, point.armyLog, point.seconds].every(
            Number.isFinite,
          ) ||
          point.hp < 0 ||
          point.maxHp <= 0 ||
          point.hp > point.maxHp ||
          point.armyLog < 0 ||
          point.seconds < 0,
      )
    )
      return null;
    for (const [field, projection] of [
      ['squadMagnitude', 'squad'],
      ['peakSquadMagnitude', 'peakSquad'],
    ] as const) {
      if (
        raw[field] !== undefined &&
        (!validMagnitude(raw[field]) ||
          projectMagnitude(raw[field]) !== raw[projection])
      )
        return null;
    }
    if (
      typeof raw.runId !== 'string' ||
      raw.runId.length > 80 ||
      !Number.isFinite(raw.combatTime) ||
      raw.combatTime < 0 ||
      !Number.isFinite(raw.peakSquad) ||
      raw.peakSquad > ARMY_PROJECTION_LIMIT ||
      raw.peakSquad < 1
    )
      return null;
    const es = raw.endless;
    if (
      !es ||
      typeof es !== 'object' ||
      !['embers', 'reforges', 'keyLore', 'keysOpened', 'covenantAt'].every(
        (key) => Number.isSafeInteger(es[key]) && es[key] >= 0,
      ) ||
      !['power', 'legion'].every(
        (key) => Number.isFinite(es[key]) && es[key] >= 1 && es[key] <= 1e100,
      ) ||
      !Array.isArray(es.allies) ||
      es.allies.length > 2 ||
      new Set(es.allies).size !== es.allies.length ||
      es.allies.some(
        (id: unknown) =>
          typeof id !== 'string' || !Object.hasOwn(raw.encountersDefeated, id),
      )
    )
      return null;
    if (!Object.hasOwn(raw, 'talentPicks'))
      raw.talentPicks = experience({ xp: Number(raw.xp) || 0 }).level - 1;
    // The old three-column graph has no lossless mapping to explicit edges.
    // Keep resources and earned talents, restart this act, and retain pending loot.
    // An empty path at floor 5/10 is an explicit migrated act checkpoint.
    if (legacy) {
      if (
        !['map', 'reward', 'rest', 'shop', 'event'].includes(raw.phase) ||
        !Array.isArray(raw.reward) ||
        !Array.isArray(raw.purchases)
      )
        return null;
      raw.version = 4;
      raw.floor = Math.floor(oldFloor / 4) * ACT_LENGTH;
      raw.path = [];
      raw.node = null;
      raw.phase = raw.phase === 'reward' ? 'reward' : 'map';
      if (raw.phase !== 'reward') raw.reward = [];
      raw.purchases = [];
    }
    const r = raw as Run;
    // Older chapter rewards could replace flame with legion even when legion
    // already occupied the third slot. Repair only that known generated draft;
    // keep rejecting other duplicate rewards and preserve all saved resources.
    if (
      isEndless(r) &&
      r.phase === 'reward' &&
      r.floor >= 20 &&
      r.floor % 10 === 0 &&
      Array.isArray(r.reward) &&
      r.reward.length === 3 &&
      r.reward[0] === 'abyss-legion' &&
      r.reward[1] === 'abyss-heart' &&
      r.reward[2] === 'abyss-legion'
    )
      r.reward = ['abyss-flame', 'abyss-heart', 'abyss-legion'];
    if (
      r.version !== 4 ||
      typeof r.squareGateSeen !== 'boolean' ||
      typeof r.secretDiscovered !== 'boolean' ||
      !r.encountersDefeated ||
      typeof r.encountersDefeated !== 'object' ||
      Array.isArray(r.encountersDefeated) ||
      !HEROES.some((h) => h.id === r.classId) ||
      ![
        'map',
        'reward',
        'rest',
        'shop',
        'event',
        'fallen',
        'ascension',
        'battle',
      ].includes(r.phase) ||
      !Number.isSafeInteger(r.seed) ||
      !Number.isInteger(r.floor) ||
      r.floor < 0 ||
      r.floor >= (isEndless(r) ? 101 : TOTAL_FLOORS) ||
      !Array.isArray(r.path) ||
      r.path.length > r.floor ||
      ((r.floor - r.path.length) % ACT_LENGTH !== 0 &&
        !r.legacyPendingCheckpoint) ||
      !Array.isArray(r.log) ||
      r.log.length > 50 ||
      r.log.some((entry) => typeof entry !== 'string' || entry.length > 300) ||
      !Array.isArray(r.purchases) ||
      r.purchases.length > SHOP_ITEMS.length ||
      new Set(r.purchases).size !== r.purchases.length ||
      r.purchases.some((id) => !SHOP_ITEMS.some((item) => item.id === id)) ||
      !Array.isArray(r.reward) ||
      r.reward.length > 3 ||
      new Set(r.reward).size !== r.reward.length ||
      !r.relics ||
      typeof r.relics !== 'object' ||
      Array.isArray(r.relics)
    )
      return null;
    const encounters = Object.entries(r.encountersDefeated);
    if (
      encounters.length > 128 ||
      encounters.some(
        ([id, count]) =>
          !id.length ||
          id.length > 80 ||
          ['__proto__', 'constructor', 'prototype'].includes(id) ||
          !Number.isSafeInteger(count) ||
          count < 0 ||
          count > 1000000,
      )
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
      !Number.isInteger(r.talentPicks) ||
      r.talentPicks < 0 ||
      // Migrated builds keep cards earned under the previous, faster XP curve.
      r.talentPicks > MAX_LEVEL - 1 ||
      (r.hp <= 0 && r.phase !== 'fallen') ||
      r.hp > r.maxHp ||
      r.maxHp > hpLimit(r) ||
      r.squad < 1 ||
      !Number.isInteger(r.squad) ||
      r.squad > ARMY_PROJECTION_LIMIT ||
      r.weaponTier < 1 ||
      r.weaponTier > weaponLimit(r) ||
      !Number.isInteger(r.weaponTier) ||
      !['gold', 'kills', 'chests', 'gates'].every((key) =>
        Number.isSafeInteger(r[key as 'gold' | 'kills' | 'chests' | 'gates']),
      )
    )
      return null;
    if (
      Object.entries(r.relics).some(
        ([id, count]) =>
          !RELIC_BY_ID[id] ||
          (RELIC_BY_ID[id].family !== 'all' &&
            RELIC_BY_ID[id].family !== r.classId) ||
          !Number.isInteger(count) ||
          count < 1 ||
          count > RELIC_BY_ID[id].max,
      )
    )
      return null;
    if (
      r.phase === 'ascension' &&
      (!isEndless(r) || r.floor !== 100 || !r.ascended)
    )
      return null;
    if (
      r.phase === 'fallen' &&
      (!isEndless(r) || !r.node || r.hp !== 0 || (r.revivalCoins || 0) < 1)
    )
      return null;
    if (
      r.phase === 'battle' &&
      (!r.battleResume || !isEndless(r) || !r.node || (r.revivalsUsed || 0) < 1)
    )
      return null;
    const offset = isEndless(r)
      ? r.floor >= 100
        ? 100
        : Math.floor(r.floor / TOTAL_FLOORS) * TOTAL_FLOORS
      : 0;
    if (
      isEndless(r) &&
      r.path.length !== (r.legacyPendingCheckpoint ? 0 : r.floor - offset)
    )
      return null;
    r.nodes = createRunMap(r.seed, r.difficulty, r.floor);
    const checkpoint = r.floor - r.path.length;
    let previous: RouteNode | undefined;
    for (const [index, id] of r.path.entries()) {
      const node = r.nodes[checkpoint + index - offset]?.find(
        (n) => n.id === id,
      );
      if (!node || (previous && !previous.next.includes(node.id))) return null;
      previous = node;
    }
    if (r.node) {
      const known = r.nodes.flat().find((n) => n.id === r.node!.id);
      if (!known) return null;
      if (
        r.node.enchanted !== undefined &&
        typeof r.node.enchanted !== 'boolean'
      )
        return null;
      if (
        r.node.enchanted &&
        (known.kind !== 'elite' ||
          !r.squareGateSeen ||
          (!r.relics.square_key && !isEndless(r)))
      )
        return null;
      r.node = { ...known, ...(r.node.enchanted ? { enchanted: true } : {}) };
    }
    if (
      ['fallen', 'battle'].includes(r.phase) &&
      (!r.node ||
        r.node.floor !== r.floor ||
        !availableNodes(r).some((node) => node.id === r.node!.id))
    )
      return null;
    if (
      ['rest', 'shop', 'event'].includes(r.phase) &&
      (!r.node ||
        r.node.floor !== r.floor ||
        r.node.kind !== r.phase ||
        !availableNodes(r).some((node) => node.id === r.node!.id))
    )
      return null;
    if (
      ['map', 'reward'].includes(r.phase) &&
      r.node &&
      r.node.id !== r.path.at(-1)
    )
      return null;
    if (r.reward.some((id) => !Object.hasOwn(REWARD_BY_ID, id))) return null;
    if (r.reward.includes('square_key')) r.reward = rollRewards(r, true);
    if (legacy)
      logRun(
        r,
        `旧存档已迁移 · 原第 ${oldFloor + 1} 层回到第 ${Math.floor(r.floor / ACT_LENGTH) + 1} 幕起点；构筑、金币、经验与待领战利品保留。`,
      );
    return r;
  } catch {
    return null;
  }
}

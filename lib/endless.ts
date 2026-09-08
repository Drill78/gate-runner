import type { Run, Relic } from './game';
type EncounterId = string;

export interface EndlessState {
  embers: number;
  reforges: number;
  power: number;
  legion: number;
  keyLore: number;
  keysOpened: number;
  allies: EncounterId[];
  covenantAt: number;
}
export const freshEndless = (): EndlessState => ({
  embers: 0,
  reforges: 0,
  power: 1,
  legion: 1,
  keyLore: 0,
  keysOpened: 0,
  allies: [],
  covenantAt: 0,
});
export const isEndless = (run: Pick<Run, 'difficulty'>) =>
  run.difficulty === 'endless';
export const localFloor = (run: Pick<Run, 'difficulty' | 'floor'>) =>
  isEndless(run) ? run.floor % 15 : run.floor;
export const actIndex = (run: Pick<Run, 'difficulty' | 'floor'>) =>
  Math.min(2, Math.floor(localFloor(run) / 5));
export const hpLimit = (run: Pick<Run, 'difficulty'>) =>
  isEndless(run) ? 1e12 : 1200;
export const weaponLimit = (run: Pick<Run, 'difficulty'>) =>
  isEndless(run) ? 10000 : 25;
// Log-space growth remains finite even after very long expeditions.
export const boundedProduct = (a: number, b: number) => Math.min(1e100, a * b);
export function depthHealth(run: Pick<Run, 'difficulty' | 'floor'>) {
  if (!isEndless(run) || run.floor < 15) return 1;
  // Replace the campaign's exponential reset with a continuous post-throne curve.
  const depth = run.floor - 14;
  const growth =
    Math.min(depth, 16) * Math.log(1.058) +
    Math.min(30, Math.max(0, depth - 16)) * Math.log(1.075) +
    Math.max(0, depth - 46) * Math.log(1.095);
  return Math.exp(
    Math.min(210, Math.log(1.26) * (14 - localFloor(run)) + growth),
  );
}
export function depthIncome(run: Pick<Run, 'difficulty' | 'floor'>) {
  return isEndless(run)
    ? Math.min(1e9, Math.pow(1.045, Math.min(480, Math.max(0, run.floor - 14))))
    : 1;
}
export type BossMutation = 'ashen' | 'frenzied' | 'hollow' | 'fusion';
export interface EndlessEncounter {
  name: string;
  omen: string;
  groups: EncounterId[][];
  mutation?: BossMutation;
}
export function endlessEncounter(
  run: Pick<Run, 'difficulty' | 'floor' | 'seed'>,
): EndlessEncounter | null {
  if (!isEndless(run) || run.floor < 19 || run.floor % 5 !== 4) return null;
  const chapter = Math.floor((run.floor - 19) / 5);
  const variants: EndlessEncounter[] = [
    {
      name: '双誓守陵',
      omen: '两道誓言，在同一座坟前醒来。',
      groups: [['watcher', 'wyvern']],
    },
    {
      name: '不息追猎',
      omen: '第一声钟响之后，尚有脚步逼近。',
      groups: [['commander'], ['lich'], ['oracle']],
      mutation: 'ashen',
    },
    {
      name: '王影相噬',
      omen: '王座只有一座，归来的王却有两位。',
      groups: [['king', 'king']],
    },
    {
      name: '血月畸变',
      omen: '血月缝合了伤口，也唤醒了另一颗心。',
      groups: [['broodmother', 'hexblade']],
      mutation: 'frenzied',
    },
    {
      name: '合葬圣体',
      omen: '同一个胸腔中，响起两位君主的祷词。',
      groups: [['king']],
      mutation: 'fusion',
    },
    {
      name: '无冠王庭',
      omen: '三盏烛火，为一个闯入者点亮。',
      groups: [['watcher', 'lich', 'king']],
      mutation: 'hollow',
    },
    {
      name: '长夜加冕',
      omen: '不要在第一位王倒下时，放下武器。',
      groups: [['king'], ['wyvern', 'oracle'], ['king', 'king']],
      mutation: 'ashen',
    },
    {
      name: '畸星巡礼',
      omen: '群星坠入墓穴，旧日的守门人正在蜕皮。',
      groups: [
        ['stonewarden', 'broodmother'],
        ['lich', 'king'],
      ],
      mutation: 'fusion',
    },
  ];
  // Teach each encounter once, then shuffle deterministic late-night surprises.
  const index =
    chapter < variants.length
      ? chapter
      : (Math.imul(chapter + 1, 1664525) + run.seed) >>> 0;
  return variants[index % variants.length];
}

export const ENDLESS_REWARDS: Relic[] = [
  {
    id: 'abyss-flame',
    name: '续燃薪火',
    family: 'all',
    tag: '长夜契约',
    rarity: '史诗',
    desc: '本次远征的伤害永久提高 24%。焚印后仍保留。',
    max: 1,
    icon: 'flame',
  },
  {
    id: 'abyss-legion',
    name: '万军回声',
    family: 'all',
    tag: '长夜契约',
    rarity: '史诗',
    desc: '兵力对伤害的贡献倍率提高 30%，立即补充一半现有兵力。',
    max: 1,
    icon: 'flag',
  },
  {
    id: 'abyss-heart',
    name: '不熄圣血',
    family: 'all',
    tag: '长夜契约',
    rarity: '史诗',
    desc: '生命上限提高 22%，恢复 45% 最大生命。',
    max: 1,
    icon: 'heart',
  },
  {
    id: 'abyss-reforge',
    name: '焚印重铸',
    family: 'all',
    tag: '薪火轮回',
    rarity: '传说',
    desc: '焚毁所有普通符文；每层化作 8% 永存伤害，再获三层淬火钢刃与本职业三项符文。武器、生命、契约及侍从保留。',
    max: 1,
    icon: 'spark',
  },
  {
    id: 'abyss-lore',
    name: '深门残章',
    family: 'all',
    tag: '禁忌秘闻',
    rarity: '传说',
    desc: '读懂更深一重的门。开启已有禁门后，渡鸦将出售下一把秘钥：6,666、66,666……',
    max: 1,
    icon: 'key',
  },
  {
    id: 'abyss-bind',
    name: '失冠者之誓',
    family: 'all',
    tag: '王庭盟约',
    rarity: '传说',
    desc: '与一位已击败的首领缔结盟誓。每 8 秒发动一次随你成长的援击；至多两位同行。',
    max: 1,
    icon: 'crown',
  },
];
export function covenantChoices(run: Run): string[] {
  const choices = ['abyss-flame', 'abyss-heart', 'abyss-legion'];
  const layers = Object.entries(run.relics).reduce(
    (sum, [id, n]) => sum + (id === 'square_key' ? 0 : n),
    0,
  );
  const special: string[] = [];
  if (run.floor >= 20 && layers >= 18) special.push('abyss-reforge');
  if (run.floor >= 20 && run.endless.keyLore <= run.endless.keysOpened)
    special.push('abyss-lore');
  if (
    run.floor >= 20 &&
    run.endless.allies.length < (run.floor >= 40 ? 2 : 1) &&
    Object.keys(run.encountersDefeated).some(
      (id) => !run.endless.allies.includes(id as EncounterId),
    )
  )
    special.push('abyss-bind');
  if (special.length)
    choices[2] =
      special[(Math.floor(run.floor / 5) + run.seed) % special.length];
  // Alternate the repeatable offer so legion growth is not crowded out by special contracts.
  if (run.floor % 10 === 0) choices[0] = 'abyss-legion';
  return choices;
}

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
  if (!isEndless(run)) return 1;
  return healthGrowth(run, 1.26) / Math.pow(1.26, localFloor(run));
}
export const ENDLESS_CURVE = {
  bandSize: 15,
  openingBase: 1.26,
  // Relative to the last room of the opening round. Only rounds III and VI
  // deliberately make a sharp jump; the other rounds grow linearly inside it.
  roundHealth: [0, 1.35, 5.4, 7.3, 9.9, 32.4],
  withinRoundGrowth: 0.32,
  roundDamage: [1, 1.1, 1.38, 1.5, 1.65, 2.12],
  stairHealth: [34, 36, 39, 43, 47, 51, 55, 59, 67, 74],
  stairDamage: [2.05, 2.08, 2.12, 2.12, 2.16, 2.18, 2.2, 2.24, 2.28, 1.72],
} as const;
export const ENDLESS_ROOMS = 100;
export const CELEBRATION_ROOM = 101;
export const endlessRound = (floor: number) =>
  Math.min(6, Math.floor(Math.max(0, floor) / 15) + 1);
export const isAscensionStair = (run: Pick<Run, 'difficulty' | 'floor'>) =>
  isEndless(run) && run.floor >= 90 && run.floor < 100;
export function healthGrowth(
  run: Pick<Run, 'difficulty' | 'floor'>,
  campaignBase: number,
) {
  if (!isEndless(run)) return Math.pow(campaignBase, run.floor);
  const c = ENDLESS_CURVE;
  if (run.floor < c.bandSize) return c.openingBase ** run.floor;
  const openingEnd = c.openingBase ** 14;
  // Old saves past the former endless limit still get a finite budget while
  // their migration sends them back to the staircase. There is no new cycle.
  if (run.floor >= 90)
    return openingEnd * c.stairHealth[Math.min(9, run.floor - 90)];
  const band = Math.floor(run.floor / c.bandSize);
  return (
    openingEnd *
    c.roundHealth[band] *
    (1 + (c.withinRoundGrowth * (run.floor % c.bandSize)) / 14)
  );
}
export function depthDamage(run: Pick<Run, 'difficulty' | 'floor'>) {
  if (!isEndless(run)) return 1;
  if (run.floor >= 90)
    return ENDLESS_CURVE.stairDamage[Math.min(9, run.floor - 90)];
  return ENDLESS_CURVE.roundDamage[Math.floor(Math.max(0, run.floor) / 15)];
}
export function depthIncome(run: Pick<Run, 'difficulty' | 'floor'>) {
  return isEndless(run)
    ? Math.min(1e9, Math.pow(1.045, Math.min(480, Math.max(0, run.floor - 14))))
    : 1;
}
// hollow is accepted only to read old saves; new encounters use golden.
export type BossMutation =
  | 'ashen'
  | 'frenzied'
  | 'golden'
  | 'fusion'
  | 'angelic'
  | 'hollow';
export interface EndlessEncounter {
  name: string;
  omen: string;
  groups: EncounterId[][];
  mutation?: BossMutation;
  mutations?: (BossMutation | undefined)[][];
  secondLives?: boolean;
}
export function endlessEncounter(
  run: Pick<Run, 'difficulty' | 'floor' | 'seed'>,
): EndlessEncounter | null {
  if (!isEndless(run) || run.floor < 0 || run.floor >= 100) return null;
  if (run.floor >= 90) return staircaseEncounter(run.floor + 1);
  if (run.floor % 5 !== 4) return null;
  const round = endlessRound(run.floor);
  const chapter = Math.floor((run.floor % 15) / 5);
  const hash = (Math.imul(run.floor + 1, 1664525) + run.seed) >>> 0;
  const mutations: BossMutation[] = ['ashen', 'frenzied', 'golden', 'fusion'];
  if (chapter === 2) {
    const finals: EndlessEncounter[] = [
      {
        name: '余烬复王',
        omen: '王冠落地，王的誓言却尚未燃尽。',
        groups: [['king']],
        secondLives: true,
      },
      {
        name: '重叠的王座',
        omen: '一位王的葬钟，唤来另一位王的脚步。',
        groups: [['king'], ['king']],
        secondLives: true,
      },
      {
        name: '双日同陨',
        omen: '两轮黑日升起。别让其中一轮遮住另一轮的火。',
        groups: [['king', 'king']],
        secondLives: true,
      },
      {
        name: '四劫王庭',
        omen: '黑影、血月、金身与合葬，依次献上旧世界最后的誓言。',
        groups: [
          ['watcher', 'executioner'],
          ['lich', 'hexblade'],
          ['wyvern', 'stonewarden'],
          ['oracle', 'broodmother'],
        ],
        mutations: [
          ['ashen', 'ashen'],
          ['frenzied', 'frenzied'],
          ['golden', 'golden'],
          ['fusion', 'fusion'],
        ],
        secondLives: true,
      },
      {
        name: '三度焚冠',
        omen: '三位王接过同一簇火；每一顶冠冕都将重燃一次。',
        groups: [['king'], ['king'], ['king']],
        mutations: [['ashen'], ['frenzied'], ['golden']],
        secondLives: true,
      },
      {
        name: '旧世的最后守门人',
        omen: '四位守门人之后，三顶异色王冠同时点燃。踏过这里，天阶才会显现。',
        groups: [
          ['watcher', 'lich'],
          ['wyvern', 'oracle'],
          ['king', 'king', 'king'],
        ],
        mutations: [
          ['ashen', 'frenzied'],
          ['golden', 'fusion'],
          ['ashen', 'frenzied', 'golden'],
        ],
        secondLives: true,
      },
    ];
    return finals[round - 1];
  }
  const pair = chapter === 0 ? ['watcher', 'wyvern'] : ['lich', 'oracle'];
  if (round <= 2)
    return {
      name: chapter === 0 ? '双誓守陵' : '蚀月双相',
      omen:
        chapter === 0
          ? '风暴与荆棘，共守一条归途。'
          : '两道预言，在同一轮死去的月下相遇。',
      groups: [pair],
      secondLives: true,
    };
  let groups: string[][];
  if (round === 3) groups = hash % 2 ? [pair] : pair.map((id) => [id]);
  else if (round < 6) {
    const elites =
      chapter === 0
        ? ['commander', 'hexblade']
        : ['stonewarden', 'broodmother'];
    groups = [[pair[hash % pair.length], ...elites]];
  } else
    groups =
      hash % 2
        ? [[...pair, 'executioner']]
        : [
            [pair[0], 'commander'],
            [pair[1], 'hexblade'],
          ];
  return {
    name: round === 3 ? '异誓醒转' : round < 6 ? '失落的仪仗' : '终夜围猎',
    omen:
      round === 3
        ? '古老的敌人披上异色；留意黑影、血光与金色护佑的退潮。'
        : round < 6
          ? '守门人的身旁，仍有不肯放下兵刃的近卫。'
          : '这已是旧世最后的防线。每一束异光都有破绽。',
    groups,
    mutations: groups.map((group, stage) =>
      group.map((_, i) => mutations[(hash + stage + i) % mutations.length]),
    ),
    secondLives: true,
  };
}

function staircaseEncounter(room: number): EndlessEncounter {
  const groups: string[][][] = [
    [['executioner']],
    [['commander'], ['hexblade']],
    [['stonewarden', 'broodmother']],
    [['watcher']],
    [['wyvern']],
    [['lich']],
    [['oracle']],
    [['king']],
    [['king-ascendant']],
    [['deity']],
  ];
  const names = [
    '断罪之翼',
    '双刃洗礼',
    '石与丝的圣歌',
    '荆冠圣门',
    '天穹折翼',
    '不朽月冕',
    '最后的预言',
    '灰烬圣徒',
    '日冕之上的王',
    '万光之源',
  ];
  const index = room - 91;
  return {
    name: names[index],
    omen:
      room < 99
        ? '白翼护佑着尚未离去的灵魂。击破后，守过十息狂潮，等待圣约碎裂。'
        : room === 99
          ? '他已舍弃灰烬，却仍未放下王冠。跨过两重日冕，听见天穹的回声。'
          : '不再是征服。一百道门后，所有曾与你同行的微光，将一同作答。',
    groups: groups[index],
    mutation: room < 99 ? 'angelic' : undefined,
    secondLives: room === 99,
  };
}

export const ENDLESS_ECONOMY = {
  flameGain: 0.18,
  reforgePerLayer: 0.08,
  reforgeDiminishing: 0.6,
} as const;
export function reforgeGain(layers: number, previousReforges: number) {
  return (
    (Math.max(0, layers) * ENDLESS_ECONOMY.reforgePerLayer) /
    (1 + Math.max(0, previousReforges) * ENDLESS_ECONOMY.reforgeDiminishing)
  );
}
export const ENDLESS_REWARDS: Relic[] = [
  {
    id: 'abyss-flame',
    name: '续燃薪火',
    family: 'all',
    tag: '长夜契约',
    rarity: '史诗',
    desc: '本次远征的伤害永久提高 18%。焚印后仍保留。',
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
    desc: '焚毁普通符文，转为永存伤害；首铸每层8%，此后按已重铸次数逐渐衰减。再获三层淬火钢刃与本职业三项符文，保留武器、生命、契约与侍从。',
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

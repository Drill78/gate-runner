import {
  createRun,
  createRunMap,
  firepower,
  type ClassId,
  type Difficulty,
  type Run,
} from './game.ts';
import { setArmy } from './army.ts';
import {
  endlessEncounter,
  type BossMutation,
  type EndlessEncounter,
} from './endless.ts';

export type CheckpointRoom = 46 | 91;
export const CHECKPOINT_PRESETS = {
  46: {
    weapon: 48,
    hpByClass: { knight: 420, ranger: 360, mage: 340 },
    armyExponent: 18,
    legion: 1.3,
    dps: 140000,
    gold: 900,
  },
  91: {
    weapon: 90,
    hpByClass: { knight: 400, ranger: 560, mage: 540 },
    armyExponent: 42,
    legion: 1.7,
    dps: 1600000,
    gold: 1600,
  },
} as const;
const COMMON_RUNES = {
  steel: 3,
  split: 1,
  focus: 1,
  vampire: 1,
  velocity: 1,
  mirror: 1,
  lifebloom: 1,
};
const CLASS_RUNES: Record<ClassId, Record<string, number>> = {
  knight: { bash: 1, paladin: 1, bulwark: 2, aegis: 1, plate: 2 },
  ranger: { hunter: 1, quiver: 2, keen: 2, deadeye: 1 },
  mage: { surge: 2, archmage: 1, echo: 1, ward: 2, ember: 1 },
};

/** The two recovery builds are deliberately fixed budgets, not copies of the
 * defeated army. Coin accounting, identity and earned checkpoint progress are
 * transferred by the caller; this factory never grants any of them. */
export function createCheckpointRun(
  classId: ClassId,
  startRoom: CheckpointRoom,
  seed = 721604,
): Run {
  const preset = CHECKPOINT_PRESETS[startRoom];
  const run = createRun(classId, seed, 'endless');
  run.floor = startRoom - 1;
  run.phase = 'map';
  run.nodes = createRunMap(seed, 'endless', run.floor);
  run.xp = 40000;
  run.talentPicks = 14;
  run.weaponTier = preset.weapon;
  run.maxHp = preset.hpByClass[classId];
  run.hp = run.maxHp;
  run.relics = { ...COMMON_RUNES, ...CLASS_RUNES[classId] };
  run.gold = preset.gold;
  run.endless.legion = preset.legion;
  setArmy(run, { mantissa: 1, exponent: preset.armyExponent });
  // The stat budget is class-neutral before temporary skill windows; actual
  // shield interactions, aim, critical bursts and survival still differ.
  run.endless.power = preset.dps / firepower(run).dps;
  run.log = [
    startRoom === 46
      ? '余火重聚。以新的誓言，踏上第四重远征。'
      : '群星替你守住了这一级阶梯。白翼之外，仍有人在等你。',
  ];
  return run;
}

export interface DeveloperPreset {
  id: string;
  name: string;
  description: string;
  room: number;
  difficulty?: Difficulty;
  encounter?: EndlessEncounter;
}
export const DEVELOPER_PRESETS: DeveloperPreset[] = [
  {
    id: 'hard-king',
    name: '复燃王座',
    description: '困难第15关 · 两条命与两次不可跳过的突入。',
    room: 15,
    difficulty: 'hard',
    encounter: {
      name: '复燃王座',
      omen: '余烬之王将再次起身。',
      groups: [['king']],
      secondLives: true,
    },
  },
  {
    id: 'round-three',
    name: '第三轮 · 双日同陨',
    description: '第45关 · 双王与各自的第二条命。',
    room: 45,
  },
  {
    id: 'round-four',
    name: '第四轮 · 预设续战',
    description: '从第46关正常选择路线；使用复生时相同的构筑。',
    room: 46,
  },
  {
    id: 'four-calamities',
    name: '第四轮 · 四劫王庭',
    description: '第60关 · 四种异化首领与近卫连战。',
    room: 60,
  },
  {
    id: 'three-crowns',
    name: '第五轮 · 三度焚冠',
    description: '第75关 · 三位不同异化王连续复燃。',
    room: 75,
  },
  {
    id: 'round-six',
    name: '第六轮 · 终夜守门人',
    description: '第90关 · 两组双首领，随后三王同时登场。',
    room: 90,
  },
  {
    id: 'staircase',
    name: '登神长阶 · 完整流程',
    description: '从第91关连续体验十场战斗、完美结算与祝福尾声。',
    room: 91,
  },
  {
    id: 'ascendant',
    name: '日冕之上的王',
    description: '第99关 · 登神王的两重日冕。',
    room: 99,
  },
  {
    id: 'deity',
    name: '万光之源',
    description: '第100关 · 主神演出与通关流程。',
    room: 100,
  },
];

export function createDeveloperRun(
  classId: ClassId,
  preset: DeveloperPreset,
  seed = 721604,
): Run {
  const run = createCheckpointRun(classId, preset.room < 76 ? 46 : 91, seed);
  run.difficulty = preset.difficulty || 'endless';
  run.floor = Math.max(0, Math.min(99, preset.room - 1));
  run.nodes = createRunMap(seed, run.difficulty, run.floor);
  run.path = [];
  run.node = null;
  run.devMode = true;
  if (preset.encounter) run.devEncounter = structuredClone(preset.encounter);
  if (preset.room <= 15) {
    run.weaponTier = 20;
    run.endless.power = 1;
    run.endless.legion = 1;
    setArmy(run, { mantissa: 1, exponent: classId === 'mage' ? 7 : 6 });
    run.maxHp = run.hp = classId === 'knight' ? 260 : 220;
  }
  // Non-chapter entry points are intentional developer anchors. No fake route
  // history or wins are manufactured: use an isolated one-row test map.
  if (run.floor % 5 !== 0 || preset.encounter) {
    const node = run.nodes
      .find((row) => row[0]?.floor === run.floor)
      ?.find((n) => n.kind === 'boss') || {
      id: `${run.floor}-2`,
      floor: run.floor,
      col: 2,
      kind: 'boss' as const,
      next: [],
    };
    run.node = { ...node, kind: 'boss' };
    run.phase = 'battle';
    // Dedicated ruler tests start at the actual encounter. Full-route presets
    // still retain their normal maps, waves, rewards and economy.
    if (!run.devEncounter && run.floor < 90) {
      const encounter = endlessEncounter(run);
      if (encounter) run.devEncounter = structuredClone(encounter);
    }
  }
  return run;
}

export function customBossPreset(
  id: string,
  mutation?: BossMutation,
  secondLives = true,
): DeveloperPreset {
  return {
    id: `boss-${id}-${mutation || 'plain'}`,
    name: '首领演武',
    description: '独立试炼，不进入公开史册。',
    room:
      id === 'deity'
        ? 100
        : id === 'king-ascendant'
          ? 99
          : mutation === 'angelic'
            ? 91
            : 45,
    encounter: {
      name: '首领演武',
      omen: '此处是记忆中的战场。',
      groups: [[id]],
      mutation,
      secondLives,
    },
  };
}

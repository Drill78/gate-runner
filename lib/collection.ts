import { ENCOUNTERS } from './bosses.ts';
import { HEROES, type ClassId, type Run } from './game.ts';

export interface CollectionProgress {
  version: 1;
  kills: Record<string, number>;
  wins: Record<ClassId, number>;
  secrets: string[];
}

const CLASS_IDS: readonly ClassId[] = ['knight', 'ranger', 'mage'];
const SECRET_IDS = ['forbidden-key'] as const;

export function emptyCollection(): CollectionProgress {
  return {
    version: 1,
    kills: {},
    wins: { knight: 0, ranger: 0, mage: 0 },
    secrets: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function normalizeCollection(value: unknown): CollectionProgress {
  const result = emptyCollection();
  if (!isRecord(value) || value.version !== 1) return result;
  if (isRecord(value.kills)) {
    for (const encounter of ENCOUNTERS) {
      const count = value.kills[encounter.id];
      if (validCount(count) && count > 0) result.kills[encounter.id] = count;
    }
  }
  if (isRecord(value.wins)) {
    for (const classId of CLASS_IDS) {
      const count = value.wins[classId];
      if (validCount(count)) result.wins[classId] = count;
    }
  }
  const secrets = value.secrets;
  if (Array.isArray(secrets))
    result.secrets = SECRET_IDS.filter((id) => secrets.includes(id));
  return result;
}

export function parseCollection(raw: string | null): CollectionProgress {
  if (!raw) return emptyCollection();
  try {
    return normalizeCollection(JSON.parse(raw));
  } catch {
    return emptyCollection();
  }
}

/** The caller commits each battle delta and completed victory once. */
export function mergeCollection(
  progress: CollectionProgress,
  run: Pick<Run, 'classId' | 'phase'> & { secretDiscovered?: boolean },
  earnedEncounterKills: Record<string, number> = {},
): CollectionProgress {
  const next = normalizeCollection(progress);
  for (const encounter of ENCOUNTERS) {
    const earned = earnedEncounterKills[encounter.id];
    if (!validCount(earned) || earned === 0) continue;
    next.kills[encounter.id] = Math.min(
      Number.MAX_SAFE_INTEGER,
      (next.kills[encounter.id] || 0) + earned,
    );
  }
  if (run.phase === 'victory' && CLASS_IDS.includes(run.classId))
    next.wins[run.classId] = Math.min(
      Number.MAX_SAFE_INTEGER,
      next.wins[run.classId] + 1,
    );
  if (run.secretDiscovered === true && !next.secrets.includes('forbidden-key'))
    next.secrets.push('forbidden-key');
  return next;
}

type AchievementRule =
  | { type: 'encounter'; encounterId: string }
  | { type: 'class-win'; classId: ClassId }
  | { type: 'first-win' }
  | { type: 'all-classes' }
  | { type: 'encounter-set'; kind: 'elite' | 'boss' }
  | { type: 'secret'; secretId: string };

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  hidden?: boolean;
  rule: AchievementRule;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  ...ENCOUNTERS.map(
    (encounter): AchievementDefinition => ({
      id: `defeat-${encounter.id}`,
      title: `征服 · ${encounter.name}`,
      description: `首次击败${encounter.name}。`,
      rule: { type: 'encounter', encounterId: encounter.id },
    }),
  ),
  ...HEROES.map(
    (hero): AchievementDefinition => ({
      id: `victory-${hero.id}`,
      title: `${hero.name}的凯旋`,
      description: `使用${hero.name}完成一次远征。`,
      rule: { type: 'class-win', classId: hero.id },
    }),
  ),
  {
    id: 'first-victory',
    title: '穿过最后一道门',
    description: '首次完成远征。',
    rule: { type: 'first-win' },
  },
  {
    id: 'all-classes',
    title: '三种誓言',
    description: '使用三个职业分别完成远征。',
    rule: { type: 'all-classes' },
  },
  {
    id: 'all-elites',
    title: '精英征服者',
    description: '击败所有种类的精英。',
    rule: { type: 'encounter-set', kind: 'elite' },
  },
  {
    id: 'all-bosses',
    title: '众王的终章',
    description: '击败所有种类的章节首领。',
    rule: { type: 'encounter-set', kind: 'boss' },
  },
  {
    id: 'forbidden-key',
    title: '门后的低语',
    description: '在远征中发现古老钥匙的秘密。',
    hidden: true,
    rule: { type: 'secret', secretId: 'forbidden-key' },
  },
];

export interface AchievementState {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  unlocked: boolean;
  concealed: boolean;
}

function achievementCount(
  rule: AchievementRule,
  progress: CollectionProgress,
): { current: number; target: number } {
  switch (rule.type) {
    case 'encounter':
      return { current: progress.kills[rule.encounterId] || 0, target: 1 };
    case 'class-win':
      return { current: progress.wins[rule.classId], target: 1 };
    case 'first-win':
      return {
        current: CLASS_IDS.some((id) => progress.wins[id] > 0) ? 1 : 0,
        target: 1,
      };
    case 'all-classes':
      return {
        current: CLASS_IDS.filter((id) => progress.wins[id] > 0).length,
        target: CLASS_IDS.length,
      };
    case 'encounter-set': {
      const encounters = ENCOUNTERS.filter((e) => e.kind === rule.kind);
      return {
        current: encounters.filter((e) => (progress.kills[e.id] || 0) > 0)
          .length,
        target: Math.max(1, encounters.length),
      };
    }
    case 'secret':
      return {
        current: progress.secrets.includes(rule.secretId) ? 1 : 0,
        target: 1,
      };
  }
}

/** Concealed achievements expose no title or condition until unlocked. */
export function getAchievementStates(
  progress: CollectionProgress,
): AchievementState[] {
  const clean = normalizeCollection(progress);
  return ACHIEVEMENTS.map((achievement) => {
    const { current, target } = achievementCount(achievement.rule, clean);
    const unlocked = current >= target;
    const concealed = !!achievement.hidden && !unlocked;
    return {
      id: achievement.id,
      title: concealed ? '???' : achievement.title,
      description: concealed ? '???' : achievement.description,
      current: concealed ? 0 : Math.min(current, target),
      target,
      unlocked,
      concealed,
    };
  });
}

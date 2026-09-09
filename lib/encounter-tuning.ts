import type { Run } from './game.ts';

type Depth = Pick<Run, 'floor' | 'difficulty'>;
export function combatRound(run: Depth) {
  return run.difficulty === 'endless'
    ? Math.min(5, Math.floor(Math.max(0, run.floor) / 15))
    : 0;
}
export function hordeSize(run: Depth, wave: number) {
  if (run.floor >= 90 && run.difficulty === 'endless') return 1;
  if (run.floor === 0 && wave < 3) return 1;
  const openingChapters = Math.min(2, Math.floor(Math.max(0, run.floor) / 5));
  return Math.min(9, 2 + openingChapters + combatRound(run));
}
export function troopHealthTuning(run: Depth) {
  const chapter = Math.floor((run.floor % 15) / 5);
  return (
    [1, 1.2, 1.55, 1.9, 2.35, 3][combatRound(run)] * [1, 1.1, 1.2][chapter]
  );
}
export function rulerHealthTuning(run: Depth, chapterBoss: boolean) {
  if (run.difficulty === 'endless' && run.floor >= 90)
    return run.floor === 98 ? 1.15 : 1;
  return (
    chapterBoss
      ? [1, 1.12, 1.35, 1.5, 1.75, 2]
      : [1.05, 1.25, 1.5, 1.8, 2.2, 2.6]
  )[combatRound(run)];
}
export function enemyDamageTuning(run: Depth) {
  if (run.difficulty === 'endless' && run.floor >= 90)
    return run.floor === 99 ? 1 : 1.24;
  const chapter = Math.floor((run.floor % 15) / 5);
  return (
    [1.04, 1.12, 1.22, 1.28, 1.34, 1.4][combatRound(run)] *
    (combatRound(run) === 0 ? [1, 1.04, 1.08][chapter] : 1)
  );
}
export function eliteDamageReduction(run: Depth) {
  if (run.difficulty === 'endless' && run.floor >= 90) return 0;
  return [0.18, 0.22, 0.28, 0.32, 0.36, 0.4][combatRound(run)];
}

import { ENCOUNTERS, bossProfile } from './bosses.ts';
import { arrivalDuration, type Battle } from './combat.ts';

/** Every living ruler in the current encounter gets its own uninterrupted entrance. */
export function arrivalRoster(battle: Battle) {
  if (battle.epilogue) return [];
  return battle.entities
    .filter(
      (entity) =>
        entity.boss && !entity.done && (entity.stage || 0) === battle.rushStage,
    )
    .map((entity) => {
      const base =
        ENCOUNTERS.find((profile) => profile.id === entity.encounterId) ||
        bossProfile(battle.player);
      return {
        key: `${battle.rushStage}-${entity.id}`,
        profile: { ...base, name: entity.name || base.name },
        duration: arrivalDuration(entity.encounterId),
      };
    });
}
export type ArrivalCard = ReturnType<typeof arrivalRoster>[number];

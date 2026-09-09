import { ENCOUNTERS, bossProfile } from './bosses.ts';
import {
  arrivalDuration,
  type Battle,
  type BattleTransition,
} from './combat.ts';

function arrivalIdentity(encounterId: string, form?: 'solar' | 'eclipse') {
  return form === 'eclipse' ? `${encounterId}:eclipse` : encounterId;
}

export function seenArrivals(battle: Battle) {
  const seen = new Set<string>();
  for (const [id, count] of Object.entries(battle.player.encountersDefeated)) {
    if (count <= 0) continue;
    seen.add(id);
    if (id === 'king-ascendant') seen.add(`${id}:eclipse`);
  }
  return seen;
}

export function mandatoryArrivalRoom(battle: Battle) {
  const room = battle.player.floor + 1;
  return (room <= 90 && room % 15 === 0) || (room >= 91 && room <= 100);
}

export interface ArrivalCard {
  key: string;
  identity: string;
  profile: ReturnType<typeof bossProfile>;
  duration: number;
  skippable: boolean;
  form?: 'solar' | 'eclipse';
  transitionSeq?: number;
}

/** Resolve in display order: a duplicate after its first full entrance is known. */
export function arrivalRoster(
  battle: Battle,
  shown = seenArrivals(battle),
): ArrivalCard[] {
  if (battle.epilogue) return [];
  const planned = new Set(shown);
  return battle.entities
    .filter(
      (entity) =>
        entity.boss && !entity.done && (entity.stage || 0) === battle.rushStage,
    )
    .map((entity) => {
      const base =
        ENCOUNTERS.find((profile) => profile.id === entity.encounterId) ||
        bossProfile(battle.player);
      const identity = arrivalIdentity(base.id, entity.ascendantForm);
      const skippable = !mandatoryArrivalRoom(battle) && planned.has(identity);
      planned.add(identity);
      return {
        key: `${battle.rushStage}-${entity.id}`,
        identity,
        profile: { ...base, name: entity.name || base.name },
        duration: arrivalDuration(entity.encounterId),
        skippable,
        form: entity.ascendantForm,
      };
    });
}

export function transitionArrivalCard(
  battle: Battle,
  transition: BattleTransition,
  shown: ReadonlySet<string>,
): ArrivalCard | null {
  if (transition.kind !== 'revival') return null;
  const base =
    ENCOUNTERS.find((profile) => profile.id === transition.encounterId) ||
    bossProfile(battle.player);
  const entity = battle.entities.find(
    (entry) => entry.id === transition.entityId,
  );
  const identity = arrivalIdentity(base.id, transition.form);
  return {
    key: `revival-${transition.seq}`,
    identity,
    profile: { ...base, name: entity?.name || base.name },
    duration: transition.duration,
    form: transition.form,
    transitionSeq: transition.seq,
    skippable: !mandatoryArrivalRoom(battle) && shown.has(identity),
  };
}

/** One request can consume only the visible card; stale/repeated input is harmless. */
export class ArrivalSequence {
  private cards: ArrivalCard[] = [];
  remaining = 0;
  readonly shown: Set<string>;
  constructor(shown: Set<string>) {
    this.shown = shown;
  }
  get current() {
    return this.cards[0] || null;
  }
  start(cards: ArrivalCard[]) {
    this.cards = [...cards];
    this.activate();
  }
  private activate() {
    const card = this.current;
    this.remaining = card?.duration || 0;
    if (card) this.shown.add(card.identity);
  }
  private finish() {
    this.cards.shift();
    this.activate();
  }
  tick(dt: number, frozen = false) {
    if (frozen || !this.current || !Number.isFinite(dt) || dt <= 0)
      return false;
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining > 1e-8) return false;
    this.finish();
    return true;
  }
  skip(key: string, frozen = false) {
    if (frozen || this.current?.key !== key || !this.current.skippable)
      return false;
    this.finish();
    return true;
  }
}

export function skipTransitionArrival(
  battle: Battle,
  card: ArrivalCard | null,
  key: string,
  frozen = false,
) {
  const transition = battle.transition;
  if (
    frozen ||
    !transition ||
    !card?.skippable ||
    card.key !== key ||
    card.transitionSeq !== transition?.seq ||
    transition.kind !== 'revival' ||
    transition.remaining <= 0
  )
    return false;
  // Let the engine finish this transition and activate any queued one itself.
  transition.remaining = 0;
  return true;
}

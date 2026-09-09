// The supplied MP3 contains 3,480 MPEG-2 Layer III audio frames at 24 kHz.
// HTML audio's ended event is authoritative; this encoded duration is the
// silent/error fallback (83.4666666667 s after LAME encoder delay and padding).
export const EPILOGUE_DURATION_SECONDS = 83.52;
export const EPILOGUE_WAVE_SPACING = 1.35;
// The original 220×164 GIF has 182 frames at 100 ms: one complete loop is 18.2 s.
export const EPILOGUE_GIF_CYCLE_SECONDS = 18.2;
export const EPILOGUE_GIF_HOLD_SECONDS = EPILOGUE_GIF_CYCLE_SECONDS + 0.2;
export const EPILOGUE_GIF_FADE_SECONDS = 1.4;
export const EPILOGUE_GIF_LIFETIME =
  EPILOGUE_GIF_HOLD_SECONDS + EPILOGUE_GIF_FADE_SECONDS;
export const EPILOGUE_GIF_SPACING = 3.4;
export const EPILOGUE_GIF_LIMIT = 6;
export const EPILOGUE_EVENT_LIFETIME = 22;
export const EPILOGUE_BLESSINGS = ['恭喜', '谢谢'] as const;

export interface EpilogueBlessingEvent {
  id: number;
  time: number;
  // Normalized screen coordinates keep celebrations clear of the hero/controls.
  x: number;
  y: number;
  text: (typeof EPILOGUE_BLESSINGS)[number];
}

export interface EpilogueApplauseSlot {
  event: EpilogueBlessingEvent;
  slot: number;
}

export interface EpilogueCelebrationState {
  slots: EpilogueApplauseSlot[];
  pending: EpilogueBlessingEvent | null;
  feedback: EpilogueBlessingEvent | null;
  lastSeenId: number;
  lastStartedAt: number;
  seenAt: number;
}

export function emptyEpilogueCelebration(): EpilogueCelebrationState {
  return {
    slots: [],
    pending: null,
    feedback: null,
    lastSeenId: 0,
    lastStartedAt: -Infinity,
    seenAt: 0,
  };
}

export function canStartEpilogueGif(time: number) {
  // Reserve a second for media-ended timing differences and the final view transition.
  return time + EPILOGUE_GIF_LIFETIME + 1 <= EPILOGUE_DURATION_SECONDS;
}

/** Keep running images stable; coalesce bursts into one latest pending applause. */
export function advanceEpilogueCelebration(
  previous: EpilogueCelebrationState,
  events: EpilogueBlessingEvent[],
  time: number,
): EpilogueCelebrationState {
  const state =
    time + 0.001 < previous.seenAt ? emptyEpilogueCelebration() : previous;
  const incoming = events.filter(
    (event) => event.id > state.lastSeenId && event.time <= time,
  );
  const latest = incoming.reduce<EpilogueBlessingEvent | null>(
    (last, event) => (!last || event.id > last.id ? event : last),
    null,
  );
  let pending = latest || state.pending;
  let slots = state.slots;
  let lastStartedAt = state.lastStartedAt;
  if (
    !canStartEpilogueGif(time) ||
    (pending && time - pending.time >= EPILOGUE_EVENT_LIFETIME)
  ) {
    pending = null;
  }
  if (
    pending &&
    slots.length < EPILOGUE_GIF_LIMIT &&
    time - lastStartedAt >= EPILOGUE_GIF_SPACING
  ) {
    const firstSlot = (pending.id * 5) % EPILOGUE_GIF_LIMIT;
    const slot = Array.from(
      { length: EPILOGUE_GIF_LIMIT },
      (_, i) => (firstSlot + i) % EPILOGUE_GIF_LIMIT,
    ).find((candidate) => !slots.some((active) => active.slot === candidate))!;
    slots = [...slots, { event: pending, slot }];
    pending = null;
    lastStartedAt = time;
  }
  if (!latest && pending === state.pending && slots === state.slots)
    return state;
  return {
    slots,
    pending,
    feedback: latest || state.feedback,
    lastSeenId: latest?.id ?? state.lastSeenId,
    lastStartedAt,
    seenAt: time,
  };
}

import { EPILOGUE_DURATION_SECONDS } from './epilogue.ts';

type Playback = {
  status: 'idle' | 'loading' | 'playing' | 'ended' | 'failed';
  position: number;
  duration: number;
};

/** The recording owns the curtain call. Only an unavailable recording uses a
 * silent clock, and once chosen it can never be replaced by a late download. */
export class EpilogueClock {
  position = 0;
  ended = false;
  fallback = false;
  private stalled = 0;
  advance(playback: Playback, elapsed: number, paused: boolean) {
    if (paused || this.ended) return;
    const dt = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
    if (!this.fallback) {
      const position = Number.isFinite(playback.position)
        ? Math.max(0, playback.position)
        : 0;
      if (playback.status === 'ended') {
        this.position = Math.max(
          this.position,
          position,
          playback.duration || 0,
        );
        this.ended = true;
        return;
      }
      if (playback.status === 'playing' && position > this.position) {
        this.position = position;
        this.stalled = 0;
        return;
      }
      this.stalled += dt;
      if (playback.status !== 'failed' && this.stalled < 12) return;
      this.fallback = true;
      return;
    }
    this.position = Math.min(EPILOGUE_DURATION_SECONDS, this.position + dt);
    this.ended = this.position >= EPILOGUE_DURATION_SECONDS;
  }
}

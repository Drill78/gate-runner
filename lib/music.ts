import type { Battle } from './combat';
import type { Phase, Run } from './game';

export type MusicTrack =
  | 'normal'
  | 'boss'
  | 'final'
  | 'forbidden'
  | 'menu'
  | 'map'
  | 'event'
  | 'shop'
  | 'ascension'
  | 'stair-heaven'
  | 'crown-fracture'
  | 'dawn-judgment'
  | 'congratulations';
export const MUSIC_TRACKS: Record<
  MusicTrack,
  {
    title: string;
    src: string;
    loopStart?: number;
    volume?: number;
    once?: boolean;
  }
> = {
  normal: { title: '破晓行军', src: '/audio/normal.mp3?v=1.0' },
  boss: { title: '暴君的审判', src: '/audio/boss.mp3?v=1.0' },
  final: { title: '圣烬加冕', src: '/audio/final.mp3?v=1.0', loopStart: 10 },
  forbidden: { title: '门后的低语', src: '/audio/forbidden.mp3' },
  menu: { title: '誓言尚未熄灭', src: '/audio/menu.mp3?v=1.0', volume: 0.8 },
  map: { title: '灰林远行', src: '/audio/map.mp3?v=1.0', volume: 0.7 },
  event: { title: '命运的岔路', src: '/audio/event.mp3?v=1.0', volume: 0.72 },
  shop: { title: '炉火与铜币', src: '/audio/shop.mp3?v=1.0', volume: 0.72 },
  ascension: {
    title: '破雾登神 · 长阶终誓',
    src: '/audio/ascension.mp3?v=1.2',
    loopStart: 15,
    volume: 0.95,
  },
  'stair-heaven': {
    title: '圣阶浮光',
    src: '/audio/stair-heaven.mp3',
    loopStart: 8,
    volume: 0.9,
  },
  'crown-fracture': {
    title: '裂冠之战',
    src: '/audio/crown-fracture.mp3',
    loopStart: 0,
    volume: 0.95,
  },
  'dawn-judgment': {
    title: '曙光裁决',
    src: '/audio/dawn-judgment.mp3',
    loopStart: 24,
    volume: 0.95,
  },
  congratulations: {
    title: '献给远征者',
    src: '/audio/congratulations.mp3',
    volume: 1,
    once: true,
  },
};

type MusicRun = Pick<Run, 'difficulty' | 'floor'>;

export function sceneMusic(
  phase: Phase,
  run?: MusicRun | null,
): MusicTrack | null {
  if (phase === 'battle') return null;
  if (phase === 'victory' && run?.difficulty === 'endless' && run.floor >= 100)
    return null;
  if (
    phase !== 'setup' &&
    phase !== 'defeat' &&
    run?.difficulty === 'endless' &&
    run.floor >= 90 &&
    run.floor <= 100
  )
    return 'stair-heaven';
  if (phase === 'setup' || phase === 'victory' || phase === 'defeat')
    return 'menu';
  if (phase === 'event') return 'event';
  if (phase === 'shop') return 'shop';
  return 'map';
}

export function battleMusic(battle: Battle): MusicTrack {
  if (battle.player.difficulty === 'endless') {
    if (battle.player.floor === 100) return 'congratulations';
    if (battle.player.floor === 99) return 'dawn-judgment';
    if (battle.player.floor === 98) return 'crown-fracture';
    if (battle.player.floor >= 90 && battle.player.floor <= 97)
      return 'stair-heaven';
  }
  if (battle.player.node?.enchanted) return 'forbidden';
  if (battle.player.node?.kind === 'boss')
    return battle.entities.some((e) => e.encounterId?.startsWith('king'))
      ? 'final'
      : 'boss';
  return 'normal';
}

export type PlaybackStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'ended'
  | 'failed';
export type MusicPlaybackKey = string | object;
export interface MusicPlayback {
  status: PlaybackStatus;
  position: number;
  duration: number;
}
interface OncePlayback extends MusicPlayback {
  key: MusicPlaybackKey;
  revision: number;
  startedAt: number | null;
}

/** One gesture-unlocked context. A one-shot key belongs to one battle instance;
 * its position follows the audio clock, including context suspension. Muting
 * one-shots changes their gain, while ordinary muted BGM remains suspended. */
export class MusicPlayer {
  private context: AudioContext | null = null;
  private bus: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private voiceGain: GainNode | null = null;
  private cache = new Map<MusicTrack, Promise<AudioBuffer>>();
  private desired: MusicTrack | null = null;
  private playing: MusicTrack | null = null;
  private playbackKey: MusicPlaybackKey | undefined;
  private oncePlayback: OncePlayback | null = null;
  private voices = new Map<AudioBufferSourceNode, GainNode>();
  private paused = true;
  private muted = false;
  private revision = 0;
  private loading: MusicTrack | null = null;
  private failedRevision = -1;
  private contextAction: 'resume' | 'suspend' | null = null;
  private contextBlocked = false;
  private makeContext: () => AudioContext;
  private fetchAudio: (url: string) => Promise<ArrayBuffer>;

  constructor(
    makeContext = () => new AudioContext(),
    fetchAudio = async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Music HTTP ${response.status}`);
      return response.arrayBuffer();
    },
  ) {
    this.makeContext = makeContext;
    this.fetchAudio = fetchAudio;
  }

  unlock(unmute = false) {
    if (unmute) this.muted = false;
    try {
      if (!this.context) {
        this.context = this.makeContext();
        this.bus = this.context.createGain();
        this.bus.gain.value = 0.28;
        this.bus.connect(this.context.destination);
      }
      this.contextBlocked = false;
      // Resume inside the gesture even when the current screen is silent. This
      // unlocks later muted one-shots without requiring a second user gesture.
      this.contextState(true);
      this.sync();
    } catch {
      this.fail(this.revision);
    }
  }

  setState(
    track: MusicTrack | null,
    paused: boolean,
    muted: boolean,
    playbackKey?: MusicPlaybackKey,
  ) {
    const key =
      track && MUSIC_TRACKS[track].once ? (playbackKey ?? track) : undefined;
    if (
      this.desired === track &&
      this.paused === paused &&
      this.muted === muted &&
      this.playbackKey === key
    )
      return;
    if (this.desired !== track || this.playbackKey !== key) {
      const stopImmediately =
        this.isOnce() || Boolean(track && MUSIC_TRACKS[track].once) || !track;
      this.revision++;
      this.loading = null;
      this.oncePlayback =
        key === undefined
          ? null
          : {
              key,
              revision: this.revision,
              status: 'loading',
              position: 0,
              duration: 0,
              startedAt: null,
            };
      if (stopImmediately) this.stopAll();
    }
    this.desired = track;
    this.playbackKey = key;
    this.paused = paused;
    this.muted = muted;
    this.sync();
  }

  playback(key: MusicPlaybackKey): MusicPlayback {
    const state = this.oncePlayback;
    if (!state || state.key !== key)
      return { status: 'idle', position: 0, duration: 0 };
    if (
      this.context?.state === 'closed' &&
      state.status !== 'ended' &&
      state.status !== 'failed'
    ) {
      this.fail(state.revision);
    }
    if (
      state.status === 'loading' &&
      state.startedAt !== null &&
      this.context?.state === 'running'
    )
      state.status = 'playing';
    const position =
      state.status === 'playing' && state.startedAt !== null && this.context
        ? Math.min(
            state.duration,
            Math.max(0, this.context.currentTime - state.startedAt),
          )
        : state.position;
    const status =
      state.status === 'playing' &&
      !this.paused &&
      this.context?.state !== 'running'
        ? 'loading'
        : state.status;
    return { status, position, duration: state.duration };
  }

  private isOnce() {
    return Boolean(this.desired && MUSIC_TRACKS[this.desired].once);
  }

  private disconnect(source: AudioBufferSourceNode) {
    const gain = this.voices.get(source);
    this.voices.delete(source);
    try {
      source.disconnect();
    } catch {
      /* Already detached. */
    }
    try {
      gain?.disconnect();
    } catch {
      /* Already detached. */
    }
  }

  private stopAll() {
    const voices = [...this.voices.keys()];
    this.source = null;
    this.voiceGain = null;
    this.playing = null;
    for (const source of voices) {
      try {
        source.stop();
      } catch {
        /* Sources can already have ended. */
      }
      this.disconnect(source);
    }
  }

  private fail(revision: number) {
    if (this.revision !== revision) return;
    this.failedRevision = revision;
    if (this.oncePlayback?.revision === revision) {
      const state = this.oncePlayback;
      if (state.startedAt !== null && this.context)
        state.position = Math.min(
          state.duration,
          Math.max(0, this.context.currentTime - state.startedAt),
        );
      this.oncePlayback.status = 'failed';
      this.stopAll();
    }
  }

  private contextState(running: boolean) {
    const context = this.context;
    if (!context || this.contextAction) return;
    if (context.state === 'closed') {
      this.fail(this.revision);
      return;
    }
    const action = running ? 'resume' : 'suspend';
    if (
      running
        ? context.state === 'running' || this.contextBlocked
        : context.state === 'suspended'
    )
      return;
    this.contextAction = action;
    let operation: Promise<void>;
    try {
      operation = context[action]();
    } catch {
      operation = Promise.reject(new Error('Audio context unavailable'));
    }
    void operation
      .then(() => {
        this.contextAction = null;
        if (context.state !== (action === 'resume' ? 'running' : 'suspended')) {
          this.contextBlocked = true;
          this.fail(this.revision);
          return;
        }
        this.sync();
      })
      .catch(() => {
        this.contextAction = null;
        this.contextBlocked = true;
        this.fail(this.revision);
      });
  }

  private volume() {
    if (!this.context || !this.voiceGain || !this.playing) return;
    const gain = this.voiceGain.gain;
    gain.cancelScheduledValues(this.context.currentTime);
    gain.setValueAtTime(
      this.muted ? 0 : (MUSIC_TRACKS[this.playing].volume ?? 1),
      this.context.currentTime,
    );
  }

  private sync() {
    const context = this.context;
    if (!context || !this.bus) return;
    this.volume();
    const suspended =
      this.paused || !this.desired || (this.muted && !this.isOnce());
    this.contextState(!suspended);
    if (
      suspended ||
      !this.desired ||
      this.failedRevision === this.revision ||
      this.oncePlayback?.status === 'ended'
    ) {
      return;
    }
    const track = this.desired;
    if (this.playing === track || this.loading === track) return;
    this.loading = track;
    const revision = this.revision;
    let buffer = this.cache.get(track);
    if (!buffer) {
      buffer = this.fetchAudio(MUSIC_TRACKS[track].src).then((data) =>
        context.decodeAudioData(data),
      );
      this.cache.set(track, buffer);
    } else {
      this.cache.delete(track);
      this.cache.set(track, buffer);
    }
    // Keep long decoded stereo scores from accumulating across every game screen.
    while (this.cache.size > 3)
      this.cache.delete(this.cache.keys().next().value!);
    void buffer
      .then((decoded) => {
        if (this.revision !== revision || this.desired !== track) return;
        this.loading = null;
        if (this.oncePlayback) {
          if (!Number.isFinite(decoded.duration) || decoded.duration <= 0) {
            this.fail(revision);
            return;
          }
          this.oncePlayback.duration = decoded.duration;
        }
        if (
          this.paused ||
          (this.muted && !MUSIC_TRACKS[track].once) ||
          this.failedRevision === revision
        )
          return;
        if (this.source && this.voiceGain) {
          const outgoing = this.source;
          const gain = this.voiceGain;
          gain.gain.cancelScheduledValues(context.currentTime);
          gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
          gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.5);
          try {
            outgoing.stop(context.currentTime + 0.52);
          } catch {
            this.disconnect(outgoing);
          }
        }
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = decoded;
        source.loop = !MUSIC_TRACKS[track].once;
        source.loopStart = MUSIC_TRACKS[track].loopStart ?? 0;
        source.connect(gain);
        gain.connect(this.bus!);
        this.voices.set(source, gain);
        source.onended = () => {
          const active = this.revision === revision && this.source === source;
          this.disconnect(source);
          if (!active) return;
          if (this.oncePlayback?.revision === revision) {
            const state = this.oncePlayback;
            const elapsed = Math.max(
              0,
              context.currentTime - (state.startedAt ?? context.currentTime),
            );
            state.position = Math.min(state.duration, elapsed);
            state.status =
              elapsed + 0.05 >= state.duration ? 'ended' : 'failed';
            if (state.status === 'ended') state.position = state.duration;
            else this.failedRevision = revision;
          }
          this.source = null;
          this.voiceGain = null;
          this.playing = null;
        };
        this.source = source;
        this.voiceGain = gain;
        this.playing = track;
        if (this.oncePlayback) {
          this.oncePlayback.status =
            context.state === 'running' ? 'playing' : 'loading';
          this.oncePlayback.startedAt = context.currentTime;
          gain.gain.setValueAtTime(
            this.muted ? 0 : (MUSIC_TRACKS[track].volume ?? 1),
            context.currentTime,
          );
        } else {
          gain.gain.setValueAtTime(0, context.currentTime);
          gain.gain.linearRampToValueAtTime(
            MUSIC_TRACKS[track].volume ?? 1,
            context.currentTime + 0.7,
          );
        }
        try {
          source.start();
        } catch {
          this.fail(revision);
        }
      })
      .catch(() => {
        if (this.cache.get(track) === buffer) this.cache.delete(track);
        if (this.revision === revision) {
          this.loading = null;
          this.fail(revision);
        }
      });
  }
}

export const musicPlayer = new MusicPlayer();

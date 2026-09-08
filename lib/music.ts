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
  | 'ascension';
export const MUSIC_TRACKS: Record<
  MusicTrack,
  { title: string; src: string; loopStart?: number; volume?: number }
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
};

type MusicRun = Pick<Run, 'difficulty' | 'floor'>;
function hasAscensionScore(run?: MusicRun | null) {
  // Run.floor is zero based. Keep the score through the blessing epilogue.
  return run?.difficulty === 'endless' && run.floor >= 90 && run.floor <= 100;
}

export function sceneMusic(
  phase: Phase,
  run?: MusicRun | null,
): MusicTrack | null {
  if (phase === 'battle') return null;
  if (phase !== 'setup' && phase !== 'defeat' && hasAscensionScore(run))
    return 'ascension';
  if (phase === 'setup' || phase === 'victory' || phase === 'defeat')
    return 'menu';
  if (phase === 'event') return 'event';
  if (phase === 'shop') return 'shop';
  return 'map';
}

export function battleMusic(battle: Battle): MusicTrack {
  if (hasAscensionScore(battle.player)) return 'ascension';
  if (battle.player.node?.enchanted) return 'forbidden';
  if (battle.player.node?.kind === 'boss')
    return battle.entities.some((e) => e.encounterId === 'king')
      ? 'final'
      : 'boss';
  return 'normal';
}

/** One gesture-unlocked music context; suspending it preserves the loop position. */
export class MusicPlayer {
  private context: AudioContext | null = null;
  private bus: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private voiceGain: GainNode | null = null;
  private cache = new Map<MusicTrack, Promise<AudioBuffer>>();
  private desired: MusicTrack | null = null;
  private playing: MusicTrack | null = null;
  private paused = true;
  private muted = false;
  private revision = 0;
  private loading: MusicTrack | null = null;
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
    if (this.muted) return;
    try {
      if (!this.context) {
        this.context = this.makeContext();
        this.bus = this.context.createGain();
        this.bus.gain.value = 0.28;
        this.bus.connect(this.context.destination);
      }
      void this.context
        .resume()
        .then(() => this.sync())
        .catch(() => {});
    } catch {
      // Restricted audio support must never prevent a battle from starting.
    }
  }

  setState(track: MusicTrack | null, paused: boolean, muted: boolean) {
    if (
      this.desired === track &&
      this.paused === paused &&
      this.muted === muted
    )
      return;
    if (this.desired !== track) {
      this.revision++;
      this.loading = null;
    }
    this.desired = track;
    this.paused = paused;
    this.muted = muted;
    this.sync();
  }

  private sync() {
    const context = this.context;
    if (!context || !this.bus) return;
    if (!this.desired) {
      this.source?.stop();
      this.source = null;
      this.voiceGain = null;
      this.playing = null;
    }
    if (this.paused || this.muted || !this.desired) {
      if (context.state === 'running') void context.suspend().catch(() => {});
      return;
    }
    if (context.state === 'suspended') void context.resume().catch(() => {});
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
        if (this.source && this.voiceGain) {
          const outgoing = this.source;
          const gain = this.voiceGain;
          gain.gain.cancelScheduledValues(context.currentTime);
          gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
          gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.5);
          outgoing.stop(context.currentTime + 0.52);
        }
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = decoded;
        source.loop = true;
        source.loopStart = MUSIC_TRACKS[track].loopStart ?? 0;
        source.connect(gain);
        gain.connect(this.bus!);
        source.onended = () => {
          source.disconnect();
          gain.disconnect();
        };
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(
          MUSIC_TRACKS[track].volume ?? 1,
          context.currentTime + 0.7,
        );
        source.start();
        this.source = source;
        this.voiceGain = gain;
        this.playing = track;
        this.sync();
      })
      .catch(() => {
        this.cache.delete(track);
        if (this.revision === revision) this.loading = null;
      });
  }
}

export const musicPlayer = new MusicPlayer();

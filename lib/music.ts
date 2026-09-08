import type { Battle } from './combat';

export type MusicTrack = 'normal' | 'boss' | 'final' | 'forbidden';
export const MUSIC_TRACKS: Record<MusicTrack, { title: string; src: string }> =
  {
    normal: { title: '铁与誓言', src: '/audio/normal.mp3?v=0.7' },
    boss: { title: '王座之前·诸王战歌', src: '/audio/boss.mp3?v=0.7' },
    final: { title: '灰烬终誓·交响王权', src: '/audio/final.mp3?v=0.7' },
    forbidden: { title: '门后的低语', src: '/audio/forbidden.mp3' },
  };

export function battleMusic(battle: Battle): MusicTrack {
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

  unlock() {
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
    }
    void buffer
      .then((decoded) => {
        if (this.revision !== revision || this.desired !== track) return;
        this.loading = null;
        this.source?.stop();
        const source = context.createBufferSource();
        source.buffer = decoded;
        source.loop = true;
        source.connect(this.bus!);
        this.bus!.gain.cancelScheduledValues(context.currentTime);
        this.bus!.gain.setValueAtTime(0, context.currentTime);
        this.bus!.gain.linearRampToValueAtTime(0.28, context.currentTime + 0.7);
        source.start();
        this.source = source;
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

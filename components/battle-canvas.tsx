'use client';
import { useEffect, useRef } from 'react';
import { type Battle, type Run, stepBattle, activateSkill } from '@/lib/game';
import { drawBattle } from '@/lib/renderer';

export interface BattleSnapshot {
  run: Run;
  shield: number;
  cooldown: number;
  time: number;
  message: string;
  lane: number;
}
export function BattleCanvas({
  battle,
  paused,
  muted,
  onSnapshot,
  onEnd,
  onPause,
}: {
  battle: Battle;
  paused: boolean;
  muted: boolean;
  onSnapshot: (s: BattleSnapshot) => void;
  onEnd: (b: Battle) => void;
  onPause: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const current = useRef({ paused, muted, onSnapshot, onEnd, onPause });
  useEffect(() => {
    current.current = { paused, muted, onSnapshot, onEnd, onPause };
  }, [paused, muted, onSnapshot, onEnd, onPause]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ctx = element.getContext('2d');
    if (!ctx) return;
    let frame = 0,
      last = 0,
      lastUI = 0,
      finished = false,
      w = 600,
      h = 640,
      lastSound = 0;
    let audio: AudioContext | null = null;
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const resize = () => {
      const bounds = element.getBoundingClientRect();
      w = bounds.width;
      h = bounds.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(w * dpr);
      element.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const ensureAudio = () => {
      if (current.current.muted) return;
      try {
        audio ??= new AudioContext();
        if (audio.state === 'suspended') void audio.resume().catch(() => {});
      } catch {
        /* Audio is optional on restricted browsers. */
      }
    };
    const play = (name: string) => {
      if (!audio || current.current.muted || audio.state !== 'running') return;
      const freq: Record<string, number> = {
        gate: 520,
        chest: 780,
        skill: 240,
        hurt: 95,
        shoot: 190,
        kill: 320,
      };
      try {
        const o = audio.createOscillator(),
          g = audio.createGain();
        o.type = name === 'hurt' ? 'sawtooth' : 'triangle';
        o.frequency.setValueAtTime(freq[name] || 300, audio.currentTime);
        o.frequency.exponentialRampToValueAtTime(
          (freq[name] || 300) * (name === 'hurt' ? 0.4 : 1.65),
          audio.currentTime + 0.12,
        );
        g.gain.setValueAtTime(
          name === 'shoot' ? 0.014 : 0.055,
          audio.currentTime,
        );
        g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.17);
        o.connect(g);
        g.connect(audio.destination);
        o.start();
        o.stop(audio.currentTime + 0.18);
      } catch {
        /* Keep combat running if audio fails. */
      }
    };
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,[role="dialog"]'))
        return;
      const code = e.code;
      if (
        [
          'ArrowLeft',
          'ArrowRight',
          'KeyA',
          'KeyD',
          'Space',
          'KeyP',
          'Escape',
        ].includes(code)
      )
        e.preventDefault();
      if (code === 'KeyP' || code === 'Escape') {
        if (!e.repeat) current.current.onPause();
        return;
      }
      if (current.current.paused) return;
      ensureAudio();
      if (code === 'ArrowLeft' || code === 'KeyA') battle.lane = -1;
      if (code === 'ArrowRight' || code === 'KeyD') battle.lane = 1;
      if (code === 'Space' && !e.repeat) activateSkill(battle);
    };
    const pointer = (e: PointerEvent) => {
      if (current.current.paused) return;
      ensureAudio();
      const rect = element.getBoundingClientRect();
      battle.lane = e.clientX < rect.left + rect.width / 2 ? -1 : 1;
    };
    const loop = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      if (!current.current.paused && !document.hidden && !finished) {
        stepBattle(battle, dt);
        if (battle.soundSeq !== lastSound) {
          lastSound = battle.soundSeq;
          play(battle.lastSound);
        }
      }
      drawBattle(ctx, w, h, battle, reducedMotion);
      if (now - lastUI > 100) {
        lastUI = now;
        current.current.onSnapshot({
          run: { ...battle.player },
          shield: battle.shield,
          cooldown: battle.cooldown,
          time: battle.time,
          message: battle.time < battle.messageUntil ? battle.message : '',
          lane: battle.lane,
        });
      }
      if (battle.state !== 'running' && !finished) {
        finished = true;
        current.current.onEnd(battle);
      }
      frame = requestAnimationFrame(loop);
    };
    window.addEventListener('keydown', key);
    window.addEventListener('pointerdown', ensureAudio);
    element.addEventListener('pointerdown', pointer);
    element.addEventListener('pointermove', drag);
    function drag(e: PointerEvent) {
      if (e.buttons === 1) pointer(e);
    }
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('keydown', key);
      window.removeEventListener('pointerdown', ensureAudio);
      element.removeEventListener('pointerdown', pointer);
      element.removeEventListener('pointermove', drag);
      if (audio) void audio.close().catch(() => {});
    };
  }, [battle]);
  return (
    <canvas
      ref={canvas}
      className="battle-canvas"
      aria-label="战斗场地：方向键或 A D 换道，空格释放技能。触屏可点击或拖动换道。"
    />
  );
}

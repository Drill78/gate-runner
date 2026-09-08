'use client';
import { useEffect, useRef, useState } from 'react';
import { type Run, RELIC_BY_ID, experience } from '@/lib/game';
import {
  type Battle,
  stepBattle,
  activateSkill,
  type Ritual,
  type BossPressure,
  movePlayer,
  setMoveAxis,
  chooseBattleUpgrade,
  skipBattleUpgrade,
  kingPhase,
  type BattleTransition,
} from '@/lib/combat';
import { arrivalRoster, type ArrivalCard } from '@/lib/arrivals';
import { pointerToWorldX, screenX, screenY, VIEW } from '@/lib/view';
import { createHeroTapTracker } from '@/lib/controls';
import { RelicCard } from '@/components/game-panels';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { drawBattle } from '@/lib/renderer';
import { bossProfile, ENCOUNTERS } from '@/lib/bosses';
import { BossArrival } from '@/components/boss-arrival';
import { battleMusic, musicPlayer } from '@/lib/music';
import { actIndex } from '@/lib/endless';

export interface BattleSnapshot {
  run: Run;
  shield: number;
  cooldown: number;
  buffRemaining: number;
  time: number;
  message: string;
  x: number;
  wave: number;
  totalWaves: number;
  duration: number;
  enrage: boolean;
  arriving: boolean;
  pressure: BossPressure | null;
  ritual: Ritual | null;
  encounters: NonNullable<BattleSnapshot['encounter']>[];
  encounter: {
    id: number;
    name: string;
    hp: number;
    maxHp: number;
    chapterBoss: boolean;
    hasSecondPhase: boolean;
    life: number;
    lives: number;
    phaseThresholds: number[];
    status: string;
  } | null;
}
export function BattleCanvas({
  battle,
  paused,
  muted,
  doubleTapSkill,
  onSnapshot,
  onEnd,
  onPause,
}: {
  battle: Battle;
  paused: boolean;
  muted: boolean;
  doubleTapSkill: boolean;
  onSnapshot: (s: BattleSnapshot) => void;
  onEnd: (b: Battle) => void;
  onPause: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [arrival, setArrival] = useState<ArrivalCard | null>(null);
  const [transitionArrival, setTransitionArrival] =
    useState<BattleTransition | null>(null);
  const [levelChoices, setLevelChoices] = useState(battle.levelChoices);
  const current = useRef({
    paused,
    muted,
    doubleTapSkill,
    onSnapshot,
    onEnd,
    onPause,
  });
  useEffect(() => {
    current.current = {
      paused,
      muted,
      doubleTapSkill,
      onSnapshot,
      onEnd,
      onPause,
    };
    if (paused) setMoveAxis(battle, 0);
  }, [paused, muted, doubleTapSkill, onSnapshot, onEnd, onPause, battle]);
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
      lastSound = 0,
      introRemaining = 0,
      introShownStage = -1;
    let introQueue: ArrivalCard[] = [];
    const background = new Image();
    background.src =
      battle.player.difficulty === 'endless' && battle.player.floor >= 90
        ? '/art/ascension-stair.webp'
        : `/art/battlefield-${actIndex(battle.player) + 1}.webp`;
    const models = { angel: new Image() };
    models.angel.src = '/art/angel-minion.webp';
    const portrait = new Image();
    portrait.src = (
      ENCOUNTERS.find(
        (e) =>
          e.id === battle.entities.find((entity) => entity.boss)?.encounterId,
      ) || bossProfile(battle.player)
    ).portrait;
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
        level: 980,
        'boss-arrival': 82,
        'elite-arrival': 104,
        'angel-revive': 680,
        'time-shatter': 1450,
      };
      try {
        const o = audio.createOscillator(),
          g = audio.createGain();
        const impact = name === 'boss-arrival' || name === 'elite-arrival';
        o.type = impact ? 'sine' : name === 'hurt' ? 'sawtooth' : 'triangle';
        o.frequency.setValueAtTime(freq[name] || 300, audio.currentTime);
        o.frequency.exponentialRampToValueAtTime(
          (freq[name] || 300) * (impact ? 0.35 : name === 'hurt' ? 0.4 : 1.65),
          audio.currentTime + (impact ? 0.22 : 0.12),
        );
        g.gain.setValueAtTime(
          impact ? 0.1 : name === 'shoot' ? 0.014 : 0.055,
          audio.currentTime,
        );
        g.gain.exponentialRampToValueAtTime(
          0.001,
          audio.currentTime + (impact ? 0.24 : 0.17),
        );
        o.connect(g);
        g.connect(audio.destination);
        o.start();
        o.stop(audio.currentTime + (impact ? 0.25 : 0.18));
        if (name === 'time-shatter') {
          for (let i = 0; i < 7; i++) {
            const shard = audio.createOscillator(),
              gain = audio.createGain(),
              at = audio.currentTime + i * 0.038;
            shard.type = 'triangle';
            shard.frequency.setValueAtTime(2200 - i * 190, at);
            shard.frequency.exponentialRampToValueAtTime(
              160 + i * 24,
              at + 0.48,
            );
            gain.gain.setValueAtTime(0.035, at);
            gain.gain.exponentialRampToValueAtTime(0.001, at + 0.6);
            shard.connect(gain);
            gain.connect(audio.destination);
            shard.start(at);
            shard.stop(at + 0.62);
          }
        }
      } catch {
        /* Keep combat running if audio fails. */
      }
    };
    const held = new Set<string>();
    const heroTaps = createHeroTapTracker();
    const updateAxis = () =>
      setMoveAxis(
        battle,
        (held.has('ArrowRight') || held.has('KeyD') ? 1 : 0) -
          (held.has('ArrowLeft') || held.has('KeyA') ? 1 : 0),
      );
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,[role="dialog"]'))
        return;
      const code = e.code;
      if (
        ['Space', 'Enter'].includes(code) &&
        (e.target as HTMLElement).closest('button,a')
      )
        return;
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
      if (current.current.paused || document.hidden) return;
      if (introRemaining > 0 || battle.transition) {
        if (code === 'Enter' || code === 'Space') e.preventDefault();
        return;
      }
      ensureAudio();
      if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(code)) {
        held.add(code);
        updateAxis();
      }
      if (code === 'Space' && !e.repeat) activateSkill(battle);
    };
    const pointer = (e: PointerEvent) => {
      if (
        !e.isPrimary ||
        current.current.paused ||
        introRemaining > 0 ||
        battle.transition ||
        battle.levelChoices.length
      )
        return;
      ensureAudio();
      if (e.type === 'pointerdown') element.setPointerCapture(e.pointerId);
      const rect = element.getBoundingClientRect();
      const point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        time: e.timeStamp,
      };
      if (current.current.doubleTapSkill) {
        if (e.type === 'pointerdown')
          heroTaps.down(
            point,
            Math.hypot(
              point.x - screenX(battle.x, w),
              point.y - screenY(VIEW.playerY, h),
            ) <= 38,
          );
        else heroTaps.move(point);
      } else heroTaps.reset();
      movePlayer(battle, pointerToWorldX(e.clientX - rect.left, rect.width));
    };
    const pointerUp = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      const rect = element.getBoundingClientRect();
      if (
        current.current.doubleTapSkill &&
        !current.current.paused &&
        !document.hidden &&
        introRemaining <= 0 &&
        !battle.transition &&
        !battle.levelChoices.length &&
        heroTaps.up({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          time: e.timeStamp,
        })
      )
        activateSkill(battle);
    };
    const loop = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      if (
        current.current.paused ||
        document.hidden ||
        introRemaining > 0 ||
        battle.transition ||
        battle.levelChoices.length
      ) {
        heroTaps.reset();
        held.clear();
      }
      if (!current.current.paused && !document.hidden && !finished) {
        let startedArrival = false;
        if (
          !battle.levelChoices.length &&
          !battle.epilogue &&
          !battle.transition &&
          introShownStage !== battle.rushStage &&
          battle.time + dt >= battle.finalStart
        ) {
          stepBattle(battle, Math.max(0, battle.finalStart - battle.time));
          if (!battle.levelChoices.length) {
            introShownStage = battle.rushStage;
            startedArrival = true;
            battle.inputLocked = true;
            introQueue = arrivalRoster(battle);
            introRemaining = introQueue[0]?.duration || 0;
            held.clear();
            setMoveAxis(battle, 0);
            setArrival(introQueue[0] || null);
            play(
              battle.player.node?.kind === 'boss'
                ? 'boss-arrival'
                : 'elite-arrival',
            );
          }
        }
        if (introRemaining > 0) {
          if (!startedArrival)
            introRemaining = Math.max(0, introRemaining - dt);
          if (introRemaining === 0) {
            introQueue.shift();
            const next = introQueue[0];
            introRemaining = next?.duration || 0;
            battle.inputLocked = Boolean(next);
            setArrival(next || null);
            if (next)
              play(
                battle.player.node?.kind === 'boss'
                  ? 'boss-arrival'
                  : 'elite-arrival',
              );
          }
        } else stepBattle(battle, dt);
        if (battle.soundSeq !== lastSound) {
          lastSound = battle.soundSeq;
          play(battle.lastSound);
        }
      }
      setTransitionArrival((previous) =>
        previous?.seq === battle.transition?.seq
          ? previous
          : battle.transition
            ? { ...battle.transition }
            : null,
      );
      drawBattle(ctx, w, h, battle, reducedMotion, background, models);
      musicPlayer.setState(
        battleMusic(battle),
        current.current.paused ||
          document.hidden ||
          !!battle.levelChoices.length ||
          finished,
        current.current.muted,
      );
      if (now - lastUI > 100) {
        lastUI = now;
        setLevelChoices((previous) =>
          previous === battle.levelChoices ? previous : battle.levelChoices,
        );
        const chapterBoss = battle.player.node?.kind === 'boss';
        const encounters = battle.entities
          .filter(
            (e) =>
              e.boss &&
              e.start <= battle.time &&
              (e.stage || 0) === battle.rushStage,
          )
          .map((target) => ({
            id: target.id,
            name: target.name,
            hp: Math.max(0, target.hp),
            maxHp: target.maxHp,
            chapterBoss,
            hasSecondPhase:
              !!target.secondLife ||
              (target.life || 1) > 1 ||
              target.mutation === 'angelic',
            life: target.angelRevived ? 2 : target.life || 1,
            lives:
              target.secondLife ||
              (target.life || 1) > 1 ||
              target.mutation === 'angelic'
                ? 2
                : 1,
            phaseThresholds: target.encounterId?.startsWith('king')
              ? [70, 35]
              : [50],
            status: target.done
              ? '已击败'
              : (target.rageUntil || 0) > battle.time
                ? `圣翼狂怒 · 无敌 ${Math.ceil(target.rageUntil! - battle.time)}秒`
                : target.angelBroken && target.mutation === 'angelic'
                  ? '圣翼已碎 · 凡躯暴露'
                  : (target.invulnerableUntil || 0) > battle.time
                    ? `金身不坏 ${Math.ceil(target.invulnerableUntil! - battle.time)}秒`
                    : (target.mutationShield || 0) > 0
                      ? '金甲护盾 · 可击碎'
                      : (target.healingUntil || 0) > battle.time &&
                          (target.healingPool || 0) > 0
                        ? '血月汲取 · 正在回生'
                        : target.mutation === 'angelic'
                          ? '圣翼护佑 · 减伤与再生'
                          : target.encounterId === 'deity'
                            ? '黎明圣约 · 循光破界'
                            : target.encounterId === 'king-reborn'
                              ? '焚誓重生'
                              : target.encounterId === 'king-ascendant'
                                ? (target.life || 1) > 1
                                  ? '蚀日王权'
                                  : '圣日王权'
                                : battle.entities.some(
                                      (v) =>
                                        v.guardianOf === target.id && !v.done,
                                    )
                                  ? '魂灯护佑'
                                  : target.encounterId === 'king'
                                    ? `${['余烬王座', '王冠破碎', '终焉燃尽'][kingPhase(target) - 1]}${battle.enrage ? ' · 狂暴' : ''}`
                                    : battle.enrage
                                      ? '狂暴'
                                      : target.guardUntil > battle.time
                                        ? '正面举盾'
                                        : target.hp < target.maxHp * 0.5
                                          ? '杀意渐盛'
                                          : '交战中',
          }));
        current.current.onSnapshot({
          run: { ...battle.player },
          shield: battle.shield,
          cooldown: battle.cooldown,
          buffRemaining: Math.max(0, battle.buffUntil - battle.time),
          time: battle.time,
          message: battle.time < battle.messageUntil ? battle.message : '',
          x: battle.x,
          wave: battle.wave,
          totalWaves: battle.totalWaves,
          duration: battle.duration,
          enrage: battle.enrage,
          arriving: introRemaining > 0 || !!battle.transition,
          pressure: battle.pressure ? { ...battle.pressure } : null,
          ritual: battle.ritual ? { ...battle.ritual } : null,
          encounters,
          encounter: encounters.find((e) => e.hp > 0) || null,
        });
      }
      if (
        battle.state !== 'running' &&
        !finished &&
        (battle.state === 'lost' || !battle.levelChoices.length)
      ) {
        finished = true;
        current.current.onEnd(battle);
      }
      frame = requestAnimationFrame(loop);
    };
    window.addEventListener('keydown', key);
    const keyup = (e: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) return;
      held.delete(e.code);
      if (!current.current.paused && introRemaining <= 0) updateAxis();
    };
    const blur = () => {
      held.clear();
      heroTaps.reset();
      setMoveAxis(battle, 0);
    };
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', blur);
    window.addEventListener('pointerdown', ensureAudio);
    element.addEventListener('pointerdown', pointer);
    element.addEventListener('pointermove', drag);
    element.addEventListener('pointerup', pointerUp);
    element.addEventListener('pointercancel', blur);
    function drag(e: PointerEvent) {
      if (e.buttons === 1) pointer(e);
    }
    frame = requestAnimationFrame(loop);
    return () => {
      battle.inputLocked = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('keydown', key);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', blur);
      window.removeEventListener('pointerdown', ensureAudio);
      element.removeEventListener('pointerdown', pointer);
      element.removeEventListener('pointermove', drag);
      element.removeEventListener('pointerup', pointerUp);
      element.removeEventListener('pointercancel', blur);
      if (audio) void audio.close().catch(() => {});
      musicPlayer.setState(null, true, current.current.muted);
    };
  }, [battle]);
  return (
    <>
      <canvas
        ref={canvas}
        className="battle-canvas"
        aria-label="俯视战斗场地：按住方向键或 A D 连续左右移动，空格释放技能。触屏点击任意位置或拖动移动。"
      />
      {arrival || transitionArrival?.kind === 'revival' ? (
        <BossArrival
          key={
            transitionArrival
              ? `revival-${transitionArrival.seq}`
              : arrival?.key
          }
          profile={
            transitionArrival
              ? ENCOUNTERS.find(
                  (e) => e.id === transitionArrival.encounterId,
                ) || bossProfile(battle.player)
              : arrival?.profile || bossProfile(battle.player)
          }
          chapterBoss={battle.player.node?.kind === 'boss'}
          paused={paused}
          duration={transitionArrival?.duration || arrival?.duration || 3}
          form={transitionArrival?.form}
        />
      ) : null}
      <Dialog
        open={
          levelChoices.length > 0 &&
          !paused &&
          !arrival &&
          !transitionArrival &&
          battle.state !== 'lost'
        }
      >
        <DialogContent
          className="game-dialog level-up-dialog"
          showCloseButton={false}
        >
          <DialogTitle>
            Lv.{battle.player.talentPicks + 2} · 选择技能强化
          </DialogTitle>
          <DialogDescription>
            战斗已暂停。选择一项能力，立即加入本局构筑。
            {experience(battle.player).level - 1 - battle.player.talentPicks > 1
              ? ' 本次连续升级，选择后还有下一次研习。'
              : ''}
          </DialogDescription>
          <div className="level-up-choices">
            {levelChoices.map((id) => (
              <RelicCard
                key={id}
                relic={RELIC_BY_ID[id]}
                owned={battle.player.relics[id] || 0}
                compact
                onPick={() => {
                  if (chooseBattleUpgrade(battle, id))
                    setLevelChoices(battle.levelChoices);
                }}
              />
            ))}
          </div>
          <p className="level-up-note">
            技能、弹幕与职业能力可叠层 · 选完继续战斗
          </p>
          <button
            className="text-button"
            onClick={() => {
              if (skipBattleUpgrade(battle))
                setLevelChoices(battle.levelChoices);
            }}
          >
            跳过本次研习
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}

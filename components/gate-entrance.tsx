'use client';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Settings,
  Shield,
  BowArrow,
  WandSparkles,
} from 'lucide-react';
import { HEROES, type ClassId } from '@/lib/game';
import './gate-entrance.css';

export function GateEntrance({
  selected,
  onSelect,
  onStart,
  onContinue,
  onSettings,
}: {
  selected: ClassId;
  onSelect: (id: ClassId) => void;
  onStart: () => void;
  onContinue?: () => void;
  onSettings: () => void;
}) {
  const [stage, setStage] = useState<'closed' | 'opening' | 'classes'>(
    'closed',
  );
  useEffect(() => {
    if (stage !== 'opening') return;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const timer = window.setTimeout(
      () => setStage('classes'),
      reduced ? 250 : 1900,
    );
    return () => window.clearTimeout(timer);
  }, [stage]);
  const hero = HEROES.find((h) => h.id === selected)!;
  const icons = { knight: Shield, ranger: BowArrow, mage: WandSparkles };
  return (
    <section
      className={`gate-entrance gate-entrance--${stage}`}
      aria-label="灰烬之门"
    >
      <button
        className="entrance-settings"
        onClick={onSettings}
        aria-label="设置、图鉴与成就"
      >
        <Settings size={22} />
      </button>
      {stage === 'classes' ? (
        <>
          <div
            className="entrance-class-art"
            style={{ '--class-color': hero.color } as React.CSSProperties}
          >
            <img src={`/art/${hero.id}.webp`} alt={hero.name} />
          </div>
          <div className="entrance-class-heading">
            <span>CHOOSE YOUR OATH</span>
            <h1>{hero.name}</h1>
            <p>
              {hero.person} · {hero.tags}
            </p>
          </div>
          <div className="entrance-class-controls">
            <div className="entrance-class-tabs" aria-label="选择职业">
              {HEROES.map((h) => {
                const Icon = icons[h.id];
                return (
                  <button
                    key={h.id}
                    onClick={() => onSelect(h.id)}
                    aria-pressed={selected === h.id}
                    className={selected === h.id ? 'selected' : ''}
                  >
                    <Icon size={22} />
                    <span>{h.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="entrance-skill">
              <strong>{hero.skill}</strong>
              <span>{hero.skillDesc}</span>
            </p>
            <button className="entrance-start" onClick={onStart}>
              以此誓约启程 <ArrowRight size={20} />
            </button>
            <button
              className="entrance-back"
              onClick={() => setStage('closed')}
            >
              返回圣门
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="gate-door-scene" aria-hidden="true">
            <div className="gate-sanctum" />
            <div className="gate-leaf gate-leaf--left" />
            <div className="gate-leaf gate-leaf--right" />
            <div className="gate-holy-light" />
          </div>
          <div className="entrance-brand">
            <span>ASHEN GATES</span>
            <h1>灰烬之门</h1>
            <p>门扉之后，命运由你抉择。</p>
          </div>
          <div className="entrance-door-controls">
            <button
              className="entrance-start"
              disabled={stage === 'opening'}
              onClick={() => setStage('opening')}
            >
              {stage === 'opening' ? '圣门正在开启…' : '开启圣门'}
              <ArrowRight size={20} />
            </button>
            {onContinue && stage === 'closed' ? (
              <button className="entrance-continue" onClick={onContinue}>
                继续上次远征
              </button>
            ) : null}
            <span>三层高塔 · 十五段征程 · 无限构筑</span>
          </div>
        </>
      )}
    </section>
  );
}

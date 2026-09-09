'use client';

import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import type { bossProfile } from '@/lib/bosses';
import './boss-arrival.css';

const SPEED_LINES = [11, 19, 28, 38, 49, 61, 73, 85];
const subscribeVisibility = (notify: () => void) => {
  document.addEventListener('visibilitychange', notify);
  return () => document.removeEventListener('visibilitychange', notify);
};
const pageHidden = () => document.hidden;
const serverHidden = () => false;

interface BossArrivalProps {
  profile: ReturnType<typeof bossProfile>;
  chapterBoss: boolean;
  paused: boolean;
  duration: number;
  form?: 'solar' | 'eclipse';
  skippable: boolean;
  onSkip: () => void;
}

export function BossArrival({
  profile,
  chapterBoss,
  paused,
  duration,
  form,
  skippable,
  onSkip,
}: BossArrivalProps) {
  const button = useRef<HTMLButtonElement>(null);
  const hidden = useSyncExternalStore(
    subscribeVisibility,
    pageHidden,
    serverHidden,
  );
  const frozen = paused || hidden;

  useEffect(() => {
    const element = button.current;
    const previous = document.activeElement;
    element?.focus({ preventScroll: true });
    return () => {
      if (
        previous instanceof HTMLElement &&
        previous.isConnected &&
        (document.activeElement === element ||
          document.activeElement === document.body)
      )
        previous.focus({ preventScroll: true });
    };
  }, []);

  return (
    <button
      ref={button}
      type="button"
      className={`ag-cutin ${chapterBoss ? 'ag-cutin--chapter' : 'ag-cutin--guardian'}`}
      data-paused={frozen}
      data-form={form}
      data-skippable={skippable && !frozen}
      aria-disabled={!skippable || frozen}
      aria-keyshortcuts={skippable ? 'Enter Space' : undefined}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (skippable && !frozen) onSkip();
      }}
      onKeyDown={(event) => {
        if (!['Space', 'Enter'].includes(event.code)) return;
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat && skippable && !frozen) onSkip();
      }}
      onKeyUp={(event) => {
        if (!['Space', 'Enter'].includes(event.code)) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      style={
        {
          '--ag-cutin-color': profile.color,
          '--ag-cutin-duration': `${duration * 1000}ms`,
        } as CSSProperties
      }
      aria-label={`${profile.name}登场。${profile.quote}${skippable ? '。点击或按空格、Enter跳过' : ''}`}
    >
      <span className="ag-cutin__backdrop" aria-hidden="true" />
      <span
        className="ag-cutin__slash ag-cutin__slash--back"
        aria-hidden="true"
      />
      <span
        className="ag-cutin__slash ag-cutin__slash--front"
        aria-hidden="true"
      />
      <span className="ag-cutin__burst" aria-hidden="true" />
      <span className="ag-cutin__ink" aria-hidden="true">
        <svg viewBox="0 0 600 900" preserveAspectRatio="none" focusable="false">
          <path d="M0 96 414 0 193 125 522 35 204 160 0 191ZM600 472 395 537 570 508 214 683 600 594ZM0 616 176 653 52 669 354 722 0 711ZM600 814 355 881 428 833 109 900H600Z" />
          <path d="m37 281 30-51 9 32 47-11-26 38 40 25-70-9-25 49 1-48-43-8Zm509-69 19-29 4 25 32 5-23 18 8 34-25-23-25 12 11-22-20-13Z" />
          <circle cx="42" cy="374" r="13" />
          <circle cx="75" cy="414" r="5" />
          <circle cx="28" cy="433" r="7" />
          <circle cx="544" cy="668" r="12" />
          <circle cx="576" cy="642" r="5" />
          <circle cx="535" cy="717" r="6" />
        </svg>
      </span>
      <span className="ag-cutin__speed" aria-hidden="true">
        {SPEED_LINES.map((top, index) => (
          <i
            key={top}
            style={
              {
                '--ag-line-top': `${top}%`,
                '--ag-line-delay': `${index * 17}ms`,
                '--ag-line-width': `${32 + (index % 3) * 17}%`,
              } as CSSProperties
            }
          />
        ))}
      </span>
      <span className="ag-cutin__stage">
        <span className="ag-cutin__ghost-word" aria-hidden="true">
          {chapterBoss ? '灾厄' : '强敌'}
        </span>
        <span className="ag-cutin__portrait-wrap" aria-hidden="true">
          <img
            className="ag-cutin__portrait"
            src={profile.portrait}
            alt=""
            draggable={false}
          />
        </span>
        <span className="ag-cutin__frame" aria-hidden="true" />
        <span className="ag-cutin__banner" aria-hidden="true">
          <span>{chapterBoss ? '灾厄降临' : '强敌突入'}</span>
        </span>
        <span className="ag-cutin__copy">
          <span className="ag-cutin__title">{profile.title}</span>
          <strong className="ag-cutin__name">{profile.name}</strong>
          <span className="ag-cutin__quote">「{profile.quote}」</span>
        </span>
      </span>
      <span className="ag-cutin__skip">
        {frozen ? '已暂停' : skippable ? '点击或按 空格 / Enter 跳过' : ''}
      </span>
      <span className="ag-cutin__time" aria-hidden="true" />
    </button>
  );
}

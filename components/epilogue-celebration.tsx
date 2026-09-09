import { useState, type CSSProperties } from 'react';
import {
  advanceEpilogueCelebration,
  canStartEpilogueGif,
  emptyEpilogueCelebration,
  EPILOGUE_GIF_FADE_SECONDS,
  EPILOGUE_GIF_HOLD_SECONDS,
  EPILOGUE_GIF_LIFETIME,
  type EpilogueApplauseSlot,
  type EpilogueBlessingEvent,
} from '@/lib/epilogue';
import './epilogue-celebration.css';

export function EpilogueCelebration({
  events,
  time,
}: {
  events: EpilogueBlessingEvent[];
  time: number;
}) {
  const [celebration, setCelebration] = useState(emptyEpilogueCelebration);
  const current = advanceEpilogueCelebration(celebration, events, time);
  if (current !== celebration) setCelebration(current);
  const finish = (id: number) =>
    setCelebration((current) => ({
      ...current,
      slots: current.slots.filter((slot) => slot.event.id !== id),
    }));
  const feedback = current.feedback;
  return (
    <div className="epilogue-celebration" aria-hidden="true">
      {current.slots.map((active) => (
        <ApplauseClip
          key={active.event.id}
          active={active}
          time={time}
          onFinish={finish}
        />
      ))}
      {feedback && time - feedback.time < 1.6 && (
        <strong
          className="epilogue-quick-blessing"
          key={`blessing-${feedback.id}`}
          style={{ left: `${30 + (feedback.id % 3) * 20}%` }}
        >
          {feedback.text}
        </strong>
      )}
    </div>
  );
}

function ApplauseClip({
  active,
  time,
  onFinish,
}: {
  active: EpilogueApplauseSlot;
  time: number;
  onFinish: (id: number) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const { event, slot } = active;
  const x = ((slot % 3) + 0.5) / 3 + (event.x - 0.5) * 0.025;
  const y = 0.19 + Math.floor(slot / 3) * 0.27 + (event.y - 0.4) * 0.03;
  return (
    <div
      className={`epilogue-applause${loaded ? ' is-playing' : ''}`}
      onAnimationEnd={(animation) => {
        if (animation.animationName === 'epilogue-applause-exit')
          onFinish(event.id);
      }}
      style={
        {
          left: `clamp(42px, ${x * 100}%, calc(100% - 42px))`,
          top: `${y * 100}%`,
          '--applause-tilt': `${((event.id % 7) - 3) * 1.6}deg`,
          '--applause-hold': `${EPILOGUE_GIF_HOLD_SECONDS}s`,
          '--applause-fade': `${EPILOGUE_GIF_FADE_SECONDS}s`,
          '--applause-life': `${EPILOGUE_GIF_LIFETIME}s`,
        } as CSSProperties
      }
    >
      <img
        src="/art/congratulations-evangelion.gif"
        alt=""
        width={220}
        height={164}
        draggable={false}
        decoding="async"
        onLoad={() => {
          if (!canStartEpilogueGif(time)) onFinish(event.id);
          else setLoaded(true);
        }}
        onError={() => onFinish(event.id)}
      />
      <strong>{event.text}</strong>
    </div>
  );
}

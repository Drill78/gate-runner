import type { CSSProperties } from 'react';
import type { EpilogueBlessingEvent } from '@/lib/epilogue';
import './epilogue-celebration.css';

export function EpilogueCelebration({
  events,
  time,
}: {
  events: EpilogueBlessingEvent[];
  time: number;
}) {
  return (
    <div className="epilogue-celebration" aria-hidden="true">
      {events.map((event) => {
        const age = Math.max(0, time - event.time);
        const opacity = Math.max(0, Math.min(1, age / 0.22, (6.4 - age) / 1.5));
        const tilt = ((event.id % 7) - 3) * 2;
        return (
          <div
            className="epilogue-applause"
            key={event.id}
            style={
              {
                left: `clamp(72px, ${event.x * 100}%, calc(100% - 72px))`,
                top: `${event.y * 100}%`,
                opacity,
                '--applause-rise': `${-Math.min(age, 6.4) * 5}px`,
                '--applause-tilt': `${tilt}deg`,
                '--applause-scale': 0.9 + Math.min(1, age / 0.25) * 0.1,
              } as CSSProperties
            }
          >
            <img
              src="/art/congratulations-evangelion.gif"
              alt=""
              width={220}
              height={168}
              draggable={false}
            />
            <strong>{event.text}</strong>
          </div>
        );
      })}
    </div>
  );
}

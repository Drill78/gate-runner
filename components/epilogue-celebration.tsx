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
        // Rotate through twelve separated areas; the original random values
        // add small offsets without letting applause pile up in one corner.
        const slot = (event.id * 5) % 12;
        const x = ((slot % 4) + 0.5) / 4 + (event.x - 0.5) * 0.045;
        const y = 0.16 + Math.floor(slot / 4) * 0.195 + (event.y - 0.4) * 0.06;
        return (
          <div
            className="epilogue-applause"
            key={event.id}
            style={
              {
                left: `clamp(48px, ${x * 100}%, calc(100% - 48px))`,
                top: `${y * 100}%`,
                opacity,
                '--applause-rise': `${-Math.min(age, 6.4) * 3}px`,
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

interface TapPoint {
  x: number;
  y: number;
  time: number;
}
// A tap must start on the visible hero and stay still; long drags never cast.
export function createHeroTapTracker() {
  let previous: TapPoint | null = null;
  let start: TapPoint | null = null;
  let dragged = false;
  const distance = (a: TapPoint, b: TapPoint) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  return {
    reset() {
      previous = null;
      start = null;
      dragged = false;
    },
    down(point: TapPoint, onHero: boolean) {
      start = onHero ? point : null;
      dragged = false;
      if (!onHero) previous = null;
    },
    move(point: TapPoint) {
      if (start && distance(start, point) > 12) dragged = true;
    },
    up(point: TapPoint) {
      const valid =
        start &&
        !dragged &&
        distance(start, point) <= 12 &&
        point.time - start.time <= 240;
      start = null;
      if (!valid) {
        previous = null;
        return false;
      }
      const twice =
        previous &&
        point.time - previous.time <= 320 &&
        distance(previous, point) <= 28;
      previous = twice ? null : point;
      return Boolean(twice);
    },
  };
}

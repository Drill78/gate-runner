// Scientific counts keep a 15-digit approximation; the exponent is stored
// separately so squaring never overflows Number or silently resets an army.
export interface Magnitude {
  mantissa: number;
  exponent: number;
}
export interface ArmyState {
  squad: number;
  peakSquad: number;
  squadMagnitude?: Magnitude;
  peakSquadMagnitude?: Magnitude;
}
export const MAX_ARMY_EXPONENT = Number.MAX_SAFE_INTEGER;
export const ARMY_PROJECTION_LIMIT = 1e300;
export function validMagnitude(value: unknown): value is Magnitude {
  const v = value as Magnitude | null;
  return Boolean(
    v &&
    typeof v === 'object' &&
    Number.isFinite(v.mantissa) &&
    v.mantissa >= 1 &&
    v.mantissa < 10 &&
    Number.isSafeInteger(v.exponent) &&
    v.exponent >= 0 &&
    v.exponent <= MAX_ARMY_EXPONENT,
  );
}
export function magnitude(value: number): Magnitude {
  if (!(value > 0)) return { mantissa: 0, exponent: 0 };
  const exponent = Math.floor(
    Math.log10(Math.min(ARMY_PROJECTION_LIMIT, value)),
  );
  return normalize(value / 10 ** exponent, exponent);
}
export function normalize(mantissa: number, exponent: number): Magnitude {
  if (!(mantissa > 0)) return { mantissa: 0, exponent: 0 };
  const shift = Math.floor(Math.log10(mantissa));
  let m = Number((mantissa / 10 ** shift).toPrecision(15));
  let e = exponent + shift;
  if (m >= 10) {
    m /= 10;
    e++;
  }
  if (e > MAX_ARMY_EXPONENT)
    return { mantissa: 9.99999999999999, exponent: MAX_ARMY_EXPONENT };
  if (e < 0) return { mantissa: 0, exponent: 0 };
  return { mantissa: m, exponent: e };
}
export function projectMagnitude(value: Magnitude): number {
  return value.exponent >= 300
    ? ARMY_PROJECTION_LIMIT
    : value.mantissa * 10 ** value.exponent;
}
export function compareMagnitude(a: Magnitude, b: Magnitude) {
  if (!a.mantissa || !b.mantissa) return Math.sign(a.mantissa - b.mantissa);
  return (
    Math.sign(a.exponent - b.exponent) || Math.sign(a.mantissa - b.mantissa)
  );
}
export function addMagnitude(
  a: Magnitude,
  b: Magnitude,
  subtract = false,
): Magnitude {
  const e = Math.max(a.exponent, b.exponent);
  return normalize(
    a.mantissa * 10 ** (a.exponent - e) +
      b.mantissa * 10 ** (b.exponent - e) * (subtract ? -1 : 1),
    e,
  );
}
export function multiplyMagnitude(a: Magnitude, factor: number): Magnitude {
  return normalize(a.mantissa * factor, a.exponent);
}
export function powerMagnitude(a: Magnitude, power: 2 | 0.5): Magnitude {
  const e = a.exponent * power;
  return normalize(
    a.mantissa ** power * 10 ** (e - Math.floor(e)),
    Math.floor(e),
  );
}
export function armyMagnitude(run: ArmyState): Magnitude {
  if (run.squadMagnitude && projectMagnitude(run.squadMagnitude) === run.squad)
    return run.squadMagnitude;
  return magnitude(run.squad);
}
export function peakArmyMagnitude(run: ArmyState): Magnitude {
  const peak =
    run.peakSquadMagnitude &&
    projectMagnitude(run.peakSquadMagnitude) === run.peakSquad
      ? run.peakSquadMagnitude
      : magnitude(run.peakSquad || 1);
  const current = armyMagnitude(run);
  return compareMagnitude(current, peak) > 0 ? current : peak;
}
export function trackArmyPeak(run: ArmyState) {
  const peak = peakArmyMagnitude(run);
  run.peakSquad = projectMagnitude(peak);
  if (peak.exponent >= 15) run.peakSquadMagnitude = peak;
  else delete run.peakSquadMagnitude;
}
export function setArmy(run: ArmyState, value: Magnitude, roundUp = false) {
  if (value.exponent < 15) {
    const n = projectMagnitude(value);
    // Rounding scientific mantissas can put an integer just below its boundary.
    run.squad = Math.max(
      1,
      roundUp ? Math.ceil(n - 1e-10) : Math.floor(n + 1e-10),
    );
    delete run.squadMagnitude;
  } else {
    run.squadMagnitude = value;
    run.squad = projectMagnitude(value);
  }
  trackArmyPeak(run);
}
export function addArmy(
  run: ArmyState,
  amount: number | Magnitude,
  subtract = false,
) {
  // Keep ordinary integer arithmetic exact for early-game gates and supplies.
  if (typeof amount === 'number' && run.squad < 1e14 && amount < 1e14) {
    setArmy(
      run,
      magnitude(Math.max(1, run.squad + amount * (subtract ? -1 : 1))),
    );
  } else
    setArmy(
      run,
      addMagnitude(
        armyMagnitude(run),
        typeof amount === 'number' ? magnitude(amount) : amount,
        subtract,
      ),
    );
}
export function multiplyArmy(run: ArmyState, factor: number, roundUp = false) {
  setArmy(run, multiplyMagnitude(armyMagnitude(run), factor), roundUp);
}
export function armyLog(run: ArmyState): number {
  const a = armyMagnitude(run);
  return a.exponent + Math.log10(a.mantissa);
}
export function formatMagnitude(value: Magnitude): string {
  if (value.exponent >= 16) {
    // Truncate at the display boundary rather than round 9.999 into misleading 10.00.
    const mantissa = (Math.floor(value.mantissa * 100) / 100).toFixed(2);
    return `${mantissa}×10^${value.exponent.toLocaleString('en-US', { useGrouping: false })}`;
  }
  const n = projectMagnitude(value);
  return n >= 1e12
    ? `${(n / 1e12).toFixed(1)}兆`
    : n >= 1e8
      ? `${(n / 1e8).toFixed(1)}亿`
      : n >= 1e4
        ? `${(n / 1e4).toFixed(1)}万`
        : Math.round(n).toLocaleString('zh-CN');
}
export const formatArmy = (run: ArmyState) =>
  formatMagnitude(armyMagnitude(run));

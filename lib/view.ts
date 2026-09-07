// Shared world-to-screen mapping. View distance never changes object scale.
export const VIEW = {
  far: -0.45,
  near: 1.03,
  playerY: 0.8,
  previewSeconds: 1.25,
  controlSpace: 140,
} as const;
export function screenY(y: number, height: number) {
  // Leave room below the army for thumb controls without covering the fight.
  return (
    ((y - VIEW.far) / (VIEW.near - VIEW.far)) *
    Math.max(1, height - VIEW.controlSpace)
  );
}
export function screenX(x: number, width: number) {
  return width * (0.5 + x * 0.455);
}

// Shared world-to-screen mapping. View distance never changes object scale.
export const VIEW = {
  // Move only the camera framing; world travel still reaches the player at 0.8.
  far: -0.68,
  near: 1.17,
  playerY: 0.8,
  previewSeconds: 1.5,
  controlSpace: 24,
  horizontalScale: 0.465,
} as const;
export function screenY(y: number, height: number) {
  // Skills live at the side; reserve only the slim bottom experience strip.
  return (
    ((y - VIEW.far) / (VIEW.near - VIEW.far)) *
    Math.max(1, height - VIEW.controlSpace)
  );
}
export function screenX(x: number, width: number) {
  return width * (0.5 + x * VIEW.horizontalScale);
}
// Accept canvas-local CSS pixels; combat owns the allowed movement range.
export function pointerToWorldX(x: number, width: number) {
  if (!Number.isFinite(x) || !Number.isFinite(width) || width <= 0) return 0;
  return (x / width - 0.5) / VIEW.horizontalScale;
}

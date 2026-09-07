// Shared world-to-screen mapping. View distance never changes object scale.
export const VIEW = {
  far: -0.45,
  near: 1.03,
  playerY: 0.8,
  previewSeconds: 1.25,
  controlSpace: 24,
} as const;
export function screenY(y: number, height: number) {
  // Skills live at the side; reserve only the slim bottom experience strip.
  return (
    ((y - VIEW.far) / (VIEW.near - VIEW.far)) *
    Math.max(1, height - VIEW.controlSpace)
  );
}
export function screenX(x: number, width: number) {
  return width * (0.5 + x * 0.455);
}

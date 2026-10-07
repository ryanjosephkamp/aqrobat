export const THEMES = Object.freeze([
  { id: "violet", name: "Violet" },
  { id: "ocean", name: "Ocean" },
  { id: "ember", name: "Ember" },
  { id: "garden", name: "Garden" },
  { id: "midnight", name: "Midnight" },
]);
export const ICON_COLORS = Object.freeze([
  { id: "violet", name: "Violet", background: "#33244f", ink: "#d8c5ff" },
  { id: "blue", name: "Blue", background: "#103f58", ink: "#a2e1ff" },
  { id: "coral", name: "Coral", background: "#572c32", ink: "#ffc1ae" },
  { id: "green", name: "Green", background: "#18352c", ink: "#d9f171" },
  { id: "gold", name: "Gold", background: "#483a15", ink: "#ffe398" },
]);
export const APPEARANCE_KEY = "aqrobat-appearance-v1";
export function appearance(value) {
  return {
    theme: THEMES.some((t) => t.id === value?.theme) ? value.theme : "violet",
    icon: ICON_COLORS.some((c) => c.id === value?.icon) ? value.icon : "violet",
  };
}
export function iconPaths(color) {
  const id = appearance({ icon: color }).icon;
  return Object.fromEntries(
    [16, 32, 48, 128].map((size) => [size, `icons/${id}-${size}.png`]),
  );
}
export function drawIcon(canvas, color, size = 32) {
  const id = appearance({ icon: color }).icon;
  const swatch = ICON_COLORS.find((c) => c.id === id);
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = swatch.background;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = swatch.ink;
  ctx.font = `700 ${size * 0.82}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("#", size / 2, size / 2);
}

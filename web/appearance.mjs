export const THEMES = Object.freeze([
  { id: "system", name: "System" },
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
]);
export const APPEARANCE_KEY = "aqrobat-appearance-v1";
// Earlier versions stored named color themes; the dark one maps to dark and
// the rest follow the device. They also stored an icon color, now unused.
const LEGACY_THEMES = { midnight: "dark" };
export function appearance(value) {
  const theme = LEGACY_THEMES[value?.theme] ?? value?.theme;
  return {
    theme: THEMES.some((t) => t.id === theme) ? theme : "system",
  };
}

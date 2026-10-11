import {
  DEFAULT_RECIPE,
  validatePortable,
  measurePortable,
  composePortable,
} from "../portable-story-2026-10-11/generator.mjs";

// Choose the largest valid size, not a scanner score or the failed fill heuristic.
export function composePageProse(input, documentObject = document) {
  const spec = validatePortable({
    ...DEFAULT_RECIPE,
    quiet: 5,
    ...input,
    font: "Impact",
    darkWeight: 400,
    lightWeight: 400,
  });
  if (![600, 624].includes(spec.field))
    throw new Error("Choose a 6.25in or 6.5in text measure.");
  const attempts = [],
    points =
      input.pointChoice === "fit"
        ? [9, 8.5, 8]
        : [Number(input.pointChoice ?? 9)];
  if (points.some((p) => ![8, 8.5, 9, 9.5, 10].includes(p)))
    throw new Error("Choose a supported half-point type size.");
  for (const point of points) {
    const candidate = { ...spec, fontSize: point / 0.75 };
    try {
      const measurement = measurePortable(candidate, documentObject),
        layout = composePortable(candidate, measurement);
      attempts.push({ points: point, accepted: true });
      return { layout, attempts };
    } catch (e) {
      attempts.push({ points: point, accepted: false, error: e.message });
    }
  }
  const error = new Error(
    attempts.at(-1)?.error ?? "No complete source fits this page.",
  );
  error.attempts = attempts;
  throw error;
}

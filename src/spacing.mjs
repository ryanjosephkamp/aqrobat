// Destination-specific packing. measure() must measure whole strings using
// the destination's actual font, size, letter spacing, and word spacing.
export function calibratedText(qr, measure, lineHeight) {
  if (!(lineHeight > 0 && Number.isFinite(lineHeight)))
    throw new RangeError("The editor's line height cannot be measured.");
  const widths = qr.palette.map((g) => measure(g)),
    widest = Math.max(...widths);
  if (!(widest > 0))
    throw new RangeError("The editor's glyphs cannot be measured.");
  // Keep glyphs in the central part of a module. Repetition is adapted to the
  // destination, not the image's pixel size. All cells retain the same matrix.
  const down = Math.max(
      qr.recipe.options.repeatY,
      Math.ceil(widest / lineHeight),
    ),
    cellHeight = lineHeight * down;
  const spaces = [" ", "\u00a0", "\u2009", "\u200a", "\u3000"]
    .map((text) => ({ text, width: measure(text) }))
    .filter((s) => s.width > 0 && Number.isFinite(s.width))
    .sort((a, b) => b.width - a.width);
  if (!spaces.length)
    throw new RangeError("The editor's spaces cannot be measured.");
  // Prefer a nearby cell width the available blanks can express exactly.
  // Keep any horizontal/vertical difference under ten percent; typography can
  // still make the cells slightly rectangular. This is reported in the preview.
  const cellOptions = [];
  for (const a of spaces)
    for (const b of spaces)
      for (let n = 0; n <= 8; n++)
        for (let m = 0; m <= 8; m++) {
          const width = a.width * n + b.width * m;
          if (
            width >= widest &&
            Math.abs(width - cellHeight) <= cellHeight * 0.1
          )
            cellOptions.push(width);
        }
  cellOptions.sort(
    (a, b) => Math.abs(a - cellHeight) - Math.abs(b - cellHeight),
  );
  const cell = cellOptions[0] ?? cellHeight,
    repeats = Object.fromEntries(
      qr.palette.map((g) => {
        let n = 1;
        while (n < 12 && measure(g.repeat(n + 1)) <= cell * 1.01) n++;
        return [g, n];
      }),
    );
  let maxError = 0;
  function pad(row, target) {
    const start = measure(row),
      remaining = target - start;
    const candidates = [{ text: "", error: Math.abs(remaining) }];
    // Compare bounded combinations of two kinds of blank. One greedy blank
    // at a time fails when, for example, two ordinary spaces beat one wide one.
    for (const a of spaces)
      for (const b of spaces) {
        const limit = Math.min(
          64,
          Math.max(0, Math.ceil(remaining / a.width) + 1),
        );
        for (let n = 0; n <= limit; n++) {
          const m = Math.max(
            0,
            Math.min(64, Math.round((remaining - n * a.width) / b.width)),
          );
          const text = a.text.repeat(n) + b.text.repeat(m);
          candidates.push({
            text,
            error: Math.abs(n * a.width + m * b.width - remaining),
          });
        }
      }
    candidates.sort(
      (a, b) => a.error - b.error || a.text.length - b.text.length,
    );
    let best = row,
      error = Math.abs(remaining);
    const checked = new Set();
    for (const option of candidates) {
      if (checked.has(option.text)) continue;
      checked.add(option.text);
      const candidate = row + option.text,
        actual = Math.abs(measure(candidate) - target);
      if (actual + 0.001 < error) {
        error = actual;
        best = candidate;
      }
      if (checked.size >= 8 || error < 0.001) break;
    }
    maxError = Math.max(maxError, error);
    return best;
  }
  const rows = [];
  for (let y = -qr.quiet; y < qr.modules + qr.quiet; y++) {
    let row = "";
    for (let x = -qr.quiet; x < qr.modules + qr.quiet; x++) {
      const glyph = qr.glyphMatrix[y]?.[x],
        i = x + qr.quiet;
      if (glyph) {
        const ink = glyph.repeat(repeats[glyph]);
        row = pad(row, i * cell + (cell - measure(ink)) / 2) + ink;
      }
      row = pad(row, (i + 1) * cell);
    }
    for (let dy = 0; dy < down; dy++) rows.push(row);
  }
  const gridWidth = qr.totalModules * cell;
  const width = Math.max(gridWidth, ...rows.map(measure));
  if (maxError > cell * 0.2)
    throw new RangeError(
      "This font's spaces are too coarse to align the QR. Use a smaller monospace font or formatted insertion.",
    );
  return {
    text: rows.join("\n"),
    rows,
    width,
    gridWidth,
    height: rows.length * lineHeight,
    lineHeight,
    cell,
    cellHeight,
    down,
    maxError,
    repeats,
    layout: "aqrobat-field-v1",
  };
}

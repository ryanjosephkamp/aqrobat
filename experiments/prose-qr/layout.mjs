import { generate } from "../../src/core.mjs";
import { WORDS } from "./vocabulary.mjs";
export const SCALES = [320, 640, 960];
export const FONTS = ["Menlo", "Courier New"];
export const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function makeSpecifications(payload = "AQROBAT-TEST") {
  const strict = [],
    styled = [];
  for (const font of FONTS)
    for (const length of [2, 3, 4])
      for (const weight of [400, 700])
        for (const packing of ["comfortable", "tight"])
          for (const light of ["blank", "words"])
            strict.push({
              id: `strict-${String(strict.length + 1).padStart(3, "0")}`,
              track: "strict",
              payload,
              font,
              length,
              weight,
              packing,
              light,
              ecc: "M",
              boost: false,
            });
  for (const font of FONTS)
    for (const length of [2, 3, 4])
      for (const rows of [2, 3])
        for (const letterSpacing of [0, -0.1, -0.2])
          for (const lightRatio of [0, 0.25, 0.55])
            styled.push({
              id: `styled-${String(styled.length + 1).padStart(3, "0")}`,
              track: "styled",
              payload,
              font,
              length,
              weight: 700,
              rows,
              letterSpacing,
              lightRatio,
              ecc: "M",
              boost: false,
            });
  return [...strict, ...styled];
}
export function chooseWords(spec, metrics) {
  const data = metrics.words[`${spec.font}|${spec.weight}`];
  const dark = [...new Set(WORDS[spec.length].dark)]
    .sort(
      (a, b) =>
        data[b].cellInkFraction - data[a].cellInkFraction || a.localeCompare(b),
    )
    .slice(0, 3);
  const light = [...new Set(WORDS[spec.length].light)]
    .sort(
      (a, b) =>
        data[a].cellInkFraction - data[b].cellInkFraction || a.localeCompare(b),
    )
    .slice(0, 3);
  return { dark, light };
}
export function buildLayout(spec, metrics, size) {
  const qr = generate(spec.payload, {
    ecc: spec.ecc,
    boost: spec.boost,
    width: size,
    stroke: 0,
  });
  const { dark, light } = chooseWords(spec, metrics);
  const module = size / qr.totalModules;
  const advance = metrics.fonts[`${spec.font}|${spec.weight}`].advanceEm;
  const charCount = spec.length + 1;
  const rows =
    spec.track === "strict"
      ? Math.round(
          (charCount * advance) / (spec.packing === "tight" ? 0.6 : 0.85),
        )
      : spec.rows;
  const fontSize =
    spec.track === "strict"
      ? module / (charCount * advance)
      : (module * 0.9) /
        (spec.length * advance + spec.length * spec.letterSpacing);
  const lineHeight = module / rows;
  const placements = [];
  let d = 0,
    l = 0;
  for (let y = -qr.quiet; y < qr.modules + qr.quiet; y++) {
    const row = [];
    for (let x = -qr.quiet; x < qr.modules + qr.quiet; x++) {
      const quiet = x < 0 || y < 0 || x >= qr.modules || y >= qr.modules;
      const isDark = !quiet && qr.matrix[y][x];
      const useLight =
        !quiet &&
        (spec.track === "strict"
          ? spec.light === "words"
          : spec.lightRatio > 0);
      row.push({
        dark: isDark,
        quiet,
        word: quiet
          ? ""
          : isDark
            ? dark[d++ % dark.length]
            : useLight
              ? light[l++ % light.length]
              : "",
      });
    }
    placements.push(row);
  }
  const text =
    placements
      .flatMap((row) =>
        Array.from({ length: rows }, () =>
          row.map((c) => c.word.padEnd(charCount, " ")).join(""),
        ),
      )
      .join("\n") + "\n";
  const common = `font-family:'${spec.font}',monospace;color:#000;background:#fff;width:${size}px;height:${size}px;direction:ltr;`;
  let markup;
  if (spec.track === "strict")
    markup = `<pre id="artifact" style="${common}font-size:${fontSize}px;font-weight:${spec.weight};font-style:normal;line-height:${lineHeight}px;letter-spacing:0;white-space:pre;margin:0;padding:0;border:0;overflow:visible;">${escapeHtml(text)}</pre>`;
  else
    markup =
      `<div id="artifact" style="${common}display:grid;grid-template-columns:repeat(${qr.totalModules},${module}px);grid-template-rows:repeat(${qr.totalModules},${module}px);font-style:normal;">` +
      placements
        .flat()
        .map((c) => {
          const ratio = c.dark ? 1 : spec.lightRatio;
          const fs = fontSize * ratio;
          const weight = c.dark ? 700 : 400;
          const spacing = c.dark ? spec.letterSpacing * fontSize : 0;
          return (
            `<div class="word-cell" style="width:${module}px;height:${module}px;display:flex;flex-direction:column;justify-content:center;text-align:center;font-size:${fs}px;line-height:${lineHeight}px;font-weight:${weight};letter-spacing:${spacing}px;white-space:pre;">` +
            Array.from(
              { length: rows },
              () =>
                `<span style="display:block;height:${lineHeight}px;flex:none;">${escapeHtml(c.word)}${c.word ? " " : ""}</span>`,
            ).join("") +
            `</div>`
          );
        })
        .join("") +
      `</div>`;
  return {
    spec,
    size,
    qr: {
      matrix: qr.matrix,
      modules: qr.modules,
      version: qr.version,
      quiet: qr.quiet,
      totalModules: qr.totalModules,
      actualEcc: qr.actualEcc,
    },
    darkWords: dark,
    lightWords: light,
    rows,
    fontSize,
    lineHeight,
    advanceEm: advance,
    plainText: text,
    markup,
    styleDependencies: {
      font: spec.font,
      fontWeight: spec.weight,
      fontSize,
      lineHeight,
      letterSpacingEm: spec.track === "strict" ? 0 : spec.letterSpacing,
      lightFontRatio: spec.track === "strict" ? 1 : spec.lightRatio,
      lightFontWeight: spec.track === "strict" ? spec.weight : 400,
    },
    readingStatus: "real words, not grammatical prose",
    hidingStatus: "not independently reviewed",
  };
}
export function documentHtml(markup) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;padding:0;background:white;color:black}body{width:max-content}</style></head><body>${markup}</body></html>`;
}
export function positiveControl(payload, size) {
  const qr = generate(payload, {
    ecc: "M",
    boost: false,
    width: size,
    stroke: 0,
  });
  const unit = size / qr.totalModules;
  const squares = qr.matrix
    .flatMap((row, y) =>
      row.flatMap((dark, x) =>
        dark
          ? [
              `<rect x="${Math.floor((x + 4) * unit)}" y="${Math.floor((y + 4) * unit)}" width="${Math.floor((x + 5) * unit) - Math.floor((x + 4) * unit)}" height="${Math.floor((y + 5) * unit) - Math.floor((y + 4) * unit)}" fill="black"/>`,
            ]
          : [],
      ),
    )
    .join("");
  return `<svg id="artifact" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="white"/>${squares}</svg>`;
}

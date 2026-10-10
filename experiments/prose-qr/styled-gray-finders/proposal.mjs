import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import { escapeHtml } from "../layout.mjs";
import { finderMatrix } from "../finder-native/layout.mjs";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-21/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  input = root + "source.txt",
  text = (await readFile(input, "utf8")).trim().replace(/\s+/g, " "),
  words = text.split(" "),
  configs = [];
await mkdir(root + "proposal-01");
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 400 },
    deviceScaleFactor: 1,
  });
  let index = 0;
  for (const font of ["Impact", "Arial Black"]) {
    await page.setContent(
      `<p style="font:400 20px/28px '${font}';font-kerning:none">${escapeHtml(text)}</p>`,
    );
    await page.evaluate(() => document.fonts.ready);
    const glyphs = await page.evaluate(
      ({ font, text }) => {
        const g = document.createElement("canvas").getContext("2d");
        g.font = `400 20px '${font}'`;
        g.fontKerning = "none";
        return Object.fromEntries(
          [...new Set(text)].map((c) => {
            const m = g.measureText(c);
            return [
              c,
              {
                advance: m.width + 2,
                left: m.actualBoundingBoxLeft,
                right: m.actualBoundingBoxRight,
                ascent: m.actualBoundingBoxAscent,
                descent: m.actualBoundingBoxDescent,
              },
            ];
          }),
        );
      },
      { font, text },
    );
    const field = 1008,
      unit = 144,
      leading = 28,
      lines = [],
      markupLines = [];
    let next = 0;
    for (let row = 0; row < Math.floor(field / leading); row++) {
      const selected = [];
      let width = 0;
      while (true) {
        const word = words[next % words.length],
          advance = [...word].reduce((n, c) => n + glyphs[c].advance, 0),
          gap = selected.length ? glyphs[" "].advance : 0;
        if (width + gap + advance > field - 12) break;
        selected.push(word);
        width += gap + advance;
        next++;
      }
      assert(selected.length);
      const line = selected.join(" ");
      lines.push(line);
      let x = 0;
      markupLines.push(
        [...line]
          .map((c) => {
            const m = glyphs[c],
              mx = Math.floor((x + m.advance / 2) / unit),
              my = Math.floor(((row + 0.5) * leading) / unit),
              dark =
                mx === 0 ||
                mx === 6 ||
                my === 0 ||
                my === 6 ||
                (mx >= 2 && mx <= 4 && my >= 2 && my <= 4);
            x += m.advance;
            return `<span style="color:${dark ? "#000" : "#767676"}">${escapeHtml(c)}</span>`;
          })
          .join(""),
      );
    }
    const normalized = lines.join(" ").split(" ");
    assert(normalized.every((w, i) => w === words[i % words.length]));
    const spec = {
      id: `styled-gray-${++index}`,
      font,
      platformFamily: font,
      size: 20,
      leading,
      tracking: 2,
      lines,
      markupLines,
      unit,
      dx: 0,
      offset: 0,
      textField: field,
      matrix: finderMatrix(25),
      payload: null,
      classification:
        "Styled regular-gray meaningful prose; not uniform-black ASCII",
    };
    const path = root + `run-0${index}.json`,
      content = await format(
        JSON.stringify({
          batch: `run-0${index}`,
          plan: root + "PLAN.md",
          specs: [spec],
        }),
        { parser: "json" },
      );
    await writeFile(path, content, { flag: "wx" });
    configs.push({
      path,
      sha256: sha(content),
      font,
      words: normalized.length,
    });
    await writeFile(
      root + `proposal-01/metrics-${index}.json`,
      await format(
        JSON.stringify({
          glyphs,
          sourceTextSha256: sha(text),
          wordsConsumed: next,
          contrastRatio:
            1.05 /
            ((0.2126 + 0.7152 + 0.0722) *
              Math.pow((118 / 255 + 0.055) / 1.055, 2.4) +
              0.05),
        }),
        { parser: "json" },
      ),
      { flag: "wx" },
    );
  }
  await writeFile(
    root + "proposal-01/manifest.json",
    await format(
      JSON.stringify({
        at: new Date().toISOString(),
        configs,
        sources: Object.fromEntries(
          await Promise.all(
            [
              input,
              "experiments/prose-qr/styled-gray-finders/proposal.mjs",
              root + "PLAN.md",
            ].map(async (p) => [p, sha(await readFile(p))]),
          ),
        ),
      }),
      { parser: "json" },
    ),
    { flag: "wx" },
  );
} finally {
  await browser.close();
}

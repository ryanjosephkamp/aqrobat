import { readFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { root, source, json, sources } from "./common.mjs";
import { finderMatrix } from "../finder-native/layout.mjs";
await mkdir(root + "proposal-01");
const m = JSON.parse(await readFile(root + "metrics-01/summary.json"));
assert.equal(m.completedResources, 60);
assert.equal(m.immediateRepeats, 60);
const observation = JSON.parse(
  await readFile(root + "resource-legibility.json"),
);
const selected = m.selected;
if (!selected || !observation.eligible) {
  await json(root + "proposal-01/rejection.json", {
    selected,
    observation,
    plannedNativeSlots: 2,
    unattemptedNativeSlots: 2,
  });
} else {
  assert(selected.margin >= 0.1);
  const resourceRows = [];
  for (const clearance of [0.25, 2]) {
    const c = clearance === 0.25 ? "c1" : "c2";
    const dark = JSON.parse(
      await readFile(
        root + "metrics-01/" + selected.dark.replace("c1", c) + ".json",
      ),
    );
    const light = JSON.parse(
      await readFile(
        root + "metrics-01/" + selected.light.replace("c1", c) + ".json",
      ),
    );
    assert(!dark.rejected && !light.rejected);
    const side = 5600,
      unit = 160,
      left = 2,
      top = 2,
      leading = dark.leading;
    const regions = [
      [0, 0],
      [18, 0],
      [0, 18],
    ]
      .flatMap(([x, y]) => [
        [x, y, x + 7, y + 1],
        [x, y + 6, x + 7, y + 7],
        [x, y + 1, x + 1, y + 6],
        [x + 6, y + 1, x + 7, y + 6],
        [x + 2.3, y + 2.3, x + 4.7, y + 4.7],
      ])
      .map((r) => r.map((v) => (v + 5) * unit));
    const rows = Math.floor((side - top) / leading),
      lines = [],
      advances = [];
    const space = dark.glyphs[" "].advance;
    for (let row = 0; row < rows; row++) {
      let x = left;
      const words = [];
      while (true) {
        const useDark = regions.some(
          ([x0, y0, x1, y1]) =>
            x + dark.wordWidth / 2 >= x0 &&
            x + dark.wordWidth / 2 < x1 &&
            top + (row + 0.5) * leading >= y0 &&
            top + (row + 0.5) * leading < y1,
        );
        const word = useDark ? dark : light;
        if (x + word.wordWidth > side - 2) break;
        words.push(word.word);
        x += word.wordWidth + space;
      }
      lines.push(words.join(" "));
      advances.push(x - left - space);
    }
    const batch = `run-0${clearance === 0.25 ? 1 : 2}`;
    const spec = {
      batch,
      font: selected.font,
      darkWord: dark.word,
      lightWord: light.word,
      glyphs: dark.glyphs,
      leading,
      clearance,
      envelope: dark.envelope,
      size: 20,
      tracking: 0,
      side,
      unit,
      modules: 25,
      quiet: 5,
      matrix: finderMatrix(25),
      regions,
      sourceLeft: left,
      sourceTop: top,
      lines,
      advances,
      sourceCentralSquareModules: 2.4,
      payload: null,
      lane: selected.font.lane,
      classification:
        "One continuous native text node; whole-word source-center assignment; no encoded payload",
    };
    await json(root + batch + ".json", spec);
    resourceRows.push({
      batch,
      rows,
      leading,
      clearance,
      words: lines.reduce((n, l) => n + l.split(" ").length, 0),
      minRightSlack: side - left - Math.max(...advances),
    });
  }
  await json(root + "proposal-01/manifest.json", {
    at: new Date().toISOString(),
    plannedNative: 2,
    selected,
    observation,
    cases: resourceRows,
    sources: await sources([
      source + "proposal.mjs",
      source + "common.mjs",
      root + "PLAN.md",
      root + "metrics-01/summary.json",
      root + "resource-legibility.json",
      "experiments/prose-qr/finder-native/layout.mjs",
      root + "run-01.json",
      root + "run-02.json",
    ]),
  });
  console.log(JSON.stringify(resourceRows));
}

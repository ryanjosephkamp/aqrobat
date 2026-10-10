import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import qrcodegen from "../../../vendor/qrcodegen.mjs";
import {
  root,
  source,
  json,
  save,
  sha,
  sources,
  checkTime,
} from "./common.mjs";
checkTime();
const out = root + "/calibration-01",
  payload = "https://example.com/";
const code = qrcodegen.QrCode.encodeSegments(
  [qrcodegen.QrSegment.makeBytes([...new TextEncoder().encode(payload)])],
  qrcodegen.QrCode.Ecc.MEDIUM,
  2,
  2,
  0,
  false,
);
const matrix = Array.from({ length: code.size }, (_, y) =>
  Array.from({ length: code.size }, (_, x) => code.getModule(x, y)),
);
await json(out + "/manifest.json", {
  at: new Date().toISOString(),
  payload,
  version: 2,
  mask: 0,
  ecc: "M",
  boost: false,
  unit: 12,
  quiet: 4,
  matrix,
  newConventionalSources: 2,
  nativeTextProposals: 0,
  sources: await sources([
    source + "/calibration.mjs",
    source + "/common.mjs",
    out + "/PLAN.md",
    "vendor/qrcodegen.mjs",
    "NOTICE.md",
  ]),
});
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const captures = [];
let current;
try {
  const page = await browser.newPage({
    viewport: { width: 396, height: 396 },
    deviceScaleFactor: 1,
  });
  page.setDefaultTimeout(30000);
  for (const shape of ["square", "circle"]) {
    current = shape;
    const dir = out + "/" + shape;
    await mkdir(dir);
    let parts = [];
    for (let y = 0; y < 25; y++)
      for (let x = 0; x < 25; x++)
        if (
          matrix[y][x] &&
          !(
            shape === "circle" &&
            ((x < 7 && y < 7) || (x >= 18 && y < 7) || (x < 7 && y >= 18))
          )
        )
          parts.push(`<rect x="${x + 4}" y="${y + 4}" width="1" height="1"/>`);
    if (shape === "circle")
      for (const [x, y] of [
        [7.5, 7.5],
        [25.5, 7.5],
        [7.5, 25.5],
      ])
        for (const [r, fill] of [
          [3.5, "black"],
          [2.5, "white"],
          [1.5, "black"],
        ])
          parts.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="396" height="396" viewBox="0 0 33 33"><rect width="33" height="33" fill="white"/><g fill="black">${parts.join("")}</g></svg>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:white}svg{display:block}</style></head><body>${svg}</body></html>`;
    await save(dir + "/source.svg", svg);
    await save(dir + "/source.html", html);
    await page.setContent(html);
    const png = await page.screenshot();
    await save(dir + "/native.png", png);
    await page.setContent(html);
    const repeat = await page.screenshot();
    if (sha(repeat) !== sha(png)) await save(dir + "/repeat.png", repeat);
    const c = {
      id: shape,
      dir,
      control: true,
      newConventional: true,
      pngPath: dir + "/native.png",
      pngSha256: sha(png),
      repeatSha256: sha(repeat),
      repeatExact: sha(repeat) === sha(png),
      rejected: sha(repeat) !== sha(png),
      reasons: sha(repeat) !== sha(png) ? ["repeat mismatch"] : [],
      payload,
      geometry: {
        unit: 12,
        dimension: 25,
        counters: [
          { x: 90, y: 90 },
          { x: 306, y: 90 },
          { x: 90, y: 306 },
        ],
      },
    };
    await json(dir + "/capture.json", c);
    captures.push(c);
  }
  await json(out + "/captures.json", captures);
} catch (e) {
  await json(out + "/capture-error.json", { current, error: e.stack });
  throw e;
} finally {
  await browser.close();
}

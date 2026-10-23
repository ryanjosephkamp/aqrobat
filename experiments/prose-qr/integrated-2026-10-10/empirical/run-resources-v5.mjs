import assert from "node:assert/strict";
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright";
import { sha } from "./common.mjs";
import { ordinaryBinarize, bundleHash } from "./diagnostic.mjs";
import { geometricRuns, runMetric } from "./metrics.mjs";
const source = "experiments/prose-qr/integrated-2026-10-10/empirical";
const root = "docs/research/prose-qr/integrated-2026-10-10/empirical";
const out = process.argv[2];
assert(out?.startsWith(root + "/"));
const read = async (p) => JSON.parse(await readFile(p));
const prereg = await read(out + "/preregistration.json");
assert.equal(
  prereg.allocation.path,
  "docs/research/prose-qr/integrated-2026-10-10/allocation-02.json",
);
assert.equal(
  sha(await readFile(prereg.allocation.path)),
  prereg.allocation.sha256,
);
const walk = async (p) =>
  (
    await Promise.all(
      (await readdir(p, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? walk(p + "/" + e.name) : [p + "/" + e.name],
      ),
    )
  ).flat();
const bytes = async () =>
  (
    await Promise.all(
      [...(await walk(root)), ...(await walk(source))].map(
        async (p) => (await stat(p)).size,
      ),
    )
  ).reduce((a, b) => a + b, 0);
const save = async (path, value, mutable = false) => {
  assert(path.startsWith(root + "/"));
  assert((await bytes()) + Buffer.byteLength(value) < 47000000);
  await writeFile(path, value, { flag: mutable ? "w" : "wx" });
};
const json = (path, value, mutable = false) =>
  save(path, JSON.stringify(value, null, 2) + "\n", mutable);
let budget = await read(root + "/budget.json");
const rows = [],
  events = [],
  slots = prereg.specs.map((t) => ({ id: t.id, status: "unattempted" }));
let browser,
  current = null,
  stop = null,
  diagnostics = 0,
  captures = 0;
const startedAtUtc = new Date().toISOString();
const check = async () => {
  assert(Date.now() < Date.parse(prereg.cutoffUtc));
  assert((await bytes()) < 47000000);
  assert(budget.glyphResources <= 128);
};
const stream = async (t, label, command, args, options = {}) => {
  const r = spawnSync(command, args, {
    timeout: 15000,
    maxBuffer: 12000000,
    ...options,
  });
  await save(
    t.dir + "/" + label + ".stdout" + (options.encoding ? ".txt" : ".bin.gz"),
    options.encoding ? (r.stdout ?? "") : gzipSync(r.stdout ?? Buffer.alloc(0)),
  );
  await save(t.dir + "/" + label + ".stderr.txt", r.stderr ?? Buffer.alloc(0));
  await json(t.dir + "/" + label + ".process.json", {
    status: r.status,
    signal: r.signal,
    error: r.error?.message,
    timeoutMs: 15000,
    stdoutSha256: sha(r.stdout ?? Buffer.alloc(0)),
    stderrSha256: sha(r.stderr ?? Buffer.alloc(0)),
    stdoutBytes: Buffer.byteLength(r.stdout ?? Buffer.alloc(0)),
    binaryStdoutLosslesslyGzipped: !options.encoding,
  });
  assert.equal(r.status, 0, label + " subprocess failure");
  return r.stdout;
};
try {
  await check();
  for (const [path, expected] of Object.entries(prereg.sourceHashes)) {
    const raw = await readFile(path);
    assert.equal(sha(raw), expected);
    await save(
      out + "/executed-" + path.split("/").at(-1) + ".gz",
      gzipSync(raw),
    );
  }
  for (const t of prereg.specs)
    assert.equal(sha(await readFile(t.htmlPath)), t.htmlSha256);
  browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const context = await browser.newContext({
    viewport: { width: prereg.specs[0].width, height: prereg.specs[0].height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  for (const t of prereg.specs) {
    current = t.id;
    const slot = slots.find((s) => s.id === t.id);
    slot.status = "setup";
    slot.startedAtUtc = new Date().toISOString();
    await check();
    const html = await readFile(t.htmlPath, "utf8");
    assert.equal(sha(html), t.htmlSha256);
    await page.setViewportSize({ width: t.width, height: t.height });
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const native = await page.locator("#artifact").evaluate((e) => {
      const range = document.createRange();
      range.selectNodeContents(e);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      const selected = selection.toString();
      selection.removeAllRanges();
      const canvas = document.createElement("canvas").getContext("2d");
      canvas.fontKerning = "none";
      const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT),
        glyphs = [];
      let node;
      while ((node = walker.nextNode())) {
        const s = getComputedStyle(node.parentElement);
        canvas.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
        for (let i = 0; i < node.length; i++) {
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          const r = range.getBoundingClientRect(),
            m = canvas.measureText(node.data[i]);
          glyphs.push({
            character: node.data[i],
            rect: { x: r.x, y: r.y, width: r.width, height: r.height },
            canvasFont: canvas.font,
            fill: s.color,
            opacity: s.opacity,
            visibility: s.visibility,
            display: s.display,
            stroke: s.webkitTextStrokeWidth,
            advance: m.width,
            left: m.actualBoundingBoxLeft,
            right: m.actualBoundingBoxRight,
            ascent: m.actualBoundingBoxAscent,
            descent: m.actualBoundingBoxDescent,
          });
        }
      }
      return {
        text: e.textContent,
        selected,
        glyphs,
        tags: [...e.querySelectorAll("*")].map((x) => x.tagName),
        images: document.querySelectorAll("img,svg,canvas").length,
      };
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const d = await cdp.send("DOM.getDocument"),
      node = await cdp.send("DOM.querySelector", {
        nodeId: d.root.nodeId,
        selector: t.fontSelector ?? "#artifact",
      });
    const nativeFonts = (
      await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
    ).fonts;
    await cdp.detach();
    await json(t.dir + "/dom.json", { native, nativeFonts });
    assert.equal(native.text, t.expectedSelection);
    assert.equal(native.selected, t.expectedSelection);
    assert(
      native.images === 0 &&
        native.glyphs.every(
          (g) =>
            g.opacity === "1" &&
            g.visibility === "visible" &&
            g.display !== "none",
        ),
    );
    const actual = [...new Set(nativeFonts.map((f) => f.postScriptName))];
    assert(
      nativeFonts.length > 0 &&
        nativeFonts.every((f) => !f.isCustomFont) &&
        actual.every((f) => t.expectedFonts.includes(f)) &&
        t.expectedFonts.every((f) => actual.includes(f)),
      "Native font descriptor mismatch",
    );
    assert(budget.glyphResources < 128);
    budget.glyphResources++;
    captures++;
    events.push({
      type: "resource-capture-invoked",
      id: t.id,
      atUtc: new Date().toISOString(),
      ordinal: budget.glyphResources,
    });
    await json(root + "/budget.json", budget, true);
    await json(out + "/events.json", events, true);
    slot.status = "captured";
    const png = await page.screenshot({ type: "png" }),
      pngPath = t.dir + "/input.png";
    await save(pngPath, png);
    diagnostics++;
    const contoursRaw = await stream(
        t,
        "contours",
        "python3",
        [source + "/holes.py", pngPath],
        { encoding: "utf8" },
      ),
      contours = JSON.parse(contoursRaw);
    const rgbaRaw = await stream(t, "rgba", "python3", [
      "-c",
      "import cv2,sys;a=cv2.imread(sys.argv[1]);sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
      pngPath,
    ]);
    const visibleInk = {
      threshold: 245,
      bounds: [t.width, t.height, -1, -1],
      pixels: 0,
    };
    for (let y = 0; y < t.height; y++)
      for (let x = 0; x < t.width; x++) {
        const i = (y * t.width + x) * 4;
        if ((rgbaRaw[i] + rgbaRaw[i + 1] + rgbaRaw[i + 2]) / 3 < 245) {
          visibleInk.pixels++;
          visibleInk.bounds[0] = Math.min(visibleInk.bounds[0], x);
          visibleInk.bounds[1] = Math.min(visibleInk.bounds[1], y);
          visibleInk.bounds[2] = Math.max(visibleInk.bounds[2], x);
          visibleInk.bounds[3] = Math.max(visibleInk.bounds[3], y);
        }
      }
    const bin = ordinaryBinarize({
      data: new Uint8ClampedArray(rgbaRaw),
      width: t.width,
      height: t.height,
    });
    const rawBin = {
      width: t.width,
      height: t.height,
      get: (x, y) =>
        x >= 0 &&
        y >= 0 &&
        x < t.width &&
        y < t.height &&
        rgbaRaw[(y * t.width + x) * 4] < 128,
    };
    const points =
      t.kind === "ornament-resource" && contours.inkBounds
        ? [
            {
              label: "complete-literal-gray128-ink-midpoint",
              x: (contours.inkBounds[0] + contours.inkBounds[2]) / 2,
              y: (contours.inkBounds[1] + contours.inkBounds[3]) / 2,
            },
          ]
        : (t.diagnosticPoints ?? []);
    const models = points.map((p) => {
      const point = { x: Math.round(p.x), y: Math.round(p.y) };
      const runs = geometricRuns(bin, point),
        metric = runMetric(runs),
        literalRuns = geometricRuns(rawBin, point),
        literalMetric = runMetric(literalRuns);
      return {
        label: p.label,
        point,
        runs,
        metric,
        literalRuns,
        literalMetric,
        pitch:
          (literalMetric.axes.horizontal.scale +
            literalMetric.axes.vertical.scale) /
          2,
        classification:
          "Declared source diagnostic only, never ordinary first-selected gate or payload acceptance.",
      };
    });
    let support = null;
    if (t.kind === "continuous-resource") {
      const dc = t.diagnosticContract,
        samples = [];
      for (const pitch of dc.gridPitches)
        for (const offset of dc.centerOffsets) {
          const cells = [];
          for (let row = 0; (row + 0.5) * pitch < dc.extent.height; row++)
            for (let col = 0; (col + 0.5) * pitch < dc.extent.width; col++) {
              const px = Math.floor(
                  dc.origin.x + offset.x + (col + 0.5) * pitch,
                ),
                py = Math.floor(dc.origin.y + offset.y + (row + 0.5) * pitch);
              assert(
                px >= 0 && py >= 0 && px < t.width && py < t.height,
                "Source support coordinate outside image",
              );
              const owners = native.glyphs.filter(
                (g) =>
                  px + 0.5 >= g.rect.x &&
                  px + 0.5 < g.rect.x + g.rect.width &&
                  py + 0.5 >= g.rect.y &&
                  py + 0.5 < g.rect.y + g.rect.height,
              );
              const owner = owners.length === 1 ? owners[0] : null;
              const foreground = owner
                ? owner.character.trim()
                  ? owner.fill === "rgb(0, 0, 0)"
                    ? "black"
                    : "gray"
                  : "space"
                : "unowned-gap";
              const i = (py * t.width + px) * 4,
                value = (rgbaRaw[i] + rgbaRaw[i + 1] + rgbaRaw[i + 2]) / 3;
              cells.push({
                col,
                row,
                px,
                py,
                value,
                adaptiveBlack: +bin.get(px, py),
                foreground,
                ownerCharacter: owner?.character,
                ownerCount: owners.length,
              });
            }
          const classes = {};
          for (const label of ["black", "gray", "space", "unowned-gap"]) {
            const a = cells.filter((c) => c.foreground === label);
            classes[label] = {
              samples: a.length,
              minimum: a.length ? Math.min(...a.map((c) => c.value)) : null,
              maximum: a.length ? Math.max(...a.map((c) => c.value)) : null,
              adaptiveBlack: a.filter((c) => c.adaptiveBlack).length,
              thresholdBlack: Object.fromEntries(
                dc.pixelThresholds.map((th) => [
                  th,
                  a.filter((c) => c.value < th).length,
                ]),
              ),
            };
          }
          samples.push({
            pitch,
            offset,
            cells,
            classes,
            totalCells: cells.length,
          });
        }
      support = {
        contract: dc,
        grids: samples,
        classification:
          "Frozen source diagnostic across fixed thresholds/pitches/offsets. Default jsQR adaptive bit classification only, no ordinary decode and no composable local-color independence claim.",
      };
      await json(t.dir + "/support.json", support);
    }
    const row = {
      ...t,
      pngPath,
      pngSha256: sha(png),
      rgbaSha256: sha(rgbaRaw),
      native,
      nativeFonts,
      contours,
      visibleInk,
      models,
      supportSummary: support?.grids.map((g) => ({
        pitch: g.pitch,
        offset: g.offset,
        classes: g.classes,
        totalCells: g.totalCells,
      })),
      sourceVerified: sha(await readFile(t.htmlPath)) === t.htmlSha256,
      diagnosticBundleHash: bundleHash,
      streamCustody:
        "All contour and RGBA stdout/stderr/process status saved, including successful stderr.",
      classification: prereg.classification,
    };
    rows.push(row);
    await json(t.dir + "/result.json", row);
    assert(row.sourceVerified);
    assert(
      visibleInk.pixels > 0 &&
        visibleInk.bounds.every(
          (v, i) => v >= 2 && v < (i % 2 === 0 ? t.width : t.height) - 2,
        ),
      "Visible native ink touches capture boundary",
    );
    if (t.kind === "continuous-resource" && prereg.visualReviewRequired) {
      console.log(
        JSON.stringify({
          awaitingVisualReview: t.id,
          pngSha256: row.pngSha256,
          deadlineMs: 180000,
        }),
      );
      let review;
      const reviewStart = Date.now();
      while (!review && Date.now() - reviewStart < 180000) {
        try {
          review = await read(t.dir + "/visual-review.json");
        } catch (e) {
          if (e.code !== "ENOENT") throw e;
        }
        if (!review) await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert(review, "Resource visual review timeout");
      assert.equal(review.pngSha256, row.pngSha256, "Resource visual custody");
      assert(
        review.readable && review.completeInk && review.noLetterformOverlap,
        "Unacceptable source readability/fullink/overlap",
      );
    }
    slot.status = "completed";
    slot.completedAtUtc = new Date().toISOString();
    await json(out + "/slots.json", slots, true);
    console.log(
      JSON.stringify({
        id: t.id,
        pngSha256: row.pngSha256,
        points: models.map((m) => ({
          label: m.label,
          completeAxes: m.metric.completeAxes,
          worstRMS: m.metric.worstRMS,
        })),
      }),
    );
  }
} catch (e) {
  stop = {
    current,
    atUtc: new Date().toISOString(),
    message: e.message,
    stack: e.stack,
  };
  const slot = slots.find((s) => s.id === current);
  if (slot) slot.status = "failed";
} finally {
  if (browser) await browser.close();
  for (const slot of slots)
    if (slot.status === "unattempted")
      slot.reason = stop
        ? "Mandatory batch stop: " + stop.message
        : "Not reached";
  await json(out + "/slots.json", slots, true);
  await json(out + "/results.json", {
    startedAtUtc,
    finishedAtUtc: new Date().toISOString(),
    stop,
    rows,
    captures,
    diagnostics,
    events,
    slots,
    unattempted: slots
      .filter((s) => s.status === "unattempted")
      .map((s) => s.id),
    ownedBrowserClosed: true,
    budget,
    bytesAtEnd: await bytes(),
    ordinaryCalls: 0,
    passiveProfiles: 0,
    repeats: 0,
  });
}
if (stop) process.exitCode = 1;

import { chromium } from "playwright";
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { sha } from "./common.mjs";
const source = "experiments/prose-qr/integrated-2026-10-10/empirical",
  root = "docs/research/prose-qr/integrated-2026-10-10/empirical",
  out = process.argv[2];
assert(out?.startsWith(root + "/"));
const read = async (p) => JSON.parse(await readFile(p));
const prereg = await read(out + "/preregistration.json"),
  events = [],
  captures = [],
  profiles = [],
  slots = prereg.specs.flatMap((t) =>
    prereg.readerOrder.map((engine) => ({
      id: t.id,
      engine,
      status: "unattempted",
      texts: [],
    })),
  );
let browser = null,
  stop = null,
  current = null,
  browserClosed = false;
const startedAtUtc = new Date().toISOString();
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
const save = async (p, b, replace = false) => {
  assert(p.startsWith(root + "/"));
  assert(
    (await bytes()) + Buffer.byteLength(b) < 47000000,
    "Empirical byte ceiling",
  );
  await writeFile(p, b, { flag: replace ? "w" : "wx" });
};
const json = (p, v, replace = false) =>
  save(p, JSON.stringify(v, null, 2) + "\n", replace);
const budgetPath = root + "/budget.json";
assert(
  prereg.allocation?.path ===
    "docs/research/prose-qr/integrated-2026-10-10/allocation-02.json",
  "Fresh released allocation required",
);
assert.equal(
  sha(await readFile(prereg.allocation.path)),
  prereg.allocation.sha256,
  "Allocation custody",
);
const authorizedAllocation = await read(prereg.allocation.path);
assert.deepEqual(authorizedAllocation.empiricalTotalCeilings, {
  glyphResources: 128,
  nativeCaptures: 24,
  controlCaptures: 8,
  ordinaryReaderCalls: 96,
  exploratoryGateFailedPayloadTrials: 4,
  bytes: 48000000,
});
let budget;
try {
  budget = await read(budgetPath);
} catch {
  budget = {
    glyphResources: 0,
    nativeCaptures: 0,
    controlCaptures: 0,
    ordinaryCalls: 0,
    profiles: 0,
    repeats: 0,
    payloadTrials: 0,
  };
  for (const f of await readdir(root))
    if (f.startsWith("resources-"))
      try {
        budget.glyphResources += (
          await read(root + "/" + f + "/results.json")
        ).captures;
      } catch {}
  await json(budgetPath, budget);
}
async function event(type, t, extra = {}) {
  const e = { atUtc: new Date().toISOString(), type, id: t?.id, ...extra };
  events.push(e);
  await json(out + "/events.json", events, true);
}
const check = async () => {
  assert(Date.now() < Date.parse(prereg.cutoffUtc), "Experiment cutoff");
  assert((await bytes()) < 47000000, "Byte ceiling");
  assert(
    budget.glyphResources <= 128 &&
      budget.nativeCaptures <= 24 &&
      budget.controlCaptures <= 8 &&
      budget.ordinaryCalls <= 96 &&
      budget.payloadTrials <= 4,
    "Allocated cap",
  );
};
const persist = () =>
  json(
    out + "/ledger.json",
    { slots, stop, updatedAtUtc: new Date().toISOString() },
    true,
  );
const count = async (key, limit, t) => {
  assert(budget[key] < limit, key + " cap");
  budget[key]++;
  await json(budgetPath, budget, true);
  await event(key + "-invoked", t, { ordinal: budget[key] });
};
const rgba = (path) => {
  const r = spawnSync(
    "python3",
    [
      "-c",
      "import cv2,sys;a=cv2.imread(sys.argv[1]);sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
      path,
    ],
    { timeout: 10000, maxBuffer: 80000000 },
  );
  assert.equal(r.status, 0, "RGBA conversion");
  return r.stdout;
};
try {
  await check();
  for (const [path, hash] of Object.entries(prereg.sourceHashes)) {
    const b = await readFile(path);
    assert.equal(sha(b), hash, "Frozen script hash: " + path);
    await save(
      out + "/executed-" + path.split("/").at(-1) + ".gz",
      gzipSync(b),
    );
  }
  for (const t of prereg.specs)
    assert.equal(sha(await readFile(t.htmlPath)), t.htmlSha256, "Frozen HTML");
  await json(out + "/runtime.json", {
    node: process.version,
    nodePath: process.execPath,
    versions: Object.fromEntries(
      await Promise.all(
        ["playwright", "jsqr", "zxing-wasm"].map(async (n) => [
          n,
          (await read("node_modules/" + n + "/package.json")).version,
        ]),
      ),
    ),
    chrome: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    profile:
      "Fresh Playwright ephemeral profile; owner profiles/clipboard untouched",
  });
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
  page.setDefaultTimeout(25000);
  for (const t of prereg.specs) {
    current = t.id;
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
    let dom = null,
      fonts = [];
    if (t.kind === "native") {
      dom = await page.evaluate(() => {
        const sel = getSelection(),
          range = document.createRange(),
          paragraphs = [...document.querySelectorAll(".prose")].map((e) => {
            range.selectNodeContents(e);
            sel.removeAllRanges();
            sel.addRange(range);
            return { id: e.id, text: e.textContent, selection: sel.toString() };
          });
        range.selectNodeContents(document.querySelector("#artifact"));
        sel.removeAllRanges();
        sel.addRange(range);
        const fullSelection = sel.toString();
        sel.removeAllRanges();
        const c = document.createElement("canvas").getContext("2d");
        const glyphs = [...document.querySelectorAll(".prose span")].map(
          (e) => {
            const r = e.getBoundingClientRect(),
              s = getComputedStyle(e);
            c.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
            const m = c.measureText(e.textContent);
            return {
              id: e.id,
              ch: e.textContent,
              role: e.dataset.role,
              expectedFont: e.dataset.font,
              rect: { x: r.x, y: r.y, width: r.width, height: r.height },
              font: c.font,
              fill: s.color,
              opacity: s.opacity,
              display: s.display,
              visibility: s.visibility,
              stroke: parseFloat(s.webkitTextStrokeWidth),
              advance: m.width,
              ascent: m.actualBoundingBoxAscent,
              descent: m.actualBoundingBoxDescent,
              left: m.actualBoundingBoxLeft,
              right: m.actualBoundingBoxRight,
              fontAscent: m.fontBoundingBoxAscent,
              fontDescent: m.fontBoundingBoxDescent,
            };
          },
        );
        return {
          paragraphs,
          fullSelection,
          glyphs,
          articleText: document.querySelector("#artifact").textContent,
          descendantTags: [...document.querySelectorAll("#artifact *")].map(
            (e) => e.tagName,
          ),
          images: document.querySelectorAll("img,svg,canvas").length,
        };
      });
      const cdp = await context.newCDPSession(page);
      await cdp.send("DOM.enable");
      await cdp.send("CSS.enable");
      const d = await cdp.send("DOM.getDocument");
      for (let p = 0; p < 3; p++) {
        const node = await cdp.send("DOM.querySelector", {
          nodeId: d.root.nodeId,
          selector: "#p" + p,
        });
        fonts.push({
          paragraph: p,
          fonts: (
            await cdp.send("CSS.getPlatformFontsForNode", {
              nodeId: node.nodeId,
            })
          ).fonts,
        });
      }
      await cdp.detach();
      await json(t.dir + "/dom.json", {
        dom,
        fonts,
        expectedTexts: t.texts,
        expectedFullSelection: t.fullText,
      });
      assert(
        dom.paragraphs.length === 3 &&
          dom.paragraphs.every(
            (p, i) => p.text === t.texts[i] && p.selection === t.texts[i],
          ),
        "Exact paragraph selection",
      );
      assert.equal(
        dom.fullSelection,
        t.fullText,
        "Exact full-document selection",
      );
      assert.equal(dom.images, 0, "Native source contains image");
      assert(
        dom.glyphs.every(
          (g) =>
            g.opacity === "1" &&
            g.display !== "none" &&
            g.visibility === "visible",
        ),
        "Invisible glyph",
      );
      const actualFonts = [
        ...new Set(fonts.flatMap((p) => p.fonts.map((f) => f.postScriptName))),
      ];
      assert(
        actualFonts.every((f) => t.expectedFonts.includes(f)) &&
          t.expectedFonts.every((f) => actualFonts.includes(f)),
        "Native font substitution",
      );
    }
    const c = {
      id: t.id,
      kind: t.kind,
      dir: t.dir,
      sourceHtmlSha256: t.htmlSha256,
      payload: prereg.payload,
      geometry: t.geometry,
      startedAtUtc: new Date().toISOString(),
      pngPath: t.dir + "/input.png",
      width: t.width,
      height: t.height,
    };
    await count(
      t.kind === "native" ? "nativeCaptures" : "controlCaptures",
      t.kind === "native" ? 24 : 8,
      t,
    );
    if (t.payloadTrial) await count("payloadTrials", 4, t);
    const png = await page.screenshot({ type: "png" });
    await save(c.pngPath, png);
    c.pngSha256 = sha(png);
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await check();
    await count("repeats", 32, t);
    const repeat = await page.screenshot({ type: "png" });
    await save(t.dir + "/repeat.png", repeat);
    c.repeatSha256 = sha(repeat);
    c.repeatExact = c.pngSha256 === c.repeatSha256;
    c.rgbaSha256 = sha(rgba(c.pngPath));
    c.repeatRgbaSha256 = sha(rgba(t.dir + "/repeat.png"));
    c.sourceVerifiedAfterCapture =
      sha(await readFile(t.htmlPath)) === t.htmlSha256;
    c.completedAtUtc = new Date().toISOString();
    captures.push(c);
    await json(t.dir + "/capture.json", c);
    assert(
      c.repeatExact && c.rgbaSha256 === c.repeatRgbaSha256,
      "Immediate repeat mismatch",
    );
    assert(c.sourceVerifiedAfterCapture, "After-capture source mismatch");
    if (t.samplePrediction) {
      const pred = await read(t.samplePrediction.path);
      assert.equal(
        sha(await readFile(t.samplePrediction.path)),
        t.samplePrediction.sha256,
        "Prediction input hash",
      );
      const pixel = rgba(c.pngPath),
        mismatches = pred.samples.filter(
          (a) => +(pixel[(a.py * t.width + a.px) * 4] < 128) !== a.expected,
        );
      await json(t.dir + "/sample-verification.json", {
        sampleCount: pred.samples.length,
        mismatches,
        exact: mismatches.length === 0,
        pngSha256: c.pngSha256,
        predictionSha256: t.samplePrediction.sha256,
        classification:
          "Literal rawgray128 style-model custody only; never reader recovery or standards fit.",
      });
      assert.equal(
        mismatches.length,
        0,
        "Native style prediction parity failure",
      );
    }
    if (t.visualReviewRequired) {
      const measured = spawnSync(
        process.execPath,
        [source + "/measure-continuous.mjs", t.dir, t.measurementSpec.path],
        { timeout: 30000, maxBuffer: 2000000, encoding: "utf8" },
      );
      await save(t.dir + "/ledger.stdout.txt", measured.stdout ?? "");
      await save(t.dir + "/ledger.stderr.txt", measured.stderr ?? "");
      assert.equal(measured.status, 0, "Native full-source ledger diagnostic");
      await event("awaiting-visual-review", t, {
        pngSha256: c.pngSha256,
        deadlineMs: 180000,
      });
      const reviewStart = Date.now();
      let review;
      while (!review && Date.now() - reviewStart < 180000) {
        try {
          review = await read(t.dir + "/visual-review.json");
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
        if (!review) await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert(review, "Visual review unavailable before frozen180second stop");
      assert.equal(
        review.pngSha256,
        c.pngSha256,
        "Visual review capture custody",
      );
      assert(
        review.readable && review.completeInk && review.noLetterformOverlap,
        "Unacceptable native readability/fullink/overlap",
      );
      assert.equal(
        sha(await readFile(t.measurementSpec.path)),
        t.measurementSpec.sha256,
        "Measurement source custody",
      );
      await event("visual-review-passed", t, {
        receiptSha256: sha(await readFile(t.dir + "/visual-review.json")),
      });
    }
    for (const engine of prereg.readerOrder) {
      await check();
      const slot = slots.find((s) => s.id === t.id && s.engine === engine);
      slot.status = "running";
      slot.startedAtUtc = new Date().toISOString();
      await persist();
      await count("ordinaryCalls", 96, t);
      const command = engine === "opencv" ? "python3" : process.execPath,
        args =
          engine === "opencv"
            ? [source + "/ordinary.py", c.pngPath]
            : [source + "/reader.mjs", engine, c.pngPath];
      const raw = spawnSync(command, args, {
        encoding: "utf8",
        timeout: 45000,
        maxBuffer: 24000000,
      });
      await save(t.dir + "/" + engine + ".stdout.txt", raw.stdout ?? "");
      await save(t.dir + "/" + engine + ".stderr.txt", raw.stderr ?? "");
      if (raw.status !== 0) {
        slot.status = raw.error?.code === "ETIMEDOUT" ? "timeout" : "error";
        slot.error = {
          message: raw.error?.message,
          status: raw.status,
          signal: raw.signal,
        };
        await persist();
        throw Error("Reader crash/timeout: " + engine);
      }
      const r = JSON.parse(raw.stdout);
      await save(t.dir + "/" + engine + ".raw.json.txt", raw.stdout);
      slot.status = r.error ? "error" : "completed";
      slot.texts = engine === "opencv" ? (r.text ? [r.text] : []) : r.texts;
      slot.exactExpected =
        slot.texts.length === 1 && slot.texts[0] === prereg.payload;
      slot.pngSha256 = r.pngSha256;
      slot.rawSha256 = sha(raw.stdout);
      slot.completedAtUtc = new Date().toISOString();
      await persist();
      assert(!r.error, "Reader error");
      assert.equal(r.pngSha256, c.pngSha256);
      if (r.rgbaSha256) assert.equal(r.rgbaSha256, c.rgbaSha256);
      assert(
        slot.texts.every((x) => x === prereg.payload),
        "Wrong payload",
      );
      if (t.requiredReaders?.includes(engine))
        assert(slot.exactExpected, "Invalid control: " + t.id + "/" + engine);
    }
    if (!prereg.readerOrder.includes("jsqr")) {
      await event("capture-complete-without-readers-or-profile", t);
      console.log(
        JSON.stringify({ id: t.id, captureOnly: true, pngSha256: c.pngSha256 }),
      );
      continue;
    }
    await check();
    await count("profiles", 32, t);
    const raw = spawnSync(
      process.execPath,
      [source + "/reader.mjs", "passive", c.pngPath, t.dir + "/capture.json"],
      { encoding: "utf8", timeout: 45000, maxBuffer: 32000000 },
    );
    await save(t.dir + "/passive.stderr.txt", raw.stderr ?? "");
    if (raw.status !== 0) {
      await json(t.dir + "/passive-failure.json", {
        status: raw.status,
        signal: raw.signal,
        error: raw.error?.message,
        stdout: raw.stdout,
      });
      throw Error("Passive timeout/crash");
    }
    await save(t.dir + "/passive-full.json.gz", gzipSync(raw.stdout));
    const p = JSON.parse(raw.stdout),
      summary = {
        ...p,
        rawSha256: sha(raw.stdout),
        scans: p.scans.map(({ allScoredRuns, allQuads, ...s }) => ({
          ...s,
          scoredRuns: allScoredRuns.length,
          quads: allQuads.length,
        })),
      };
    await json(t.dir + "/passive-summary.json", summary);
    profiles.push({
      id: t.id,
      parity: p.passiveReturnsMatch,
      strictBranches: p.scans.map((s) => ({
        branch: s.branch,
        strictPass: s.strictPass,
        first: s.selectedFirstLocation,
      })),
    });
    assert(p.passiveReturnsMatch, "Passive stock parity mismatch");
    assert.equal(p.pngSha256, c.pngSha256);
    assert.equal(p.rgbaSha256, c.rgbaSha256);
    await event("capture-complete", t);
    console.log(
      JSON.stringify({
        id: t.id,
        texts: slots
          .filter((s) => s.id === t.id)
          .map((s) => ({ engine: s.engine, texts: s.texts })),
        profile: profiles.at(-1),
      }),
    );
  }
} catch (e) {
  stop = {
    atUtc: new Date().toISOString(),
    current,
    message: e.message,
    stack: e.stack,
  };
  await event("mandatory-stop", null, stop);
} finally {
  if (browser) {
    await browser.close();
    browserClosed = true;
  }
  for (const s of slots)
    if (s.status === "unattempted")
      s.reason = stop ? "Mandatory stop: " + stop.message : "Not reached";
  await persist();
  await json(out + "/run-results.json", {
    startedAtUtc,
    finishedAtUtc: new Date().toISOString(),
    stop,
    captures,
    profiles,
    slots,
    budget,
    bytesAtEnd: await bytes(),
    browserClosed,
  });
}
if (stop) process.exitCode = 1;

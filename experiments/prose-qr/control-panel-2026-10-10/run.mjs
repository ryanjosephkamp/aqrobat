import { chromium } from "playwright";
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { sha } from "./common.mjs";
const root = "docs/research/prose-qr/control-panel-2026-10-10";
const source = "experiments/prose-qr/control-panel-2026-10-10";
const start = new Date().toISOString();
async function files(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? files(dir + "/" + e.name) : [dir + "/" + e.name],
      ),
    )
  ).flat();
}
async function totalBytes() {
  return (
    await Promise.all(
      [...(await files(root)), ...(await files(source))].map(
        async (f) => (await stat(f)).size,
      ),
    )
  ).reduce((a, b) => a + b, 0);
}
async function save(path, data, replace = false) {
  assert(path.startsWith(root + "/"));
  assert(
    (await totalBytes()) + Buffer.byteLength(data) < 3800000,
    "Byte ceiling reached; stop and preserve reserve",
  );
  await writeFile(path, data, { flag: replace ? "w" : "wx" });
}
const json = (p, v, replace = false) =>
  save(p, JSON.stringify(v, null, 2) + "\n", replace);
const read = async (p) => JSON.parse(await readFile(p));
const prereg = await read(root + "/preregistration.json");
const provenance = await read(root + "/provenance.json");
const ledger = await read(root + "/ledger.json");
const captures = [],
  profiles = [],
  events = [];
let captureCount = 0,
  repeatCount = 0,
  passiveCount = 0,
  browser = null,
  browserClosed = false,
  current = null,
  stop = null;
const checkTime = () =>
  assert(
    Date.now() < Date.parse(prereg.cutoffUtc),
    "New-experiment cutoff reached",
  );
const event = (type, extra = {}) =>
  events.push({ atUtc: new Date().toISOString(), type, ...extra });
const persist = () =>
  json(
    root + "/ledger.json",
    { ...ledger, updatedAtUtc: new Date().toISOString(), stop },
    true,
  );
const pixelBytes = (pngPath) =>
  execFileSync(
    "python3",
    [
      "-c",
      "import cv2,sys;a=cv2.imread(sys.argv[1]);sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
      pngPath,
    ],
    { timeout: 10000, maxBuffer: 1000000 },
  );
try {
  checkTime();
  for (const [path, expected] of Object.entries(provenance.executedSources))
    assert.equal(
      sha(await readFile(path)),
      expected,
      "Executed script source mismatch: " + path,
    );
  for (const t of prereg.treatments) {
    assert.equal(
      sha(await readFile(t.svgPath)),
      t.svgSha256,
      "Frozen SVG mismatch",
    );
    assert.equal(
      sha(await readFile(t.htmlPath)),
      t.htmlSha256,
      "Frozen HTML mismatch",
    );
  }
  event("all-four-sources-and-executed-scripts-verified-before-capture");
  const versions = {};
  for (const name of ["playwright", "jsqr", "zxing-wasm", "prettier"])
    versions[name] = (
      await read("node_modules/" + name + "/package.json")
    ).version;
  const python = JSON.parse(
    execFileSync(
      "python3",
      [
        "-c",
        "import cv2,sys,json;print(json.dumps({'python':sys.version,'executable':sys.executable,'opencv':cv2.__version__,'module':cv2.__file__}))",
      ],
      { encoding: "utf8", timeout: 10000 },
    ),
  );
  await json(root + "/runtime.json", {
    node: process.version,
    executable: process.execPath,
    versions,
    python,
    browserExecutable:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    browserProfile:
      "Playwright-created fresh ephemeral user-data-dir; no existing profile opened",
  });
  browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  event("owned-browser-launched", { version: browser.version() });
  const context = await browser.newContext({
    viewport: { width: 396, height: 396 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  for (const t of prereg.treatments) {
    current = t.id;
    checkTime();
    assert(captureCount < 4 && repeatCount < 4);
    const html = await readFile(t.htmlPath, "utf8");
    assert.equal(
      sha(html),
      t.htmlSha256,
      "Source mismatch immediately before capture",
    );
    assert.equal(
      sha(await readFile(t.svgPath)),
      t.svgSha256,
      "SVG mismatch immediately before capture",
    );
    const c = {
      id: t.id,
      dir: t.dir,
      sourceHtmlSha256: t.htmlSha256,
      sourceSvgSha256: t.svgSha256,
      payload: prereg.payload,
      geometry: prereg.sourceGeometry,
      startedAtUtc: new Date().toISOString(),
      pngPath: t.dir + "/input.png",
    };
    await page.setContent(html);
    captureCount++;
    event("source-capture-invoked", { id: t.id, ordinal: captureCount });
    const png = await page.screenshot({ type: "png" });
    await save(c.pngPath, png);
    c.pngSha256 = sha(png);
    await page.setContent(html);
    checkTime();
    repeatCount++;
    event("immediate-repeat-invoked", { id: t.id, ordinal: repeatCount });
    const repeat = await page.screenshot({ type: "png" });
    c.repeatSha256 = sha(repeat);
    c.repeatExact = c.pngSha256 === c.repeatSha256;
    c.repeatRepresentation = c.repeatExact
      ? "Byte-identical PNG; exact repeat hash receipt, no redundant PNG file"
      : "Lossless repeat PNG retained";
    if (!c.repeatExact) await save(t.dir + "/repeat.png", repeat);
    c.rgbaSha256 = sha(pixelBytes(c.pngPath));
    // Byte-identical PNG necessarily decodes to identical RGBA; mismatches are retained and stopped.
    c.repeatRgbaSha256 = c.repeatExact
      ? c.rgbaSha256
      : sha(pixelBytes(t.dir + "/repeat.png"));
    c.width = png.readUInt32BE(16);
    c.height = png.readUInt32BE(20);
    c.sourceVerifiedAfterCapture =
      sha(await readFile(t.htmlPath)) === t.htmlSha256 &&
      sha(await readFile(t.svgPath)) === t.svgSha256;
    c.completedAtUtc = new Date().toISOString();
    captures.push(c);
    await json(t.dir + "/capture.json", c);
    assert(
      c.repeatExact && c.rgbaSha256 === c.repeatRgbaSha256,
      "Immediate repeat mismatch",
    );
    assert(c.sourceVerifiedAfterCapture, "Source mismatch after capture");
    assert(c.width === 396 && c.height === 396, "Invalid capture dimensions");
    for (const engine of prereg.readerOrder) {
      checkTime();
      const slot = ledger.slots.find(
        (s) => s.id === t.id && s.engine === engine,
      );
      slot.status = "running";
      slot.startedAtUtc = new Date().toISOString();
      await persist();
      event("ordinary-slot-invoked", { id: t.id, engine });
      try {
        assert.equal(
          sha(await readFile(c.pngPath)),
          c.pngSha256,
          "Reader input PNG source mismatch",
        );
        const command = engine === "opencv" ? "python3" : process.execPath;
        const args =
          engine === "opencv"
            ? [source + "/ordinary.py", c.pngPath]
            : [source + "/reader.mjs", engine, c.pngPath];
        const raw = execFileSync(command, args, {
          encoding: "utf8",
          timeout: 45000,
          maxBuffer: 2000000,
        });
        await save(t.dir + "/" + engine + ".raw.json.txt", raw);
        const result = JSON.parse(raw);
        slot.rawPath = t.dir + "/" + engine + ".raw.json.txt";
        slot.rawSha256 = sha(raw);
        slot.status = result.error ? "error" : "completed";
        slot.texts =
          engine === "opencv"
            ? result.text
              ? [result.text]
              : []
            : result.texts;
        slot.exactExpected =
          slot.texts.length === 1 && slot.texts[0] === prereg.payload;
        slot.unexpectedText = slot.texts.filter((x) => x !== prereg.payload);
        slot.pngSha256 = result.pngSha256;
        if (result.rgbaSha256) slot.rgbaSha256 = result.rgbaSha256;
        slot.completedAtUtc = new Date().toISOString();
        await persist();
        assert(!result.error, "Ordinary reader returned error");
        assert.equal(
          result.pngSha256,
          c.pngSha256,
          "Ordinary input hash mismatch",
        );
        if (result.rgbaSha256)
          assert.equal(
            result.rgbaSha256,
            c.rgbaSha256,
            "Ordinary RGBA hash mismatch",
          );
        assert.equal(slot.unexpectedText.length, 0, "Wrong payload returned");
        if (t.id === "square" || (t.id === "circle" && engine !== "opencv"))
          assert(
            slot.exactExpected,
            "Endpoint comparability failure: " + t.id + "/" + engine,
          );
      } catch (e) {
        if (slot.status === "running")
          slot.status = e.code === "ETIMEDOUT" ? "timeout" : "error";
        slot.error = {
          message: e.message,
          code: e.code ?? null,
          signal: e.signal ?? null,
          stdout: e.stdout?.toString() ?? null,
          stderr: e.stderr?.toString() ?? null,
        };
        slot.completedAtUtc = new Date().toISOString();
        await json(t.dir + "/" + engine + "-failure.json", slot);
        await persist();
        throw e;
      }
    }
    checkTime();
    assert(passiveCount < 4);
    passiveCount++;
    event("separate-passive-profile-invoked", {
      id: t.id,
      ordinal: passiveCount,
    });
    try {
      const raw = execFileSync(
        process.execPath,
        [source + "/reader.mjs", "passive", c.pngPath, t.dir + "/capture.json"],
        { encoding: "utf8", timeout: 45000, maxBuffer: 12000000 },
      );
      await save(t.dir + "/passive-full.json.gz", gzipSync(raw));
      const full = JSON.parse(raw);
      const summary = {
        ...full,
        rawSha256: sha(raw),
        rawCompressedPath: t.dir + "/passive-full.json.gz",
        scans: full.scans.map(({ allScoredRuns, allQuads, ...s }) => ({
          ...s,
          scoredRuns: allScoredRuns.length,
          quads: allQuads.length,
        })),
      };
      await json(t.dir + "/passive-summary.json", summary);
      profiles.push({
        id: t.id,
        path: t.dir + "/passive-summary.json",
        branches: full.stockBranchesActuallyExecuted,
        parity: full.passiveReturnsMatch,
        strictBranches: full.scans.map((s) => ({
          branch: s.branch,
          strictPass: s.strictPass,
        })),
      });
      assert.equal(full.pngSha256, c.pngSha256, "Passive PNG hash mismatch");
      assert.equal(full.rgbaSha256, c.rgbaSha256, "Passive RGBA hash mismatch");
      assert(full.passiveReturnsMatch, "Passive/stock return mismatch");
    } catch (e) {
      await json(t.dir + "/passive-failure.json", {
        id: t.id,
        message: e.message,
        code: e.code ?? null,
        signal: e.signal ?? null,
        stdout: e.stdout?.toString() ?? null,
        stderr: e.stderr?.toString() ?? null,
      });
      throw e;
    }
    event("treatment-complete", { id: t.id });
    console.log(
      JSON.stringify({
        id: t.id,
        slots: ledger.slots.filter((s) => s.id === t.id),
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
  event("mandatory-stop", stop);
} finally {
  if (browser) {
    try {
      await browser.close();
      browserClosed = true;
      event("owned-browser-closed");
    } catch (e) {
      event("owned-browser-close-failed", { message: e.message });
      if (!stop)
        stop = {
          message: "Owned browser cleanup failed",
          atUtc: new Date().toISOString(),
        };
    }
  }
  for (const slot of ledger.slots)
    if (slot.status === "unattempted")
      slot.reason = stop ? "Mandatory stop: " + stop.message : "Not reached";
  await persist();
  await json(root + "/events.json", events);
  await json(root + "/run-results.json", {
    startedAtUtc: start,
    finishedAtUtc: new Date().toISOString(),
    stop,
    captureCount,
    repeatCount,
    passiveCount,
    captures,
    profiles,
    slots: ledger.slots,
    ordinaryAttempted: ledger.slots.filter((s) => s.status !== "unattempted")
      .length,
    ordinaryCompleted: ledger.slots.filter((s) => s.status === "completed")
      .length,
    ordinaryUnattempted: ledger.slots.filter((s) => s.status === "unattempted")
      .length,
    browserClosed,
    bytesAtRunEnd: await totalBytes(),
  });
}

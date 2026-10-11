import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { format } from "prettier";
import { STORY } from "../flow/layout.mjs";
const cwd = process.cwd(),
  root = resolve("docs/research/prose-qr/styled-story-2026-10-11");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const json = async (p) => JSON.parse(await readFile(p, "utf8"));
const save = (n, b) =>
  writeFile(
    resolve(root, n),
    typeof b === "string" || Buffer.isBuffer(b)
      ? b
      : JSON.stringify(b, null, 2) + "\n",
    { flag: "wx" },
  );
const escape = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const baselineBytes = await readFile(
    resolve(root, "baseline-preservation.json"),
  ),
  baseline = JSON.parse(baselineBytes);
let protectedBytes = 0;
const protectedFailures = [];
for (const f of baseline.files) {
  try {
    const b = await readFile(resolve(cwd, f.path));
    protectedBytes += b.length;
    if (b.length !== f.bytes || sha(b) !== f.sha256)
      protectedFailures.push(f.path);
  } catch {
    protectedFailures.push(f.path);
  }
}
assert.deepEqual(protectedFailures, []);
const head = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const branch = execFileSync("git", ["branch", "--show-current"], {
  encoding: "utf8",
}).trim();
const remote = execFileSync("git", ["remote", "get-url", "origin"], {
  encoding: "utf8",
}).trim();
const status = execFileSync("git", ["status", "--porcelain=v1"], {
  encoding: "utf8",
});
assert.equal(head, baseline.anchor);
assert.equal(branch, "codex/aqrobat-foundation");
assert.equal(remote, "https://github.com/ryanjosephkamp/aqrobat.git");
assert(
  !status
    .split("\n")
    .filter(Boolean)
    .some((s) => !s.startsWith("?? ")),
);
const prRaw = execFileSync(
  "gh",
  [
    "pr",
    "view",
    "1",
    "--json",
    "url,state,isDraft,headRefName,headRefOid,mergedAt",
  ],
  { encoding: "utf8" },
);
const pr = JSON.parse(prRaw);
assert(
  pr.isDraft &&
    pr.state === "OPEN" &&
    pr.headRefOid === head &&
    pr.headRefName === branch &&
    pr.mergedAt === null,
);
assert.equal((await json(resolve(cwd, "package.json"))).private, true);
const candidates = [],
  controls = [],
  batches = [];
let plannedCandidates = 0,
  archivedSources = 0;
for (const name of (await readdir(root))
  .filter((n) => /^batch-\d\d$/.test(n))
  .sort()) {
  const dir = resolve(root, name),
    m = await json(resolve(dir, "manifest.json"));
  assert.equal(sha(await readFile(resolve(cwd, m.configPath))), m.configSha256);
  plannedCandidates += m.candidateSlots;
  const sources = Object.entries(m.sourceHashes).filter(
    ([k]) => !k.endsWith(":uncompressed"),
  );
  for (const [i, [path, hash]] of sources.entries()) {
    const b = await readFile(resolve(dir, `source-${i + 1}.txt.gz`));
    assert.equal(sha(b), hash);
    assert.equal(sha(gunzipSync(b)), m.sourceHashes[path + ":uncompressed"]);
    archivedSources++;
  }
  const rows = (await readFile(resolve(dir, "results.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map(JSON.parse);
  for (const row of rows) {
    const png = await readFile(resolve(dir, row.id + ".png")),
      repeat = await readFile(resolve(dir, row.id + "-repeat.png"));
    assert.equal(sha(png), row.pngSha256);
    assert(png.equals(repeat));
    assert(row.repeatExact);
    for (const r of row.readings) {
      const raw = await json(resolve(dir, `${row.id}-${r.engine}.stdout.txt`));
      assert.equal(raw.pngSha256, row.pngSha256);
      assert.equal(r.status, 0);
      assert.equal(r.error, null);
      assert.deepEqual(r.texts, raw.texts);
      assert.equal(r.exact, raw.texts.includes(row.spec.payload));
      assert(raw.texts.every((t) => t === row.spec.payload));
    }
    if (row.spec.control) controls.push({ ...row, batch: name });
    else {
      const layout = await json(resolve(dir, row.id + "-layout.json"));
      const text = await readFile(resolve(dir, row.id + ".txt"), "utf8");
      assert.equal(text, layout.plainText);
      assert.equal(sha(text), row.selectionSha256);
      const original = (
        row.spec.font === "Impact" || row.spec.font === "Arial Black"
          ? STORY.toUpperCase()
          : STORY
      ).split(" ");
      text
        .split(/\s+/)
        .forEach((w, i) => assert.equal(w, original[i % original.length]));
      candidates.push({
        ...row,
        batch: name,
        allLetter: !(layout.structural.ornaments > 0),
      });
    }
  }
  batches.push({
    id: name,
    plannedCandidates: m.candidateSlots,
    completedCandidates: rows.filter((r) => !r.spec.control).length,
    controls: rows.filter((r) => r.spec.control).length,
    aborted: !!(await readdir(dir)).includes("abort.json"),
  });
}
assert.equal(candidates.length, 75);
assert.equal(controls.length, 12);
assert.equal(plannedCandidates, 87);
const verification = await json(resolve(root, "verification/results.json"));
const functional = verification.rows.filter(
  (r) => !["format-baseline", "format-current"].includes(r.id),
);
assert(functional.every((r) => r.status === 0 && !r.error));
assert((await json(resolve(root, "verification/cleanup.json"))).removed);
const warningPaths = async (name) =>
  (await readFile(resolve(root, `verification/${name}.stderr.txt`), "utf8"))
    .split("\n")
    .filter((l) => l.startsWith("[warn] ") && !l.startsWith("[warn] Code"))
    .map((l) => l.slice(7));
const oldWarnings = await warningPaths("format-baseline"),
  newWarnings = await warningPaths("format-current");
assert.equal(oldWarnings.length, 207);
assert.equal(newWarnings.length, 313);
assert(oldWarnings.every((p) => newWarnings.includes(p)));
const vision2 = await json(resolve(root, "vision-02/results.json")),
  vision3 = await json(resolve(root, "vision-03/results.json")),
  vision4 = await json(resolve(root, "vision-04/results.json"));
assert(vision2.rows.find((r) => r.id === "large-1").exact);
assert(vision3.rows[0].exact);
assert(vision4.rows[0].exact);
const primary = await json(resolve(root, "batch-15/story-url-layout.json"));
const capture = await json(resolve(root, "batch-15/story-url-capture.json"));
const html = await readFile(resolve(root, "story.html"));
assert.equal(
  sha(html),
  sha(gunzipSync(await readFile(resolve(root, "batch-15/story-url.html.gz")))),
);
assert((await json(resolve(root, "export-verification/selection.json"))).exact);
assert(
  (await json(resolve(root, "export-replay-readers/inspection.json")))
    .pixelsEqual,
);
const native = (
  await json(resolve(root, "batch-15/story-url-zxing.stdout.txt"))
).values[0];
assert.equal(native.text, "https://example.com/");
const allLetter = candidates.filter((c) => c.allLetter);
assert.equal(allLetter.length, 33);
const notes = {
  finishedAt: new Date().toISOString(),
  start: "2026-10-11T04:53:00Z",
  absoluteDeadline: "2026-10-11T07:53:00Z",
  head,
  branch,
  remote,
  gitStatus: status,
  pr,
  privatePackage: true,
  protectedFiles: baseline.files.length,
  protectedBytes,
  protectedFailures,
  baselineManifestSha256: sha(baselineBytes),
  nativeCandidates: candidates.length,
  allLetterCandidates: allLetter.length,
  ornamentedCandidates: candidates.length - allLetter.length,
  plannedCandidateSlots: plannedCandidates,
  sourceFailedBeforeCapture: 1,
  unusedAfterSourceStop: 11,
  resourceCaptures: 12,
  conventionalCaptures: controls.length,
  immediateRepeats: 99,
  standaloneVerificationCaptures: 1,
  standaloneImmediateRepeats: 1,
  inspectionCrops: 1,
  ordinaryReaderCalls: 290,
  configuredHistoricalCalls: 1,
  archivedBatchSources: archivedSources,
  oldFormatWarnings: oldWarnings.length,
  currentFormatWarnings: newWarnings.length,
  addedFrozenFormatWarnings: newWarnings.filter(
    (p) => !oldWarnings.includes(p),
  ),
  verificationRows: verification.rows.map(({ id, status, error }) => ({
    id,
    status,
    error,
  })),
  batches,
  site: "No Site calls, deployment or audience changes. Protected local identity/audience records unchanged; live audience not re-queried.",
  phone:
    "No new phone or physical-print test. Earlier unspecified Samsung failures remain historical evidence.",
  nativePaste:
    "Not run for this candidate; programmatic native browser Selection exact. Portable styled paste remains untested.",
  pngSha256: capture.pngSha256,
  htmlSha256: sha(html),
  textSha256: capture.selectionSha256,
  sourceCharacters: primary.plainText.length,
  sourceWords: primary.structural.words,
  sourceParagraphRepeats: primary.structural.words / STORY.split(" ").length,
  sourceLines: primary.plainText.split("\n").length,
  sourceFont: "Impact 20px/20px, uppercase, black and gray180",
  qr: "Version2, Q,25modules,160px pitch,5module margin",
  zxingExtra: native.extra,
};
await save("audit.json", notes);
await save("pr-state.json", prRaw);
await save(
  "delivery-source.mjs.txt",
  await readFile(new URL("deliver.mjs", import.meta.url)),
);
const abspath = (n) => resolve(root, n);
const readme = `# All-letter styled-story result\n\nThe exact URL **https://example.com/** is recovered from the unchanged native all-letter PNG by ordinary **ZXing3.1.5** and ordinary **macOS Vision revision4**. jsQR1.4.0 and OpenCV4.13.0 return no URL. The short AQROBAT-TEST case also recovers in ZXing and Vision. This meets the run's two-reader software promotion rule. No camera or print acceptance is claimed.\n\n[Visual handback](${abspath("index.html")}) · [Selectable standalone HTML](${abspath("story.html")}) · [Native PNG](${abspath("batch-15/story-url.png")}) · [Source TXT](${abspath("batch-15/story-url.txt")})\n\n## What changed\n\nThe original band-023 mixed-case Courier20 field is2233px square and about1490words. In this run its saved PNG recovers only with the historical configured ZXing call; the three ordinary primary readers remain negative. The earlier phase14 ordinary ZXing success is separately reproduced, but its repetitive BOB/i word bank is not natural prose.\n\nThe new all-letter version uses native20px Impact, all capitals,20px leading, gray180light letters, whole-word justification and160px QR cells. Its5600px page contains a4000px text field,200lines and17,040words:240 ordered repetitions of the original71word paragraph. It ends at the paragraph's final “US.” These are actual selectable characters. The captured/exported document has91,162 visible elements, no images/canvas/SVG, no dark backgrounds, no shadows, no filters and no invisible duplicate layer. Generation uses the existing pinned local encoder and measured local fonts, with no server or AI at runtime.\n\nThe evidence suggests that heavier native letter ink and more letters per QR cell let the ordinary reader's scaling preserve the overall QR pattern. This is an inference from the controlled size/font comparisons, not an internal trace of every reader stage. The cost is a much larger, denser, all-capital field. Letters are readable at their native20px size; fitting the entire page on a small display makes them tiny. The original mixed-case Courier appearance remains unqualified under ordinary settings.\n\n## Ordinary reader evidence\n\n| Input | ZXing | macOS Vision | jsQR | OpenCV |\n| --- | --- | --- | --- | --- |\n| All-letter short,4960px | AQROBAT-TEST | AQROBAT-TEST | no payload | no payload |\n| All-letter URL,5600px | exact URL | exact URL | no payload | no payload |\n| Standalone-file URL replay | exact URL | exact URL | no payload | no payload |\n\nZXing uses readBarcodes(image) with the options argument omitted. jsQR uses jsQR(rgba,width,height) with options omitted. OpenCV uses a default QRCodeDetector. Vision uses a default VNDetectBarcodesRequest and URL handler. Readers receive no expected strings or supplied corners; exact strings are compared after return. Native input PNGs are losslessly decoded, with no external resampling, blur, thresholding or crop. The one detail crop is inspection-only and was never decoded.\n\nRaw native URL receipts: [ZXing](${abspath("batch-15/story-url-zxing.stdout.txt")}), [Vision](${abspath("vision-03/results.json")}), [jsQR](${abspath("batch-15/story-url-jsqr.stdout.txt")}), [OpenCV](${abspath("batch-15/story-url-opencv.stdout.txt")}). ZXing reports UEC0.90 for the URL and1.00 for the short case. The pinned upstream code defines UEC as the unused correction fraction, so a larger value means more correction capacity remained in that decode; it is not a cross-device reliability measurement. See [ReedSolomon.h](https://github.com/zxing-cpp/zxing-cpp/blob/2ecec3f5be0ee803f6e14a5a2c7028c0cfe525b4/core/src/ReedSolomon.h#L35-L46) and [the implementation](https://github.com/zxing-cpp/zxing-cpp/blob/2ecec3f5be0ee803f6e14a5a2c7028c0cfe525b4/core/src/ReedSolomon.cpp#L45-L54).\n\n## Standalone-file replay\n\nThe exported HTML bytes exactly match the captured HTML archive, and browser Selection exactly matches the90,959character TXT. A fresh file-origin replay and its repeat agree byte-for-byte with each other. They differ from the earlier setContent native PNG at24 antialiased pixels, maximum channel difference15, at x799 just outside the text field. The initial exact-PNG assertion stopped; its source and outputs are retained in [ERRATA](${abspath("export-verification/ERRATA.md")}). No pixel repair was made. The unchanged replay separately recovers the exact URL in ordinary ZXing and Vision; jsQR/OpenCV remain negative. The detail crop matches the corresponding primary pixels exactly. Portable styled paste, native-app reflow and other font/platform environments remain untested.\n\n## Full denominator and limits\n\nThere are75 unique completed native candidates:33 all-letter and42 ornamented, each with an exact immediate repeat;12 native resource captures and12 conventional captures each also repeat exactly. One source Selection failure stopped an earlier12-slot batch before its first candidate PNG: one setup failed and11 further slots were unused. The corrected source is a separately frozen batch. All failures and unused slots remain. The standalone verification adds one full replay plus repeat, and one inspection crop. There are291 recorded reader calls:290 ordinary and one historical configured baseline. Passive binarizer/locator/extractor diagnostics made no decoder calls and are separate from this denominator.\n\nThe initial64-candidate/128MB limits were amended prospectively for the recorded hypotheses to75 candidates/160MB, retaining the original clock deadline. The resource ceiling progressed8→9→10→11→12. All plans and exact invoked source archives remain. No unchanged failed native decoder input was selectively retried. A [75-row ledger](index.html#ledger) exposes negative results alongside successes. The clearer ornamented fallback [HTML](${abspath("ornamented-story.html")}) and [PNG](${abspath("batch-13/final-2.png")}) recover in ZXing and jsQR but visibly add square glyph ornaments. The all-letter result is the primary handback.\n\nPhone camera, Samsung Scan QR, physical print, fit-to-screen sizes, arbitrary paste destinations and independent owner aesthetic acceptance remain open. The earlier owner-reported Samsung failures have unspecified case/attempt counts and are preserved as earlier evidence, not generalized to this new image.\n\n## Verification and custody\n\nRepository unit tests, build, browser checks, text-browser checks and three research layout invariants pass in a disposable copy. Current new JavaScript formatting passes. Full format checking reports207 original warnings and313 at the verification snapshot;106 additions are frozen evidence/configuration/protocol bytes that were preserved. No formatter was run on captured HTML, frozen JSON or original evidence. Optional installed-extension and native-app paste checks were not run for this research candidate. [Check receipts](${abspath("verification/results.json")}) and [temporary-copy cleanup](${abspath("verification/cleanup.json")}) are retained.\n\nAll11,013 protected files (${protectedBytes.toLocaleString("en-US")}bytes) retain their original SHA256 and size. HEAD remains ${head}, branch ${branch}, draft PR#1 remains OPEN and draft at the same head, npm private:true remains, and no commit/push/deployment/Site/audience action occurred. Owner context, prior evidence, original generated artifacts and Site identity records remain intact. No agents, new chats or messages were started. [Audit](${abspath("audit.json")}) and [file hashes](${abspath("evidence-sha256.json")}) bind the handback to its evidence.\n`;
await save("README.md", await format(readme, { parser: "markdown" }));
const rows = candidates
  .map(
    (c) =>
      `<tr data-kind="${c.allLetter ? "letters" : "ornaments"}" data-success="${c.readings.some((r) => r.exact)}"><td><a href="${c.batch}/${c.id}.png">${c.batch}/${c.id}</a></td><td>${c.allLetter ? "All letters" : "Ornaments"}</td><td>${c.width}</td><td>${c.readings.map((r) => `${r.engine}: <b class="${r.exact ? "yes" : "no"}">${r.exact ? "exact" : "no payload"}</b>`).join("<br>")}</td><td><a href="${c.batch}/${c.id}.txt">text</a> · <a href="${c.batch}/${c.id}-capture.json">receipt</a></td></tr>`,
  )
  .join("");
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aqrobat — all-letter story recovery</title><style>
:root{color-scheme:light;--ink:#19212a;--muted:#596571;--line:#d9e0e3;--accent:#146750}*{box-sizing:border-box}body{margin:0;background:#f3f5f3;color:var(--ink);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1180px;margin:auto;padding:36px 24px 70px}header{padding:25px 0}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.16em;color:var(--accent);font-weight:700}h1{font-size:clamp(32px,5vw,58px);line-height:1.08;max-width:900px;letter-spacing:-.035em;margin:16px 0}h2{font-size:26px;line-height:1.25;margin:0 0 15px}h3{font-size:19px;margin:0 0 10px}.lead{font-size:20px;max-width:870px;color:#35434b}.badge{display:inline-block;background:#d9eee3;color:#164d3b;border-radius:30px;padding:5px 13px;font-weight:650;font-size:13px}.card{background:white;border:1px solid var(--line);border-radius:18px;padding:26px;margin:22px 0}.grid{display:grid;grid-template-columns:1.4fr 1fr;gap:24px}.meta{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}.meta span{background:#f0f4f3;padding:8px 12px;border-radius:9px}.actions{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0}a{color:#0b654d;text-underline-offset:3px}.button,button{display:inline-block;background:#146750;color:white;border:1px solid #146750;border-radius:9px;padding:10px 15px;text-decoration:none;font:inherit;cursor:pointer}.secondary{background:white;color:#146750}.preview{overflow:auto;background:white;border:1px solid var(--line);border-radius:12px;max-height:700px}.preview img{display:block;width:100%;height:auto}.preview.native img{width:5600px;max-width:none}.caption{font-size:13px;color:var(--muted);margin:10px 0}.detail{max-width:100%;height:auto;display:block;border:1px solid var(--line);margin:15px 0}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;border-bottom:1px solid var(--line);padding:12px;vertical-align:top}th{color:#42515a;background:#f5f7f6}.table-wrap{overflow:auto}.yes{color:#146750}.no{color:#65717b;font-weight:400}details>summary{cursor:pointer;font-weight:700;font-size:20px}.filters{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}select{font:inherit;padding:8px;border:1px solid var(--line);border-radius:7px}footer{color:var(--muted);font-size:13px;margin-top:28px}code{font-size:.92em;overflow-wrap:anywhere}p{margin:10px 0 16px}@media(max-width:760px){main{padding:20px 14px 45px}.grid{grid-template-columns:1fr}.card{padding:18px}th,td{padding:9px}h1{font-size:37px}.lead{font-size:18px}.actions .button{flex:1 1 150px;text-align:center}}</style></head><body><main>
<header><div class="eyebrow">Aqrobat · October 11,2026 · local research handback</div><h1>An all-letter story that ordinary software readers decode</h1><p class="lead">ZXing and Apple Vision recover <strong>https://example.com/</strong> from the unchanged native image. The page is made of real selectable story characters, with no corner ornaments or hidden QR layer.</p><span class="badge">Exact URL recovered by two reader systems</span><div class="actions"><a class="button" href="story.html">Open selectable HTML</a><a class="button secondary" href="batch-15/story-url.png">Open native PNG</a><a class="button secondary" href="batch-15/story-url.txt">Open source text</a><a class="button secondary" href="README.md">Detailed evidence</a></div></header>
<section class="card"><div class="grid"><div><h2>The result and the cost</h2><p>Heavier letters and more text per QR cell produce a stronger overall pattern under ordinary reader settings. The successful version uses <strong>uppercase Impact at20px</strong> with gray180light letters.</p><p>It is a <strong>5,600 ×5,600px</strong> page. Its200lines repeat the original71word paragraph240times. The letter detail is readable at native size; a whole-page preview makes the text tiny.</p><p>The original mixed-case Courier appearance remains unqualified with ordinary settings. Phone cameras, physical print and portable styled paste still need their own evidence.</p></div><div><h3>Unchanged native URL input</h3><div class="table-wrap"><table><tbody><tr><td>ZXing3.1.5</td><td class="yes">Exact URL</td></tr><tr><td>macOS Vision, revision4</td><td class="yes">Exact URL</td></tr><tr><td>jsQR1.4.0</td><td>No payload</td></tr><tr><td>OpenCV4.13.0</td><td>No payload</td></tr><tr><td>Browser Selection</td><td class="yes">Exact90,959characters</td></tr></tbody></table></div></div></div></section>
<section class="card"><h2>The complete native field</h2><div class="actions"><button id="fit" class="secondary" type="button">Fit preview</button><button id="native" class="secondary" type="button">Show native pixels</button></div><div id="preview" class="preview"><img src="batch-15/story-url.png" width="5600" height="5600" alt="A QR pattern formed entirely from black and gray uppercase story letters"></div><p id="preview-note" class="caption">This preview fits the page. Recorded decoders received the untouched5,600px PNG.</p><h3>Native20px letter detail</h3><img class="detail" src="export-verification/text-detail.png" width="1040" height="220" alt="Native-size Impact story words, including readable black and gray text"><p class="caption">Inspection-only crop. Its pixels match the original region exactly; this crop was never supplied to a decoder. <a href="export-verification/text-detail.png">Open the detail at native size.</a></p></section>
<section class="card"><h2>How it compares</h2><div class="table-wrap"><table><thead><tr><th>Version</th><th>Reader evidence</th><th>Tradeoff</th></tr></thead><tbody><tr><td><a href="../phase-02/batch-02/raw/band-023-2233.png">Original band-023</a></td><td>Historical configured ZXing recovers AQROBAT-TEST; three ordinary primary readers remain negative in the replay.</td><td>Mixed-case Courier20,2233px, roughly1490words; the more balanced appearance.</td></tr><tr><td><a href="../phase-14/run-01/native.png">Earlier phase14</a></td><td>Ordinary ZXing URL success reproduced.</td><td>Native Monaco14 and repetitive BOB/i material; not a natural story.</td></tr><tr><td><a href="batch-15/story-url.png">New all-letter story</a></td><td>Ordinary ZXing and Vision return the exact URL.</td><td>Impact20, all capitals,5600px,240paragraph repetitions.</td></tr><tr><td><a href="batch-13/final-2.png">Ornamented fallback</a></td><td>Ordinary ZXing and jsQR return the exact URL.</td><td>Fewer/larger words, but visible square glyph ornaments. <a href="ornamented-story.html">Selectable HTML.</a></td></tr></tbody></table></div></section>
<section class="card"><h2>What the standalone file proves</h2><p>The HTML export has the exact captured source bytes and exact text Selection. Its file-origin image repeats exactly, but24left-edge antialiased pixels differ from the original capture. The initial byte-equality check stopped and is retained. The unchanged replay then separately recovered the URL in both ZXing and Vision. <a href="export-verification/ERRATA.md">Read the mismatch record.</a></p><p>Native lettering is verified on this Mac with Impact installed. Reflow, other fonts, native applications, fit-to-screen scanning and physical print have not been accepted. Earlier unspecified Samsung failures remain part of the project history.</p></section>
<section class="card" id="ledger"><details><summary>Every completed native candidate ·75rows</summary><p>33all-letter cases and42ornamented cases; failures are retained. One earlier source-selection failure stopped before any candidate PNG and left11further slots unused. Controls, resource captures and the standalone replay are separate.</p><div class="filters"><label>Layout <select id="kind"><option value="all">All layouts</option><option value="letters">All letters</option><option value="ornaments">Ornaments</option></select></label><label>Result <select id="result"><option value="all">All results</option><option value="true">Any primary-reader recovery</option><option value="false">No primary-reader recovery</option></select></label><span id="row-count">75rows</span></div><div class="table-wrap"><table id="cases"><thead><tr><th>Native input</th><th>Layout</th><th>Pixels</th><th>Primary ordinary readers</th><th>Evidence</th></tr></thead><tbody>${rows}</tbody></table></div><p class="caption">Vision was run on a preregistered subset. The all-letter large-1 and story-url cases recover in Vision; its raw receipts are linked in the detailed report.</p></details></section>
<section class="card"><h2>Verification and preservation</h2><p>Unit tests, build, browser checks, text-browser checks and research layout invariants passed in a disposable copy. Current new JavaScript formatting passed. Full formatting reported207existing warnings and313at the verification snapshot; frozen evidence bytes were retained.</p><p>All11,013protected files retain their hashes. Branch and HEAD are unchanged; PR#1 is still draft and open. npm remains private. No commit, push, deployment, Site/audience change, agent, new chat or message occurred.</p><p><a href="audit.json">Audit receipt</a> · <a href="verification/results.json">Check receipts</a> · <a href="verification/cleanup.json">Temporary-copy cleanup</a> · <a href="evidence-sha256.json">Evidence file hashes</a> · <a href="PLAN.md">Original plan</a> · <a href="LARGE-FACE-PLAN.md">Final bounded amendment</a></p></section>
<footer>Software recovery and native text selection are established for the named files. Phone, print, portable paste and owner aesthetic acceptance remain separate. The original three-hour allowance was not renewed.</footer></main><script>
const preview=document.getElementById('preview'),note=document.getElementById('preview-note');document.getElementById('fit').onclick=()=>{preview.classList.remove('native');note.textContent='This preview fits the page. Recorded decoders received the untouched5,600px PNG.'};document.getElementById('native').onclick=()=>{preview.classList.add('native');note.textContent='Native pixels: scroll to inspect. This viewing control does not change the saved image.'};const kind=document.getElementById('kind'),result=document.getElementById('result');function filter(){let n=0;for(const r of document.querySelectorAll('#cases tbody tr')){const show=(kind.value==='all'||r.dataset.kind===kind.value)&&(result.value==='all'||r.dataset.success===result.value);r.hidden=!show;if(show)n++;}document.getElementById('row-count').textContent=n+'rows';}kind.onchange=result.onchange=filter;</script></body></html>`;
await save("index.html", await format(page, { parser: "html" }));
await save("checks-and-formatting.json", {
  at: new Date().toISOString(),
  oldWarnings,
  newWarnings,
  notes:
    "Frozen records/configs/protocols preserved; current new JS format check passed in verification copy. Final delivery source and documents receive a targeted check separately.",
});
const inventory = [];
async function walk(p) {
  for (const e of await readdir(p, { withFileTypes: true })) {
    const f = resolve(p, e.name);
    if (e.isDirectory()) await walk(f);
    else {
      const b = await readFile(f);
      inventory.push({
        path: f.slice(root.length + 1),
        bytes: b.length,
        sha256: sha(b),
      });
    }
  }
}
await walk(root);
const evidenceBytes = inventory.reduce((s, f) => s + f.bytes, 0);
assert(evidenceBytes < 160000000, "Evidence cap exceeded");
assert.equal(inventory.filter((f) => f.path.endsWith(".png")).length, 201);
await save("evidence-sha256.json", {
  at: new Date().toISOString(),
  files: inventory,
  evidenceBytes,
  excluded:
    "This self-referential inventory; later UI/targeted-format verification receipts are separately added to delivery-seal.json",
  nativePngFiles: 201,
});
console.log(
  JSON.stringify({
    candidateCount: candidates.length,
    allLetter: allLetter.length,
    protectedFiles: baseline.files.length,
    protectedBytes,
    evidenceBytes,
    primaryNativeSha256: capture.pngSha256,
    readers: "ZXing and macOS Vision",
    html: abspath("index.html"),
  }),
);

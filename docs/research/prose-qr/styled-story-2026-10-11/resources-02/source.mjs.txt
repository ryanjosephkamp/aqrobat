import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
const supplied = process.argv[2]
  ? JSON.parse(await readFile(process.argv[2], "utf8"))
  : null;
const root = resolve(
  "docs/research/prose-qr/styled-story-2026-10-11/" +
    (supplied?.id || "resources-01"),
);
await mkdir(root);
const specs = [];
for (const font of ["Arial Unicode MS", "Apple Symbols"])
  for (const symbol of ["◉", "▣"])
    specs.push({
      id: `glyph-${specs.length + 1}`,
      font,
      symbol,
      size: 400,
      origin: [100, 100],
    });
if (supplied) specs.splice(0, specs.length, ...supplied.specs);
const source = await readFile(new URL("resources.mjs", import.meta.url));
await writeFile(resolve(root, "source.mjs.txt"), source, { flag: "wx" });
await writeFile(
  resolve(root, "manifest.json"),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      specs,
      sourceSha256: createHash("sha256").update(source).digest("hex"),
      selectionRule:
        "Minimize maximum relative center-row 1:1:3:1:1 run error among actual native glyph resources; report fallback faces; no decoder calls",
      readerCalls: 0,
    },
    null,
    2,
  ),
  { flag: "wx" },
);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const rows = [];
try {
  const page = await browser.newPage({
    viewport: { width: 800, height: 800 },
    deviceScaleFactor: 1,
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  for (const spec of specs) {
    const html = `<!doctype html><html><body style="margin:0"><article id="artifact" style="position:relative;width:700px;height:700px;background:white"><span id="glyph" style="position:absolute;left:100px;top:100px;font:${spec.weight || 400} ${spec.size}px/1 '${spec.font}';color:black;-webkit-text-stroke:${spec.stroke || 0}px currentColor;paint-order:stroke fill">${spec.symbol}</span></article></body></html>`;
    await writeFile(resolve(root, spec.id + ".html.txt"), html, { flag: "wx" });
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    const doc = await cdp.send("DOM.getDocument");
    const node = await cdp.send("DOM.querySelector", {
      nodeId: doc.root.nodeId,
      selector: "#glyph",
    });
    const fonts = (
      await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
    ).fonts;
    const png = await page.locator("#artifact").screenshot();
    const path = resolve(root, spec.id + ".png");
    await writeFile(path, png, { flag: "wx" });
    const repeat = await page.locator("#artifact").screenshot();
    await writeFile(resolve(root, spec.id + "-repeat.png"), repeat, {
      flag: "wx",
    });
    if (!repeat.equals(png)) throw Error("Resource repeat mismatch");
    const code = `import cv2,json,sys,numpy as np\na=cv2.imread(sys.argv[1],0);ys,xs=np.where(a<128);x=int(xs.min());y=int(ys.min());w=int(xs.max()-x+1);h=int(ys.max()-y+1);line=(a[y+h//2,x:x+w]<128).astype(int).tolist();runs=[]\nfor v in line:\n if not runs or runs[-1][0]!=v:runs.append([v,1])\n else:runs[-1][1]+=1\nprint(json.dumps({'inkBounds':[x,y,w,h],'horizontalRuns':runs}))`;
    const raw = spawnSync("python3", ["-B", "-c", code, path], {
      encoding: "utf8",
    });
    await writeFile(
      resolve(root, spec.id + "-measure.stdout.txt"),
      raw.stdout,
      { flag: "wx" },
    );
    await writeFile(
      resolve(root, spec.id + "-measure.stderr.txt"),
      raw.stderr,
      { flag: "wx" },
    );
    if (raw.status !== 0) throw Error("Resource measurement failed");
    const measure = JSON.parse(raw.stdout);
    const lengths = measure.horizontalRuns.map((r) => r[1]);
    const ratios =
      lengths.length === 5
        ? lengths.map((v) => v / (measure.inkBounds[2] / 7))
        : null;
    const error = ratios
      ? Math.max(
          ...ratios.map(
            (v, i) => Math.abs(v - [1, 1, 3, 1, 1][i]) / [1, 1, 3, 1, 1][i],
          ),
        )
      : Infinity;
    const row = {
      ...spec,
      ...measure,
      fonts,
      ratios,
      error: Number.isFinite(error) ? error : null,
      pngSha256: createHash("sha256").update(png).digest("hex"),
      repeatExact: true,
    };
    rows.push(row);
    console.log(JSON.stringify(row));
  }
  await writeFile(
    resolve(root, "results.json"),
    JSON.stringify({ rows, browser: browser.version() }, null, 2),
    { flag: "wx" },
  );
} finally {
  await browser.close();
}

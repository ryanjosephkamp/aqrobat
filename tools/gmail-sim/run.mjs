// Gmail view simulator. Renders a code's plain text the way Gmail shows a
// message that was pasted as plain text (as the Gmail phone app does): runs
// of spaces collapse, the font is Arial, and emoji are drawn as Google's
// Noto images. Each render then goes through camera-like trials (scale,
// blur, contrast, noise, tilt) and is decoded with ZXing and jsQR.
//
//   node tools/gmail-sim/run.mjs                 # calibration and current layouts
//   node tools/gmail-sim/run.mjs 🍇 🖤 🙂        # current layouts for these characters
//   node tools/gmail-sim/run.mjs 🍇 --corners= --centers=   # without ⬛ corners
//   node tools/gmail-sim/run.mjs ⬛ --light=🤍   # with a light character
//   node tools/gmail-sim/run.mjs --view=print --trials=24 --out=test-results/gmail-sim
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { generate } from "../../src/core.mjs";
import { pasteText } from "../../src/portable.mjs";
import { decodePng } from "../paste-lab/lib/decode.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback) =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const VIEWS = {
  // Gmail on the web: 1.25 times taller rows than wide, measured from a
  // received message. The print view draws square rows.
  web: { lineHeight: "1.55" },
  print: { lineHeight: "normal" },
};
const view = VIEWS[flag("view", "web")];
const trials = Number(flag("trials", 12));
const payload = flag("payload", "https://example.com");
const out = flag("out", null);
const glyphs = args.filter((a) => !a.startsWith("--"));
// Parts as the page sets them; an empty value follows the code.
const partFlags = ["corners", "centers", "light"].filter((k) =>
  args.some((a) => a.startsWith(`--${k}=`)),
);
const parts = partFlags.length
  ? Object.fromEntries(partFlags.map((k) => [k, flag(k, "")]))
  : undefined;

const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
// Gmail turns emoji, and only emoji, into images.
const isEmoji = (g) => /\p{Extended_Pictographic}|⃣/u.test(g);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
function gmailHtml(text) {
  const lines = text
    .replace(/\n$/, "")
    .split("\n")
    .map((line) =>
      [...seg.segment(line)]
        .map(({ segment: g }) =>
          isEmoji(g) ? `<e-img>${esc(g)}</e-img>` : esc(g),
        )
        .join(""),
    );
  return `<!doctype html><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=block">
<style>body{margin:0;background:#fff}
#m{display:inline-block;padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:small;color:#222;white-space:normal;line-height:${view.lineHeight}}
e-img{display:inline-block;width:1.2em;height:1.2em;vertical-align:middle;font-family:"Noto Color Emoji";font-size:1.032em;line-height:1.163em;text-align:center;overflow:hidden}</style>
<div id="m"><div dir="ltr">${lines.join("<br>")}</div></div>`;
}

// The layouts that were sent through Gmail on October 28, 2026 and scanned
// (squares) or did not (the rest) on a phone. A run that disagrees with
// these is not calibrated.
function october28(qr) {
  const emoji = qr.palette.every(isEmoji);
  const rows = [];
  for (let y = -2; y < qr.modules + 2; y++) {
    let row = "";
    for (let x = -2; x < qr.modules + 2; x++) {
      const glyph = qr.glyphMatrix[y]?.[x];
      row += emoji ? (glyph ?? "⬜") : glyph ? glyph.repeat(2) : "  ";
    }
    rows.push(row);
  }
  return rows.join("\n") + "\n";
}
const cases = [];
const add = (name, glyph, layout, phone = null, withParts = parts) => {
  const qr = generate(payload, {
    glyph,
    repeatX: 1,
    repeatY: 1,
    ...(withParts ? { parts: withParts } : {}),
  });
  cases.push({ name, text: layout(qr), modules: qr.modules + 4, phone });
};
const now = (qr) => pasteText(qr).text;
if (glyphs.length) for (const g of glyphs) add(g, g, now);
else {
  add("⬛ October 28", "⬛", october28, "scanned");
  add("🍇 October 28", "🍇", october28, "did not scan");
  add("🙂 October 28", "🙂", october28, "did not scan");
  add("# October 28", "#", october28, "did not scan");
  // Sent with ▫️ light squares and ⬛ corners on October 29.
  add("⬛ now", "⬛", now);
  add("🍇 now", "🍇", now, "scanned");
  add("🖤 now", "🖤", now, "scanned");
  add("🙂 now", "🙂", now, "did not scan");
}

const executablePath =
  process.env.CHROME_PATH ||
  (existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : undefined);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
if (out) await mkdir(out, { recursive: true });
console.log(`Gmail ${flag("view", "web")} view, ${trials} camera trials each`);
for (const c of cases) {
  await page.setContent(gmailHtml(c.text));
  await page.evaluate(() => document.fonts.ready);
  if (await page.locator("e-img").count())
    await page.waitForFunction(() =>
      [...document.fonts].some(
        (f) => f.family === "Noto Color Emoji" && f.status === "loaded",
      ),
    );
  const shot = await page.locator("#m").screenshot();
  if (out) await writeFile(`${out}/${c.name.replace(/\W+/g, "-")}.png`, shot);
  let passes = 0;
  for (let i = 0; i < trials; i++) {
    // About 3.4 to 4.9 px a square, blur 0.8 to 1.3 px, 15% contrast loss,
    // 4% noise, and up to 3° of tilt: a phone a little way from a screen.
    const t = {
      module: 3.4 + (i % 4) * 0.5,
      blur: 0.8 + (i % 3) * 0.25,
      noise: 0.04,
      rotate: ((i % 5) - 2) * 1.5,
      contrast: 0.85,
      seed: 7 + i * 13,
    };
    const png = await page.evaluate(
      async ({ png, t, modules }) => {
        const img = new Image();
        img.src = "data:image/png;base64," + png;
        await img.decode();
        const scale = t.module / ((img.width - 48) / modules);
        const w = Math.round(img.width * scale),
          h = Math.round(img.height * scale);
        const c = document.createElement("canvas");
        c.width = w + 80;
        c.height = h + 80;
        const x = c.getContext("2d");
        x.fillStyle = "#fff";
        x.fillRect(0, 0, c.width, c.height);
        x.filter = `blur(${t.blur}px) contrast(${t.contrast})`;
        x.translate(c.width / 2, c.height / 2);
        x.rotate((t.rotate * Math.PI) / 180);
        x.drawImage(img, -w / 2, -h / 2, w, h);
        x.setTransform(1, 0, 0, 1, 0, 0);
        x.filter = "none";
        const d = x.getImageData(0, 0, c.width, c.height);
        let s = t.seed;
        const rnd = () =>
          (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
        for (let i = 0; i < d.data.length; i += 4) {
          const n = (rnd() - 0.5) * 2 * t.noise * 255;
          for (let k = 0; k < 3; k++)
            d.data[i + k] = Math.max(0, Math.min(255, d.data[i + k] + n));
        }
        x.putImageData(d, 0, 0);
        return c.toDataURL("image/png").split(",")[1];
      },
      { png: shot.toString("base64"), t, modules: c.modules },
    );
    const r = await decodePng(Buffer.from(png, "base64"), payload);
    if (r.zxing.pass || r.jsqr.pass) passes++;
  }
  console.log(
    `${c.name.padEnd(16)} ${String(passes).padStart(2)}/${trials}${c.phone ? `   phone: ${c.phone}` : ""}`,
  );
}
await browser.close();
// zxing-wasm keeps handles open; exit explicitly.
process.exit(0);

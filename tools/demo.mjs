// Record the README demo from the real page in a disposable browser. Frames are
// captured one by one, so the timing is exact, then ffmpeg makes the GIF.
// This is not a phone scan test.
import { chromium } from "playwright";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const OUT = "docs/demo/aqrobat.gif";
const STILL = "docs/demo/aqrobat.png";
const FRAMES = "test-results/demo";
const server = spawn(process.execPath, ["tools/serve.mjs"], {
  env: { ...process.env, PORT: "0" },
  stdio: ["ignore", "pipe", "pipe"],
});
let browser;
try {
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Server timeout")), 15000);
    server.stdout.on("data", (data) => {
      const match = data.toString().match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
    server.on("error", reject);
  });
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      (existsSync(
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      )
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : undefined),
  });
  await rm(FRAMES, { recursive: true, force: true });
  await mkdir(FRAMES, { recursive: true });
  await mkdir("docs/demo", { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 1080 },
    colorScheme: "light",
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: url,
  });
  const page = await context.newPage();
  await page.goto(url + "/");
  const top = await page.evaluate(() => {
    const make = document.getElementById("make");
    // A drawn pointer, since headless screenshots leave out the real one. The
    // unsaved-work note is hidden: the demo edits the form on purpose.
    const pointer = document.createElement("div");
    pointer.id = "demo-pointer";
    pointer.innerHTML =
      '<span></span><svg width="22" height="26" viewBox="0 0 22 26"><path d="M2 2v19l5-4.5 3.3 7.2 3.4-1.5-3.2-7H18z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const style = document.createElement("style");
    style.textContent = `#demo-pointer{position:fixed;left:0;top:0;z-index:99;pointer-events:none}
      #demo-pointer svg{position:absolute;left:-2px;top:-2px;filter:drop-shadow(0 1px 1px rgb(0 0 0/.25))}
      #demo-pointer span{position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;background:rgb(37 99 235/.28);opacity:0;transform:scale(.4)}
      #demo-pointer[data-down] span{opacity:1;transform:scale(1)}
      #unsaved{display:none}`;
    document.head.append(style);
    document.body.append(pointer);
    return make.getBoundingClientRect().top + scrollY - 72;
  });
  await page.waitForTimeout(600);

  const frames = [];
  const shot = async (seconds) => {
    const file = `${FRAMES}/${String(frames.length).padStart(4, "0")}.png`;
    // Typing scrolls the caret into view; keep every frame framed the same.
    await page.evaluate((y) => scrollTo(0, y), top);
    await page.screenshot({ path: file, caret: "initial" });
    frames.push([file, seconds]);
  };
  let at = { x: 760, y: 560 };
  const place = (x, y, down = false) =>
    page.evaluate(
      ([x, y, down]) => {
        const pointer = document.getElementById("demo-pointer");
        pointer.style.transform = `translate(${x}px, ${y}px)`;
        pointer.toggleAttribute("data-down", down);
      },
      [x, y, down],
    );
  const moveTo = async (selector, dx = 0, dy = 0) => {
    const box = await page.locator(selector).boundingBox();
    const to = {
      x: box.x + box.width / 2 + dx,
      y: box.y + box.height / 2 + dy,
    };
    const steps = 11;
    for (let i = 1; i <= steps; i++) {
      const t = 1 - (1 - i / steps) ** 3;
      const x = at.x + (to.x - at.x) * t;
      const y = at.y + (to.y - at.y) * t;
      await page.mouse.move(x, y);
      await place(x, y);
      await shot(0.04);
    }
    at = to;
  };
  const click = async (selector, hold, dx, dy) => {
    await moveTo(selector, dx, dy);
    await place(at.x, at.y, true);
    await shot(0.12);
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(220);
    await place(at.x, at.y);
    await shot(hold);
  };

  await place(at.x, at.y);
  await shot(1.4);
  await click("#payload", 0.3, 120, -12);
  await page.keyboard.press("End");
  for (const key of "/hello") {
    await page.keyboard.type(key);
    await shot(0.11);
  }
  await shot(0.9);
  await click('#presets [aria-label="Grapes"]', 1.9);
  // The still for readers who turn motion off.
  await place(-40, -40);
  await page.screenshot({ path: STILL });
  await place(at.x, at.y);
  await click('#destinations button:has-text("Slack")', 1.6);
  // The emoji picker finds a black heart by name, then the corners turn red.
  await click("#glyph-emoji", 0.8);
  for (const key of "heart") {
    await page.keyboard.type(key);
    await shot(0.11);
  }
  await shot(0.6);
  await click('#picker-results .emoji-cell[data-glyph="🖤"]', 1.6);
  await click("#part-corners", 0.8);
  await click('#picker-choices button[aria-label="red square"]', 1.8);
  await click("#copy-destination", 1.8);
  await context.close();

  // ffmpeg's concat list keeps each frame's own duration.
  const list = frames
    .map(
      ([file, seconds]) =>
        `file '${file.split("/").pop()}'\nduration ${seconds}`,
    )
    .join("\n");
  await writeFile(
    `${FRAMES}/frames.txt`,
    `${list}\nfile '${frames.at(-1)[0].split("/").pop()}'\n`,
  );
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "concat",
    "-i",
    `${FRAMES}/frames.txt`,
    "-filter_complex",
    "split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle",
    "-fps_mode",
    "vfr",
    "-loop",
    "0",
    OUT,
  ]);
  console.log(`Recorded ${frames.length} frames to ${OUT}, and ${STILL}.`);
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}

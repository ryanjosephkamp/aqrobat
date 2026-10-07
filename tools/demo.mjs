// Record the real UI in a disposable browser. This is not a phone scan test.
import { chromium } from "playwright";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
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
  await mkdir("test-results/demo", { recursive: true });
  await mkdir("docs/demo", { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 960, height: 800 },
    recordVideo: {
      dir: "test-results/demo",
      size: { width: 960, height: 800 },
    },
  });
  const page = await context.newPage();
  await page.goto(url + "/#make");
  await page.locator("#make").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1300);
  await page.locator("#width").fill("701");
  await page.waitForTimeout(1100);
  await page.locator("#preset").selectOption("█");
  await page.waitForTimeout(1300);
  await page.locator("#preset").selectOption("⚫️");
  await page.waitForTimeout(1300);
  await page.locator("#preset").selectOption("🍇");
  await page.waitForTimeout(1300);
  await page.locator("#preset").selectOption("#");
  await page.waitForTimeout(1100);
  await page.locator("#compare").click();
  await page.locator("#grid").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const video = page.video();
  await context.close();
  const path = await video.path();
  await copyFile(path, "docs/demo/walkthrough.webm");
  // ffmpeg is optional and only used for a convenient small animated GIF.
  try {
    execFileSync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      path,
      "-filter_complex",
      "fps=6,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=80[p];[b][p]paletteuse=dither=none",
      "-loop",
      "0",
      "docs/demo/walkthrough.gif",
    ]);
  } catch {
    console.log("GIF conversion unavailable; the WebM recording remains.");
  }
  console.log("Recorded real UI walkthrough. No phone scan or print claim.");
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}

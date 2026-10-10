// Optional interactive check. Uses only a fresh, task-owned Chrome profile.
import { chromium } from "playwright";
import {
  mkdtemp,
  rm,
  writeFile,
  access,
  mkdir,
  readFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
await mkdir("test-results", { recursive: true });
const profile = await mkdtemp(resolve("test-results/aqrobat-owned-native-"));
const marker = resolve(`test-results/finish-native-insertion-${randomUUID()}`);
const server = spawn(process.execPath, ["tools/serve.mjs"], {
  env: { ...process.env, PORT: "0" },
  stdio: ["ignore", "pipe", "pipe"],
});
const url = await new Promise((r, j) => {
  server.once("error", j);
  server.stdout.on("data", (d) => {
    const m = String(d).match(/http:\/\/127\.0\.0\.1:\d+/);
    if (m) r(m[0]);
  });
});
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    headless: false,
    executablePath:
      process.env.EXTENSION_CHROME_PATH || chromium.executablePath(),
    args: [
      `--disable-extensions-except=${resolve("dist/extension")}`,
      `--load-extension=${resolve("dist/extension")}`,
    ],
  });
  const worker =
      context.serviceWorkers()[0] ||
      (await context.waitForEvent("serviceworker")),
    id = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(url + "/downloads/aqrobat-insertion-practice.html");
  const generator = await context.newPage();
  await generator.goto(`chrome-extension://${id}/index.html`);
  await generator.locator("#density").selectOption("1x1");
  await generator.locator("#recipe-name").fill("Native test · saved hash");
  await generator.locator("#save-local").click();
  await generator.waitForFunction(() =>
    document.querySelector("#status").textContent.startsWith("Recipe saved"),
  );
  await generator.close();
  await page.bringToFront();
  console.log(
    JSON.stringify({
      ready: true,
      url: page.url(),
      marker,
      steps:
        "Invoke Aqrobat through real Chrome toolbar. Select saved hash in popup; Insert; choose plain field; preview/insert/Undo. Close panel. Invoke toolbar again; choose rich field; preview/insert. Create marker when done.",
    }),
  );
  let completed = false;
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    try {
      await access(marker);
      completed = true;
      break;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  const state = await page.evaluate(() => {
    const root = document.querySelector("#rich [data-aqrobat-layout]");
    return {
      plain: document.querySelector("#plain").value,
      rich: document.querySelector("#rich").innerHTML,
      richWidth: root?.getBoundingClientRect().width,
      layoutCount: document.querySelectorAll("#rich [data-aqrobat-layout]")
        .length,
      embeddedImages: document.querySelectorAll(
        "#rich img,#rich svg,#rich canvas",
      ).length,
      message: document
        .querySelector("aqrobat-insertion")
        ?.shadowRoot.getElementById("message").textContent,
    };
  });
  const receipt = {
    browser: await worker.evaluate(() => navigator.userAgent),
    version: await worker.evaluate(() => chrome.runtime.getManifest().version),
    completed,
    sourceSha256: createHash("sha256")
      .update(await readFile("dist/extension/insertion.js"))
      .digest("hex"),
    nativeActions:
      "Real toolbar invocation and field/preview/insert clicks are manual; automation only prepares fixture and reads resulting DOM.",
    profile:
      "Fresh task-owned profile; removed afterward. Owner profile untouched.",
    phone: "not run",
    physicalPrint: "not run",
    externalEmail: "not run",
    ...state,
  };
  if (
    completed &&
    (state.plain.trim() !== "Your draft starts here." ||
      state.layoutCount !== 1 ||
      state.embeddedImages !== 0 ||
      Math.abs(state.richWidth - 328) > 1 ||
      !state.rich.includes("Your email draft starts here."))
  )
    throw new Error(
      "Native check ended without the expected preserved draft and rich QR.",
    );
  await writeFile(
    "test-results/native-extension-insertion.json",
    JSON.stringify(receipt, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      completed,
      richWidth: state.richWidth,
      plainRestored: state.plain.trim() === "Your draft starts here.",
    }),
  );
} finally {
  if (context) await context.close();
  server.kill();
  await rm(profile, { recursive: true, force: true });
  await rm(marker, { force: true });
}

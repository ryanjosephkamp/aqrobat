import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import jsQR from "jsqr";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const panel = () => page.locator("aqrobat-insertion"),
  message = () => panel().locator("#message").innerText();
const report = {
  browser: browser.version(),
  checks: [],
  samples: [],
  rawRasterDecodes: [],
  phone: "not run",
  physicalPrint: "not run",
  externalEditors: "not run",
};
async function open() {
  await page.locator("#start").click();
}
async function target(id) {
  await page.locator(id).click();
  await page.waitForTimeout(20);
}
async function preview() {
  await panel().locator("#prepare").click();
  await page.waitForTimeout(30);
}
async function probe(locator, name, output) {
  const png = await locator.screenshot();
  const pixels = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = "data:image/png;base64," + base64;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    return {
      width: canvas.width,
      height: canvas.height,
      data: Array.from(
        ctx.getImageData(0, 0, canvas.width, canvas.height).data,
      ),
    };
  }, png.toString("base64"));
  const decoded = jsQR(
    new Uint8ClampedArray(pixels.data),
    pixels.width,
    pixels.height,
  );
  if (decoded) assert.equal(decoded.data, "https://example.com");
  report.rawRasterDecodes.push({
    name,
    output,
    width: pixels.width,
    height: pixels.height,
    decoder: "jsQR 1.4.0",
    expected: "https://example.com",
    result: decoded ? "exact payload recovered" : "not recovered",
  });
}
try {
  await page.goto(
    new URL("../downloads/aqrobat-insertion-practice.html", import.meta.url)
      .href,
  );
  for (const [i, name] of ["hash", "rocket", "circle", "mixed"].entries()) {
    await page.locator("#plain").fill("KEEP THIS DRAFT\n");
    await open();
    await panel()
      .locator("#recipe")
      .selectOption(`00000000-0000-4000-8000-00000000000${i}`);
    await target("#plain");
    await page.locator("#plain").press("ControlOrMeta+End");
    await target("#plain");
    await page
      .locator("#plain")
      .evaluate((el) => el.setSelectionRange(el.value.length, el.value.length));
    // A second real click captures the settled cursor; put it at the end via a click handler.
    await page
      .locator("#plain")
      .evaluate((el) =>
        el.addEventListener(
          "click",
          () => el.setSelectionRange(el.value.length, el.value.length),
          { once: true },
        ),
      );
    await target("#plain");
    await preview();
    assert.equal(
      await panel().locator("#insert").isEnabled(),
      true,
      await message(),
    );
    const text = await panel().locator("#preview pre").innerText();
    const geometryMessage = await message();
    await probe(
      panel().locator("#preview pre"),
      name,
      "actual measured plain preview; same text inserted in textarea",
    );
    await panel().locator("#insert").click();
    await page.waitForFunction(() =>
      /^(Inserted\.|The editor changed)/.test(
        document
          .querySelector("aqrobat-insertion")
          ?.shadowRoot.getElementById("message").textContent,
      ),
    );
    assert(
      (await page.locator("#plain").inputValue()).startsWith(
        "KEEP THIS DRAFT\n",
      ),
    );
    assert((await page.locator("#plain").inputValue()).includes(text));
    assert((await message()).startsWith("Inserted."));
    await page.locator("#plain").focus();
    await page.keyboard.press("ControlOrMeta+Z");
    assert.equal(
      await page.locator("#plain").inputValue(),
      "KEEP THIS DRAFT\n",
    );
    report.samples.push({
      name,
      mode: "measured plain",
      preview: geometryMessage,
      undo: "original draft restored",
    });
    await panel().locator("#close").click();
  }
  report.checks.push(
    "four palettes insert calibrated plain text with all spaces/newlines; one Undo restores original draft",
  );
  for (const i of [0, 1, 2, 3]) {
    await page.locator("#rich").evaluate((el) => {
      el.innerHTML = "<p>KEEP ORIGINAL PARAGRAPH</p><p><br></p>";
      el.onclick = () => {
        const r = document.createRange();
        r.selectNodeContents(el.lastChild);
        r.collapse(true);
        const s = getSelection();
        s.removeAllRanges();
        s.addRange(r);
      };
    });
    await open();
    await panel()
      .locator("#recipe")
      .selectOption(`00000000-0000-4000-8000-00000000000${i}`);
    await target("#rich");
    await preview();
    assert.equal(
      await panel().locator("#insert").isEnabled(),
      true,
      await message(),
    );
    await panel().locator("#insert").click();
    assert(
      (await page.locator("#rich").innerText()).includes(
        "KEEP ORIGINAL PARAGRAPH",
      ),
    );
    assert.equal(await page.locator("#rich [data-aqrobat-layout]").count(), 1);
    assert.equal(
      await page.locator("#rich img,#rich svg,#rich canvas").count(),
      0,
    );
    const box = await page.locator("#rich [data-aqrobat-layout]").boundingBox();
    assert(Math.abs(box.width - 328) < 1);
    assert(
      Math.abs(box.height - 328) < 2,
      `Inserted QR proportions changed: ${JSON.stringify(box)}`,
    );
    await probe(
      page.locator("#rich [data-aqrobat-layout]"),
      ["hash", "rocket", "circle", "mixed"][i],
      "actual inserted rich text",
    );
    await page.screenshot({
      path: resolve(`test-results/insertion-rich-${i}.png`),
    });
    await page.locator("#rich").focus();
    await page.keyboard.press("ControlOrMeta+Z");
    assert.equal(await page.locator("#rich [data-aqrobat-layout]").count(), 0);
    assert(
      (await page.locator("#rich").innerText()).includes(
        "KEEP ORIGINAL PARAGRAPH",
      ),
    );
    await panel().locator("#close").click();
  }
  report.checks.push(
    "four rich-text palettes preserve draft, 328px text layout, no embedded images, native undo",
  );
  for (const [kind, setup, expected] of [
    ["width", (el) => (el.style.width = "200px"), "needs at least"],
    ["maxlength", (el) => (el.maxLength = 30), "character limit"],
    ["readonly", (el) => (el.readOnly = true), "read-only"],
    [
      "selection",
      (el) => (el.onclick = () => el.setSelectionRange(0, 4)),
      "empty cursor",
    ],
  ]) {
    await page.locator("#plain").evaluate((el) => {
      el.style.width = "100%";
      el.readOnly = false;
      el.removeAttribute("maxlength");
      el.onclick = null;
      el.value = "KEEP ORIGINAL";
    });
    await page.locator("#plain").evaluate(setup);
    await open();
    await target("#plain");
    await preview();
    assert.equal(
      await panel().locator("#insert").isEnabled(),
      false,
      `${kind}: ${await message()}`,
    );
    // Read-only/selection failure may be reported at field capture.
    assert(
      (await message()).includes(expected) ||
        (await message()).includes("Click inside"),
      `${kind}: ${await message()}`,
    );
    assert.equal(await page.locator("#plain").inputValue(), "KEEP ORIGINAL");
    await panel().locator("#close").click();
  }
  report.checks.push(
    "width, maxlength, readonly, selected text rejected without changing draft",
  );
  await page.locator("#plain").evaluate((el) => {
    el.style.width = "100%";
    el.readOnly = false;
    el.removeAttribute("maxlength");
    el.onclick = null;
    el.value = "KEEP\n";
  });
  await open();
  await target("#plain");
  await preview();
  await page.locator("#plain").evaluate((el) => (el.value += "changed"));
  await panel().locator("#insert").click();
  assert((await message()).includes("changed"));
  assert.equal(await page.locator("#plain").inputValue(), "KEEP\nchanged");
  await panel().locator("#close").click();
  await open();
  await target("#plain");
  await preview();
  await page.locator("#plain").evaluate((el) =>
    el.addEventListener("beforeinput", (e) => e.preventDefault(), {
      once: true,
    }),
  );
  await panel().locator("#insert").click();
  assert((await message()).includes("declined"));
  assert.equal(await page.locator("#plain").inputValue(), "KEEP\nchanged");
  await panel().locator("#close").click();
  report.checks.push(
    "changed draft and cancellable beforeinput veto prevent insertion",
  );
  // Reinvoking the extension must show the newly selected recipe, not a stale panel.
  await open();
  await panel()
    .locator("#recipe")
    .selectOption("00000000-0000-4000-8000-000000000001");
  await open();
  assert.equal(await panel().count(), 1);
  assert.equal(
    await panel().locator("#recipe").inputValue(),
    "00000000-0000-4000-8000-000000000000",
    "Reopening retained the previous recipe instead of the new invocation",
  );
  await panel().locator("#close").click();
  for (const change of ["font", "cursor", "readonly"]) {
    await page.locator("#plain").evaluate((el) => {
      el.value = "KEEP ORIGINAL\n";
      el.style.fontFeatureSettings = "normal";
      el.readOnly = false;
    });
    await open();
    await target("#plain");
    await preview();
    assert.equal(
      await panel().locator("#insert").isEnabled(),
      true,
      await message(),
    );
    if (change === "font")
      await page
        .locator("#plain")
        .evaluate((el) => (el.style.fontFeatureSettings = '"liga" 0'));
    else
      await page.locator("#plain").evaluate((el, change) => {
        el.addEventListener(
          "beforeinput",
          () => {
            if (change === "readonly") el.readOnly = true;
            else {
              const other = document.createElement("textarea");
              other.id = "other-draft";
              other.value = "OTHER DRAFT";
              document.body.append(other);
              other.focus();
            }
          },
          { once: true },
        );
      }, change);
    await panel().locator("#insert").click();
    assert.equal(
      await page.locator("#plain").inputValue(),
      "KEEP ORIGINAL\n",
      change,
    );
    assert.equal(
      await panel().locator("#insert").isEnabled(),
      false,
      await message(),
    );
    if (change === "cursor") {
      assert.equal(
        await page.locator("#other-draft").inputValue(),
        "OTHER DRAFT",
      );
      await page.locator("#other-draft").evaluate((el) => el.remove());
    }
    await panel().locator("#close").click();
  }
  report.checks.push(
    "reopening replaces stale recipe panel; font changes and insertion-event cursor/readonly changes leave drafts untouched",
  );
  await page.locator("#rich").evaluate((el) => {
    el.style.whiteSpace = "pre-wrap";
    el.innerHTML = '<p style="font-size:24px">KEEP NESTED TYPOGRAPHY</p>';
    el.onclick = () => {
      const range = document.createRange();
      range.selectNodeContents(el.firstChild);
      range.collapse(false);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
    };
  });
  await open();
  await target("#rich");
  await panel().locator("#mode").selectOption("plain");
  await preview();
  assert.equal(await panel().locator("#insert").isEnabled(), false);
  assert((await message()).includes("uniform typography"));
  assert.equal(
    await page.locator("#rich").innerText(),
    "KEEP NESTED TYPOGRAPHY",
  );
  await panel().locator("#close").click();
  report.checks.push(
    "plain rich-editor insertion refuses mismatched typography at the cursor rather than measuring the wrong font",
  );
  assert.deepEqual(errors, []);
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/insertion-browser.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}

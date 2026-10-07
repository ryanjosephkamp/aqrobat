import {
  plainText,
  textMetrics,
  formattedText,
  textDocument,
  textRtf,
  exportName,
  TEXT_LAYOUT,
} from "../src/text.mjs";
import {
  generate,
  fromRecipe,
  PRESETS,
  recipeKey,
  toSvg,
} from "../src/core.mjs";
import { render, htmlSheet } from "../src/render.mjs";
import {
  THEMES,
  ICON_COLORS,
  APPEARANCE_KEY,
  appearance,
  drawIcon,
} from "./appearance.mjs";

const $ = (id) => document.getElementById(id);
let current = null,
  records = [],
  cases = [],
  textOutput = null,
  metrics = null;
let savedForm = "",
  resultsDirty = false;
const formKey = () =>
  JSON.stringify(
    Array.from($("controls").elements).map((e) =>
      e.type === "checkbox" ? e.checked : e.value,
    ),
  );
function protectWork() {
  const dirty = formKey() !== savedForm || resultsDirty;
  $("unsaved").textContent = dirty
    ? "Unsaved work. Export your recipe and any scan results before leaving."
    : "";
  window.removeEventListener("beforeunload", preventLoss);
  if (dirty) window.addEventListener("beforeunload", preventLoss);
}
function preventLoss(e) {
  e.preventDefault();
  e.returnValue = "";
}
const saveName = (suffix) => exportName($("filename").value) + suffix;
const status = (message) => ($("status").textContent = message);
for (const [id, choices] of [
  ["theme", THEMES],
  ["icon-color", ICON_COLORS],
]) {
  for (const choice of choices) {
    const option = document.createElement("option");
    option.value = choice.id;
    option.textContent = choice.name;
    $(id).append(option);
  }
}
const extensionAppearance =
  location.protocol === "chrome-extension:" &&
  globalThis.chrome?.storage?.local;
function applyAppearance(value) {
  const settings = appearance(value);
  document.documentElement.dataset.theme = settings.theme;
  $("theme").value = settings.theme;
  $("icon-color").value = settings.icon;
  drawIcon($("icon-preview"), settings.icon);
  let favicon = document.querySelector('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.append(favicon);
  }
  favicon.type = "image/png";
  favicon.href = $("icon-preview").toDataURL("image/png");
  return settings;
}
applyAppearance(null);
// Persist appearance only; payloads and scan observations remain in this page.
try {
  const saved = extensionAppearance
    ? (await chrome.storage.local.get(APPEARANCE_KEY))[APPEARANCE_KEY]
    : JSON.parse(localStorage.getItem(APPEARANCE_KEY) || "null");
  applyAppearance(saved);
} catch {
  /* Storage may be unavailable, especially for local files. */
}
let saveAppearance = Promise.resolve();
for (const id of ["theme", "icon-color"])
  $(id).addEventListener("change", () => {
    const settings = applyAppearance({
      theme: $("theme").value,
      icon: $("icon-color").value,
    });
    saveAppearance = saveAppearance.then(async () => {
      try {
        if (extensionAppearance)
          await chrome.storage.local.set({ [APPEARANCE_KEY]: settings });
        else localStorage.setItem(APPEARANCE_KEY, JSON.stringify(settings));
      } catch {
        status(
          "Appearance changed for this page; preferences could not be saved.",
        );
      }
    });
  });
$("icon-hint").textContent = extensionAppearance
  ? "Icon color also updates your Aqrobat toolbar icon."
  : "Icon color previews the extension artwork and changes this tab’s icon. Set it inside the extension to change its toolbar icon.";
if (extensionAppearance)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[APPEARANCE_KEY])
      applyAppearance(changes[APPEARANCE_KEY].newValue);
  });
else
  window.addEventListener("storage", (e) => {
    if (e.key === APPEARANCE_KEY) {
      try {
        applyAppearance(JSON.parse(e.newValue));
      } catch {
        /* Ignore invalid preferences. */
      }
    }
  });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.querySelector(".appearance").open = false;
});
document.addEventListener("click", (e) => {
  const menu = document.querySelector(".appearance");
  if (!menu.contains(e.target)) menu.open = false;
});
function download(name, data, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
for (const { glyph, name } of PRESETS) {
  const option = document.createElement("option");
  option.value = glyph;
  option.textContent = `${glyph} / ${name}`;
  $("preset").append(option);
}
const custom = document.createElement("option");
custom.value = "custom";
custom.textContent = "Custom…";
$("preset").append(custom);
function options() {
  const [repeatX, repeatY] = $("density").value.split("x").map(Number);
  return {
    glyph: $("glyph").value,
    repeatX,
    repeatY,
    ecc: $("ecc").value,
    boost: $("boost").checked,
    width: Number($("width").value),
    font: $("font").value,
    stroke: $("thick").checked ? 0.1 : 0,
  };
}
function displaySize() {
  if (!current) return;
  const px = $("preview").getBoundingClientRect().width;
  $("metadata").textContent =
    `Version ${current.version} · ${current.modules} × ${current.modules} modules · ECC ${current.requestedEcc} requested / ${current.actualEcc} actual · ${current.recipe.options.width} px export / ${Math.round(px)} px on screen`;
  $("palette-info").textContent =
    `${current.palette.length} unique symbol${current.palette.length === 1 ? "" : "s"}. Cycle in entry order; repeats and spaces ignored.`;
}
function update() {
  try {
    current = generate($("payload").value, options());
    render($("preview"), current);
    textOutput = plainText(current);
    metrics = textMetrics(current);
    $("raw").value = textOutput.text;
    $("raw").rows = textOutput.rows.length + 1;
    $("raw").style.fontFamily =
      current.recipe.options.font === "monospace"
        ? "monospace"
        : `"${current.recipe.options.font}", "Apple Color Emoji", monospace`;
    $("formatted-preview").innerHTML = formattedText(current, metrics);
    $("text-info").textContent =
      `${textOutput.rows.length} rows. ${textOutput.mixed ? "Mixed-width packing: 5 narrow or 3 wide characters per module, 3 rows (scaled for higher density)." : `${textOutput.across} across × ${textOutput.down} rows per module; ${textOutput.blank === " " ? "ordinary" : "full-width"} blanks.`} Text density adapts for normal line spacing; image density stays as selected.`;
    fitText();
    $("error").textContent = "";
    $("bytes").textContent =
      `${current.utf8Bytes} / 1024 UTF-8 bytes. Nothing gets shortened.`;
    displaySize();
    document
      .querySelectorAll(".exports button")
      .forEach((b) => (b.disabled = false));
    return true;
  } catch (error) {
    current = null;
    $("preview").width = $("preview").height = 0;
    $("raw").value = "";
    $("formatted-preview").replaceChildren();
    $("metadata").textContent = "";
    $("palette-info").textContent = "";
    $("error").textContent = error.message;
    document
      .querySelectorAll(".exports button")
      .forEach((b) => (b.disabled = true));
    return false;
  }
}
function loadRecipe(value) {
  const qr = fromRecipe(value),
    o = qr.recipe.options;
  $("payload").value = qr.recipe.payload;
  $("glyph").value = o.glyph;
  $("preset").value = PRESETS.some((p) => p.glyph === o.glyph)
    ? o.glyph
    : "custom";
  const density = `${o.repeatX}x${o.repeatY}`;
  if (!Array.from($("density").options).some((v) => v.value === density)) {
    const opt = document.createElement("option");
    opt.value = density;
    opt.textContent = `${o.repeatX} across × ${o.repeatY} rows`;
    $("density").append(opt);
  }
  $("density").value = density;
  $("width").value = $("size").value = o.width;
  $("font").value = o.font;
  $("ecc").value = o.ecc;
  $("thick").checked = !!o.stroke;
  $("boost").checked = o.boost;
  update();
}
$("controls").addEventListener("submit", (e) => {
  e.preventDefault();
  if (update()) status("Generated locally. Scan status: untested.");
});
$("preset").addEventListener("change", () => {
  if ($("preset").value !== "custom") {
    $("glyph").value = $("preset").value;
    $("density").value = /^[\x21-\x7e█]$/.test($("glyph").value)
      ? "4x2"
      : "1x1";
  }
  update();
});
$("glyph").addEventListener("input", () => {
  $("preset").value = PRESETS.some((p) => p.glyph === $("glyph").value)
    ? $("glyph").value
    : "custom";
  update();
});
$("size").addEventListener("input", () => {
  $("width").value = $("size").value;
  update();
});
$("width").addEventListener("input", () => {
  $("size").value = $("width").value;
  update();
});
for (const id of ["payload", "density", "font", "ecc", "boost", "thick"])
  $(id).addEventListener(id === "payload" ? "input" : "change", update);
new ResizeObserver(() => {
  displaySize();
  fitText();
}).observe($("preview"));
new ResizeObserver(fitText).observe($("raw").parentElement);
$("controls").addEventListener("input", protectWork);
$("controls").addEventListener("change", protectWork);
$("copy").addEventListener("click", async () => {
  if (!current) return;
  try {
    await navigator.clipboard.writeText(textOutput.text);
    status(
      "Copied. Preserve spacing and use a monospace font; copied-text scanning is unverified.",
    );
  } catch {
    $("raw").closest("details").open = true;
    $("raw").focus();
    $("raw").select();
    status(
      "Clipboard unavailable. The text is selected below for manual copying.",
    );
  }
});
$("txt").addEventListener(
  "click",
  () => current && download(saveName(".txt"), textOutput.text),
);
$("recipe").addEventListener("click", () => {
  if (!current) return;
  download(
    saveName("-recipe.json"),
    JSON.stringify(current.recipe, null, 2) + "\n",
    "application/json",
  );
  savedForm = formKey();
  protectWork();
});
$("svg").addEventListener("click", () => {
  if (current) {
    download(saveName(".svg"), toSvg(current), "image/svg+xml");
    status(
      "SVG exported. Its appearance depends on fonts; it may differ from this canvas.",
    );
  }
});
$("png").addEventListener("click", () => {
  if (!current) return;
  const name = saveName(".png");
  $("preview").toBlob((blob) => {
    if (blob) {
      download(name, blob, "image/png");
      status(
        "PNG exported with the artwork shown here. This recipe remains untested.",
      );
    }
  }, "image/png");
});
$("html").addEventListener("click", () => {
  if (current)
    download(
      saveName("-print.html"),
      htmlSheet(current, $("preview").toDataURL("image/png"), textOutput.text),
      "text/html;charset=utf-8",
    );
});
async function readJson(input, limit) {
  const file = input.files[0];
  if (!file) throw new Error("Choose a JSON file.");
  if (file.size > limit) throw new Error("File exceeds the import size limit.");
  return JSON.parse(await file.text());
}
$("import-recipe").addEventListener("change", async () => {
  try {
    loadRecipe(await readJson($("import-recipe"), 20_000));
    savedForm = formKey();
    protectWork();
    status("Recipe loaded locally; its scan status is untested.");
  } catch (error) {
    status(`Recipe not loaded: ${error.message}`);
  }
  $("import-recipe").value = "";
});

const outcomes = ["untested", "pass", "fail", "conditional"];
function lastResult(recipe, output = "image") {
  return [...records]
    .reverse()
    .find(
      (r) =>
        recipeKey(r.recipe) === recipeKey(recipe) &&
        (r.output || "image") === output &&
        (output === "image" || r.layout === TEXT_LAYOUT),
    );
}
function record(recipe, outcome, width, output = "image") {
  if (!$("scanner").value.trim())
    throw new Error("Name the phone/scanner before recording a result.");
  if (records.length >= 1000)
    throw new Error(
      "Result limit reached; export a backup before starting a new page.",
    );
  records.push({
    schema: "aqrobat-observation-v1",
    id: crypto.randomUUID(),
    time: new Date().toISOString(),
    recipe,
    output,
    layout: output === "plain-text" ? TEXT_LAYOUT : "aqrobat-image-v1",
    outcome,
    scanner: $("scanner").value,
    conditions: $("conditions").value,
    displayWidthPx: Math.round(width),
    browser: navigator.userAgent.slice(0, 400),
  });
  resultsDirty = true;
  protectWork();
}
function buildGrid() {
  $("grid").replaceChildren();
  $("text-grid").replaceChildren();
  for (const output of $("compare-text").checked
    ? ["image", "plain-text"]
    : ["image"])
    for (const qr of cases) {
      const o = qr.recipe.options,
        card = document.createElement("article");
      card.className = "test-card";
      card.dataset.output = output;
      const title = document.createElement("h3");
      title.textContent = `${output === "image" ? "Image" : "Plain text"} · ${o.glyph} · ${o.repeatX}×${o.repeatY} · ${o.font} · ${o.width}px`;
      const canvas = document.createElement("canvas");
      canvas.setAttribute("aria-label", title.textContent);
      let art = canvas;
      if (output === "image") render(canvas, qr);
      else {
        art = document.createElement("pre");
        art.className = "comparison-text";
        const packed = plainText(qr);
        art.textContent = packed.text;
        art.style.fontFamily = fontFamilyForText(o.font);
        art.dataset.targetWidth = o.width;
      }
      const info = document.createElement("p");
      info.className = "hint";
      info.textContent = `Expected: ${qr.recipe.payload}. ECC ${qr.requestedEcc} → ${qr.actualEcc}; ink ${o.stroke ? "thickened" : "plain"}. Pass = exact intended payload recovered. Print: 65 mm.`;
      const select = document.createElement("select");
      select.setAttribute("aria-label", `Scan result for ${title.textContent}`);
      for (const outcome of outcomes) {
        const opt = document.createElement("option");
        opt.value = outcome;
        opt.textContent = outcome[0].toUpperCase() + outcome.slice(1);
        select.append(opt);
      }
      const previous = lastResult(qr.recipe, output);
      select.value = previous?.outcome || "untested";
      card.dataset.outcome = select.value;
      select.addEventListener("change", () => {
        try {
          record(
            qr.recipe,
            select.value,
            art.getBoundingClientRect().width,
            output,
          );
          card.dataset.outcome = select.value;
          status(
            `Recorded ${records.length} observations in this page. Export a backup to keep them.`,
          );
        } catch (error) {
          select.value = card.dataset.outcome;
          status(error.message);
        }
      });
      card.append(title, art, info, select);
      if (output === "plain-text") {
        const button = document.createElement("button");
        button.textContent = "Save this TXT";
        button.addEventListener("click", () =>
          download(
            saveName(
              `-text-${o.repeatX}x${o.repeatY}-${o.font.replaceAll(" ", "")}-${o.width}.txt`,
            ),
            plainText(qr).text,
          ),
        );
        card.append(button);
      }
      $(output === "image" ? "grid" : "text-grid").append(card);
      if (output === "plain-text") sizePre(art, o.width);
    }
}
$("compare").addEventListener("click", () => {
  if (!update()) return;
  ((cases = []), (textOutput = null), (metrics = null));
  let savedForm = "",
    resultsDirty = false;
  const formKey = () =>
    JSON.stringify(
      Array.from($("controls").elements).map((e) =>
        e.type === "checkbox" ? e.checked : e.value,
      ),
    );
  function protectWork() {
    const dirty = formKey() !== savedForm || resultsDirty;
    $("unsaved").textContent = dirty
      ? "Unsaved work. Export your recipe and any scan results before leaving."
      : "";
    window.removeEventListener("beforeunload", preventLoss);
    if (dirty) window.addEventListener("beforeunload", preventLoss);
  }
  function preventLoss(e) {
    e.preventDefault();
    e.returnValue = "";
  }
  const saveName = (suffix) => exportName($("filename").value) + suffix;
  for (const [repeatX, repeatY] of [
    [2, 1],
    [4, 2],
  ])
    for (const font of ["Menlo", "Courier New"])
      for (const width of [328, 492, 656])
        cases.push(
          generate(current.recipe.payload, {
            ...current.recipe.options,
            repeatX,
            repeatY,
            font,
            width,
          }),
        );
  buildGrid();
  status(
    "Built 12 comparisons. Their on-screen size depends on the grid width; exports retain the recipe size.",
  );
});
$("compare-text").addEventListener("change", buildGrid);
$("export-results").addEventListener("click", () => {
  download(
    saveName("-results.json"),
    JSON.stringify({ schema: "aqrobat-results-v1", records }, null, 2) + "\n",
    "application/json",
  );
  resultsDirty = false;
  protectWork();
});
$("import-results").addEventListener("change", async () => {
  try {
    const data = await readJson($("import-results"), 10_000_000);
    if (
      data.schema !== "aqrobat-results-v1" ||
      !Array.isArray(data.records) ||
      data.records.length > 1000
    )
      throw new Error("Not a bounded Aqrobat results file.");
    const next = [...records],
      seen = new Map(records.map((r) => [r.id, JSON.stringify(r)]));
    for (const r of data.records) {
      fromRecipe(r.recipe);
      if (
        r.schema !== "aqrobat-observation-v1" ||
        !outcomes.includes(r.outcome) ||
        (r.output !== undefined &&
          !["image", "plain-text"].includes(r.output)) ||
        (r.output === "plain-text" && r.layout !== TEXT_LAYOUT) ||
        !Number.isFinite(Date.parse(r.time)) ||
        typeof r.id !== "string" ||
        !/^[\w-]{1,80}$/.test(r.id) ||
        ["scanner", "conditions", "browser"].some(
          (k) => typeof r[k] !== "string" || r[k].length > 600,
        ) ||
        !Number.isInteger(r.displayWidthPx) ||
        r.displayWidthPx < 1 ||
        r.displayWidthPx > 4096
      )
        throw new Error("Invalid observation; import was not applied.");
      const text = JSON.stringify(r);
      if (seen.has(r.id)) {
        if (seen.get(r.id) !== text)
          throw new Error(
            "Conflicting observation ID; import was not applied.",
          );
      } else {
        next.push(r);
        seen.set(r.id, text);
      }
    }
    if (next.length > 1000)
      throw new Error("Merged results would exceed 1000 observations.");
    records = next;
    buildGrid();
    status(
      `Imported locally. ${records.length} total observations. These are user reports, not independent verification.`,
    );
  } catch (error) {
    status(`Results not imported: ${error.message}`);
  }
  $("import-results").value = "";
});
$("print-grid").addEventListener("click", () => {
  if (!cases.length) {
    status("Build comparisons before printing.");
    return;
  }
  window.print();
});

update();
savedForm = formKey();
protectWork();
// Extension transfers chosen text in session storage; the URL contains only a
// one-time random key, never the payload. No web page receives extension data.
const handoff = new URLSearchParams(location.hash.slice(1)).get("handoff");
if (
  handoff &&
  globalThis.chrome?.storage?.session &&
  /^[\w-]{36}$/.test(handoff)
) {
  history.replaceState(null, "", location.pathname);
  const key = `aqrobat:${handoff}`;
  const stored = await chrome.storage.session.get(key);
  await chrome.storage.session.remove(key);
  if (stored[key] && Date.now() - stored[key].time < 60_000) {
    $("payload").value = stored[key].payload;
    update();
    protectWork();
    status(
      "Selected content received locally from your explicit extension action.",
    );
  }
}

function fontFamilyForText(font) {
  return font === "monospace"
    ? "monospace"
    : `"${font}", "Apple Color Emoji", monospace`;
}
function sizePre(pre, width) {
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.font = `700 100px ${pre.style.fontFamily}`;
  const max = Math.max(
    ...pre.textContent
      .trimEnd()
      .split("\n")
      .map((row) => ctx.measureText(row).width),
  );
  const target = Math.min(width, pre.parentElement.clientWidth - 2);
  pre.style.setProperty("--text-span", String(max / 100));
  pre.style.fontSize = `${Math.max(0.5, (target * 100) / Math.max(1, max))}px`;
}
function fitText() {
  if (!current || !textOutput) return;
  const raw = $("raw"),
    ctx = document.createElement("canvas").getContext("2d");
  ctx.font = `700 100px ${raw.style.fontFamily}`;
  const max = Math.max(
    ...textOutput.rows.map((row) => ctx.measureText(row).width),
  );
  const fs = Math.max(0.5, ((raw.parentElement.clientWidth - 26) * 100) / max);
  raw.style.fontSize = `${fs}px`;
  raw.style.lineHeight = "1.2";
  raw.style.height = `${Math.ceil((textOutput.rows.length + 1) * fs * 1.2 + 28)}px`;
  const holder = $("formatted-preview"),
    child = holder.firstElementChild;
  if (child) {
    const scale = Math.min(
      1,
      holder.parentElement.clientWidth / current.recipe.options.width,
    );
    child.style.transformOrigin = "top left";
    child.style.transform = `scale(${scale})`;
    holder.style.height = `${current.recipe.options.width * scale + 20}px`;
  }
  for (const pre of document.querySelectorAll(".comparison-text"))
    sizePre(pre, Number(pre.dataset.targetWidth));
}
$("copy-formatted").addEventListener("click", async () => {
  if (!current) return;
  const html = formattedText(current, metrics),
    text = textOutput.text;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([text], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      }),
    ]);
    status(
      "Formatted text copied. Paste into a rich text editor; scan that pasted result. Plain-only editors receive the spaced TXT version.",
    );
  } catch {
    status(
      "Formatted clipboard unavailable. Download Text HTML or RTF, or use Copy text for plain text.",
    );
  }
});
$("snippet").addEventListener("click", async () => {
  if (!current) return;
  try {
    await navigator.clipboard.writeText(formattedText(current, metrics));
    status(
      "Website HTML copied. Paste into an HTML/code block that preserves inline styles.",
    );
  } catch {
    status("Clipboard unavailable. Download Text HTML instead.");
  }
});
$("text-html").addEventListener(
  "click",
  () =>
    current &&
    download(
      saveName("-text.html"),
      textDocument(current, metrics),
      "text/html;charset=utf-8",
    ),
);
$("rtf").addEventListener(
  "click",
  () =>
    current &&
    download(saveName(".rtf"), textRtf(current, metrics), "application/rtf"),
);

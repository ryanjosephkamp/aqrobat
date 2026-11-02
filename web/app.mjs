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
  parsePalette,
  recipeKey,
  toSvg,
} from "../src/core.mjs";
import { render, htmlSheet } from "../src/render.mjs";
import { LIBRARY_KEY, readLibrary } from "../src/library.mjs";
import {
  tileText,
  blockText,
  pasteText,
  wideGlyph,
  SQUARES,
  DARK_TILES,
  CORNER_TILE,
  TILES_LAYOUT,
  BLOCKS_LAYOUT,
} from "../src/portable.mjs";
import {
  DESTINATIONS,
  FORMATS,
  destination,
  clipboardFor,
  pasteCheck,
  characterCount,
} from "../src/destinations.mjs";
import { THEMES, APPEARANCE_KEY, appearance } from "./appearance.mjs";
import {
  openPicker,
  loadEmoji,
  knownLightness,
  TOO_LIGHT,
  TOO_DARK,
} from "./emoji-picker.mjs";

const $ = (id) => document.getElementById(id);
let current = null,
  records = [],
  cases = [],
  pasteCase = null,
  textOutput = null,
  selectable = null,
  metrics = null,
  copy = null;
let savedForm = "",
  resultsDirty = false;
const PREFERENCES_KEY = "aqrobat-preferences-v1";
const preferences = { destination: "gmail", tile: "⬛" };
try {
  const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "{}");
  if (DESTINATIONS.some((d) => d.id === saved.destination))
    preferences.destination = saved.destination;
  if (DARK_TILES.includes(saved.tile)) preferences.tile = saved.tile;
} catch {
  /* Storage may be unavailable, especially for local files. */
}
function savePreferences() {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    /* A remembered destination is a convenience only. */
  }
}
const formKey = () =>
  JSON.stringify([
    ...Array.from($("controls").elements).map((e) =>
      e.type === "checkbox" ? e.checked : e.value,
    ),
    partsChosen && parts,
  ]);
function protectWork() {
  const dirty = formKey() !== savedForm || resultsDirty;
  $("unsaved").textContent = dirty
    ? "Unsaved changes. Save the recipe, and export any scan results, before you leave."
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

// Appearance: the theme, stored automatically.
for (const [id, choices] of [["theme", THEMES]]) {
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
  // The phone's browser bar follows the page: the media defaults for System,
  // the chosen theme's background otherwise.
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue("--bg")
    .trim();
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.dataset.color ??= meta.content;
    meta.content = settings.theme === "system" ? meta.dataset.color : bg;
  }
  $("theme").value = settings.theme;
  return settings;
}
applyAppearance(null);
try {
  const saved = extensionAppearance
    ? (await chrome.storage.local.get(APPEARANCE_KEY))[APPEARANCE_KEY]
    : JSON.parse(localStorage.getItem(APPEARANCE_KEY) || "null");
  applyAppearance(saved);
} catch {
  /* Storage may be unavailable, especially for local files. */
}
let saveAppearance = Promise.resolve();
for (const id of ["theme"])
  $(id).addEventListener("change", () => {
    const settings = applyAppearance({ theme: $("theme").value });
    saveAppearance = saveAppearance.then(async () => {
      try {
        if (extensionAppearance)
          await chrome.storage.local.set({ [APPEARANCE_KEY]: settings });
        else localStorage.setItem(APPEARANCE_KEY, JSON.stringify(settings));
      } catch {
        status("Appearance changed for this page but could not be saved.");
      }
    });
  });
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
const menus = () => document.querySelectorAll("details.menu");
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") for (const menu of menus()) menu.open = false;
});
document.addEventListener("click", (e) => {
  for (const menu of menus()) if (!menu.contains(e.target)) menu.open = false;
});

function download(name, data, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Character presets and destinations are buttons, so choosing one is a
// single click and the current choice is announced.
function chip(label, title, value) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.textContent = label;
  button.title = title;
  button.dataset.value = value;
  return button;
}
// Parts: a character for the corner frames, corner centers, or light
// squares. Empty follows the code, or leaves the light squares blank. Until
// someone chooses a part, emoji other than the squares get ⬛ corners, which
// a camera needs to find them in apps such as Gmail.
const PART_NAMES = {
  corners: "Corner frames",
  centers: "Corner centers",
  light: "Light squares",
};
let parts = { corners: "", centers: "", light: "" },
  partsChosen = false;
const needsCorners = (palette) =>
  palette.every(wideGlyph) && !palette.every((g) => DARK_TILES.includes(g));
function automaticParts(palette) {
  return needsCorners(palette)
    ? { corners: CORNER_TILE, centers: CORNER_TILE, light: "" }
    : { corners: "", centers: "", light: "" };
}
/** The parts option for generate(), or undefined for a code without parts. */
function chosenParts() {
  let palette;
  try {
    palette = parsePalette($("glyph").value);
  } catch {
    return undefined;
  }
  const p = partsChosen ? parts : automaticParts(palette);
  // Emoji codes always say what their corners are, so an empty choice
  // turns the automatic ⬛ corners off.
  return Object.values(p).some(Boolean) || needsCorners(palette)
    ? { ...p }
    : undefined;
}
function setPart(part, glyph) {
  if (!partsChosen) {
    try {
      parts = automaticParts(parsePalette($("glyph").value));
    } catch {
      /* An invalid palette has no automatic parts to keep. */
    }
    partsChosen = true;
  }
  parts[part] = glyph;
  update();
  protectWork();
}
$("parts-reset").addEventListener("click", () => {
  partsChosen = false;
  parts = { corners: "", centers: "", light: "" };
  update();
  protectWork();
  $("glyph").focus();
});
function renderParts() {
  const p = current?.recipe.options.parts ?? {};
  for (const part of Object.keys(PART_NAMES)) {
    const button = $(`part-${part}`),
      glyph = p[part] ?? "";
    // Following the code shows what will appear there, faded.
    const shown =
      glyph ||
      (part === "light"
        ? (current && pasteText(current).light) || ""
        : (current?.palette[0] ?? ""));
    const label = glyph ? "" : part === "light" ? "Blank" : "Same as code";
    button.replaceChildren();
    if (shown) {
      const g = document.createElement("span");
      g.className = "part-glyph";
      g.textContent = shown;
      button.append(g);
    }
    if (label) {
      const t = document.createElement("span");
      t.className = "part-follow";
      t.textContent = label;
      button.append(t);
    }
    button.dataset.follow = String(!glyph);
    button.setAttribute(
      "aria-label",
      `${PART_NAMES[part]}: ${glyph || label}. Change`,
    );
    button.disabled = !current;
  }
  $("parts-reset").hidden = !partsChosen;
}
for (const part of Object.keys(PART_NAMES))
  $(`part-${part}`).addEventListener("click", (e) =>
    openPicker({
      anchor: e.currentTarget,
      title: PART_NAMES[part],
      mode: part === "light" ? "light" : "dark",
      choices: [
        { label: part === "light" ? "Blank" : "Same as code", value: "" },
      ],
      suggested: part === "light" ? ["▫️", "🤍", "◽", "⬜", "☁️"] : DARK_TILES,
      current: current?.recipe.options.parts?.[part] ?? "",
      onPick: (glyph) => setPart(part, glyph),
    }),
  );
$("glyph-emoji").addEventListener("click", (e) =>
  openPicker({
    anchor: e.currentTarget,
    title: "Characters",
    onPick: (glyph) => glyph && useCharacters(glyph),
  }),
);
function useCharacters(glyph) {
  $("glyph").value = glyph;
  $("density").value = /^[\x21-\x7e█]$/.test(glyph) ? "4x2" : "1x1";
  // The last square color picked is the one "Use emoji squares" offers.
  if (DARK_TILES.includes(glyph)) {
    preferences.tile = glyph;
    savePreferences();
  }
  update();
  protectWork();
}
for (const [group, list] of [
  ["squares", SQUARES],
  ["presets", PRESETS],
])
  for (const { glyph, name } of list) {
    const button = chip(glyph, name, glyph);
    button.setAttribute("aria-label", name);
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => useCharacters(glyph));
    $(group).append(button);
  }
function markPreset() {
  for (const button of [...$("squares").children, ...$("presets").children])
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.value === $("glyph").value),
    );
}
for (const d of DESTINATIONS) {
  const button = chip(d.name, FORMATS[d.format].name, d.id);
  button.setAttribute("role", "radio");
  button.addEventListener("click", () => chooseDestination(d.id));
  $("destinations").append(button);
}
function chooseDestination(id) {
  preferences.destination = id;
  savePreferences();
  update();
  showTab(destination(id).format === "png" ? "image" : "pasted");
}
function markDestination() {
  const d = destination(preferences.destination);
  for (const button of $("destinations").children) {
    const on = button.dataset.value === d.id;
    button.setAttribute("aria-checked", String(on));
    button.tabIndex = on ? 0 : -1;
  }
  $("destination-note").textContent = FORMATS[d.format].note;
  $("copy-label").textContent =
    d.format === "png" ? "Copy image" : `Copy for ${d.name}`;
  $("dock-title").textContent = d.name;
  $("dock-format").textContent = FORMATS[d.format].name;
  $("dock-peek").setAttribute(
    "aria-label",
    `Show the preview: ${d.name}, ${FORMATS[d.format].name}`,
  );
  for (const row of $("guide-rows").children)
    row.classList.toggle("current", row.dataset.id === d.id);
}
// Arrow keys move within a radio group, as in native radio buttons.
for (const group of [$("destinations")])
  group.addEventListener("keydown", (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
      e.key
    ];
    if (!step) return;
    e.preventDefault();
    const buttons = [...group.children],
      index = buttons.indexOf(document.activeElement),
      next = buttons[(index + step + buttons.length) % buttons.length];
    next.click();
    next.focus();
  });
for (const d of DESTINATIONS) {
  const row = document.createElement("tr");
  row.dataset.id = d.id;
  for (const text of [d.name, FORMATS[d.format].name, d.how]) {
    const cell = document.createElement("td");
    cell.textContent = text;
    row.append(cell);
  }
  $("guide-rows").append(row);
}

function showTab(which) {
  for (const [tab, panel, name] of [
    ["tab-pasted", "pasted-panel", "pasted"],
    ["tab-image", "image-panel", "image"],
  ]) {
    $(tab).setAttribute("aria-selected", String(which === name));
    $(tab).tabIndex = which === name ? 0 : -1;
    $(panel).hidden = which !== name;
  }
  fitText();
}
$("tab-pasted").addEventListener("click", () => showTab("pasted"));
$("tab-image").addEventListener("click", () => showTab("image"));
$("tab-pasted").parentElement.addEventListener("keydown", (e) => {
  if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
  const next = $("tab-pasted").ariaSelected === "true" ? "image" : "pasted";
  showTab(next);
  $(next === "image" ? "tab-image" : "tab-pasted").focus();
});

function options() {
  const [repeatX, repeatY] = $("density").value.split("x").map(Number);
  const o = {
    glyph: $("glyph").value,
    repeatX,
    repeatY,
    ecc: $("ecc").value,
    boost: $("boost").checked,
    width: Number($("width").value),
    font: $("font").value,
    stroke: $("thick").checked ? 0.1 : 0,
  };
  const p = chosenParts();
  if (p) o.parts = p;
  return o;
}
function fontFamilyForText(font) {
  return font === "monospace"
    ? "monospace"
    : `"${font}", "Apple Color Emoji", monospace`;
}
function displaySize() {
  if (!current) return;
  $("metadata").textContent =
    `Version ${current.version} · ${current.modules} × ${current.modules} squares · error correction ${current.actualEcc}${current.actualEcc === current.requestedEcc ? "" : ` (asked for ${current.requestedEcc})`}`;
  $("palette-info").textContent =
    `${current.palette.length} unique symbol${current.palette.length === 1 ? "" : "s"}. Several symbols take turns in the order typed; spaces and repeats are ignored.`;
}
function renderPastePreview() {
  const holder = $("paste-preview");
  holder.replaceChildren();
  holder.style.height = "";
  const d = destination(preferences.destination);
  if (copy.format === "formatted") {
    holder.innerHTML = copy.html;
  } else if (copy.format === "png") {
    const image = new Image();
    image.src = $("preview").toDataURL("image/png");
    image.alt = "The image that Copy image puts on the clipboard";
    holder.append(image);
  } else {
    const pre = document.createElement("pre");
    const code = ["markdown", "blocks"].includes(copy.format);
    pre.textContent = copy.text;
    pre.dataset.format = copy.format;
    // Plain text is shown in an ordinary app font, so letters that need a
    // monospace font show the misalignment they will have once pasted.
    pre.style.fontFamily = code
      ? "Menlo, Consolas, monospace"
      : "system-ui, sans-serif";
    pre.style.lineHeight = code ? "1.2" : "1.25";
    holder.append(pre);
  }
  const lines = [];
  if (copy.format === "formatted")
    lines.push(
      `Formatted text, ${current.recipe.options.width} px wide. Apps that drop formatting get the plain text under Select the text yourself`,
    );
  else if (copy.format === "png")
    lines.push(
      `PNG image, ${current.recipe.options.width} px wide. Image and As pasted show the same picture`,
    );
  else {
    const count = characterCount(copy.text);
    lines.push(
      `${count.toLocaleString("en-US")} characters, ${copy.text.replace(/\n$/, "").split("\n").length} lines`,
    );
    if (d.limit && count > d.limit)
      lines.push(
        `Longer than ${d.name}'s ${d.limit.toLocaleString("en-US")}-character limit. Use a shorter link or an image.`,
      );
  }
  if (copy.format === "plain")
    lines.push("Shown at 1.25 line spacing; your app's spacing may differ");
  $("paste-info").textContent = lines.join(" · ");
  renderPasteCheck(d);
}
// How light an emoji draws, from 0 (black) to 1 (white), averaged over its
// square: measured in Gmail's Noto emoji for emoji on the picker's list, and
// in this device's emoji font for anything else.
const lightness = new Map();
const lightnessOf = (glyph) =>
  knownLightness(glyph) ?? measuredLightness(glyph);
function measuredLightness(glyph) {
  if (!lightness.has(glyph)) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 64, 64);
    ctx.font =
      '54px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.fillText(glyph, 32, 34);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4)
      sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    lightness.set(glyph, sum / (255 * 64 * 64));
  }
  return lightness.get(glyph);
}
// Every copy uses the code's own characters. Characters nobody has
// scan-tested in this destination still copy, with a plain warning and a
// one-tap fix: dark corners, or the tested emoji squares.
function renderPasteCheck(d) {
  const { tested, ok } = pasteCheck(current, d.id),
    box = $("paste-check"),
    p = current.recipe.options.parts ?? {},
    paste = pasteText(current),
    emoji = (g) => wideGlyph(g) && !DARK_TILES.includes(g);
  // The dark characters, corners included, and the light squares' one.
  const dark = current.glyphs.filter((g) => g !== current.light),
    light = dark.filter((g) => emoji(g) && lightnessOf(g) > TOO_LIGHT),
    blank = paste.light && emoji(paste.light) ? paste.light : null,
    tooDark = blank && lightnessOf(blank) < TOO_DARK,
    // A camera finds emoji codes by solid corners: in the simulation,
    // emoji squares worked there in any color, and the code's own emoji
    // did not.
    plainCorners =
      paste.emoji &&
      needsCorners(current.palette) &&
      !paste.corners &&
      ["corners", "centers"].some((part) => !DARK_TILES.includes(p[part]));
  box.hidden = ok && !light.length && !tooDark && !plainCorners;
  if (box.hidden) return box.replaceChildren();
  const choice = tested ?? FORMATS.plain.tested;
  const lead = document.createElement("strong");
  const fix = document.createElement("button");
  fix.type = "button";
  fix.className = "link-button";
  let why;
  if (light.length) {
    lead.textContent = "Likely too light to scan. ";
    why = `${light.join(" ")} ${light.length === 1 ? "is" : "are"} mostly light, so a phone can't tell ${light.length === 1 ? "it" : "them"} from the blank squares. Darker emoji, such as 🍇 or 🖤, scan better.`;
  } else if (tooDark) {
    lead.textContent = "Light squares may be too dark. ";
    why = `A camera needs the light squares nearly white; ${blank} is darker than that. ▫️ and 🤍 work.`;
  } else if (plainCorners) {
    lead.textContent = "The corners may not be found. ";
    why =
      "A camera finds an emoji code by its three corners. In a simulation of Gmail, 🍇 codes scanned with emoji-square corners in any color, and not without them.";
    fix.textContent = "Use ⬛ corners";
    // With the light squares left blank, that is the automatic choice.
    fix.addEventListener("click", () => {
      if (p.light) {
        setPart("corners", CORNER_TILE);
        setPart("centers", CORNER_TILE);
      } else $("parts-reset").click();
    });
    return box.replaceChildren(lead, `${why} `, fix);
  } else {
    lead.textContent = "Experimental. ";
    why = paste.emoji
      ? `Dark emoji with dark corners, such as 🍇 and 🖤, scanned after pasting into Gmail on a phone. Other apps aren't tested yet.`
      : copy.format === "formatted"
        ? `On a computer, ${d.name} keeps the formatting, which may scan. On a phone it pastes plain text and closes up the spaces, so letters lose their shape.`
        : copy.format === "plain"
          ? "Letters and symbols line up only in a monospace font, and apps such as Gmail close up the spaces, so this code will likely not scan."
          : `These characters haven't been scan-tested in ${d.name}, so the pasted code may not line up or scan.`;
  }
  fix.textContent = `Use ${choice.name.toLowerCase()}`;
  fix.addEventListener("click", () => {
    partsChosen = false;
    parts = { corners: "", centers: "", light: "" };
    useCharacters(
      choice.glyphs.includes(preferences.tile)
        ? preferences.tile
        : choice.glyphs[0],
    );
  });
  box.replaceChildren(
    lead,
    `${why} ${choice.name} are the tested choice. `,
    fix,
  );
}
// "Select the text yourself" holds the same text the main copy writes, so
// selecting it by hand gives the same result when the clipboard is blocked.
function describeSelectable() {
  const plain = copy.format === "formatted" ? "Plain-text version: " : "";
  const fence = selectable.fence ? " inside a Markdown fence" : "";
  const p = selectable.corners
      ? { corners: CORNER_TILE, centers: CORNER_TILE }
      : (current.recipe.options.parts ?? {}),
    corners =
      p.corners && p.corners === p.centers
        ? ` and ${p.corners} corners`
        : [
            p.corners && ` and ${p.corners} corner frames`,
            p.centers && ` and ${p.centers} corner centers`,
          ]
            .filter(Boolean)
            .join("");
  return selectable.emoji
    ? `${plain}${selectable.rows.length} rows of emoji${fence}, with ${selectable.light} in the light squares${corners}. They line up in any font that shows emoji.`
    : `${plain}${selectable.rows.length} rows${fence}, two characters per square${selectable.light ? "" : " with spaces between"}. They keep their shape only in a monospace font.`;
}
function update() {
  try {
    current = generate($("payload").value, options());
    render($("preview"), current);
    textOutput = plainText(current);
    metrics = textMetrics(current);
    copy = clipboardFor(current, preferences.destination, metrics);
    const format = destination(preferences.destination).format;
    selectable = ["markdown", "blocks"].includes(format)
      ? pasteText(current, {
          quiet: current.quiet,
          fence: format === "markdown",
        })
      : pasteText(current);
    $("raw").value = selectable.text;
    $("raw").rows = selectable.text.replace(/\n$/, "").split("\n").length + 1;
    $("raw").style.fontFamily = fontFamilyForText(current.recipe.options.font);
    $("text-info").textContent = describeSelectable();
    $("error").textContent = "";
    for (const id of ["payload", "glyph"]) {
      $(id).removeAttribute("aria-invalid");
      $(`${id}-error`).textContent = "";
    }
    $("bytes").textContent =
      `${current.utf8Bytes} / 1024 bytes · never shortened`;
    displaySize();
    renderPastePreview();
    fitText();
    drawDockThumb();
    for (const b of document.querySelectorAll(
      ".actions button, .menu-list button",
    ))
      b.disabled = false;
    markPreset();
    markDestination();
    renderParts();
    // Lightness for the scan warning comes with the emoji list.
    if (current.glyphs.some((g) => wideGlyph(g) && !DARK_TILES.includes(g)))
      loadEmoji().then(
        () => current && renderPasteCheck(destination(preferences.destination)),
        () => {},
      );
    return true;
  } catch (error) {
    current = copy = selectable = null;
    $("preview").width = $("preview").height = 0;
    $("paste-check").hidden = true;
    drawDockThumb();
    $("raw").value = "";
    $("paste-preview").replaceChildren();
    $("paste-info").textContent = "";
    $("metadata").textContent = "";
    $("palette-info").textContent = "";
    $("error").textContent = error.message;
    // Show the problem on the field that caused it, too.
    let field = "payload";
    try {
      parsePalette($("glyph").value);
    } catch {
      field = "glyph";
    }
    for (const id of ["payload", "glyph"]) {
      $(id).toggleAttribute("aria-invalid", id === field);
      if (id === field) $(id).setAttribute("aria-invalid", "true");
      $(`${id}-error`).textContent = id === field ? error.message : "";
    }
    for (const b of document.querySelectorAll(
      ".actions button, .menu-list button",
    ))
      b.disabled = true;
    markPreset();
    markDestination();
    renderParts();
    return false;
  }
}
function loadRecipe(value) {
  const qr = fromRecipe(value),
    o = qr.recipe.options;
  $("payload").value = qr.recipe.payload;
  $("glyph").value = o.glyph;
  // Parts that match the automatic ones stay automatic.
  const loaded = { corners: "", centers: "", light: "", ...o.parts },
    auto = automaticParts(qr.palette);
  parts = loaded;
  partsChosen =
    !!o.parts &&
    Object.keys(PART_NAMES).some((part) => loaded[part] !== auto[part]);
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
  if (update()) status("Made in this browser. Scan status: untested.");
});
$("glyph").addEventListener("input", update);
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
new ResizeObserver(fitText).observe($("paste-preview").parentElement);
new ResizeObserver(fitText).observe($("raw").parentElement);
$("controls").addEventListener("input", protectWork);
$("controls").addEventListener("change", protectWork);

// Android passes a copy to the system in one message of at most about 1 MB,
// two bytes per character, and Chrome reports success even when the system
// refuses it. A Samsung phone refused a Gmail copy of about 860 KB. There,
// copies keep their HTML only below this many characters; phone apps such
// as Gmail paste the plain text anyway.
const ANDROID =
  navigator.userAgentData?.platform === "Android" ||
  /Android/i.test(navigator.userAgent);
const CLIPBOARD_LIMIT = ANDROID ? 200_000 : Infinity;
class TooLargeError extends Error {}
// Resolves to "plain" when it left the HTML out to fit.
async function writeClipboard({ html = null, text = null, png = null }) {
  if (html && html.length + text.length > CLIPBOARD_LIMIT) {
    await writeClipboard({ text });
    return "plain";
  }
  if (text && text.length > CLIPBOARD_LIMIT) throw new TooLargeError();
  if (png) {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
  } else if (html) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([text], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      }),
    ]);
  } else await navigator.clipboard.writeText(text);
}
function selectRaw(message) {
  $("raw").closest("details").open = true;
  $("raw").focus();
  $("raw").select();
  status(message);
}
const closeMenus = () => {
  for (const menu of menus()) menu.open = false;
};
async function copyForDestination() {
  if (!current) return false;
  const d = destination(preferences.destination);
  try {
    if (copy.format === "png") {
      const png = await new Promise((resolve) =>
        $("preview").toBlob(resolve, "image/png"),
      );
      await writeClipboard({ png });
      status("Image copied. Paste it, then scan the result before you send.");
    } else {
      const plain = (await writeClipboard(copy)) === "plain";
      status(
        `Copied for ${d.name}${plain ? " as plain text, since the formatted version is too large for this phone's clipboard" : ""}. Paste it, then scan the pasted result before you send.`,
      );
    }
    return true;
  } catch {
    if (copy.text)
      selectRaw(
        "This browser blocked the clipboard. The same text is selected below; copy it with ⌘C or Ctrl+C.",
      );
    else
      status(
        "This browser blocked the clipboard. Use Download PNG to save the image instead.",
      );
    return false;
  }
}
$("copy-destination").addEventListener("click", copyForDestination);

// Phone copy bar. In the one-column layout the settings sit below the
// preview; once the preview has scrolled away above them, the bar keeps a
// thumbnail of the code and the main copy action at the bottom of the screen.
function drawDockThumb() {
  const thumb = $("dock-thumb"),
    source = $("preview"),
    context = thumb.getContext("2d");
  context.clearRect(0, 0, thumb.width, thumb.height);
  if (!source.width) return;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, thumb.width, thumb.height);
}
const showPreview = () =>
  document.querySelector(".preview-card").scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "start",
  });
let dockFrame = 0;
function placeDock() {
  dockFrame = 0;
  const typing = document.activeElement?.matches(
    "input:not([type=checkbox]), textarea, select",
  );
  const box = (element) => element.getBoundingClientRect(),
    workspace = box($("make")),
    // Below the sticky top bar counts as scrolled away, too.
    edge = Math.max(0, box(document.querySelector(".topbar")).bottom);
  const show =
    !!current &&
    !typing &&
    workspace.bottom > edge &&
    workspace.top < innerHeight &&
    box(document.querySelector(".stage")).bottom <= edge &&
    box($("copy-destination")).bottom <= edge;
  $("dock").dataset.show = String(show);
  $("dock").inert = !show;
}
const queueDock = () => (dockFrame ||= requestAnimationFrame(placeDock));
addEventListener("scroll", queueDock, { passive: true });
addEventListener("resize", queueDock);
document.addEventListener("focusin", queueDock);
document.addEventListener("focusout", queueDock);
queueDock();
$("dock-peek").addEventListener("click", showPreview);
let dockTimer;
$("dock-copy").addEventListener("click", async () => {
  const copied = await copyForDestination();
  if (!copied) return showPreview();
  $("dock-copy-label").textContent = "Copied";
  clearTimeout(dockTimer);
  dockTimer = setTimeout(
    () => ($("dock-copy-label").textContent = "Copy"),
    2000,
  );
});
$("copy").addEventListener("click", async () => {
  closeMenus();
  if (!current) return;
  try {
    await navigator.clipboard.writeText(textOutput.text);
    status(
      "Monospace text copied. It keeps its shape only in the same monospace font with every space kept.",
    );
  } catch {
    status(
      "The clipboard is blocked. Download Plain text (TXT) from More instead.",
    );
  }
});
$("copy-formatted").addEventListener("click", async () => {
  closeMenus();
  if (!current) return;
  try {
    const plain =
      (await writeClipboard({
        html: formattedText(current, metrics),
        text: pasteText(current).text,
      })) === "plain";
    status(
      plain
        ? "Copied as plain text, since the formatted version is too large for this phone's clipboard. For formatting, download Text HTML or RTF from More."
        : "Formatted text copied. Paste it into a rich text editor and scan the result.",
    );
  } catch {
    status(
      "The clipboard is blocked. Download Text HTML or RTF from More instead.",
    );
  }
});
$("copy-plain").addEventListener("click", async () => {
  closeMenus();
  if (!current) return;
  try {
    const plain = pasteText(current);
    await writeClipboard({ text: plain.text });
    status(
      plain.emoji
        ? "Plain text copied. Emoji line up in any font that shows them."
        : "Plain text copied. It keeps its shape only in a monospace font.",
    );
  } catch {
    status("The clipboard is blocked in this browser.");
  }
});
$("copy-markdown").addEventListener("click", async () => {
  closeMenus();
  if (!current) return;
  try {
    await writeClipboard({
      text: pasteText(current, { quiet: current.quiet, fence: true }).text,
    });
    status("Markdown code block copied.");
  } catch {
    status("The clipboard is blocked in this browser.");
  }
});
$("snippet").addEventListener("click", async () => {
  closeMenus();
  if (!current) return;
  try {
    await writeClipboard({ text: formattedText(current, metrics) });
    status(
      "Website HTML copied. Paste it into an HTML block that keeps inline styles.",
    );
  } catch (error) {
    status(
      error instanceof TooLargeError
        ? "The website HTML is too large for this phone's clipboard. Download Text HTML from More instead."
        : "The clipboard is blocked. Download Text HTML from More instead.",
    );
  }
});
$("txt").addEventListener("click", () => {
  closeMenus();
  if (current) download(saveName(".txt"), textOutput.text);
});
$("recipe").addEventListener("click", () => {
  closeMenus();
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
  closeMenus();
  if (!current) return;
  download(saveName(".svg"), toSvg(current), "image/svg+xml");
  status("SVG saved. It uses your fonts, so it can differ from the preview.");
});
$("png").addEventListener("click", () => {
  if (!current) return;
  const name = saveName(".png");
  $("preview").toBlob((blob) => {
    if (blob) {
      download(name, blob, "image/png");
      status(
        "PNG saved with the artwork shown under Image. Scan status: untested.",
      );
    }
  }, "image/png");
});
$("html").addEventListener("click", () => {
  closeMenus();
  if (current)
    download(
      saveName("-print.html"),
      htmlSheet(current, $("preview").toDataURL("image/png"), textOutput.text),
      "text/html;charset=utf-8",
    );
});
$("text-html").addEventListener("click", () => {
  closeMenus();
  if (current)
    download(
      saveName("-text.html"),
      textDocument(current, metrics),
      "text/html;charset=utf-8",
    );
});
$("rtf").addEventListener("click", () => {
  closeMenus();
  if (current)
    download(saveName(".rtf"), textRtf(current, metrics), "application/rtf");
});
async function readJson(input, limit) {
  const file = input.files[0];
  if (!file) throw new Error("Choose a JSON file.");
  if (file.size > limit) throw new Error("The file is larger than allowed.");
  return JSON.parse(await file.text());
}
$("import-recipe").addEventListener("change", async () => {
  try {
    loadRecipe(await readJson($("import-recipe"), 20_000));
    savedForm = formKey();
    protectWork();
    status("Recipe loaded locally. Scan status: untested.");
  } catch (error) {
    status(`Recipe not loaded: ${error.message}`);
  }
  $("import-recipe").value = "";
});

// Scan lab: phone observations recorded against exact recipes.
const outcomes = ["untested", "pass", "fail", "conditional"];
const LAYOUTS = {
  image: "aqrobat-image-v1",
  "plain-text": TEXT_LAYOUT,
  formatted: TEXT_LAYOUT,
  tiles: TILES_LAYOUT,
  blocks: BLOCKS_LAYOUT,
};
// Paste formats drawn in typical app fonts and line spacing, so a phone can
// check text as a destination would show it. These are simulations of
// those apps, not the apps themselves.
const PASTE_STYLES = [
  { output: "tiles", font: "Arial, sans-serif", lineHeight: 1.2 },
  { output: "tiles", font: "Arial, sans-serif", lineHeight: 1.5 },
  { output: "tiles", font: "system-ui, sans-serif", lineHeight: 1.4 },
  { output: "blocks", font: "Menlo, Consolas, monospace", lineHeight: 1.2 },
  { output: "blocks", font: "Menlo, Consolas, monospace", lineHeight: 1.5 },
  { output: "formatted" },
];
const styleName = (s) =>
  s.font ? `${s.font.split(",")[0]} at ${s.lineHeight} line spacing` : "";
function lastResult(recipe, output = "image", style = "") {
  return [...records]
    .reverse()
    .find(
      (r) =>
        recipeKey(r.recipe) === recipeKey(recipe) &&
        (r.output || "image") === output &&
        (r.style || "") === style &&
        (output === "image" || r.layout === LAYOUTS[output]),
    );
}
function record(recipe, outcome, width, output = "image", style = "") {
  if (!$("scanner").value.trim())
    throw new Error(
      "Name the phone and scanner app before recording a result.",
    );
  if (records.length >= 1000)
    throw new Error(
      "This page holds 1000 results. Export them before starting a new page.",
    );
  records.push({
    schema: "aqrobat-observation-v1",
    id: crypto.randomUUID(),
    time: new Date().toISOString(),
    recipe,
    output,
    layout: LAYOUTS[output],
    ...(style ? { style } : {}),
    outcome,
    scanner: $("scanner").value,
    conditions: $("conditions").value,
    displayWidthPx: Math.round(width),
    browser: navigator.userAgent.slice(0, 400),
  });
  resultsDirty = true;
  protectWork();
}
function outcomeSelect(label, recipe, output, style, art, card) {
  const select = document.createElement("select");
  select.setAttribute("aria-label", `Scan result for ${label}`);
  for (const outcome of outcomes) {
    const opt = document.createElement("option");
    opt.value = outcome;
    opt.textContent = outcome[0].toUpperCase() + outcome.slice(1);
    select.append(opt);
  }
  select.value = lastResult(recipe, output, style)?.outcome || "untested";
  card.dataset.outcome = select.value;
  select.addEventListener("change", () => {
    try {
      record(
        recipe,
        select.value,
        art.getBoundingClientRect().width,
        output,
        style,
      );
      card.dataset.outcome = select.value;
      status(
        `Recorded ${records.length} result${records.length === 1 ? "" : "s"} in this page. Export them to keep them.`,
      );
    } catch (error) {
      select.value = card.dataset.outcome;
      status(error.message);
    }
  });
  return select;
}
function buildPasteGrid() {
  $("paste-grid").replaceChildren();
  if (!pasteCase || !$("compare-paste").checked) return;
  const qr = pasteCase;
  for (const s of PASTE_STYLES) {
    const card = document.createElement("article"),
      title = document.createElement("h3"),
      style = styleName(s);
    card.className = "test-card";
    card.dataset.output = s.output;
    title.textContent =
      s.output === "formatted"
        ? `Formatted text · ${qr.recipe.options.glyph} · ${qr.recipe.options.repeatX}×${qr.recipe.options.repeatY}`
        : `${s.output === "tiles" ? "Emoji squares" : "Code block"} · ${style}`;
    let art;
    if (s.output === "formatted") {
      const sized = generate(qr.recipe.payload, {
        ...qr.recipe.options,
        width: 328,
      });
      art = document.createElement("div");
      art.className = "comparison-html";
      art.innerHTML = formattedText(sized, textMetrics(sized));
    } else {
      art = document.createElement("pre");
      art.className = "comparison-text";
      art.textContent = (
        s.output === "tiles" ? tileText(qr) : blockText(qr)
      ).text;
      art.style.fontFamily = s.font;
      art.style.fontWeight = "400";
      art.style.lineHeight = String(s.lineHeight);
    }
    const info = document.createElement("p");
    info.className = "fine";
    info.textContent = `Expected: ${qr.recipe.payload}. Simulates the app's font and spacing; paste into the real app to be sure.`;
    card.append(
      title,
      art,
      info,
      outcomeSelect(title.textContent, qr.recipe, s.output, style, art, card),
    );
    $("paste-grid").append(card);
    if (art.tagName === "PRE") sizePre(art, 328);
    else {
      const scale = Math.min(1, art.clientWidth / 328);
      art.firstElementChild.style.transformOrigin = "top left";
      art.firstElementChild.style.transform = `scale(${scale})`;
      art.style.height = `${328 * scale}px`;
    }
  }
}
function buildGrid() {
  $("grid").replaceChildren();
  $("text-grid").replaceChildren();
  buildPasteGrid();
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
        art.textContent = plainText(qr).text;
        art.style.fontFamily = fontFamilyForText(o.font);
        art.dataset.targetWidth = o.width;
      }
      const info = document.createElement("p");
      info.className = "fine";
      info.textContent = `Expected: ${qr.recipe.payload}. Error correction ${qr.requestedEcc} → ${qr.actualEcc}; ink ${o.stroke ? "thickened" : "plain"}.`;
      card.append(
        title,
        art,
        info,
        outcomeSelect(title.textContent, qr.recipe, output, "", art, card),
      );
      if (output === "plain-text") {
        const button = document.createElement("button");
        button.className = "button";
        button.type = "button";
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
  cases = [];
  pasteCase = generate(current.recipe.payload, current.recipe.options);
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
    "Built the versions. Scan each one and record the result; files keep the recipe's size.",
  );
});
$("compare-text").addEventListener("change", buildGrid);
$("compare-paste").addEventListener("change", buildPasteGrid);
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
      throw new Error("This is not an Aqrobat results file.");
    const next = [...records],
      seen = new Map(records.map((r) => [r.id, JSON.stringify(r)]));
    for (const r of data.records) {
      fromRecipe(r.recipe);
      if (
        r.schema !== "aqrobat-observation-v1" ||
        !outcomes.includes(r.outcome) ||
        (r.output !== undefined && !Object.hasOwn(LAYOUTS, r.output)) ||
        (r.output !== undefined &&
          r.output !== "image" &&
          r.layout !== LAYOUTS[r.output]) ||
        (r.style !== undefined &&
          (typeof r.style !== "string" || r.style.length > 100)) ||
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
        throw new Error("A result is invalid, so nothing was imported.");
      const text = JSON.stringify(r);
      if (seen.has(r.id)) {
        if (seen.get(r.id) !== text)
          throw new Error("Conflicting result IDs, so nothing was imported.");
      } else {
        next.push(r);
        seen.set(r.id, text);
      }
    }
    if (next.length > 1000)
      throw new Error("Together these would pass 1000 results.");
    records = next;
    buildGrid();
    status(
      `Imported locally: ${records.length} result${records.length === 1 ? "" : "s"} in total. These are people's reports, not independent checks.`,
    );
  } catch (error) {
    status(`Results not imported: ${error.message}`);
  }
  $("import-results").value = "";
});
$("print-grid").addEventListener("click", () => {
  if (!cases.length) {
    status("Build the versions before printing.");
    return;
  }
  window.print();
});

function sizePre(pre, width) {
  // Measure the rendered rows rather than canvas text: emoji can draw wider
  // at small sizes, so a ratio taken at 100px does not hold.
  const target = Math.min(width, pre.parentElement.clientWidth - 2);
  pre.style.width = "max-content";
  const measure = () => pre.getBoundingClientRect().width;
  let size = 10;
  pre.style.fontSize = `${size}px`;
  for (let i = 0; i < 4 && measure(); i++) {
    size = Math.max(0.5, (size * target) / measure());
    pre.style.fontSize = `${size}px`;
  }
  while (measure() > target + 0.5 && size > 0.5) {
    size *= 0.98;
    pre.style.fontSize = `${size}px`;
  }
  pre.style.setProperty("--text-span", String(measure() / size));
  pre.style.width = "";
}
// Scale each text view to fit its box without changing its layout.
function fitText() {
  if (!current || !selectable) return;
  const raw = $("raw"),
    lines = raw.value.replace(/\n$/, "").split("\n"),
    ctx = document.createElement("canvas").getContext("2d");
  ctx.font = `700 100px ${raw.style.fontFamily}`;
  const max = Math.max(...lines.map((row) => ctx.measureText(row).width));
  const rawRoom = raw.parentElement.clientWidth - 26;
  let fs = Math.max(0.5, (rawRoom * 100) / max);
  // Emoji fonts can draw emoji wider at small sizes than at 100px, so check
  // the real width at the chosen size and shrink until the rows fit.
  const probe = document.createElement("pre");
  probe.style.cssText =
    "position:absolute;left:-100000px;top:0;visibility:hidden;margin:0;white-space:pre;font-weight:700;line-height:1.2";
  probe.style.fontFamily = raw.style.fontFamily;
  probe.textContent = raw.value;
  document.body.append(probe);
  for (let i = 0; i < 3; i++) {
    probe.style.fontSize = `${fs}px`;
    const width = probe.getBoundingClientRect().width;
    if (width <= rawRoom) break;
    fs = Math.max(0.5, (fs * rawRoom) / width - 0.01);
  }
  probe.remove();
  raw.style.fontSize = `${fs}px`;
  raw.style.lineHeight = "1.2";
  // A text area can lay emoji out a little wider than the probe did; shrink
  // until the real rows fit whenever the box is open to measure.
  for (
    let i = 0;
    i < 20 && raw.clientWidth && raw.scrollWidth > raw.clientWidth;
    i++
  ) {
    fs *= 0.98;
    raw.style.fontSize = `${fs}px`;
  }
  raw.style.height = `${Math.ceil((lines.length + 1) * fs * 1.2 + 28)}px`;
  // Measure the stage, not the preview's own box, which grows to fit it.
  const holder = $("paste-preview"),
    stage = holder.closest(".stage"),
    pad = parseFloat(getComputedStyle(stage).paddingLeft) * 2,
    room = Math.min(520, stage.clientWidth - pad - 24),
    child = holder.firstElementChild;
  if (!child || room <= 0) return;
  if (child.dataset.aqrobatLayout) {
    const scale = Math.min(1, room / current.recipe.options.width);
    child.style.transformOrigin = "top left";
    child.style.transform = `scale(${scale})`;
    holder.style.width = `${current.recipe.options.width * scale}px`;
    holder.style.height = `${current.recipe.options.width * scale}px`;
  } else if (child.tagName === "IMG") {
    child.style.width = `${room}px`;
    holder.style.width = holder.style.height = `${room}px`;
  } else if (child.tagName === "PRE") {
    const lineHeight = Number(child.style.lineHeight);
    child.style.fontSize = "100px";
    child.style.display = "inline-block";
    const { width } = child.getBoundingClientRect();
    let size = Math.max(1, (room * 100) / Math.max(1, width));
    child.style.fontSize = `${size}px`;
    // Emoji can draw wider at small sizes than at 100px; shrink to fit.
    for (
      let i = 0;
      i < 20 && child.getBoundingClientRect().width > room + 0.5;
      i++
    ) {
      size *= 0.98;
      child.style.fontSize = `${size}px`;
    }
    holder.style.width = `${room}px`;
    holder.style.height = `${Math.ceil(child.textContent.replace(/\n$/, "").split("\n").length * size * lineHeight)}px`;
  }
}

update();
showTab(
  destination(preferences.destination).format === "png" ? "image" : "pasted",
);
savedForm = formKey();
protectWork();
// The extension passes chosen text through session storage; the URL holds
// only a one-time random key, never the payload.
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
      "Your selection arrived from the extension. Nothing left this browser.",
    );
  }
}

if (extensionAppearance) {
  $("extension-save").hidden = false;
  $("recipe-library").hidden = false;
  // Inside the extension, saving is the way to insert; install steps are moot.
  $("insert-link").hidden = true;
  $("extension").hidden = true;
  let libraryEntries = [];
  async function refreshLibrary() {
    try {
      const data = await chrome.storage.local.get(LIBRARY_KEY);
      libraryEntries = readLibrary(data[LIBRARY_KEY]);
      const selectedId = $("saved-recipes").value;
      $("saved-recipes").replaceChildren();
      for (const entry of libraryEntries) {
        const option = document.createElement("option");
        option.value = entry.id;
        option.textContent = entry.name;
        $("saved-recipes").append(option);
      }
      if (libraryEntries.some((e) => e.id === selectedId))
        $("saved-recipes").value = selectedId;
      $("load-saved").disabled = $("delete-saved").disabled =
        !libraryEntries.length;
      $("library-status").textContent =
        `${libraryEntries.length} of 20 saved in this extension.`;
    } catch (error) {
      $("library-status").textContent = error.message;
    }
  }
  await refreshLibrary();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[LIBRARY_KEY]) refreshLibrary();
  });
  $("save-local").onclick = async () => {
    if (!update() || !current) return;
    const savingForm = formKey();
    try {
      const result = await chrome.runtime.sendMessage({
        action: "save-recipe",
        name: $("recipe-name").value,
        recipe: current.recipe,
      });
      if (!result?.ok)
        throw new Error(result?.error || "The code could not be saved.");
      savedForm = savingForm;
      protectWork();
      status(
        "Saved. Open the page you are writing in, click Aqrobat in the toolbar, and choose where to insert.",
      );
      await refreshLibrary();
    } catch (error) {
      status(error.message);
    }
  };
  $("load-saved").onclick = () => {
    const entry = libraryEntries.find((e) => e.id === $("saved-recipes").value);
    if (entry) {
      loadRecipe(entry.recipe);
      savedForm = formKey();
      protectWork();
      status("Saved code loaded.");
    }
  };
  $("delete-saved").onclick = async () => {
    const entry = libraryEntries.find((e) => e.id === $("saved-recipes").value);
    if (
      !entry ||
      !window.confirm(
        `Remove “${entry.name}” from this extension? Save its recipe first if you need a copy.`,
      )
    )
      return;
    const result = await chrome.runtime.sendMessage({
      action: "delete-recipe",
      id: entry.id,
    });
    if (!result?.ok) status(result?.error || "The code could not be removed.");
    await refreshLibrary();
  };
}

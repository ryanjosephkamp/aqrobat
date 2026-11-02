import { validateGlyph } from "../src/core.mjs";

// Emoji picker for computers without an emoji keyboard at hand: categories
// in the order phone keyboards use, search over Unicode's names and CLDR's
// search words, recent picks, and a filter to the emoji that can scan. The
// emoji list loads the first time it is needed.

// Lightness from 0 (black) to 1 (white), averaged over an emoji's square in
// Noto Color Emoji, the emoji Gmail draws. In a simulation of Gmail
// calibrated on phone results, emoji lighter than 0.8 rarely scanned, and
// light squares darker than 0.88 confused the camera.
export const TOO_LIGHT = 0.8;
export const TOO_DARK = 0.88;
const RECENT_KEY = "aqrobat-recent-emoji-v1",
  RECENT_LIMIT = 24;
const ICONS = {
  Recent: "i-clock",
  "Smileys & People": "i-smile",
  "Animals & Nature": "i-bear",
  "Food & Drink": "i-apple",
  Activities: "i-ball",
  "Travel & Places": "i-car",
  Objects: "i-bulb",
  Symbols: "i-heart",
  Flags: "i-flag",
};
const $ = (id) => document.getElementById(id);
const words = (s) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
const bare = (glyph) => glyph.replace(/️/g, "");

let data = null,
  loading = null;
export function loadEmoji() {
  loading ??= import("./emoji-data.mjs").then(({ EMOJI_CATEGORIES }) => {
    const byEmoji = new Map();
    const categories = EMOJI_CATEGORIES.map(([name, lines]) => ({
      name,
      emoji: lines.split("\n").map((line) => {
        const [emoji, title, extra, lightness] = line.split("\t");
        const e = {
          emoji,
          name: title,
          words: [...new Set([...words(title), ...words(extra)])],
          lightness: Number(lightness) / 100,
        };
        byEmoji.set(emoji, e);
        if (!byEmoji.has(bare(emoji))) byEmoji.set(bare(emoji), e);
        return e;
      }),
    }));
    data = { categories, byEmoji };
    return data;
  });
  return loading;
}
const lookup = (glyph) =>
  data?.byEmoji.get(glyph) ?? data?.byEmoji.get(bare(glyph));
/** An emoji's lightness in Noto Color Emoji, once the list has loaded. */
export const knownLightness = (glyph) => lookup(glyph)?.lightness;

function readRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(list)
      ? list.filter((g) => typeof g === "string").slice(0, RECENT_LIMIT)
      : [];
  } catch {
    return [];
  }
}
function remember(glyph) {
  try {
    const list = [glyph, ...readRecent().filter((g) => g !== glyph)];
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(list.slice(0, RECENT_LIMIT)),
    );
  } catch {
    /* Recent emoji are a convenience only. */
  }
}

/** Every word of the query starts a word of the emoji's name or keywords. */
function search(query) {
  const tokens = words(query),
    phrase = query.trim().toLowerCase();
  if (!tokens.length) return [];
  const hits = [];
  for (const category of data.categories)
    for (const e of category.emoji) {
      if (!tokens.every((t) => e.words.some((w) => w.startsWith(t)))) continue;
      const score =
        e.name === phrase
          ? 0
          : e.name.startsWith(phrase)
            ? 1
            : words(e.name).some((w) => w.startsWith(tokens[0]))
              ? 2
              : 3;
      hits.push({ e, score, order: hits.length });
    }
  return hits
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .map((h) => h.e);
}

let session = null;
const picker = () => $("picker");

function cell(glyph) {
  const e = lookup(glyph) ?? { emoji: glyph, name: glyph, lightness: null };
  const button = document.createElement("button");
  button.type = "button";
  button.className = "emoji-cell";
  button.textContent = e.emoji;
  button.tabIndex = -1;
  button.dataset.glyph = e.emoji;
  button.setAttribute("aria-label", e.name);
  if (e.lightness !== null) {
    if (e.lightness > TOO_LIGHT) button.dataset.tooLight = "";
    if (e.lightness < TOO_DARK) button.dataset.tooDark = "";
  }
  return button;
}
function section(name, glyphs, id) {
  const wrap = document.createElement("section"),
    title = document.createElement("h3"),
    grid = document.createElement("div");
  wrap.className = "picker-section";
  wrap.dataset.category = name;
  if (id) wrap.id = id;
  title.textContent = name;
  grid.className = "picker-grid";
  grid.append(...glyphs.map(cell));
  wrap.append(title, grid);
  return wrap;
}
function build() {
  const body = $("picker-body"),
    tabs = $("picker-tabs");
  if (body.dataset.built) return;
  body.dataset.built = "true";
  body.replaceChildren(
    section("Search results", [], "picker-results"),
    section("Recent", [], "picker-recent"),
    ...data.categories.map((c) =>
      section(
        c.name,
        c.emoji.map((e) => e.emoji),
      ),
    ),
  );
  $("picker-results").hidden = true;
  for (const name of Object.keys(ICONS)) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.category = name;
    button.setAttribute("aria-label", name);
    button.title = name;
    button.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#${ICONS[name]}" /></svg>`;
    button.addEventListener("click", () => {
      $("picker-search").value = "";
      showSearch("");
      const target = body.querySelector(
        `.picker-section[data-category="${CSS.escape(name)}"]`,
      );
      if (target && !target.hidden)
        body.scrollTop = target.offsetTop - body.offsetTop;
      markTab(name);
    });
    tabs.append(button);
  }
  body.addEventListener("scroll", () => {
    if (!$("picker-results").hidden) return;
    let name = null;
    for (const s of body.querySelectorAll(".picker-section"))
      if (!s.hidden && s.offsetTop - body.offsetTop <= body.scrollTop + 12)
        name = s.dataset.category;
    markTab(name);
  });
  body.addEventListener("click", (e) => {
    const button = e.target.closest(".emoji-cell");
    if (button) pick(button.dataset.glyph);
  });
  body.addEventListener("keydown", moveFocus);
  for (const type of ["mouseover", "focusin"])
    body.addEventListener(type, (e) => {
      const button = e.target.closest(".emoji-cell");
      if (button) describe(button.dataset.glyph);
    });
}
function markTab(name) {
  for (const button of $("picker-tabs").children)
    button.setAttribute(
      "aria-current",
      String(button.dataset.category === name),
    );
}
function describe(glyph) {
  const e = lookup(glyph),
    l = e?.lightness;
  let note = "";
  if (l !== undefined && session?.mode === "dark")
    note = l > TOO_LIGHT ? " · likely too light to scan" : " · dark enough";
  if (l !== undefined && session?.mode === "light")
    note = l < TOO_DARK ? " · too dark for light squares" : " · light enough";
  $("picker-status").textContent = `${glyph}\u2002${e?.name ?? ""}${note}`;
}
function visibleCells() {
  return [...$("picker-body").querySelectorAll(".emoji-cell")].filter(
    (c) => c.offsetParent !== null,
  );
}
function focusCell(button) {
  for (const c of $("picker-body").querySelectorAll('[tabindex="0"]'))
    c.tabIndex = -1;
  button.tabIndex = 0;
  button.focus();
}
// Arrow keys move through the grid as they do on an emoji keyboard.
function moveFocus(e) {
  const here = e.target.closest(".emoji-cell");
  if (!here) return;
  const cells = visibleCells(),
    i = cells.indexOf(here);
  let next = null;
  if (e.key === "ArrowRight") next = cells[i + 1];
  else if (e.key === "ArrowLeft") next = cells[i - 1];
  else if (e.key === "Home") next = cells[0];
  else if (e.key === "End") next = cells.at(-1);
  else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    const step = e.key === "ArrowDown" ? 1 : -1,
      from = here.getBoundingClientRect();
    let rowTop = null,
      best = Infinity;
    for (let j = i + step; j >= 0 && j < cells.length; j += step) {
      const r = cells[j].getBoundingClientRect();
      if (Math.abs(r.top - from.top) < 2) continue;
      if (rowTop === null) rowTop = r.top;
      else if (Math.abs(r.top - rowTop) >= 2) break;
      const dx = Math.abs(r.left - from.left);
      if (dx < best) [best, next] = [dx, cells[j]];
    }
    if (!next && step < 0) next = $("picker-search");
  } else return;
  e.preventDefault();
  if (next === $("picker-search")) next.focus();
  else if (next) focusCell(next);
}
function applyFilter() {
  const on = $("picker-dark").checked,
    hide = session.mode === "dark" ? "tooLight" : "tooDark";
  picker().dataset.filter = on ? session.mode : "";
  // A section the filter empties is left out, heading and all.
  for (const s of $("picker-body").querySelectorAll(".picker-section")) {
    const cells = [...s.querySelectorAll(".emoji-cell")];
    s.classList.toggle(
      "empty",
      on && cells.length > 0 && cells.every((c) => hide in c.dataset),
    );
  }
}
// Each search result section is rebuilt; the categories stay in place.
function showSearch(query) {
  const results = $("picker-results"),
    body = $("picker-body"),
    searching = query.trim() !== "";
  for (const s of body.querySelectorAll(".picker-section"))
    s.hidden =
      s === results
        ? !searching
        : searching || (s.id === "picker-recent" && !readRecent().length);
  const grid = results.querySelector(".picker-grid");
  grid.replaceChildren();
  if (searching) {
    const hits = search(query);
    grid.append(...hits.map((e) => cell(e.emoji)));
    results.querySelector("h3").textContent = hits.length
      ? `Results for “${query.trim()}”`
      : `No emoji match “${query.trim()}”`;
    body.scrollTop = 0;
    markTab(null);
  }
  renderChoices(query);
  applyFilter();
}
// The caller's own choices, its suggestions, and whatever single character
// was typed into the search, which can be used as it is.
function renderChoices(query = "") {
  const box = $("picker-choices");
  box.replaceChildren();
  const typed = [...new Intl.Segmenter().segment(query.trim())];
  if (typed.length === 1) {
    try {
      const glyph = validateGlyph(typed[0].segment);
      box.append(choice(`Use ${glyph}`, glyph, "typed"));
    } catch {
      /* Not a usable character, so it is only a search. */
    }
  }
  for (const c of session.choices) box.append(choice(c.label, c.value));
  for (const glyph of session.suggested) {
    const button = choice(glyph, glyph, "glyph");
    button.setAttribute("aria-label", lookup(glyph)?.name ?? glyph);
    button.setAttribute("aria-pressed", String(glyph === session.current));
    box.append(button);
  }
}
function choice(label, value, kind = "text") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `chip picker-choice ${kind}`;
  button.textContent = label;
  button.addEventListener("click", () => pick(value));
  return button;
}
function pick(value) {
  if (!session) return;
  const { onPick } = session;
  if (value) remember(value);
  close();
  onPick(value);
}
function close() {
  const dialog = picker();
  if (dialog.open) dialog.close();
}
function place(anchor) {
  const dialog = picker();
  // Phones get a sheet from the bottom of the screen, from CSS.
  if (matchMedia("(max-width: 720px)").matches) {
    dialog.style.left = dialog.style.top = "";
    return;
  }
  const r = anchor.getBoundingClientRect(),
    box = dialog.getBoundingClientRect();
  const left = Math.min(Math.max(16, r.left), innerWidth - box.width - 16);
  let top = r.bottom + 8;
  if (top + box.height > innerHeight - 16)
    top = Math.max(16, r.top - 8 - box.height);
  dialog.style.left = `${left}px`;
  dialog.style.top = `${top}px`;
}

let wired = false;
function wire() {
  if (wired) return;
  wired = true;
  const dialog = picker();
  $("picker-close").addEventListener("click", close);
  // A click outside the panel lands on the dialog's backdrop.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
  });
  dialog.addEventListener("close", () => {
    const anchor = session?.anchor;
    session = null;
    anchor?.focus();
  });
  $("picker-search").addEventListener("input", () =>
    showSearch($("picker-search").value),
  );
  $("picker-search").addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      const first = visibleCells()[0];
      if (first) {
        e.preventDefault();
        focusCell(first);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const first = $("picker-results").hidden ? null : visibleCells()[0];
      const typed = $("picker-choices").querySelector(".typed");
      if (first) pick(first.dataset.glyph);
      else if (typed) typed.click();
    }
  });
  $("picker-dark").addEventListener("change", applyFilter);
  addEventListener("resize", () => session && place(session.anchor));
}

/**
 * Open the picker beside its button. mode "dark" describes and filters for
 * emoji dark enough to scan, "light" for emoji light enough to be the light
 * squares. choices are extra buttons such as "Same as code"; suggested are
 * glyphs shown first. onPick receives the chosen value.
 */
export async function openPicker({
  anchor,
  title,
  mode = "dark",
  choices = [],
  suggested = [],
  current = "",
  onPick,
}) {
  wire();
  session = { anchor, mode, choices, suggested, current, onPick };
  const dialog = picker();
  $("picker-title").textContent = title;
  $("picker-search").value = "";
  $("picker-status").textContent = "Loading emoji…";
  $("picker-dark").checked = false;
  $("picker-dark").parentElement.lastChild.textContent =
    mode === "light"
      ? " Only emoji light enough for light squares"
      : " Only emoji dark enough to scan";
  renderChoices();
  if (!dialog.open) dialog.showModal();
  place(anchor);
  // On a computer the search takes the keyboard at once; on a phone it
  // would cover the emoji with the keyboard.
  if (matchMedia("(pointer: fine)").matches) $("picker-search").focus();
  else $("picker-close").focus({ focusVisible: false });
  try {
    await loadEmoji();
  } catch {
    $("picker-status").textContent =
      "The emoji list didn't load. Type a character into the search instead.";
    return;
  }
  if (session?.onPick !== onPick) return;
  build();
  const recent = $("picker-recent").querySelector(".picker-grid");
  recent.replaceChildren(...readRecent().map(cell));
  showSearch("");
  renderChoices();
  $("picker-body").scrollTop = 0;
  markTab(readRecent().length ? "Recent" : data.categories[0].name);
  $("picker-status").textContent =
    mode === "light"
      ? "Light squares need mostly white emoji, like ▫️ or 🤍."
      : "Dark emoji scan best. Point at one for its name.";
}

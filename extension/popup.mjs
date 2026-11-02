import { LIBRARY_KEY, readLibrary } from "./src/library.mjs";
import { generate, PRESETS } from "./src/core.mjs";
import { SQUARES } from "./src/portable.mjs";
import { render } from "./src/render.mjs";
import { textMetrics } from "./src/text.mjs";
import {
  DESTINATIONS,
  FORMATS,
  destination,
  destinationForHost,
  clipboardFor,
  pasteCheck,
} from "./src/destinations.mjs";
import { APPEARANCE_KEY, appearance } from "./web/appearance.mjs";

const $ = (id) => document.getElementById(id);
const PREFERENCES_KEY = "aqrobat-preferences-v1";
let preferences = {};
try {
  preferences = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "{}");
} catch {
  /* A remembered choice is a convenience only. */
}
function say(message, error = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", error);
}

try {
  const look = appearance(
    (await chrome.storage.local.get(APPEARANCE_KEY))[APPEARANCE_KEY],
  );
  document.documentElement.dataset.theme = look.theme;
} catch {
  /* The theme follows the device when storage is unavailable. */
}

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
let host = "";
try {
  const url = new URL(tab?.url ?? "");
  if (["http:", "https:"].includes(url.protocol)) {
    host = url.hostname;
    $("payload").value = url.href;
  }
} catch {
  /* Browser pages have no usable address. */
}
if (!$("payload").value) $("payload").placeholder = "https://example.com";

// Emoji squares come first: they are the tested choice for pasting.
for (const { glyph, name } of [...SQUARES, ...PRESETS]) {
  const option = document.createElement("option");
  option.value = glyph;
  option.textContent = `${glyph}  ${name}`;
  $("glyph").append(option);
}
$("glyph").value = [...SQUARES, ...PRESETS].some(
  (p) => p.glyph === preferences.glyph,
)
  ? preferences.glyph
  : "⬛";
for (const d of DESTINATIONS) {
  const option = document.createElement("option");
  option.value = d.id;
  option.textContent = d.name;
  $("destination").append(option);
}
$("destination").value =
  destinationForHost(host)?.id ?? destination(preferences.destination).id;

function remember() {
  try {
    const all = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "{}");
    all.destination = $("destination").value;
    all.glyph = $("glyph").value;
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(all));
  } catch {
    /* Ignore storage failures. */
  }
}
function quickCode() {
  const glyph = $("glyph").value,
    narrow = /^[\x21-\x7e█]$/.test(glyph);
  return generate($("payload").value, {
    glyph,
    repeatX: narrow ? 2 : 1,
    repeatY: 1,
    width: 328,
  });
}
function describe() {
  const d = destination($("destination").value);
  $("copy").textContent =
    d.format === "png" ? "Copy image" : `Copy for ${d.name}`;
  $("note").textContent = FORMATS[d.format].note;
  if (!$("payload").value) {
    $("bytes").textContent = "Type a link or some text to start.";
    $("copy").disabled = $("insert-new").disabled = true;
    return;
  }
  try {
    const qr = quickCode();
    $("bytes").textContent = `${qr.utf8Bytes} / 1024 bytes · never shortened`;
    const { tested, ok } = pasteCheck(qr, d.id);
    if (!ok)
      $("note").textContent +=
        ` Experimental with these characters; ${tested.name.toLowerCase()} are the tested choice.`;
    $("copy").disabled = $("insert-new").disabled = false;
  } catch (error) {
    $("bytes").textContent = error.message;
    $("copy").disabled = $("insert-new").disabled = true;
  }
}
for (const id of ["payload", "glyph", "destination"])
  $(id).addEventListener(id === "payload" ? "input" : "change", () => {
    remember();
    describe();
  });
describe();

$("copy").onclick = async () => {
  try {
    const qr = quickCode(),
      d = destination($("destination").value);
    if (d.format === "png") {
      const canvas = document.createElement("canvas");
      render(canvas, qr);
      const png = await new Promise((r) => canvas.toBlob(r, "image/png"));
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": png }),
      ]);
    } else {
      const data = clipboardFor(qr, d.id, textMetrics(qr));
      if (data.html)
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([data.text], { type: "text/plain" }),
            "text/html": new Blob([data.html], { type: "text/html" }),
          }),
        ]);
      else await navigator.clipboard.writeText(data.text);
    }
    say(
      `Copied for ${d.name}. Paste it, then scan the result before you send.`,
    );
  } catch (error) {
    say(error.message || "The clipboard is not available here.", true);
  }
};

async function insert(message) {
  try {
    const result = await chrome.runtime.sendMessage({
      action: "insert",
      tabId: tab?.id,
      ...message,
    });
    if (!result?.ok)
      throw new Error(result?.error || "Insertion could not start.");
    window.close();
  } catch {
    say(
      "Chrome does not let extensions insert on this page. Try a normal website or the practice page. Some embedded editors are off limits too.",
      true,
    );
  }
}
$("insert-new").onclick = () => {
  try {
    insert({ recipe: quickCode().recipe });
  } catch (error) {
    say(error.message, true);
  }
};
$("insert").onclick = () => insert({ recipeId: $("recipe").value });
$("open").onclick = () =>
  chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });

let saved = [];
function showSaved() {
  const entry = saved.find((e) => e.id === $("recipe").value);
  $("saved-payload").textContent = entry
    ? `Encodes: ${entry.recipe.payload}`
    : "Save codes from the workbench to reuse them here.";
  $("insert").disabled = !entry;
}
try {
  saved = readLibrary(
    (await chrome.storage.local.get(LIBRARY_KEY))[LIBRARY_KEY],
  );
  for (const entry of saved) {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.name;
    $("recipe").append(option);
  }
  if (!saved.length) {
    const option = document.createElement("option");
    option.textContent = "None saved yet";
    $("recipe").append(option);
    $("recipe").disabled = true;
  }
} catch {
  say("Saved codes could not be read. Open the workbench to check them.", true);
}
showSaved();
$("recipe").onchange = showSaved;
if (location.hash === "#restricted")
  say(
    "Chrome blocked access to that editor. Try a normal page; embedded editors from other sites can be off limits.",
    true,
  );

import {
  DEFAULT_RECIPE,
  composePortable,
  measurePortable,
  portableRtf,
  portableClipboardHtml,
} from "./generator.mjs";
const form = document.querySelector("#recipe"),
  frame = document.querySelector("#preview"),
  status = document.querySelector("#status"),
  details = document.querySelector("#details");
let current = null,
  retainedSource = null,
  retainedPayload = null;
const fields = [
  "payload",
  "text",
  "font",
  "fontSize",
  "field",
  "linesPerModule",
  "quiet",
  "ecc",
  "dark",
  "gray",
  "darkWeight",
  "lightWeight",
];
function setRecipe(s) {
  retainedSource = s.text;
  retainedPayload = s.payload;
  for (const k of fields) form.elements[k].value = s[k];
  form.elements.repeat.checked = s.repeat;
}
function readRecipe() {
  const s = {};
  for (const k of fields)
    s[k] = ["payload", "text", "font", "ecc"].includes(k)
      ? form.elements[k].value
      : Number(form.elements[k].value);
  s.repeat = form.elements.repeat.checked;
  if (
    retainedSource !== null &&
    s.text === retainedSource.replace(/\r\n?/g, "\n")
  )
    s.text = retainedSource;
  if (
    retainedPayload !== null &&
    s.payload === retainedPayload.replace(/\r\n?/g, "\n")
  )
    s.payload = retainedPayload;
  return s;
}
function setActions(enabled) {
  for (const b of document.querySelectorAll("[data-export],#copy,#open-text"))
    b.disabled = !enabled;
}
function invalidate() {
  current = null;
  setActions(false);
  status.textContent = "Settings changed. Generate again to update the output.";
  status.className = "notice";
}
function generateNow() {
  current = null;
  setActions(false);
  try {
    const spec = readRecipe(),
      measurement = measurePortable(spec);
    current = composePortable(spec, measurement);
    frame.srcdoc = current.html;
    frame.style.width = `${Math.ceil(current.side)}px`;
    frame.style.height = `${Math.ceil(current.side)}px`;
    const s = current.summary;
    status.textContent =
      "Generated locally. This output has not been scan-tested. The saved accepted example is linked above.";
    status.className = "notice";
    details.replaceChildren();
    for (const [term, value] of [
      [
        "Text width",
        `${s.bodyCssPixels}px = ${s.bodyInches.toFixed(2)} inches at 96px/in`,
      ],
      [
        "Type and line height",
        `${s.fontPixels}px (${s.fontPoints}pt); ${current.leading.toFixed(2)}px rows`,
      ],
      [
        "Text",
        `${s.rows} lines · ${s.outputWords} words · ${s.completeCopies} complete source ${s.completeCopies === 1 ? "copy" : "copies"}`,
      ],
      [
        "Longest row",
        `${s.maxLineCharacters} characters; whole words kept together`,
      ],
      [
        "Full square",
        `${s.pageCssPixels.toFixed(2)}px including ${spec.quiet} blank modules per edge`,
      ],
      [
        "Source fidelity",
        "Original words, punctuation and case preserved. Displayed whitespace is wrapped/normalized; original TXT and recipe retain raw source.",
      ],
    ]) {
      const dt = document.createElement("dt"),
        dd = document.createElement("dd");
      dt.textContent = term;
      dd.textContent = value;
      details.append(dt, dd);
    }
    setActions(true);
    try {
      portableRtf(current);
      document.querySelector("#rtf-note").textContent =
        "RTF carries font, color, weights and exact line spacing. Its native document layout can differ from HTML; scan the resulting document.";
    } catch (e) {
      document.querySelector('[data-export="rtf"]').disabled = true;
      document.querySelector("#rtf-note").textContent = e.message;
    }
  } catch (e) {
    frame.srcdoc =
      '<html><body style="font:16px system-ui;padding:24px">No output for these settings.</body></html>';
    frame.style.width = "600px";
    frame.style.height = "180px";
    details.replaceChildren();
    status.textContent = e.message;
    status.className = "notice error";
  }
}
form.addEventListener("submit", (e) => {
  e.preventDefault();
  generateNow();
});
form.addEventListener("input", (event) => {
  if (event.target.name === "text") retainedSource = null;
  if (event.target.name === "payload") retainedPayload = null;
  invalidate();
});
document.querySelector("#preset").addEventListener("change", (e) => {
  const source = readRecipe().text,
    payload = readRecipe().payload;
  setRecipe({
    ...DEFAULT_RECIPE,
    text: source,
    payload,
    ...(e.target.value === "black"
      ? {
          font: "Avenir Next Condensed",
          fontSize: 10,
          darkWeight: 900,
          lightWeight: 100,
          gray: 0,
          quiet: 4,
        }
      : e.target.value === "separation"
        ? { gray: 200, quiet: 4 }
        : e.target.value === "regular"
          ? {
              font: "Avenir Next Condensed",
              fontSize: 10,
              darkWeight: 900,
              lightWeight: 400,
              gray: 96,
              quiet: 4,
            }
          : {}),
  });
  invalidate();
});
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
for (const button of document.querySelectorAll("[data-export]"))
  button.addEventListener("click", () => {
    if (!current) return;
    const kind = button.dataset.export;
    try {
      if (kind === "html")
        download("aqrobat-prose.html", current.html, "text/html;charset=utf-8");
      if (kind === "rtf")
        download(
          "aqrobat-prose-letter.rtf",
          portableRtf(current),
          "application/rtf",
        );
      if (kind === "source")
        download(
          "aqrobat-original-source.txt",
          current.source,
          "text/plain;charset=utf-8",
        );
      if (kind === "text")
        download(
          "aqrobat-wrapped-text.txt",
          current.plainText,
          "text/plain;charset=utf-8",
        );
      if (kind === "recipe")
        download(
          "aqrobat-prose-recipe.json",
          JSON.stringify(
            {
              schema: "aqrobat-prose-research-v1",
              recipe: current.spec,
              summary: current.summary,
            },
            null,
            2,
          ) + "\n",
          "application/json",
        );
    } catch (e) {
      status.textContent = e.message;
      status.className = "notice error";
    }
  });
document.querySelector("#copy").addEventListener("click", async () => {
  if (!current) return;
  const d = frame.contentDocument,
    e = d.querySelector("#text-body"),
    r = d.createRange(),
    selection = frame.contentWindow.getSelection();
  r.selectNodeContents(e);
  selection.removeAllRanges();
  selection.addRange(r);
  frame.contentWindow.focus();
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined")
      throw new Error("Clipboard API unavailable");
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([portableClipboardHtml(current)], {
          type: "text/html",
        }),
        "text/plain": new Blob([current.plainText], { type: "text/plain" }),
      }),
    ]);
    status.textContent =
      "Styled HTML and plain text copied. Paste with source formatting, then scan the receiving document. Paste fidelity is not guaranteed.";
  } catch {
    status.textContent =
      "Text selected in the preview. Press Command-C or Control-C, then paste with source formatting. Receiving-app fidelity still needs a scan check.";
  }
});
document.querySelector("#import").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const v = JSON.parse(await f.text());
    if (v.schema !== "aqrobat-prose-research-v1")
      throw new Error("Choose an Aqrobat prose research recipe.");
    setRecipe(v.recipe);
    generateNow();
  } catch (error) {
    current = null;
    setActions(false);
    status.textContent = error.message;
    status.className = "notice error";
  } finally {
    e.target.value = "";
  }
});
setRecipe(DEFAULT_RECIPE);
generateNow();

document.querySelector("#open-text").addEventListener("click", () => {
  if (!current) return;
  const url = URL.createObjectURL(
    new Blob([current.html], { type: "text/html" }),
  );
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
});

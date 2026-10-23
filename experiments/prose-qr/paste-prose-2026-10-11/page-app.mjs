import { longProse, passages } from "./corpus.mjs";
import { composePageProse } from "./page-fit.mjs";
import { compactClipboardHtml } from "./compact.mjs";
import { proseDocx } from "./docx.mjs";

const pageForm = document.querySelector("#page-recipe"),
  pageStatus = document.querySelector("#status"),
  pageDetails = document.querySelector("#details"),
  pagePreview = document.querySelector("#preview");
let pageCurrent = null,
  pageSourceOriginal = null,
  pagePayloadOriginal = null;
function pageActions(enabled) {
  for (const b of document.querySelectorAll("[data-save],#copy-styled"))
    b.disabled = !enabled;
}
function pageInvalidate() {
  pageCurrent = null;
  pageActions(false);
  pageStatus.textContent = "Settings changed. Generate again.";
  pageStatus.className = "notice";
}
function pageSetSource(text, repeat = false) {
  pageSourceOriginal = text;
  pageForm.elements.text.value = text;
  pageForm.elements.repeat.checked = repeat;
  pageInvalidate();
}
function pageRead() {
  let text = pageForm.elements.text.value,
    payload = pageForm.elements.payload.value;
  if (
    pageSourceOriginal !== null &&
    text === pageSourceOriginal.replace(/\r\n?/g, "\n")
  )
    text = pageSourceOriginal;
  if (
    pagePayloadOriginal !== null &&
    payload === pagePayloadOriginal.replace(/\r\n?/g, "\n")
  )
    payload = pagePayloadOriginal;
  return {
    payload,
    text,
    field: Number(pageForm.elements.field.value),
    pointChoice: pageForm.elements.points.value,
    repeat: pageForm.elements.repeat.checked,
    gray: Number(pageForm.elements.gray.value),
    paper: pageForm.elements.paper.value,
    ecc: "Q",
    quiet: 5,
  };
}
function pageGenerate() {
  pageCurrent = null;
  pageActions(false);
  pageDetails.textContent = "";
  try {
    const recipe = pageRead(),
      fit = composePageProse(recipe),
      layout = fit.layout;
    // Reject incompatible paper measure before enabling any document action.
    const docx = proseDocx(layout, { paper: recipe.paper });
    pageCurrent = { ...fit, recipe, docx };
    pagePreview.srcdoc = layout.html;
    pagePreview.style.width = layout.side + "px";
    pagePreview.style.height = layout.side + "px";
    pageStatus.textContent =
      "Generated locally. This exact output needs a scan check before use.";
    pageStatus.className = "notice";
    const s = layout.summary;
    for (const [label, value] of [
      ["Page", recipe.paper + " · one-inch margins"],
      ["Text block", s.bodyInches + " inches wide · " + s.rows + " fixed rows"],
      [
        "Type",
        s.fontPoints +
          "pt Impact · " +
          (layout.leading * 0.75).toFixed(2) +
          "pt row spacing",
      ],
      [
        "Source",
        s.sourceWords +
          " words · " +
          s.completeCopies +
          " complete " +
          (s.completeCopies === 1 ? "copy" : "copies"),
      ],
      [
        "Fidelity",
        "Words, punctuation and case stay in order. Displayed whitespace is wrapped; original TXT preserves it exactly.",
      ],
    ]) {
      const dt = document.createElement("dt"),
        dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value;
      pageDetails.append(dt, dd);
    }
    pageActions(true);
  } catch (e) {
    pagePreview.srcdoc =
      '<html><body style="font:16px system-ui;padding:24px">No output for these settings.</body></html>';
    pagePreview.style.width = "500px";
    pagePreview.style.height = "160px";
    pageStatus.textContent = e.message;
    pageStatus.className = "notice error";
  }
}
function pageDownload(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
pageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  pageGenerate();
});
pageForm.addEventListener("input", (e) => {
  if (e.target.name === "text") pageSourceOriginal = null;
  if (e.target.name === "payload") pagePayloadOriginal = null;
  pageInvalidate();
});
document.querySelector("#sample-long").addEventListener("click", () => {
  pageSetSource(longProse, false);
  pageGenerate();
});
document.querySelector("#sample-short").addEventListener("click", () => {
  pageSetSource(passages.find((p) => p.id === "ordinary").text, true);
  pageGenerate();
});
for (const button of document.querySelectorAll("[data-save]"))
  button.addEventListener("click", () => {
    if (!pageCurrent) return;
    const { layout, recipe, docx, attempts } = pageCurrent;
    if (button.dataset.save === "docx")
      pageDownload(
        "aqrobat-prose-" + recipe.paper.toLowerCase() + ".docx",
        docx,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    if (button.dataset.save === "source")
      pageDownload(
        "aqrobat-original-source.txt",
        layout.source,
        "text/plain;charset=utf-8",
      );
    if (button.dataset.save === "text")
      pageDownload(
        "aqrobat-wrapped-text.txt",
        layout.plainText,
        "text/plain;charset=utf-8",
      );
    if (button.dataset.save === "html")
      pageDownload(
        "aqrobat-prose.html",
        layout.html,
        "text/html;charset=utf-8",
      );
    if (button.dataset.save === "recipe")
      pageDownload(
        "aqrobat-prose-recipe.json",
        JSON.stringify(
          {
            schema: "aqrobat-page-prose-v1",
            recipe,
            selectedRecipe: layout.spec,
            summary: layout.summary,
            attempts,
          },
          null,
          2,
        ) + "\n",
        "application/json",
      );
  });
document.querySelector("#copy-styled").addEventListener("click", async () => {
  if (!pageCurrent) return;
  try {
    const l = pageCurrent.layout;
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([compactClipboardHtml(l)], { type: "text/html" }),
        "text/plain": new Blob([l.plainText], { type: "text/plain" }),
      }),
    ]);
    pageStatus.textContent =
      "Styled text copied. Keep source formatting when pasting, then scan the resulting document. The Word-file copy route has stronger native evidence.";
  } catch {
    pageStatus.textContent =
      "Styled clipboard access is unavailable here. Download the Word file, open it in Word, and copy from that document.";
  }
});
document
  .querySelector("#import-recipe")
  .addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 100000) throw new Error("Recipe file is too large.");
      const data = JSON.parse(await file.text());
      if (
        data.schema !== "aqrobat-page-prose-v1" ||
        typeof data.recipe?.text !== "string" ||
        typeof data.recipe?.payload !== "string"
      )
        throw new Error("Choose an Aqrobat page-prose recipe.");
      const r = data.recipe;
      pageSourceOriginal = r.text;
      pagePayloadOriginal = r.payload;
      for (const k of ["text", "payload", "field", "gray", "paper"])
        pageForm.elements[k].value = r[k];
      pageForm.elements.points.value = r.pointChoice;
      pageForm.elements.repeat.checked = r.repeat;
      pageInvalidate();
      pageGenerate();
    } catch (e) {
      pageCurrent = null;
      pageActions(false);
      pageStatus.textContent = e.message;
      pageStatus.className = "notice error";
    }
    e.target.value = "";
  });
pagePayloadOriginal = "https://example.com/";
pageForm.elements.payload.value = pagePayloadOriginal;
pageSetSource(longProse, false);
pageGenerate();

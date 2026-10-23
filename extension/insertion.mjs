import { fromRecipe } from "../src/core.mjs";
import { formattedText, textMetrics } from "../src/text.mjs";
import { calibratedText } from "../src/spacing.mjs";

/** Runs only after the extension is invoked. No background page observation. */
export function openInsertion(entries) {
  // A second invocation may select a different recipe. Close the previous
  // task-owned panel and its listeners before showing the current selection.
  globalThis.__aqrobatCloseInsertion?.();
  if (document.querySelector("aqrobat-insertion")) return;
  const host = document.createElement("aqrobat-insertion"),
    shadow = host.attachShadow({ mode: "open" });
  host.style.cssText =
    "all:initial;position:fixed;right:12px;bottom:12px;z-index:2147483647;max-width:calc(100vw - 24px)";
  shadow.innerHTML = `<style>
    :host{color-scheme:light}*{box-sizing:border-box}section{width:440px;max-width:calc(100vw - 24px);max-height:78vh;overflow:auto;padding:18px;background:#fff;color:#241839;border:2px solid #7951b0;border-radius:16px;box-shadow:0 8px 40px #0004;font:14px/1.4 system-ui;text-align:left}
    h2{font-size:20px;margin:0 0 8px}p{margin:10px 0}button,select,input{font:inherit;padding:8px;border:1px solid #b8a6d0;border-radius:8px;background:#faf7ff;color:#241839}button{cursor:pointer}button:disabled{opacity:.5;cursor:default}label{display:block;margin:10px 0}select{max-width:100%;width:100%}#width{width:100px}#preview{max-height:220px;overflow:auto;border:1px solid #ddd;background:white;color:black;margin:12px 0}#preview:empty{display:none}#preview>pre{margin:0}#close{float:right}small{display:block;color:#675c73}#message{white-space:pre-line}input[type=checkbox]{margin-right:8px}
    </style><section role="dialog" aria-label="Insert an Aqrobat text QR"><button id="close" aria-label="Close insertion panel">✕</button><h2>Insert your QR</h2><label>Choose QR<select id="recipe"></select></label><p id="payload"></p><p id="target">Click inside the destination text box. Existing text will be preserved; selected text will not be replaced.</p><label>Text format<select id="mode"><option value="formatted">Formatted text · email / rich editors</option><option value="plain">Measured plain text · this field’s font</option></select></label><label id="width-label">QR width <input id="width" type="number" value="328" min="200" max="1536" step="1"> px</label><p id="message" role="status"></p><div id="preview" aria-label="Insertion preview"></div><button id="prepare">Preview</button> <button id="insert" disabled>Insert QR</button><p><small>Layout preview is not a scan test. Review the saved/sent result too. This extension never sends an email or submits a form.</small></p></section>`;
  document.documentElement.append(host);
  const $i = (id) => shadow.getElementById(id);
  let field = null,
    snapshot = null,
    prepared = null,
    revision = 0,
    picking = true;
  for (const entry of entries) {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.name;
    $i("recipe").append(option);
  }
  function selected() {
    return entries.find((e) => e.id === $i("recipe").value);
  }
  function describe() {
    $i("payload").textContent = selected()
      ? `Payload: ${selected().recipe.payload}`
      : "No saved recipes. Open the Aqrobat generator, load or create a recipe, and choose Save in extension.";
  }
  describe();
  $i("prepare").disabled = !entries.length;
  function invalidate() {
    revision++;
    prepared = null;
    $i("insert").disabled = true;
    $i("preview").replaceChildren();
  }
  function close() {
    invalidate();
    document.removeEventListener("click", choose, true);
    document.removeEventListener("keydown", escape, true);
    host.remove();
    if (globalThis.__aqrobatCloseInsertion === close)
      delete globalThis.__aqrobatCloseInsertion;
  }
  globalThis.__aqrobatCloseInsertion = close;
  function escape(e) {
    if (e.key === "Escape") close();
  }
  $i("close").onclick = close;
  document.addEventListener("keydown", escape, true);
  function editable(node) {
    if (!(node instanceof Element)) return null;
    if (node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement)
      return node;
    if (!node.isContentEditable) return null;
    let root = node;
    while (root.parentElement?.isContentEditable) root = root.parentElement;
    return root;
  }
  function choose(e) {
    if (!e.isTrusted || e.composedPath().includes(host) || !picking) return;
    const candidate = e.composedPath().map(editable).find(Boolean);
    if (!candidate) return;
    invalidate();
    field = candidate;
    const plain =
      field instanceof HTMLTextAreaElement ||
      field.contentEditable === "plaintext-only";
    $i("mode").value = plain ? "plain" : "formatted";
    $i("mode").disabled = plain;
    $i("width-label").hidden = plain;
    $i("target").textContent =
      `Destination: ${field.tagName.toLowerCase()}${field.getAttribute("aria-label") ? " · " + field.getAttribute("aria-label") : ""}. Click in another field to switch. Insertion uses an empty cursor; selected text is preserved.`;
    $i("message").textContent =
      "Choose your recipe, then preview. Nothing has been inserted.";
    // Selection settles after the click's default action.
    setTimeout(() => {
      if (field !== candidate) return;
      try {
        snapshot = capture();
      } catch (error) {
        snapshot = null;
        $i("message").textContent = error.message;
      }
    }, 0);
  }
  document.addEventListener("click", choose, true);
  function capture() {
    if (!field?.isConnected)
      throw new Error("Click inside a destination field first.");
    if (field instanceof HTMLInputElement)
      throw new Error(
        "Single-line and password fields cannot hold a QR. Choose a multiline text box or rich editor.",
      );
    if (
      field.matches(":disabled,[readonly]") ||
      field.closest("[inert]") ||
      field.getAttribute("aria-readonly") === "true"
    )
      throw new Error("This editor is read-only.");
    if (field instanceof HTMLTextAreaElement) {
      if (field.selectionStart !== field.selectionEnd)
        throw new Error(
          "Place an empty cursor first. Aqrobat preserves selected text.",
        );
      return { value: field.value, position: field.selectionStart };
    }
    if (!field.isContentEditable)
      throw new Error("This editor is no longer editable.");
    const selection = document.getSelection();
    if (!selection?.rangeCount)
      throw new Error("Place a cursor inside the editor.");
    const range = selection.getRangeAt(0);
    if (!field.contains(range.startContainer) || !range.collapsed)
      throw new Error(
        "Place an empty cursor inside the editor. Selected text is preserved.",
      );
    if (
      range.startContainer.parentElement?.closest('[contenteditable="false"]')
    )
      throw new Error("This part of the editor is not editable.");
    return { value: field.innerHTML, range: range.cloneRange() };
  }
  function contentWidth() {
    const css = getComputedStyle(field);
    return (
      field.clientWidth -
      parseFloat(css.paddingLeft) -
      parseFloat(css.paddingRight)
    );
  }
  const fontKeys = [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "fontStretch",
    "fontVariant",
    "fontKerning",
    "fontFeatureSettings",
    "fontVariationSettings",
    "fontVariantLigatures",
    "letterSpacing",
    "wordSpacing",
    "lineHeight",
  ];
  const textKeys = [
    ...fontKeys,
    "whiteSpace",
    "textTransform",
    "direction",
    "writingMode",
    "textAlign",
    "textIndent",
  ];
  function caretStyle() {
    const node = snapshot?.range?.startContainer;
    return getComputedStyle(
      node ? (node instanceof Element ? node : node.parentElement) : field,
    );
  }
  function fingerprint() {
    const s = getComputedStyle(field);
    const caret = caretStyle();
    return [
      contentWidth(),
      ...textKeys.map((key) => s[key]),
      ...textKeys.map((key) => caret[key]),
      field instanceof HTMLTextAreaElement ? field.maxLength : "",
    ].join("|");
  }
  function measurePlain(qr) {
    const css = getComputedStyle(field);
    const caret = caretStyle();
    if (textKeys.some((key) => caret[key] !== css[key]))
      throw new Error(
        "Plain insertion needs uniform typography at the cursor. Use formatted insertion or the editor’s own plain/code mode.",
      );
    if (
      css.direction !== "ltr" ||
      css.writingMode !== "horizontal-tb" ||
      css.textTransform !== "none" ||
      !["left", "start"].includes(css.textAlign) ||
      parseFloat(css.textIndent) !== 0
    )
      throw new Error(
        "Plain insertion needs left-aligned horizontal text, no indentation, and no automatic case conversion.",
      );
    if (!/pre/.test(css.whiteSpace))
      throw new Error(
        "This editor collapses spaces. Use formatted insertion, or its code/preformatted mode.",
      );
    const probe = document.createElement("pre"),
      span = document.createElement("span");
    probe.style.cssText =
      "all:initial;position:fixed;left:-100000px;top:0;white-space:pre;visibility:hidden;width:max-content;max-width:none;padding:0;margin:0;border:0;";
    for (const key of fontKeys) probe.style[key] = css[key];
    probe.append(span);
    shadow.append(probe);
    try {
      span.textContent = "M\nM";
      const range = document.createRange();
      range.selectNodeContents(span);
      const rects = Array.from(range.getClientRects()).filter(
        (r) => r.width > 0,
      );
      const lineHeight =
        rects.length >= 2
          ? rects.at(-1).top - rects[0].top
          : parseFloat(css.lineHeight);
      const cache = new Map();
      const measure = (text) => {
        if (!cache.has(text)) {
          span.textContent = text;
          cache.set(text, span.getBoundingClientRect().width);
        }
        return cache.get(text);
      };
      // Fail before packing if even one glyph per module cannot fit.
      const minCell =
        lineHeight *
        Math.max(
          qr.recipe.options.repeatY,
          Math.ceil(Math.max(...qr.palette.map(measure)) / lineHeight),
        );
      if (minCell * qr.totalModules > contentWidth() + 0.5)
        throw new Error(
          `The QR needs at least ${Math.ceil(minCell * qr.totalModules)} px at this font; the field has ${Math.floor(contentWidth())} px. Widen the field or choose a smaller font in the editor.`,
        );
      const packed = calibratedText(qr, measure, lineHeight);
      return { ...packed, css };
    } finally {
      probe.remove();
    }
  }
  $i("recipe").onchange = () => {
    describe();
    invalidate();
  };
  for (const id of ["mode", "width"])
    $i(id).onchange = () => {
      invalidate();
      $i("width-label").hidden = $i("mode").value === "plain";
    };
  $i("prepare").onclick = async (click) => {
    if (!click.isTrusted) return;
    invalidate();
    const preparing = revision;
    try {
      if (!field || !snapshot)
        throw new Error("Click inside a destination field first.");
      if (
        !field.isConnected ||
        (field instanceof HTMLTextAreaElement
          ? field.value
          : field.innerHTML) !== snapshot.value
      )
        throw new Error(
          "The draft changed. Click inside the field again before previewing.",
        );
      if (
        field instanceof HTMLInputElement ||
        field.matches(":disabled,[readonly]") ||
        field.closest("[inert]")
      )
        throw new Error("Choose an editable multiline field.");
      // A user may move the cursor with the keyboard after choosing the field.
      // Refresh it without changing the draft or replacing a selection.
      if (field instanceof HTMLTextAreaElement) snapshot = capture();
      else {
        const selection = document.getSelection();
        if (selection?.rangeCount && field.contains(selection.anchorNode))
          snapshot = capture();
      }
      await document.fonts.ready;
      if (preparing !== revision || !host.isConnected) return;
      if (
        (field instanceof HTMLTextAreaElement
          ? field.value
          : field.innerHTML) !== snapshot.value
      )
        throw new Error(
          "The draft changed while fonts loaded. Click inside the field and preview again.",
        );
      const source = fromRecipe(selected().recipe);
      let html = null,
        packed = null;
      if ($i("mode").value === "formatted") {
        const width = Number($i("width").value);
        if (!Number.isInteger(width) || width < 200 || width > 1536)
          throw new Error("Choose a formatted width from 200 to 1536 px.");
        if (width > contentWidth())
          throw new Error(
            `The ${width} px QR does not fit this ${Math.floor(contentWidth())} px field. Reduce the formatted width or widen the editor.`,
          );
        const qr = fromRecipe({
          ...source.recipe,
          options: { ...source.recipe.options, width },
        });
        html = formattedText(qr, textMetrics(qr));
        $i("preview").innerHTML = html;
      } else {
        packed = measurePlain(source);
        if (packed.text.length > 200000)
          throw new Error("The plain output is too large for safe insertion.");
        if (
          field instanceof HTMLTextAreaElement &&
          field.maxLength >= 0 &&
          snapshot.value.length + packed.text.length + 2 > field.maxLength
        )
          throw new Error(
            "The QR exceeds this field's character limit. Nothing will be shortened.",
          );
        if (packed.width > contentWidth() + 0.5)
          throw new Error(
            "The QR would wrap in this field. Widen it or choose a smaller editor font.",
          );
        const pre = document.createElement("pre");
        pre.textContent = packed.text;
        for (const key of fontKeys) pre.style[key] = packed.css[key];
        pre.style.whiteSpace = "pre";
        pre.style.width = `${packed.width}px`;
        pre.style.margin = "0";
        $i("preview").append(pre);
      }
      prepared = { html, packed, fingerprint: fingerprint() };
      $i("insert").disabled = false;
      $i("message").textContent = packed
        ? `Measured ${Math.ceil(packed.width)} × ${Math.ceil(packed.height)} px; maximum spacing error ${packed.maxError.toFixed(2)} px per boundary. Cells may be slightly rectangular; repetition adapts to this font. Full height may scroll. Scan the inserted result before using it.`
        : "This preview contains real styled text. The editor may remove styles; check the inserted and saved result.";
    } catch (error) {
      $i("message").textContent = error.message;
    }
  };
  $i("insert").onclick = async (click) => {
    if (!click.isTrusted) return;
    try {
      if (!prepared || !field?.isConnected)
        throw new Error("Preview the field first.");
      if (
        field.matches(":disabled,[readonly]") ||
        field.closest("[inert]") ||
        field.getAttribute("aria-readonly") === "true"
      )
        throw new Error("This editor is now read-only. Nothing was inserted.");
      if (
        (field instanceof HTMLTextAreaElement
          ? field.value
          : field.innerHTML) !== snapshot.value ||
        fingerprint() !== prepared.fingerprint
      )
        throw new Error(
          "The draft or typography changed. Click inside the field and preview again.",
        );
      const ready = prepared;
      const originalLayouts = new Set(
        field.querySelectorAll("[data-aqrobat-layout]"),
      );
      let expectedPlain = null;
      field.focus();
      if (field instanceof HTMLTextAreaElement)
        field.setSelectionRange(snapshot.position, snapshot.position);
      else {
        const selection = document.getSelection();
        selection.removeAllRanges();
        selection.addRange(snapshot.range);
      }
      // Give controlled editors a cancellable event. Never bypass a veto with
      // direct value/DOM assignment. execCommand preserves Chrome's undo history.
      const event = new InputEvent("beforeinput", {
        bubbles: true,
        composed: true,
        cancelable: true,
        inputType: "insertFromPaste",
        data: ready.packed?.text ?? null,
      });
      if (!field.dispatchEvent(event))
        throw new Error(
          "The editor declined insertion. Its draft is unchanged.",
        );
      if (
        (field instanceof HTMLTextAreaElement
          ? field.value
          : field.innerHTML) !== snapshot.value
      )
        throw new Error(
          "The editor changed its draft during the insertion event. Preview again.",
        );
      if (fingerprint() !== ready.fingerprint)
        throw new Error(
          "The editor changed its typography during insertion. Preview again.",
        );
      const active = field.getRootNode().activeElement;
      const cursor = capture();
      const sameCursor =
        field instanceof HTMLTextAreaElement
          ? cursor.position === snapshot.position
          : cursor.range.startContainer === snapshot.range.startContainer &&
            cursor.range.startOffset === snapshot.range.startOffset;
      if (!(active === field || field.contains(active)) || !sameCursor)
        throw new Error(
          "The editor moved the insertion cursor. Click inside the intended field and preview again.",
        );
      let success;
      if (ready.html)
        success = document.execCommand("insertHTML", false, ready.html);
      else {
        const prefix =
          field instanceof HTMLTextAreaElement &&
          snapshot.position > 0 &&
          snapshot.value[snapshot.position - 1] !== "\n"
            ? "\n"
            : "";
        const suffix = "\n";
        if (field instanceof HTMLTextAreaElement)
          expectedPlain =
            snapshot.value.slice(0, snapshot.position) +
            prefix +
            ready.packed.text +
            suffix +
            snapshot.value.slice(snapshot.position);
        success = document.execCommand(
          "insertText",
          false,
          prefix + ready.packed.text + suffix,
        );
      }
      if (!success)
        throw new Error(
          "This editor did not accept insertion. Use Text HTML/RTF or its own code-block feature instead.",
        );
      prepared = null;
      $i("insert").disabled = true;
      picking = false;
      document.removeEventListener("click", choose, true);
      await new Promise(requestAnimationFrame);
      const insertedLayout = Array.from(
        field.querySelectorAll("[data-aqrobat-layout]"),
      ).find((node) => !originalLayouts.has(node));
      const changed =
        expectedPlain !== null
          ? field.value !== expectedPlain
          : ready.html &&
            (!insertedLayout ||
              Math.abs(
                insertedLayout.getBoundingClientRect().width -
                  Number($i("width").value),
              ) > 1 ||
              Math.abs(
                insertedLayout.getBoundingClientRect().height -
                  Number($i("width").value),
              ) > 2);
      $i("message").textContent = changed
        ? "The editor changed the inserted text or layout. Inspect the draft and use Undo (⌘Z / Ctrl+Z) if needed. Try its own code-block feature or Text HTML/RTF. Formatting is not verified here."
        : "Inserted. Review the actual field and scan it. Use Undo (⌘Z / Ctrl+Z) to remove this insertion. Saved/sent formatting may differ; no scan success is assumed.";
    } catch (error) {
      invalidate();
      $i("message").textContent = error.message;
    }
  };
}

// Shared page code for every editor page: destination style simulation,
// clipboard writing, settle detection, structure measurement, the clip
// rectangle for the screenshot, and the phone simulation canvas.

export const params = new URLSearchParams(location.search);
export const variant = params.get("variant") || "";
export const styleName = params.get("style") || "default";
export const width = Number(params.get("width")) || 640;
export const host = document.getElementById("host");

// Style simulations approximate a destination's text styling. They are not
// the real apps. Block rules model how each destination spaces lines.
const ZERO_BLOCKS = "margin-top:0!important;margin-bottom:0!important;";
export const STYLES = {
  default: null,
  gmail: {
    font: "Arial, Helvetica, sans-serif",
    size: "13.3333px",
    lineHeight: "normal",
    blocks: ZERO_BLOCKS,
  },
  gdocs: {
    font: "Arial, sans-serif",
    size: "14.6667px",
    lineHeight: "1.15",
    blocks: ZERO_BLOCKS,
  },
  slack: {
    font: "Lato, system-ui, -apple-system, sans-serif",
    size: "15px",
    lineHeight: "1.46668",
    blocks: ZERO_BLOCKS,
  },
  discord: {
    font: '"gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
    size: "16px",
    lineHeight: "1.375",
    blocks: ZERO_BLOCKS,
  },
  notion: {
    font: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif',
    size: "16px",
    lineHeight: "1.5",
    // Notion-like blocks: small vertical padding and margin per line block.
    blocks:
      "margin-top:1px!important;margin-bottom:1px!important;padding-top:3px!important;padding-bottom:3px!important;",
  },
  mono: {
    font: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    size: "14px",
    lineHeight: "1.5",
    blocks: ZERO_BLOCKS,
    code: true,
  },
};

function styleSheet() {
  const s = STYLES[styleName];
  let css = `html,body{margin:0;padding:0;background:#fff;color:#000}
#host{margin:24px;width:${width + 240}px}
[data-lab-root]{box-sizing:content-box!important;width:${width}px!important;max-width:none!important;min-width:0!important;border-color:transparent!important;box-shadow:none!important;outline:none!important;caret-color:transparent!important;background:#fff!important;color:#000!important}
[data-lab-root]:not(textarea){height:auto!important;min-height:24px!important;max-height:none!important;overflow:visible!important}
textarea[data-lab-root]{overflow:hidden!important;resize:none!important}
`;
  if (s) {
    css += `#host [data-lab-root]{font-family:${s.font}!important;font-size:${s.size}!important;line-height:${s.lineHeight}!important}
#host [data-lab-root] :is(p,div,li,blockquote,h1,h2,h3,h4,h5,h6){${s.blocks}}
`;
    if (s.code)
      css += `#host [data-lab-root] :is(pre,code){font:inherit!important;margin:0!important}\n`;
  }
  return css;
}
const styleEl = document.createElement("style");
styleEl.textContent = styleSheet();
document.head.append(styleEl);

let adapter = null;
export function register(a) {
  adapter = a;
  // Editors that own their root's attributes (CKEditor) set them through
  // their own view layer.
  if (a.markRoot) a.markRoot();
  else {
    a.root.setAttribute("data-lab-root", "");
    a.root.setAttribute("spellcheck", "false");
  }
  window.lab = api;
  document.documentElement.dataset.labReady = "1";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () =>
  new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

function contentSignature() {
  const r = adapter.root;
  if (adapter.kind === "textarea") return [r.value.length, r.value.length];
  return [
    r.innerHTML.length,
    r.textContent.replace(/[\uFEFF\u2060]/g, "").length,
  ];
}

const collapseOf = (el) => {
  const cs = getComputedStyle(el);
  const collapse = cs.whiteSpaceCollapse;
  if (collapse)
    return {
      spaces: /^(preserve|break-spaces|preserve-spaces)$/.test(collapse),
      newlines: /^(preserve|break-spaces|preserve-breaks)$/.test(collapse),
      value: cs.whiteSpace || collapse,
    };
  const ws = cs.whiteSpace;
  return {
    spaces: /^(pre|pre-wrap|break-spaces)$/.test(ws),
    newlines: /^(pre|pre-wrap|pre-line|break-spaces)$/.test(ws),
    value: ws,
  };
};

const isBlock = (el) => {
  const d = getComputedStyle(el).display;
  return d !== "none" && d !== "contents" && !d.startsWith("inline");
};
const isFiller = (br) =>
  br.classList.contains("ProseMirror-trailingBreak") ||
  br.hasAttribute("data-cke-filler") ||
  br.hasAttribute("data-lexical-managed-linebreak") ||
  !!br.closest("[data-slate-zero-width]");

// Split the editor DOM into rows the way it renders: block boundaries and
// <br> start rows; preserved newlines inside text start rows.
function domRows(root) {
  const out = [];
  let cur = null,
    lastBr = false,
    collapsible = false,
    zeroWidth = 0;
  const push = (s) => {
    out.push({ text: s, collapsible });
    collapsible = false;
  };
  const emit = () => {
    if (cur !== null) push(cur);
    cur = null;
  };
  const walk = (node) => {
    for (const c of node.childNodes) {
      if (c.nodeType === 3) {
        let data = c.data;
        const before = data.length;
        data = data.replace(/[\uFEFF\u200B\u2060]/g, "");
        zeroWidth += before - data.length;
        if (!data) continue;
        const ws = collapseOf(c.parentElement);
        if (!ws.spaces) collapsible = true;
        if (ws.newlines) {
          const parts = data.split("\n");
          parts.forEach((p, i) => {
            if (i > 0) {
              push(cur ?? "");
              cur = "";
            }
            cur = (cur ?? "") + p;
          });
          lastBr = data.endsWith("\n");
        } else {
          cur = (cur ?? "") + data.replace(/[\r\n]/g, " ");
          lastBr = false;
        }
      } else if (c.nodeType === 1) {
        if (c.tagName === "BR") {
          if (isFiller(c)) continue;
          push(cur ?? "");
          cur = "";
          lastBr = true;
        } else if (/^(IMG|SVG|CANVAS|STYLE|SCRIPT)$/i.test(c.tagName)) {
          continue;
        } else if (isBlock(c)) {
          if (cur !== null && cur !== "") emit();
          cur = "";
          lastBr = false;
          walk(c);
          if (lastBr && cur === "") cur = null;
          else emit();
          lastBr = false;
        } else walk(c);
      }
    }
  };
  walk(root);
  if (!(lastBr && cur === "")) emit();
  return { rows: out, zeroWidth };
}

function textNodes(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const list = [];
  for (let n = w.nextNode(); n; n = w.nextNode()) list.push(n);
  return list;
}

// Visual line boxes: client rects of text, clustered by vertical midpoint.
function visualLines(root) {
  const rects = [];
  const range = document.createRange();
  for (const t of textNodes(root)) {
    range.selectNodeContents(t);
    for (const r of range.getClientRects())
      if (r.width > 0.5 && r.height > 0.5) rects.push(r);
  }
  rects.sort((a, b) => a.top - b.top || a.left - b.left);
  const lines = [];
  for (const r of rects) {
    const mid = (r.top + r.bottom) / 2;
    const line = lines.find((l) => mid > l.top && mid < l.bottom);
    if (line) {
      line.top = Math.min(line.top, r.top);
      line.bottom = Math.max(line.bottom, r.bottom);
      line.left = Math.min(line.left, r.left);
      line.right = Math.max(line.right, r.right);
    } else
      lines.push({
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        right: r.right,
      });
  }
  lines.sort((a, b) => a.top - b.top);
  return lines;
}

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

const FONT_PROPS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "wordSpacing",
  "lineHeight",
  "textTransform",
  "fontKerning",
  "fontVariantLigatures",
  "tabSize",
];

function probe(styleSource, text) {
  const cs = getComputedStyle(styleSource);
  const p = document.createElement("div");
  for (const k of FONT_PROPS) p.style[k] = cs[k];
  Object.assign(p.style, {
    position: "absolute",
    left: "-100000px",
    top: "0",
    display: "inline-block",
    whiteSpace: "pre",
    padding: "0",
    margin: "0",
    border: "0",
  });
  p.textContent = text;
  document.body.append(p);
  const out = {
    width: p.getBoundingClientRect().width,
    height: p.getBoundingClientRect().height,
  };
  p.remove();
  return out;
}

function textareaMirror(ta) {
  const cs = getComputedStyle(ta);
  const m = document.createElement("div");
  for (const k of FONT_PROPS) m.style[k] = cs[k];
  Object.assign(m.style, {
    position: "absolute",
    left: "-100000px",
    top: "0",
    width: `${ta.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)}px`,
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    wordBreak: cs.wordBreak,
    padding: "0",
    border: "0",
  });
  m.textContent = ta.value;
  document.body.append(m);
  return m;
}

// Relative luminance of a computed CSS color; null when transparent.
function luminance(color) {
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a = 1] = m[1]
    .split(/[ ,/]+/)
    .filter(Boolean)
    .map(Number);
  if (a === 0) return null;
  const lin = (c) =>
    (c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function backgroundOf(el) {
  for (let e = el; e; e = e.parentElement) {
    const l = luminance(getComputedStyle(e).backgroundColor);
    if (l !== null) return { el: e, l };
  }
  return { el: null, l: 1 };
}

const countChars = (s) => {
  const m = {};
  for (const ch of s) m[ch] = (m[ch] || 0) + 1;
  return m;
};

const api = {
  get root() {
    return adapter.root;
  },
  async writeClipboard({ text, html }) {
    const item = { "text/plain": new Blob([text], { type: "text/plain" }) };
    if (html) item["text/html"] = new Blob([html], { type: "text/html" });
    await navigator.clipboard.write([new ClipboardItem(item)]);
    const items = await navigator.clipboard.read();
    return items[0]?.types ?? [];
  },
  // Some editors (Tiptap) focus on the next animation frame.
  async focus() {
    adapter.focus();
    await frame();
    await frame();
    return (
      document.activeElement === adapter.root ||
      adapter.root.contains(document.activeElement)
    );
  },
  // Wait until the content stops changing after a paste.
  async settle(timeout = 5000) {
    const t0 = performance.now();
    let last = null,
      stable = 0;
    while (performance.now() - t0 < timeout) {
      await sleep(40);
      const [sig, textLen] = contentSignature();
      if (sig === last && textLen > 0) {
        if (++stable >= 3) {
          await frame();
          return { settled: true, ms: Math.round(performance.now() - t0) };
        }
      } else {
        stable = 0;
        last = sig;
      }
    }
    return { settled: false, ms: Math.round(performance.now() - t0) };
  },
  async finish() {
    adapter.after?.();
    if (document.activeElement && document.activeElement !== document.body)
      document.activeElement.blur();
    getSelection()?.removeAllRanges();
    await frame();
    await frame();
  },
  modelText() {
    try {
      return adapter.modelText ? adapter.modelText() : null;
    } catch (e) {
      return `error: ${e.message}`;
    }
  },
  // Structure measurement. `expected` carries the rows and module geometry.
  measure({ rows: expectedRows, totalModules, down, dark }) {
    const root = adapter.root;
    const textarea = adapter.kind === "textarea";
    let rows,
      zeroWidth = 0,
      lines,
      glyphHost = root,
      html;
    let mirror = null;
    if (textarea) {
      rows = root.value
        .split("\n")
        .map((text) => ({ text, collapsible: false }));
      mirror = textareaMirror(root);
      lines = visualLines(mirror);
      html = root.value;
    } else {
      const d = domRows(root);
      rows = d.rows;
      zeroWidth = d.zeroWidth;
      lines = visualLines(root);
      html = root.innerHTML;
      const withDark = textNodes(root).find((t) =>
        dark.some((g) => t.data.includes(g)),
      );
      const anyText = textNodes(root).find((t) => t.data.trim());
      glyphHost = (withDark || anyText)?.parentElement ?? root;
    }
    const trimEdges = (list, key = (x) => x) => {
      let a = 0,
        b = list.length;
      while (a < b && key(list[a]) === "") a++;
      while (b > a && key(list[b - 1]) === "") b--;
      return { list: list.slice(a, b), leading: a, trailing: list.length - b };
    };
    const t = trimEdges(rows, (r) => r.text);
    const actual = t.list.map((r) => r.text);
    const rendered = t.list.map((r) =>
      r.collapsible
        ? r.text.replace(/[ \t]+/g, " ").replace(/^ | $/g, "")
        : r.text,
    );
    const nb = (s) => s.replace(/\u00A0/g, " ");
    const exactRaw =
      actual.length === expectedRows.length &&
      actual.every((r, i) => r === expectedRows[i]);
    const exactNbsp =
      actual.length === expectedRows.length &&
      actual.every((r, i) => nb(r) === expectedRows[i]);
    const renderedExact =
      rendered.length === expectedRows.length &&
      rendered.every((r, i) => nb(r) === expectedRows[i]);
    const rowsCollapsedByRender = rendered.filter(
      (r, i) => r !== actual[i],
    ).length;
    let rowsMatched = 0;
    for (let i = 0; i < Math.min(actual.length, expectedRows.length); i++)
      if (nb(actual[i]) === expectedRows[i]) rowsMatched++;
    const expChars = countChars(expectedRows.join("")),
      actChars = countChars(actual.join(""));
    const charDiff = {};
    for (const ch of new Set([
      ...Object.keys(expChars),
      ...Object.keys(actChars),
    ]))
      if ((expChars[ch] || 0) !== (actChars[ch] || 0))
        charDiff[
          `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`
        ] = [expChars[ch] || 0, actChars[ch] || 0];
    const nonEmptyRendered = rendered.filter((r) => r.length).length;
    const ws = collapseOf(textarea ? root : glyphHost);
    const cs = getComputedStyle(glyphHost);
    // Kept for the font query; editors may strip attributes from their DOM.
    window.__labGlyphHost = glyphHost;
    const textLum = luminance(cs.color) ?? 0;
    const bg = backgroundOf(glyphHost);
    // Widest expected row in the pasted text's own font: proportional fonts
    // make rows differ, so take the maximum over the distinct rows.
    const p = [...new Set(expectedRows)]
      .map((row) => probe(textarea ? root : glyphHost, row))
      .reduce((a, b) => (b.width > a.width ? b : a));
    const tops = lines.map((l) => l.top);
    const pitch = median(tops.slice(1).map((y, i) => y - tops[i]));
    const moduleW = p.width / totalModules;
    const moduleH = (pitch ?? p.height) * down;
    const rootRect = root.getBoundingClientRect();
    // Textarea line boxes come from an offscreen mirror; use the box itself.
    const contentLines = textarea ? [] : lines;
    const contentRight = contentLines.length
      ? Math.max(...contentLines.map((l) => l.right))
      : rootRect.right;
    const contentBottom = contentLines.length
      ? Math.max(...contentLines.map((l) => l.bottom))
      : rootRect.bottom;
    const contentLeft = contentLines.length
      ? Math.min(...contentLines.map((l) => l.left))
      : rootRect.left;
    const clip = {
      x: Math.floor(Math.min(rootRect.left, contentLeft) + scrollX),
      y: Math.floor(rootRect.top + scrollY),
      right: Math.ceil(Math.max(rootRect.right, contentRight) + scrollX),
      bottom: Math.ceil(Math.max(rootRect.bottom, contentBottom) + scrollY),
    };
    mirror?.remove();
    const result = {
      rows: {
        expected: expectedRows.length,
        actual: actual.length,
        leadingEmpty: t.leading,
        trailingEmpty: t.trailing,
        matched: rowsMatched,
        exactRaw,
        exactNbspAsSpace: exactNbsp,
        renderedExact,
        rowsCollapsedByRender,
        nonEmptyRendered,
      },
      chars: { diff: charDiff, zeroWidthRemoved: zeroWidth },
      render: {
        whiteSpace: ws.value,
        preservesSpaces: ws.spaces,
        fontFamily: cs.fontFamily,
        glyphTag: glyphHost.tagName.toLowerCase(),
        textColor: cs.color,
        background: bg.el ? getComputedStyle(bg.el).backgroundColor : "none",
        inverted: textLum > bg.l,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        visualLines: lines.length,
        wrapped: lines.length > nonEmptyRendered,
        linePitch: pitch,
        rootWidth: Math.round(rootRect.width),
        rootHeight: Math.round(rootRect.height),
        contentWidth: textarea
          ? Math.round(
              lines.length
                ? Math.max(...lines.map((l) => l.right - l.left))
                : 0,
            )
          : Math.round(contentRight - contentLeft),
        overflowX: !textarea && contentRight > rootRect.right + 1,
        textareaScrollHeight: textarea ? root.scrollHeight : undefined,
      },
      geometry: {
        moduleW,
        moduleH,
        aspect: moduleH ? moduleW / moduleH : null,
        probeWidth: p.width,
        probeHeight: p.height,
      },
      html: { length: html.length, sample: html.slice(0, 280) },
      firstRows: actual.slice(0, 2).map((r) => r.slice(0, 80)),
      clip: {
        x: clip.x,
        y: clip.y,
        width: clip.right - clip.x,
        height: clip.bottom - clip.y,
      },
    };
    return result;
  },
  // Phone simulation: rescale so one module is about 4 px, blur 0.8 px, and
  // place on white with a 20 px margin. A simulation, not a phone camera.
  async phoneSim({ b64, scale }) {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const w = Math.max(1, Math.round(img.width * scale)),
      h = Math.max(1, Math.round(img.height * scale));
    const c = document.createElement("canvas");
    c.width = w + 40;
    c.height = h + 40;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.filter = "blur(0.8px)";
    ctx.drawImage(img, 20, 20, w, h);
    return c.toDataURL("image/png").split(",")[1];
  },
};

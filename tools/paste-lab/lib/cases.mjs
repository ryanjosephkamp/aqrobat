// The case matrix: editors, destination style simulations, widths, formats,
// and payloads. Formats are built with Aqrobat's own src/ code.
import { generate } from "../../../src/core.mjs";
import { tileText, blockText } from "../../../src/portable.mjs";
import { plainText } from "../../../src/text.mjs";

export const PAYLOADS = {
  short: "https://example.com",
  long: "https://ryanjosephkamp.github.io/aqrobat/?ref=paste-lab-2026",
};

const RICH = ["default", "gmail", "gdocs", "slack", "discord", "notion"];
const CODE = ["default", "mono"];
// entry = bundle name in dist/, variant = page variant flag.
export const EDITORS = {
  textarea: {
    entry: "textarea",
    styles: ["mono", "gmail", "gdocs", "slack", "discord", "notion"],
    license: "n/a (browser)",
  },
  contenteditable: {
    entry: "contenteditable",
    styles: RICH,
    license: "n/a (browser)",
  },
  prosemirror: { entry: "prosemirror", styles: RICH, license: "MIT" },
  "prosemirror-code": {
    entry: "prosemirror",
    variant: "code",
    styles: CODE,
    license: "MIT",
  },
  tiptap: { entry: "tiptap", styles: RICH, license: "MIT" },
  "tiptap-code": {
    entry: "tiptap",
    variant: "code",
    styles: CODE,
    license: "MIT",
  },
  quill: { entry: "quill", styles: RICH, license: "BSD-3-Clause" },
  "quill-code": {
    entry: "quill",
    variant: "code",
    styles: CODE,
    license: "BSD-3-Clause",
  },
  lexical: { entry: "lexical", styles: RICH, license: "MIT" },
  "lexical-plain": {
    entry: "lexical",
    variant: "plain",
    styles: RICH,
    license: "MIT",
  },
  ckeditor: {
    entry: "ckeditor",
    styles: RICH,
    license: "GPL-2.0-or-later (licenseKey 'GPL') or commercial",
  },
  "ckeditor-code": {
    entry: "ckeditor",
    variant: "code",
    styles: CODE,
    license: "GPL-2.0-or-later (licenseKey 'GPL') or commercial",
  },
  slate: { entry: "slate", styles: RICH, license: "MIT" },
};
export const WIDTHS = [640, 1000];

// Format ids double as filename parts.
export const FORMATS = [];
for (const [darkName, dark] of [
  ["black", "⬛"],
  ["blue", "🟦"],
])
  for (const [across, down] of [
    [1, 1],
    [2, 1],
  ])
    for (const quiet of [4, 2])
      FORMATS.push({
        id: `tiles-${darkName}-${across}x${down}-q${quiet}`,
        family: "tiles",
        kind: "tiles",
        opts: { dark, across, down, quiet },
      });
for (const across of [2, 3])
  for (const fence of [false, true])
    FORMATS.push({
      id: `blocks-${across}x1${fence ? "-fence" : ""}`,
      family: "blocks",
      kind: "blocks",
      opts: { across, down: 1, fence },
    });
FORMATS.push({
  id: "rich-block-2x1",
  family: "rich",
  kind: "rich",
  opts: { glyph: "█", repeatX: 2, repeatY: 1, width: 328 },
});
FORMATS.push({
  id: "rich-hash-4x2",
  family: "rich",
  kind: "rich",
  opts: { glyph: "#", repeatX: 4, repeatY: 2, width: 328 },
});
FORMATS.push({
  id: "plain-hash-2x1",
  family: "plain",
  kind: "plain",
  opts: { glyph: "#", repeatX: 2, repeatY: 1 },
});

const splitRows = (text) => text.replace(/\n$/, "").split("\n");

// Builds clipboard contents and expectations. `buildRich` runs in Chrome.
export async function buildPayloads(buildRich) {
  const out = {};
  for (const [pid, payload] of Object.entries(PAYLOADS))
    for (const f of FORMATS) {
      let clip, rows, probeRow, totalModules, down, dark, qr;
      if (f.kind === "tiles") {
        qr = generate(payload);
        const t = tileText(qr, f.opts);
        clip = { text: t.text };
        rows = splitRows(t.text);
        probeRow = t.rows[0];
        totalModules = qr.modules + 2 * f.opts.quiet;
        down = f.opts.down;
        dark = [f.opts.dark];
      } else if (f.kind === "blocks") {
        qr = generate(payload);
        const b = blockText(qr, f.opts);
        clip = { text: b.text };
        rows = splitRows(b.text);
        probeRow = b.rows[0];
        totalModules = qr.modules + 2 * qr.quiet;
        down = 1;
        dark = ["█"];
      } else if (f.kind === "plain") {
        qr = generate(payload, f.opts);
        const p = plainText(qr);
        clip = { text: p.text };
        rows = splitRows(p.text);
        probeRow = p.rows[0];
        totalModules = qr.modules + 2 * qr.quiet;
        down = p.down;
        dark = [f.opts.glyph];
      } else {
        qr = generate(payload, f.opts);
        const r = await buildRich(payload, f.opts);
        clip = { text: r.text, html: r.html };
        rows = splitRows(r.text);
        probeRow = r.rows[0];
        totalModules = qr.modules + 2 * qr.quiet;
        down = r.down;
        dark = [f.opts.glyph];
      }
      out[`${f.id}|${pid}`] = {
        format: f.id,
        family: f.family,
        payloadId: pid,
        payload,
        version: qr.version,
        modules: qr.modules,
        clip,
        expect: { rows, probeRow, totalModules, down, dark },
      };
    }
  return out;
}

export function allCases(filter = () => true) {
  const cases = [];
  for (const [editor, e] of Object.entries(EDITORS))
    for (const style of e.styles)
      for (const width of WIDTHS)
        for (const f of FORMATS)
          for (const pid of Object.keys(PAYLOADS)) {
            const c = {
              editor,
              entry: e.entry,
              variant: e.variant || "",
              style,
              width,
              format: f.id,
              family: f.family,
              payloadId: pid,
            };
            c.id = `${editor}-${style}-w${width}-${f.id}-${pid}`;
            if (filter(c)) cases.push(c);
          }
  return cases;
}

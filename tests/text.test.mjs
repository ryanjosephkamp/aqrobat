import test from "node:test";
import assert from "node:assert/strict";
import { generate } from "../src/core.mjs";
import {
  plainText,
  formattedText,
  textRtf,
  textDocument,
  exportName,
} from "../src/text.mjs";

test("plain text balances ASCII and keeps whole emoji with wide light modules", () => {
  for (const glyph of ["#", "🚀", "⚫️", "🤣.☄️1:a"]) {
    const qr = generate("https://example.com", {
      glyph,
      repeatX: 1,
      repeatY: 1,
    });
    const p = plainText(qr);
    assert.equal(p.text, p.rows.join("\n") + "\n");
    assert.equal(p.rows.length, qr.totalModules * p.down);
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    const widths = p.rows.map((row) =>
      [...segmenter.segment(row)].reduce(
        (n, { segment }) =>
          n + (/🚀|⚫️|🤣|☄️|\u3000/u.test(segment) ? (p.mixed ? 5 / 3 : 1) : 1),
        0,
      ),
    );
    assert(widths.every((width) => Math.abs(width - widths[0]) < 1e-6));
    assert(p.rows.slice(0, qr.quiet * p.down).every((row) => !row.trim()));
    assert(p.rows.slice(-qr.quiet * p.down).every((row) => !row.trim()));
    if (glyph === "#") assert.equal(p.across, 2);
    if (glyph === "🚀") assert.equal(p.blank, "\u3000");
  }
});
test("formatted HTML and RTF contain text, safe escapes and fixed layout, without images", () => {
  const qr = generate("<script>alert(1)</script>", {
    glyph: "<>{\\🚀",
    repeatX: 1,
    repeatY: 1,
  });
  const metrics = {
    kind: "positioned glyphs",
    fontSizes: Object.fromEntries(qr.palette.map((g) => [g, 18])),
  };
  const html = formattedText(qr, metrics),
    doc = textDocument(qr, metrics),
    rtf = textRtf(qr, metrics);
  assert(!/<(?:img|canvas|svg|script)\b/i.test(html));
  assert(html.includes("&lt;"));
  assert(html.includes("<table"));
  assert(!doc.includes("<script>"));
  assert(rtf.startsWith("{\\rtf1"));
  assert(rtf.includes("\\u-10179?\\u-8576?"));
  assert(rtf.includes("\\tx"));
  assert(rtf.includes("\\\\"));
  assert(rtf.includes("\\{"));
  const narrow = generate("test", { glyph: "#" });
  assert(
    formattedText(narrow, {
      kind: "text rows",
      fontSize: 10,
      lineHeight: 6,
    }).includes("white-space:pre"),
  );
});
test("download base names cannot introduce paths or reserved device names", () => {
  assert.equal(exportName("../my/code"), "..-my-code");
  assert.equal(exportName("NUL"), "aqrobat");
  assert.equal(exportName(""), "aqrobat");
  assert.equal(exportName("🚀 launch"), "🚀 launch");
  assert(exportName("x".repeat(200)).length <= 80);
});

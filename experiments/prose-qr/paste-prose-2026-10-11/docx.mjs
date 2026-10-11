import { coalescedRuns } from "./compact.mjs";
const xmlEscape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
const utf8 = new TextEncoder();
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) {
    crc ^= b;
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function joinBytes(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
function zipStored(entries) {
  const local = [],
    central = [];
  let offset = 0;
  for (const [name, text] of entries) {
    const n = utf8.encode(name),
      data = utf8.encode(text),
      crc = crc32(data),
      head = new Uint8Array(30),
      h = new DataView(head.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x800, true);
    h.setUint16(12, 33, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true);
    h.setUint32(22, data.length, true);
    h.setUint16(26, n.length, true);
    const dir = new Uint8Array(46),
      d = new DataView(dir.buffer);
    d.setUint32(0, 0x02014b50, true);
    d.setUint16(4, 20, true);
    d.setUint16(6, 20, true);
    d.setUint16(8, 0x800, true);
    d.setUint16(14, 33, true);
    d.setUint32(16, crc, true);
    d.setUint32(20, data.length, true);
    d.setUint32(24, data.length, true);
    d.setUint16(28, n.length, true);
    d.setUint32(42, offset, true);
    local.push(head, n, data);
    central.push(dir, n);
    offset += head.length + n.length + data.length;
  }
  const c = joinBytes(central),
    end = new Uint8Array(22),
    e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, entries.length, true);
  e.setUint16(10, entries.length, true);
  e.setUint32(12, c.length, true);
  e.setUint32(16, offset, true);
  return joinBytes([...local, c, end]);
}

// Text-only editable OOXML. No font embedding, image, hidden text, or module paint.
export function proseDocx(layout, { paper = "Letter" } = {}) {
  const s = layout.spec,
    halfPoints = s.fontSize * 1.5,
    bodyTwips = Math.round(s.field * 15),
    leadingTwips = Math.round(layout.leading * 15);
  if (s.font !== "Impact" || s.darkWeight !== 400 || s.lightWeight !== 400)
    throw new Error(
      "This document exporter currently supports the measured single-face Impact recipe.",
    );
  if (Math.abs(halfPoints - Math.round(halfPoints)) > 1e-8)
    throw new Error(
      "Word requires an exact half-point font choice for this exporter.",
    );
  const page =
    paper === "Letter"
      ? [12240, 15840]
      : paper === "A4"
        ? [11906, 16838]
        : null;
  if (!page) throw new Error("Choose Letter or A4.");
  if (
    bodyTwips > page[0] - 2880 ||
    bodyTwips + leadingTwips + 40 > page[1] - 2880
  )
    throw new Error(
      "The complete text block does not fit this page with one-inch margins.",
    );
  const face = xmlEscape(s.font),
    size = Math.round(halfPoints);
  const props = (color) =>
    `<w:rPr><w:rFonts w:ascii="${face}" w:hAnsi="${face}" w:eastAsia="${face}" w:cs="${face}"/><w:color w:val="${color.toString(16).padStart(2, "0").repeat(3).toUpperCase()}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>`;
  const rows = layout.runs
    .map(
      (row) =>
        coalescedRuns(row)
          .map(
            (r) =>
              `<w:r>${props(r.color)}<w:t xml:space="preserve">${xmlEscape(r.text)}</w:t></w:r>`,
          )
          .join("") + `<w:r>${props(s.dark)}<w:br/></w:r>`,
    )
    .join("");
  const blank = `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>`;
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:tbl><w:tblPr><w:tblW w:w="${bodyTwips}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map((b) => `<w:${b} w:val="nil"/>`).join("")}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar>${["top", "left", "bottom", "right"].map((b) => `<w:${b} w:w="0" w:type="dxa"/>`).join("")}</w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="${bodyTwips}"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="${bodyTwips}" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${leadingTwips}" w:lineRule="exact"/><w:jc w:val="both"/><w:widowControl w:val="0"/>${props(s.dark)}</w:pPr>${rows}</w:p></w:tc></w:tr></w:tbl>${blank}<w:sectPr><w:pgSz w:w="${page[0]}" w:h="${page[1]}"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const rel = "http://schemas.openxmlformats.org/package/2006/relationships";
  const entries = [
    [
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    ],
    [
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${rel}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    ],
    [
      "word/_rels/document.xml.rels",
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${rel}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ],
    [
      "word/styles.xml",
      `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault>${props(s.dark)}</w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`,
    ],
    ["word/document.xml", document],
  ];
  return zipStored(entries);
}

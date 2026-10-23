import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { escapeHtml } from "../layout.mjs";
const boundPages = new WeakSet();
export async function optimize(l, page) {
  if (!boundPages.has(page)) {
    await page.exposeFunction("modelSHA", (s, kind) =>
      createHash("sha256")
        .update(kind === "text" ? s : Buffer.from(s, "base64"))
        .digest("hex"),
    );
    boundPages.add(page);
  }
  const source = await readFile(
    createRequire(import.meta.url).resolve("jsqr"),
    "utf8",
  );
  await page.setContent("<!doctype html><body></body>");
  await page.addScriptTag({
    content: source.replace(
      "return __webpack_require__(__webpack_require__.s = 3);",
      "globalThis.glyphInternals=__webpack_require__; return __webpack_require__(__webpack_require__.s = 3);",
    ),
  });
  const result = await page.evaluate(async (l) => {
    const sha = async (s) => {
      if (typeof s === "string") return window.modelSHA(s, "text");
      let raw = "";
      for (let i = 0; i < s.length; i += 32768)
        raw += String.fromCharCode(...s.subarray(i, i + 32768));
      return window.modelSHA(btoa(raw), "rgba");
    };
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = l.side;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!("letterSpacing" in ctx))
      throw Error("Native canvas tracking unavailable");
    const pad = l.unit * 5,
      n = l.modules,
      lines = [...l.lines],
      centers = [
        [3.5, 3.5],
        [n - 3.5, 3.5],
        [3.5, n - 3.5],
      ].map(([x, y]) => [pad + x * l.unit, pad + y * l.unit]);
    const sample = [];
    for (const [cx, cy] of centers)
      for (const axis of [0, 1])
        for (let d = -2; d <= 2; d++)
          for (let i = 0; i < Math.round(7 * l.unit); i++) {
            const m = Math.floor(i / l.unit),
              target = m === 0 || m === 6 || (m >= 2 && m <= 4),
              start = (axis === 0 ? cx : cy) - 3.5 * l.unit;
            sample.push({
              x: Math.floor(axis === 0 ? start + i : cx + d),
              y: Math.floor(axis === 0 ? cy + d : start + i),
              target,
            });
          }
    const words = [];
    for (let row = 0; row < lines.length; row++)
      for (const match of lines[row].matchAll(/[A-Za-z]+/g)) {
        const x0 = pad + match.index * l.advance,
          x1 = x0 + match[0].length * l.advance,
          y0 = pad + l.textOffsetY + row * l.lineHeight,
          y1 = y0 + l.lineHeight;
        if (
          sample.some(
            (s) => s.x >= x0 && s.x < x1 && s.y >= y0 - 2 && s.y < y1 + 2,
          )
        )
          words.push({ row, col: match.index, length: match[0].length });
      }
    const draw = () => {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, l.side, l.side);
      ctx.fillStyle = "black";
      ctx.font = `${l.spec.weight} 20px '${l.spec.font}'`;
      ctx.fontKerning = "none";
      ctx.letterSpacing = l.spec.tracking + "px";
      ctx.textBaseline = "alphabetic";
      for (let r = 0; r < lines.length; r++)
        ctx.fillText(
          lines[r],
          pad,
          pad + l.textOffsetY + r * l.lineHeight + l.baseline,
        );
      const p = ctx.getImageData(0, 0, l.side, l.side),
        b = globalThis
          .glyphInternals(4)
          .binarize(p.data, p.width, p.height, false).binarized;
      const axisError =
        sample.filter((s) => Boolean(b.get(s.x, s.y)) !== s.target).length /
        sample.length;
      let centerWrong = 0;
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++)
          if (
            Boolean(
              b.get(
                Math.floor(pad + (x + 0.5) * l.unit),
                Math.floor(pad + (y + 0.5) * l.unit),
              ),
            ) !== l.matrix[y][x]
          )
            centerWrong++;
      return {
        p,
        loss: 0.7 * axisError + (0.3 * centerWrong) / (n * n),
        axisError,
        centerWrong,
      };
    };
    const initial = draw(),
      initialPNG = canvas.toDataURL("image/png").split(",")[1],
      initialRgbaHash = await sha(initial.p.data);
    let best = initial;
    const trace = [];
    const patterns = [
      "HE",
      "ME",
      "NE",
      "EE",
      "BE",
      "WE",
      "ru",
      "ur",
      "ar",
      "vu",
      "er",
      "nr",
    ];
    for (let iteration = 0; iteration < 96; iteration++) {
      const w = words[(iteration * 7) % words.length],
        old = lines[w.row].slice(w.col, w.col + w.length),
        pattern =
          patterns[
            (Math.floor(iteration / words.length) + iteration) % patterns.length
          ];
      const allowed = l.structural.allowedGlyphs;
      const candidate = Array.from({ length: w.length }, (_, i) =>
        allowed.includes(pattern[i % pattern.length])
          ? pattern[i % pattern.length]
          : old[i],
      ).join("");
      lines[w.row] =
        lines[w.row].slice(0, w.col) +
        candidate +
        lines[w.row].slice(w.col + w.length);
      const trial = draw(),
        accepted = trial.loss < best.loss - 1e-9;
      trace.push({
        iteration,
        ...w,
        old,
        candidate,
        loss: trial.loss,
        axisError: trial.axisError,
        centerWrong: trial.centerWrong,
        accepted,
        modelPngSha256: await window.modelSHA(
          canvas.toDataURL("image/png").split(",")[1],
          "png",
        ),
        textSha256: await sha(lines.join("\n")),
      });
      if (accepted) best = trial;
      else
        lines[w.row] =
          lines[w.row].slice(0, w.col) +
          old +
          lines[w.row].slice(w.col + w.length);
    }
    const final = draw();
    return {
      initialPNG,
      finalPNG: canvas.toDataURL("image/png").split(",")[1],
      initialRgbaHash,
      finalRgbaHash: await sha(final.p.data),
      initialLoss: initial.loss,
      finalLoss: final.loss,
      initialAxisError: initial.axisError,
      finalAxisError: final.axisError,
      initialCenterWrong: initial.centerWrong,
      finalCenterWrong: final.centerWrong,
      eligibleWords: words.length,
      trace,
      plainText: lines.join("\n"),
    };
  }, l);
  const oldText = l.plainText;
  l.plainText = result.plainText;
  l.lines = result.plainText.split("\n");
  l.markup = l.markup.replace(escapeHtml(oldText), escapeHtml(l.plainText));
  l.structural.fullParagraphModel = true;
  l.structural.modelIterations = result.trace.length;
  l.structural.modelObjective =
    "0.7 finder-axis error + 0.3 source-aligned center error; full native canvas binarization, no model payload decoding";
  const { initialPNG, finalPNG, ...trace } = result;
  trace.seedText = oldText;
  trace.finalText = result.plainText;
  trace.classification =
    "Optimizer model only; native DOM pixels and independent payload probes are separate";
  trace.sourceSha256 = createHash("sha256")
    .update(await readFile(new URL(import.meta.url)))
    .digest("hex");
  return {
    initialPNG: Buffer.from(initialPNG, "base64"),
    finalPNG: Buffer.from(finalPNG, "base64"),
    trace,
  };
}

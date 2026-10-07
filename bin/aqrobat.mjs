#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { generate, fromRecipe, toSvg } from "../src/core.mjs";

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      glyph: { type: "string" },
      ecc: { type: "string" },
      density: { type: "string" },
      size: { type: "string" },
      font: { type: "string" },
      thick: { type: "boolean" },
      "no-boost": { type: "boolean" },
      format: { type: "string", default: "text" },
      out: { type: "string" },
      recipe: { type: "string" },
    },
  });
  if (values.help) {
    process.stdout.write(
      `Aqrobat — deterministic glyph QR experiments\n\nUsage: aqrobat 'https://example.com' [options]\n       aqrobat --recipe recipe.json --format svg --out qr.svg\n\n--glyph '#'        One character or emoji\n--density 4x2      Characters across × rows, each from 1 to 4\n--size 656         SVG/recipe pixels, 200–1536\n--ecc M            L/M/Q/H; --no-boost keeps this exact level\n--font Menlo       Menlo, Courier New, or monospace\n--thick            Thicken glyph ink (default: off in CLI)\n--format text      text, json (matrix + recipe), recipe, or svg\n--out path         Write exclusively; refuses to replace a file\n--recipe path      Load an exported v1 recipe\n\nWithout a payload or recipe, reads up to 1024 UTF-8 bytes from stdin.\nInput is never trimmed. Outputs are untested; copying can change spacing.\n`,
    );
  } else {
    if (positionals.length > 1)
      throw new Error("Quote the payload as one argument.");
    const format = values.format;
    if (!["text", "json", "recipe", "svg"].includes(format))
      throw new Error("Unknown format.");
    let qr;
    if (values.recipe) {
      if (
        positionals.length ||
        ["glyph", "ecc", "density", "size", "font", "thick", "no-boost"].some(
          (k) => Object.hasOwn(values, k),
        )
      )
        throw new Error(
          "Use a recipe by itself; edit its options explicitly before regenerating.",
        );
      const data = await readFile(values.recipe);
      if (data.length > 20_000) throw new Error("Recipe exceeds 20 KB.");
      qr = fromRecipe(JSON.parse(data.toString("utf8")));
    } else {
      let payload = positionals[0];
      if (payload === undefined) {
        if (process.stdin.isTTY)
          throw new Error("Enter a payload, pipe stdin, or use --help.");
        const chunks = [];
        let length = 0;
        for await (const chunk of process.stdin) {
          length += chunk.length;
          if (length > 1024) throw new Error("Input exceeds 1024 UTF-8 bytes.");
          chunks.push(chunk);
        }
        payload = new TextDecoder("utf-8", { fatal: true }).decode(
          Buffer.concat(chunks),
        );
      }
      const options = {
        stroke: values.thick ? 0.1 : 0,
        boost: !values["no-boost"],
      };
      for (const key of ["glyph", "ecc", "font"])
        if (values[key] !== undefined) options[key] = values[key];
      if (values.size !== undefined) options.width = Number(values.size);
      if (values.density !== undefined) {
        if (!/^[1-4]x[1-4]$/.test(values.density))
          throw new Error("Density must be 1x1 through 4x4.");
        [options.repeatX, options.repeatY] = values.density
          .split("x")
          .map(Number);
      }
      qr = generate(payload, options);
    }
    const output =
      format === "text"
        ? qr.text
        : format === "svg"
          ? toSvg(qr)
          : JSON.stringify(format === "recipe" ? qr.recipe : qr, null, 2) +
            "\n";
    if (values.out) await writeFile(values.out, output, { flag: "wx" });
    else process.stdout.write(output);
  }
} catch (error) {
  process.stderr.write(`Aqrobat: ${error.message}\n`);
  process.exitCode = 1;
}

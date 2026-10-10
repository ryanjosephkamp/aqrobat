import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const types = {
  ".html": "text/html",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
  ".zip": "application/zip",
};
const port = Number(process.env.PORT || 4173);
const server = createServer(async (req, res) => {
  try {
    const name = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const path = resolve(
      root,
      "." + name + (name.endsWith("/") ? "index.html" : ""),
    );
    if (
      !path.startsWith(root + sep) ||
      name.split("/").some((s) => s.startsWith("."))
    )
      throw new Error("Invalid path");
    const data = await readFile(path);
    res.writeHead(200, {
      "content-type": types[extname(path)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Aqrobat: http://127.0.0.1:${server.address().port}`),
);

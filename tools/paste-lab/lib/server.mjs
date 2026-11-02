// Minimal static server for the lab: editor bundles, lab pages, and the
// repository's own src/ and vendor/ modules (read only).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
};

export function startServer(repoRoot) {
  const labRoot = resolve(repoRoot, "tools/paste-lab");
  const mounts = [
    ["/lab/dist/", resolve(labRoot, "dist")],
    ["/lab/pages/", resolve(labRoot, "pages")],
    ["/src/", resolve(repoRoot, "src")],
    ["/vendor/", resolve(repoRoot, "vendor")],
  ];
  const server = createServer(async (req, res) => {
    try {
      const name = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (name === "/favicon.ico") {
        res.writeHead(204);
        return res.end();
      }
      const mount = mounts.find(([prefix]) => name.startsWith(prefix));
      if (!mount) throw new Error("no mount");
      const path = resolve(mount[1], "." + name.slice(mount[0].length - 1));
      if (!path.startsWith(mount[1] + sep)) throw new Error("outside");
      const data = await readFile(path);
      res.writeHead(200, {
        "content-type": TYPES[extname(path)] || "application/octet-stream",
        "cache-control": name.startsWith("/lab/dist/")
          ? "max-age=3600"
          : "no-store",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  return new Promise((ok) =>
    server.listen(0, "127.0.0.1", () =>
      ok({
        url: `http://127.0.0.1:${server.address().port}`,
        close: () => server.close(),
      }),
    ),
  );
}

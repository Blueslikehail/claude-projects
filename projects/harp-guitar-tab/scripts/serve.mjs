// Dev server: serves web/ at / and src/core/ at /core/, the same layout as dist/.
// Usage: node scripts/serve.mjs [port]   (or: npm run dev)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
};

/** Map a URL path to a file, refusing anything outside web/ and src/core/. */
export function resolvePath(urlPath) {
  const path = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  const [base, rel] = path.startsWith("/core/")
    ? [join(root, "src/core"), path.slice("/core/".length)]
    : [join(root, "web"), path === "/" ? "index.html" : path.slice(1)];
  const file = resolve(base, rel);
  return file.startsWith(base + sep) ? file : null;
}

export function startServer(port = 8787) {
  const server = createServer(async (req, res) => {
    try {
      const file = resolvePath(req.url);
      if (!file || !(await stat(file)).isFile()) throw new Error("not found");
      res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not found");
    }
  });
  return new Promise((done) => server.listen(port, () => done(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2] ?? process.env.PORT ?? 8787);
  await startServer(port);
  console.log(`Harp Tab Player on http://localhost:${port}`);
}

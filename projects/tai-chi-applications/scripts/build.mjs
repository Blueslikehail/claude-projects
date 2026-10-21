// Build the static site: dist/ = web/ + src/core/ at dist/core/, with index.html wrapped
// in a full HTML skeleton. No bundler: the browser loads the ES modules directly.
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { wrapPage } from "./page.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = `${root}dist`;

rmSync(dist, { recursive: true, force: true });
cpSync(`${root}web`, dist, { recursive: true });
cpSync(`${root}src/core`, `${dist}/core`, { recursive: true });
writeFileSync(`${dist}/index.html`, wrapPage(readFileSync(`${root}web/index.html`, "utf8")));
console.log(`Built ${dist}`);

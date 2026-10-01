// Build the static site for Cloudflare Pages: dist/ = web/ + src/core/ at dist/core/.
// No bundler: the browser loads the ES modules directly.
import { cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = `${root}dist`;

rmSync(dist, { recursive: true, force: true });
cpSync(`${root}web`, dist, { recursive: true });
cpSync(`${root}src/core`, `${dist}/core`, { recursive: true });
console.log(`Built ${dist}`);

import { pathToFileURL } from "node:url";

export function greet(name) {
  return `Hello, ${name}!`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(greet("world"));
}

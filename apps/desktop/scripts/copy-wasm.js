// Copies the tree-sitter WASM files that curlconverter loads at runtime into
// public/ so Vite (dev + build) serves them from the web root.
//
// curlconverter's browser parser fetches "/tree-sitter.wasm" and
// "/tree-sitter-bash.wasm" from the server root; without these the SPA fallback
// returns index.html and the WASM loader aborts ("expected magic word 00 61 73 6d").
//
// Runs on predev/prebuild so the files always match the installed package versions.

import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("..", import.meta.url));
const publicDir = join(root, "public");
mkdirSync(publicDir, { recursive: true });

// curlconverter is a direct dep; web-tree-sitter is its (non-hoisted) transitive
// dep, so resolve it through curlconverter's own module scope.
const curlconverterEntry = require.resolve("curlconverter");
const curlconverterRequire = createRequire(curlconverterEntry);

const targets = [
  // web-tree-sitter runtime
  {
    from: join(dirname(curlconverterRequire.resolve("web-tree-sitter")), "tree-sitter.wasm"),
    to: join(publicDir, "tree-sitter.wasm"),
  },
  // bash grammar shipped by curlconverter (dist/tree-sitter-bash.wasm; entry is dist/src/index.js)
  {
    from: join(dirname(curlconverterEntry), "..", "tree-sitter-bash.wasm"),
    to: join(publicDir, "tree-sitter-bash.wasm"),
  },
];

for (const { from, to } of targets) {
  copyFileSync(from, to);
  console.log(`copied ${from} -> ${to}`);
}

#!/usr/bin/env node
/**
 * Upload Astro dist/ to the marketing-site R2 bucket.
 * Uses wrangler r2 object put (one file per object — fine for static site size).
 *
 * Usage:
 *   node scripts/sync-r2.mjs          # remote R2 (CI / deploy)
 *   node scripts/sync-r2.mjs --local    # local Miniflare R2 (wrangler dev)
 */
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = join(fileURLToPath(import.meta.url), "..", "..");
const distDir = join(siteRoot, "dist");
const bucket = process.env.R2_BUCKET ?? "trypigeon-site";
const local = process.argv.includes("--local");
const remoteFlag = local ? "--local" : "--remote";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".sh": "text/plain; charset=utf-8",
  ".json": "application/json",
};

function mimeFor(file) {
  const ext = file.slice(file.lastIndexOf(".")).toLowerCase();
  return MIME[ext] ?? "application/octet-stream";
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function runWrangler(args) {
  const result = spawnSync("wrangler", args, {
    cwd: siteRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const files = walk(distDir);
if (files.length === 0) {
  console.error("sync-r2: dist/ is empty — run pnpm build first");
  process.exit(1);
}

console.log(`sync-r2: uploading ${files.length} files → ${bucket} (${local ? "local" : "remote"})`);

for (const file of files) {
  const key = relative(distDir, file).split("\\").join("/");
  runWrangler([
    "r2",
    "object",
    "put",
    `${bucket}/${key}`,
    "--file",
    file,
    "--content-type",
    mimeFor(file),
    remoteFlag,
  ]);
}

console.log("sync-r2: done");

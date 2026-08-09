#!/usr/bin/env node
/** Copy src/release.json → public/ and ensure public/latest.json exists for R2 deploy. */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const publicDir = join(root, "public");

mkdirSync(publicDir, { recursive: true });
copyFileSync(join(root, "src/release.json"), join(publicDir, "release.json"));

const latestPath = join(publicDir, "latest.json");
if (!existsSync(latestPath)) {
  writeFileSync(
    latestPath,
    `${JSON.stringify({ version: "0.0.0", notes: "", pub_date: "", platforms: {} }, null, 2)}\n`,
  );
}

console.log("sync-release-public: public/release.json ready");

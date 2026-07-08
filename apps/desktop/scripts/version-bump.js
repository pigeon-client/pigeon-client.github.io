#!/usr/bin/env node
/**
 * version-bump.js
 * Bumps version across package.json, src-tauri/Cargo.toml, and src-tauri/tauri.conf.json
 *
 * Usage: npm run version:bump -- 1.2.3
 */

import { promises as fs } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

const newVersion = process.argv[2];

if (!newVersion) {
  process.exit(1);
}

// Validate semver format
const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
if (!semverRegex.test(newVersion)) {
  process.exit(1);
}

async function bumpJsonFile(filePath, key = "version") {
  const content = await fs.readFile(filePath, "utf-8");
  const json = JSON.parse(content);
  const oldVersion = json[key];
  json[key] = newVersion;
  await fs.writeFile(filePath, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`  Updated ${filePath}: ${oldVersion} -> ${newVersion}`);
}

async function bumpTomlFile(filePath) {
  const content = await fs.readFile(filePath, "utf-8");
  // Match version = "x.y.z" in [package] section
  const result = content.replace(
    /^(version\s*=\s*")[\d.]+(-[a-zA-Z0-9.]+)?(")/m,
    (_match, prefix, preRelease, suffix) => {
      console.log(
        `  Updated ${filePath}: ${prefix}${preRelease ?? ""}${suffix} -> ${prefix}${newVersion}${suffix}`,
      );
      return `${prefix}${newVersion}${suffix}`;
    },
  );
  await fs.writeFile(filePath, result);
}

async function main() {
  console.log(`Bumping version to ${newVersion}...`);

  try {
    // 1. package.json
    await bumpJsonFile(resolve(rootDir, "package.json"));

    // 2. src-tauri/Cargo.toml
    await bumpTomlFile(resolve(rootDir, "src-tauri", "Cargo.toml"));

    // 3. src-tauri/tauri.conf.json
    await bumpJsonFile(resolve(rootDir, "src-tauri", "tauri.conf.json"));

    console.log("\nVersion bump complete! Don't forget to:");
    console.log("  1. Review the changes");
    console.log("  2. Commit the changes");
    console.log(`  3. Run: git tag v${newVersion}`);
    console.log(`  4. Run: git push origin v${newVersion}`);
  } catch (_err) {
    process.exit(1);
  }
}

main();

#!/usr/bin/env node
/**
 * Builds the offline entry page packaged inside the iOS / Android app.
 *
 * The website keeps its normal server-rendered pages. The native app instead
 * loads this page straight from the device: it is the real rendered home
 * screen plus the same client bundle, so the whole app (kitchen, recipes,
 * shopping list, Store Mode, Shopping Trip) opens with no network at all —
 * required by App Store Guideline 4.2 Minimum Functionality.
 *
 * Run after `bun run build`, before `cap sync`.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const CLIENT = "dist/client";
const SERVER_ENTRY = pathToFileURL(resolve("dist/server/index.mjs")).href;

if (!existsSync(CLIENT)) {
  console.error("[native-shell] dist/client missing — run `bun run build` first.");
  process.exit(1);
}

const mod = await import(SERVER_ENTRY);
const handler = mod.default ?? mod;
const ctx = { waitUntil() {}, passThroughOnException() {} };

async function fetchPath(path) {
  return handler.fetch(new Request(`http://localhost${path}`), {}, ctx);
}

/* ---------------------------------------------------- render the home page */

const res = await fetchPath("/");
if (!res.ok) {
  console.error(`[native-shell] Home page render failed with ${res.status}.`);
  process.exit(1);
}
let html = await res.text();

/* ------------------------------------- bundle runtime-served image assets */

function collectAssetPaths(text, into) {
  for (const m of text.matchAll(/\/__l5e\/[A-Za-z0-9_./-]+/g)) into.add(m[0]);
}

const assetPaths = new Set();
collectAssetPaths(html, assetPaths);
for (const file of readdirSync(join(CLIENT, "assets"))) {
  if (!file.endsWith(".js") && !file.endsWith(".css")) continue;
  collectAssetPaths(readFileSync(join(CLIENT, "assets", file), "utf8"), assetPaths);
}

const ASSET_ORIGIN = process.env.NATIVE_ASSET_ORIGIN || "https://thefridgeandcupboard.com";

let saved = 0;
for (const path of assetPaths) {
  try {
    // Project images are served by the hosting asset layer, so fall back to
    // the published origin when the local render can't resolve them.
    let assetRes = await fetchPath(path);
    if (!assetRes.ok) assetRes = await fetch(`${ASSET_ORIGIN}${path}`);
    if (!assetRes.ok) {
      console.warn(`[native-shell] Skipped ${path} (${assetRes.status}).`);
      continue;
    }
    const buf = Buffer.from(await assetRes.arrayBuffer());
    const out = join(CLIENT, path.replace(/^\//, ""));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, buf);
    saved += 1;
  } catch (err) {
    console.warn(`[native-shell] Skipped ${path}: ${(err && err.message) || err}`);
  }
}

/* --------------------------------------------------------- write the shell */

// Keep the phone webview from treating the bundled page as a remote document.
html = html.replace(/<link rel="canonical"[^>]*>/g, "");

// The router's inlined hydration state contains raw NUL bytes inside JS string
// literals. An HTML parser rewrites a raw NUL to U+FFFD, which corrupts the
// route ids on the device. Escape them so the script text is byte-safe.
html = html.split("\u0000").join("\\0");

writeFileSync(join(CLIENT, "index.html"), html);
console.log(
  `[native-shell] Wrote ${CLIENT}/index.html (${html.length} bytes) and bundled ${saved} image asset(s).`,
);

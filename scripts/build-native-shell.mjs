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
const serverEntryPath = existsSync("dist/server/index.mjs")
  ? "dist/server/index.mjs"
  : ".output/server/index.mjs";
const SERVER_ENTRY = pathToFileURL(resolve(serverEntryPath)).href;

if (!existsSync(CLIENT)) {
  console.error("[native-shell] dist/client missing — run `bun run build` first.");
  process.exit(1);
}
if (!existsSync(serverEntryPath)) {
  console.error("[native-shell] server entry missing — run `bun run build` first.");
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

// This page is the rendered home screen. If the webview ever opens it by its
// file name (`/index.html`) or from a stale saved path, the router finds no
// matching page, hydration aborts with "Invariant failed" and the app shows a
// blank screen the moment it opens. Normalise the address before the app
// script runs, and recover once if hydration still fails.
const LAUNCH_PATH_GUARD = `<script>(function(){try{var p=location.pathname||"/";if(p!=="/"){var q=/index\\.html$/.test(p)||p==="";history.replaceState(null,"",(q?"/":p)+location.search+location.hash);}}catch(e){}
var recovered=false;var lastErr="";
function note(e){try{var m=(e&&(e.message||e.reason&&(e.reason.message||e.reason)))||"";var s=(e&&e.error&&e.error.stack)||(e&&e.reason&&e.reason.stack)||"";lastErr=String(m)+"\\n"+String(s).split("\\n").slice(0,5).join("\\n");}catch(x){}}
addEventListener("error",function(ev){note(ev);var m=ev&&ev.message||"";if(!recovered&&m.indexOf("Invariant failed")>-1){recovered=true;try{sessionStorage.setItem("tfc.launch.recovered","1")}catch(e){}if(!sessionStorage.getItem("tfc.launch.reloaded")){try{sessionStorage.setItem("tfc.launch.reloaded","1")}catch(e){}location.replace("/")}}});
addEventListener("unhandledrejection",note);
function healed(){try{return localStorage.getItem("tfc.launch.healed.v1")==="1"}catch(e){return true}}
function heal(){try{localStorage.setItem("tfc.launch.healed.v1","1")}catch(e){}try{var d=[],i;for(i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&(k.indexOf("tfc_")===0||k.indexOf("tfc.")===0||k.indexOf("fac:")===0||k.indexOf("chef_")===0||k.indexOf("cooking_")===0))d.push(k)}for(i=0;i<d.length;i++){try{localStorage.removeItem(d[i])}catch(e){}}}catch(e){}try{sessionStorage.clear()}catch(e){}try{location.replace("/")}catch(e){location.reload()}}
setTimeout(function(){try{var t=(document.body&&document.body.innerText)||"";if(t.indexOf("Something didn't load")===-1)return;if(!healed()){heal();return}
var box=document.createElement("pre");box.style.cssText="margin:12px;padding:10px;max-height:40vh;overflow:auto;white-space:pre-wrap;word-break:break-word;font:11px/1.4 -apple-system,monospace;background:#f4f1ea;color:#444;border-radius:8px";box.textContent=lastErr||"No error detail was captured.";document.body.appendChild(box);}catch(e){}},3500);})();</script>`;
html = html.replace(/<head([^>]*)>/i, (match) => `${match}${LAUNCH_PATH_GUARD}`);


writeFileSync(join(CLIENT, "index.html"), html);
console.log(
  `[native-shell] Wrote ${CLIENT}/index.html (${html.length} bytes) and bundled ${saved} image asset(s).`,
);

#!/usr/bin/env node
/**
 * snapshot.mjs — full-site HTML snapshot capture + two-tier byte diff.
 *
 * The byte-identical regression gate for schema migrations (Phase 7+).
 * Zero dependencies: Node >= 18 built-ins only (global fetch, fs, path, crypto).
 *
 * Usage:
 *   node scripts/snapshot.mjs capture --base http://localhost:3000 --out local-baseline
 *   node scripts/snapshot.mjs diff local-baseline local-post-A
 *   node scripts/snapshot.mjs diff local-baseline local-deploy1 --normalize
 *
 * Tier 0 (default diff): raw SHA-256 byte compare per page. Valid whenever both
 *   snapshots come from the same build. This is the true "byte-identical" gate.
 * Tier 1 (--normalize): strips <script> element bodies (tags kept) and collapses
 *   /_next/static/... asset paths to a placeholder before hashing. For cross-build
 *   comparisons only — removes exactly the build-artifact noise (random buildId,
 *   hashed chunk names, RSC flight payload) while keeping all server-rendered HTML.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const SNAP_ROOT = path.join(process.cwd(), ".snapshots");

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

/** URL path -> snapshot filename (without extension). Root path is "_index". */
function fileNameForPath(urlPath) {
  return urlPath === "/" ? "_index" : urlPath.replace(/\//g, "_");
}

// ---------------------------------------------------------------------------
// capture
// ---------------------------------------------------------------------------

async function capture(args) {
  const base = args.base;
  const label = args.out;
  if (!base || !label) {
    fail("Usage: snapshot.mjs capture --base <url> --out <label>");
  }
  const baseUrl = new URL(base);

  // 1. Enumerate pages from the sitemap.
  const sitemapUrl = new URL("/sitemap.xml", baseUrl).toString();
  const smRes = await fetch(sitemapUrl);
  if (smRes.status !== 200) {
    fail(`FAIL ${sitemapUrl} -> HTTP ${smRes.status}`);
  }
  const sitemapXml = await smRes.text();

  // Extract <loc> values with a regex — the sitemap is machine-generated with a
  // fixed shape; a full XML parser is overkill (see 07-RESEARCH.md Don't Hand-Roll).
  const paths = [];
  const seen = new Set();
  for (const m of sitemapXml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
    // Sitemap URLs carry the canonical domain; only the path matters — the
    // origin is rewritten to --base when fetching.
    const p = new URL(m[1]).pathname;
    if (p === "/sitemap.xml") continue; // never snapshot the sitemap itself (dynamic bytes)
    if (!seen.has(p)) {
      seen.add(p);
      paths.push(p);
    }
  }
  if (paths.length === 0) {
    fail(`No <loc> entries found in ${sitemapUrl}`);
  }
  // The search shell must be covered even if the sitemap omits it.
  if (!seen.has("/search")) {
    paths.push("/search");
  }

  // 2. Fetch every page sequentially; save bodies + manifest.
  const outDir = path.join(SNAP_ROOT, label);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const manifest = {};
  for (const p of paths) {
    const url = new URL(p, baseUrl).toString();
    const res = await fetch(url);
    if (res.status !== 200) {
      fail(`FAIL ${url} -> HTTP ${res.status}`);
    }
    const body = Buffer.from(await res.arrayBuffer());
    const file = `${fileNameForPath(p)}.html`;
    fs.writeFileSync(path.join(outDir, file), body);
    manifest[p] = { file, sha256: sha256(body), bytes: body.length };
  }

  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`Captured ${paths.length} pages -> .snapshots/${label}/`);
}

// ---------------------------------------------------------------------------
// diff
// ---------------------------------------------------------------------------

/**
 * Tier 1 normalization: applied identically to BOTH sides before hashing.
 * (a) Empty every <script> element body — tags stay, so a structural change
 *     (added/removed/moved script) still surfaces as a mismatch.
 * (b) Collapse every /_next/static/... asset path (up to the next quote,
 *     whitespace, backslash, or angle bracket) to /_next/static/X.
 */
function normalize(html) {
  let out = html.replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi, "$1$2");
  out = out.replace(/\/_next\/static\/[^"'\s\\<>]*/g, "/_next/static/X");
  return out;
}

function loadManifest(label) {
  const p = path.join(SNAP_ROOT, label, "manifest.json");
  if (!fs.existsSync(p)) {
    fail(`Snapshot "${label}" not found (missing ${p})`);
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/** Print the first `limit` differing lines between two strings. */
function printLineDiff(aText, bText, labelA, labelB, limit = 20) {
  const aLines = aText.split("\n");
  const bLines = bText.split("\n");
  const max = Math.max(aLines.length, bLines.length);
  let shown = 0;
  for (let i = 0; i < max && shown < limit; i++) {
    const a = aLines[i];
    const b = bLines[i];
    if (a !== b) {
      console.log(`    line ${i + 1}:`);
      console.log(`      - [${labelA}] ${a === undefined ? "<missing>" : truncate(a)}`);
      console.log(`      + [${labelB}] ${b === undefined ? "<missing>" : truncate(b)}`);
      shown++;
    }
  }
  if (shown === limit) {
    console.log(`    ... (further differences truncated)`);
  }
}

function truncate(line, n = 200) {
  return line.length > n ? line.slice(0, n) + "..." : line;
}

function diff(labelA, labelB, opts) {
  const tier = opts.normalize ? "Tier 1 (normalized)" : "Tier 0 (raw bytes)";
  const manA = loadManifest(labelA);
  const manB = loadManifest(labelB);

  // Page-set comparison first.
  const pagesA = Object.keys(manA).sort();
  const pagesB = Object.keys(manB).sort();
  const setB = new Set(pagesB);
  const setA = new Set(pagesA);
  const missing = pagesA.filter((p) => !setB.has(p)); // in A, not in B
  const extra = pagesB.filter((p) => !setA.has(p)); // in B, not in A
  if (missing.length || extra.length) {
    console.log(`Page sets differ between ${labelA} and ${labelB}:`);
    for (const p of missing) console.log(`  missing in ${labelB}: ${p}`);
    for (const p of extra) console.log(`  extra in ${labelB}:   ${p}`);
    process.exit(1);
  }

  let failures = 0;
  for (const p of pagesA) {
    const fileA = path.join(SNAP_ROOT, labelA, manA[p].file);
    const fileB = path.join(SNAP_ROOT, labelB, manB[p].file);
    let rawA = fs.readFileSync(fileA);
    let rawB = fs.readFileSync(fileB);

    let hashA, hashB, textA, textB;
    if (opts.normalize) {
      textA = normalize(rawA.toString("utf8"));
      textB = normalize(rawB.toString("utf8"));
      hashA = sha256(textA);
      hashB = sha256(textB);
    } else {
      hashA = sha256(rawA);
      hashB = sha256(rawB);
    }

    if (hashA === hashB) {
      console.log(`PASS ${p}`);
    } else {
      failures++;
      console.log(`FAIL ${p}`);
      if (!opts.normalize) {
        textA = rawA.toString("utf8");
        textB = rawB.toString("utf8");
      }
      printLineDiff(textA, textB, labelA, labelB);
    }
  }

  const total = pagesA.length;
  if (failures === 0) {
    console.log(`\n${tier}: ${total}/${total} pages identical — PASS`);
    process.exit(0);
  } else {
    console.log(`\n${tier}: ${failures}/${total} pages differ — FAIL`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--normalize") args.normalize = true;
    else if (a === "--base") args.base = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else args._.push(a);
  }
  return args;
}

const argv = process.argv.slice(2);
const cmd = argv[0];
const args = parseArgs(argv.slice(1));

if (cmd === "capture") {
  await capture(args);
} else if (cmd === "diff") {
  const [labelA, labelB] = args._;
  if (!labelA || !labelB) {
    fail("Usage: snapshot.mjs diff <labelA> <labelB> [--normalize]");
  }
  diff(labelA, labelB, args);
} else {
  fail(
    "Usage:\n" +
      "  snapshot.mjs capture --base <url> --out <label>\n" +
      "  snapshot.mjs diff <labelA> <labelB> [--normalize]"
  );
}

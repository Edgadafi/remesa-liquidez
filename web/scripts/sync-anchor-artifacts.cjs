"use strict";

/**
 * Sincroniza IDL Anchor + tipos TS generados hacia web/ antes de next build.
 * - Mono-repo local: tras `anchor build`, copia desde ../target/.
 * - Vercel (Root = web): si ../target no existe, conserva artefactos en web/.
 */

const fs = require("fs");
const path = require("path");

const WEB_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(WEB_ROOT, "..");

const PAIRS = [
  {
    src: path.join(REPO_ROOT, "target", "idl", "remesa_liquidez.json"),
    dst: path.join(WEB_ROOT, "idl", "remesa_liquidez.json"),
  },
  {
    src: path.join(REPO_ROOT, "target", "types", "remesa_liquidez.ts"),
    dst: path.join(WEB_ROOT, "types", "remesa_liquidez.ts"),
  },
];

let copied = 0;
for (const { src, dst } of PAIRS) {
  if (!fs.existsSync(src)) {
    console.warn(`[sync-anchor-artifacts] skip (missing): ${src}`);
    continue;
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log(`[sync-anchor-artifacts] synced → ${path.relative(WEB_ROOT, dst)}`);
  copied++;
}

if (copied === 0) {
  console.log(
    "[sync-anchor-artifacts] no ../target; using committed web/idl + web/types"
  );
}

for (const { dst } of PAIRS) {
  if (!fs.existsSync(dst)) {
    console.error(`[sync-anchor-artifacts] FATAL: missing ${dst}`);
    console.error(
      "Ejecuta: anchor build && node web/scripts/sync-anchor-artifacts.cjs"
    );
    process.exit(1);
  }
}

/**
 * Smoke del audit trail contra el nodo de testnet. No ancla salvo --anchor.
 * No usar en mainnet ni en CI.
 *
 *   npm run smoke:audit
 *   npm run smoke:audit -- --anchor
 *
 * La verificación es manual (verifyAnchor). nirium-cli verify falla en modo
 * solo hash hasta el fix de nirium-protocol/nirium#139.
 */
import { createHash } from "node:crypto";
import {
  postAuditForSmoke,
  signAudit,
  verifyAnchor,
} from "../src/services/auditTrail.js";

function auditUrl(): string {
  return (process.env.AUDIT_URL?.trim() || "https://nirium-agent.fly.dev").replace(/\/$/, "");
}

async function main(): Promise<number> {
  const anchor = process.argv.includes("--anchor");
  const url = auditUrl();
  if (anchor && url.includes("mainnet")) {
    console.error("[audit-smoke] --anchor rechazado: AUDIT_URL contiene mainnet");
    return 1;
  }

  const info = await fetch(`${url}/api/audit/info`);
  const body = (await info.json().catch(() => ({}))) as Record<string, unknown>;
  console.log(`[audit-smoke] GET /api/audit/info → ${info.status}`);
  console.log(
    JSON.stringify(
      {
        network: body.network ?? body.stellarNetwork ?? null,
        rules: body.rules ?? body.limits ?? body.rateLimit ?? null,
      },
      null,
      2
    )
  );
  if (!info.ok) return 1;
  if (!anchor) return 0;

  if (!process.env.AUDIT_SIGNER_SECRET?.trim()) {
    console.error("[audit-smoke] falta AUDIT_SIGNER_SECRET");
    return 1;
  }

  const hex = createHash("sha256")
    .update(`tia-audit-smoke:${Date.now()}`, "utf8")
    .digest("hex");
  signAudit(hex);

  let attempt = await postAuditForSmoke(hex, "tia-smoke");
  console.log(
    `[audit-smoke] POST status=${attempt.status} remaining=${attempt.remaining ?? "-"}`
  );
  if (attempt.status === 429) {
    const wait = attempt.retryAfter ?? 60;
    console.log(`[audit-smoke] 429 retryAfter=${wait}s remaining=${attempt.remaining ?? "-"}`);
    await new Promise((resolve) => setTimeout(resolve, wait * 1000));
    attempt = await postAuditForSmoke(hex, "tia-smoke");
    console.log(
      `[audit-smoke] reintento status=${attempt.status} remaining=${attempt.remaining ?? "-"}`
    );
    if (attempt.status === 429) return 2;
  }
  if (attempt.contentSha256 !== hex || !attempt.cid) {
    console.error(
      `[audit-smoke] contentSha256 !== hex (${attempt.contentSha256 ?? "ausente"})`
    );
    console.error(
      "[audit-smoke] llaves:",
      JSON.stringify(attempt.bodyKeys ?? {}, null, 2)
    );
    return 1;
  }
  const gatewayUrl =
    attempt.gatewayUrl ?? `https://gateway.pinata.cloud/ipfs/${attempt.cid}`;
  console.log(
    `[audit-smoke] cid=${attempt.cid} contentSha256=${attempt.contentSha256} gatewayUrl=${gatewayUrl} remaining=${attempt.remaining ?? "-"}`
  );

  const verified = await verifyAnchor({ gatewayUrl, hex });
  if (!verified.ok) {
    console.error(`[audit-smoke] falló ${verified.step}`);
    return 1;
  }
  console.log("VERIFIED");
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    console.error("[audit-smoke]", err instanceof Error ? err.message : "error");
    process.exit(1);
  });

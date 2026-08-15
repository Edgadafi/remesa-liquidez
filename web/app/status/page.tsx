import idl from "@/idl/remesa_liquidez.json";
import Link from "next/link";
import { TIA, TIA_FONT } from "@/lib/tia-brand";
import { TiaLogo } from "@/components/TiaLogo";

const programId =
  typeof idl.address === "string" ? idl.address : "Fprb6jTLfjXfZ6yuWzS7LVXxwVvPbPgPZiEqDEL9bRfj";

const backendUrl =
  process.env.RENDER_BACKEND_URL ?? "https://remesa-tia-backend.onrender.com";

const provaAgentPda = process.env.NEXT_PUBLIC_PROVA_AGENT_PDA ?? "";
const acceslyAppId = process.env.NEXT_PUBLIC_ACCESLY_APP_ID ?? "";
const stellarPilotEnabled =
  process.env.NEXT_PUBLIC_STELLAR_PILOT_ENABLED === "true";
const acceslyEnv = process.env.NEXT_PUBLIC_ACCESLY_ENV ?? "dev";

export const dynamic = "force-dynamic";

interface BackendHealth {
  ok: boolean;
  detail: string;
  prova?: {
    enabled: boolean;
    active: boolean;
    agentPda: string | null;
    attestationCount?: number;
  };
  x402?: {
    enabled: boolean;
    network: string;
    payTo: string | null;
    routes: Record<string, string>;
  };
}

async function fetchHealth(url: string): Promise<BackendHealth> {
  try {
    const res = await fetch(`${url}/health`, { next: { revalidate: 60 } });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const data = (await res.json()) as {
      status?: string;
      agent?: string;
      prova?: BackendHealth["prova"];
      x402?: BackendHealth["x402"];
    };
    return {
      ok: true,
      detail: data.status ?? data.agent ?? "ok",
      prova: data.prova,
      x402: data.x402,
    };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "offline" };
  }
}

function provaExplorerUrl(agentPda: string): string {
  return `https://www.theprova.xyz/explorer?agent=${encodeURIComponent(agentPda)}`;
}

export default async function StatusPage() {
  const tiaBackend = await fetchHealth(backendUrl);
  const provaPda =
    tiaBackend.prova?.agentPda || provaAgentPda || null;
  const provaLive =
    Boolean(tiaBackend.prova?.enabled && tiaBackend.prova?.active) ||
    Boolean(provaAgentPda);
  const provaDetail = tiaBackend.prova?.enabled
    ? tiaBackend.prova.active
      ? `${tiaBackend.prova.attestationCount ?? 0} attestations`
      : "enabled · not registered"
    : "disabled";

  const acceslyLive = acceslyAppId.length > 0 && stellarPilotEnabled;
  const acceslyDetail = acceslyAppId
    ? stellarPilotEnabled
      ? `${acceslyEnv} · ${acceslyAppId.slice(0, 10)}…`
      : "app configured · pilot off"
    : "NEXT_PUBLIC_ACCESLY_APP_ID unset";

  const x402Enabled = Boolean(tiaBackend.x402?.enabled);
  const x402Detail = x402Enabled
    ? `${tiaBackend.x402?.network ?? "stellar:testnet"} · bridge ${
        tiaBackend.x402?.routes?.["GET /premium/bridge-quote"] ?? "$0.02"
      } · fx ${tiaBackend.x402?.routes?.["GET /premium/fx"] ?? "$0.01"}`
    : "disabled · set NIRIUM_X402_ENABLED on Render";

  const metrics = [
    { label: "Corredor", value: "US → MX" },
    { label: "Comisión", value: "0.25%" },
    { label: "Canal receptor", value: "WhatsApp" },
    { label: "Red", value: "devnet" },
  ];

  return (
    <main
      className="tia-surface-admin"
      style={{
        minHeight: "100vh",
        maxWidth: 720,
        margin: "0 auto",
        padding: "48px 28px 80px",
        background: TIA.forest,
        color: TIA.cream,
      }}
    >
      <Link href="/" style={{ fontSize: 12, color: TIA.textMuted, textDecoration: "none" }}>
        ← TIA
      </Link>

      <div style={{ marginTop: 24 }}>
        <TiaLogo variant="dark" href="/" height={44} />
      </div>

      <h1
        className="text-headline"
        style={{ margin: "28px 0 8px", color: TIA.cream, fontFamily: TIA_FONT.display }}
      >
        Status
      </h1>
      <p className="text-caption" style={{ margin: "0 0 32px", color: TIA.mutedGreen }}>
        Data room · Bridge Dev3pack
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 className="text-label" style={{ margin: "0 0 16px", color: TIA.mutedGreen }}>
          Servicios
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <StatusRow name="Web" status="live" detail="vercel.app" href="https://web-coral-pi-66.vercel.app" />
          <StatusRow
            name="TIA Backend"
            status={tiaBackend.ok ? "live" : "degraded"}
            detail={tiaBackend.detail}
            href={backendUrl}
          />
          <StatusRow
            name="Contrato"
            status="live"
            detail={programId.slice(0, 8) + "…"}
            href={`https://solscan.io/account/${programId}?cluster=devnet`}
          />
          <StatusRow
            name="TIA Agent (Prova)"
            status={provaLive ? "live" : "degraded"}
            detail={provaDetail}
            href={
              provaPda
                ? provaExplorerUrl(provaPda)
                : "https://www.theprova.xyz/explorer"
            }
          />
          <StatusRow
            name="Accesly Stellar"
            status={acceslyLive ? "live" : "degraded"}
            detail={acceslyDetail}
            href="https://dev.accesly.xyz"
          />
          <StatusRow
            name="TIA Premium API (x402)"
            status={x402Enabled ? "live" : "degraded"}
            detail={x402Detail}
            href={`${backendUrl}/premium/fx`}
          />
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 className="text-label" style={{ margin: "0 0 16px", color: TIA.mutedGreen }}>
          Métricas MVP
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {metrics.map((m) => (
            <div key={m.label} className="card-dark">
              <p className="text-label" style={{ margin: 0, color: TIA.mutedGreen }}>
                {m.label}
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 15, fontWeight: 600, color: TIA.cream }}>
                {m.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="alert-liquidity" style={{ marginTop: 8 }}>
        Ejemplo: liquidez baja en tiendita — solo visible en panel de operadores.
      </div>
    </main>
  );
}

function StatusRow({
  name,
  status,
  detail,
  href,
}: {
  name: string;
  status: "live" | "degraded";
  detail: string;
  href: string;
}) {
  const dot = status === "live" ? TIA.mutedGreen : TIA.calor;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="card-dark"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        textDecoration: "none",
        color: TIA.cream,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />
      <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{name}</span>
      <span style={{ fontSize: 12, color: TIA.mutedGreen, fontFamily: TIA_FONT.mono }}>{detail}</span>
    </a>
  );
}

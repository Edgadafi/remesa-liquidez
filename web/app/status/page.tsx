import type { Metadata } from "next";
import idl from "@/idl/remesa_liquidez.json";
import { TIA, TIA_FONT } from "@/lib/tia-brand";
import { SiteNav } from "@/components/SiteNav";
import { CopyValue } from "@/components/CopyValue";

const programId =
  typeof idl.address === "string" ? idl.address : "Fprb6jTLfjXfZ6yuWzS7LVXxwVvPbPgPZiEqDEL9bRfj";

const backendUrl =
  process.env.RENDER_BACKEND_URL ?? "https://remesa-tia-backend.vercel.app";

const provaAgentPda = process.env.NEXT_PUBLIC_PROVA_AGENT_PDA ?? "";
const acceslyAppId = process.env.NEXT_PUBLIC_ACCESLY_APP_ID ?? "";
const stellarPilotEnabled =
  process.env.NEXT_PUBLIC_STELLAR_PILOT_ENABLED === "true";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status",
  description: "Estado de servicios TIA — holatia.app.",
};

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

type ServiceTone = "live" | "wait";

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
  } catch {
    return { ok: false, detail: "Sin respuesta" };
  }
}

function provaExplorerUrl(agentPda: string): string {
  return `https://www.theprova.xyz/explorer?agent=${encodeURIComponent(agentPda)}`;
}

function humanBackendDetail(detail: string): string {
  const d = detail.trim().toLowerCase();
  if (d === "ok" || d === "healthy" || d === "tia") return "API respondiendo";
  if (detail.startsWith("HTTP")) return `Error del servidor (${detail})`;
  if (detail === "Sin respuesta") return "Sin respuesta ahora";
  return detail;
}

export default async function StatusPage() {
  const tiaBackend = await fetchHealth(backendUrl);
  const provaPda = tiaBackend.prova?.agentPda || provaAgentPda || null;

  const prova: { tone: ServiceTone; badge: string; detail: string } =
    tiaBackend.prova?.enabled && tiaBackend.prova.active
      ? {
          tone: "live",
          badge: "En línea",
          detail:
            (tiaBackend.prova.attestationCount ?? 0) === 1
              ? "1 atestación"
              : `${tiaBackend.prova.attestationCount ?? 0} atestaciones`,
        }
      : tiaBackend.prova?.enabled
        ? {
            tone: "wait",
            badge: "En pausa",
            detail: "Agente creado, aún no registrado",
          }
        : {
            tone: "wait",
            badge: "En pausa",
            detail: "Agente de verificación no activo en esta demo",
          };

  const accesly: { tone: ServiceTone; badge: string; detail: string } = acceslyAppId
    ? stellarPilotEnabled
      ? { tone: "live", badge: "En línea", detail: "Cuentas inteligentes Stellar listas" }
      : { tone: "wait", badge: "En pausa", detail: "Piloto Stellar en lista de espera" }
    : { tone: "wait", badge: "No configurado", detail: "Stellar no está activo en esta demo" };

  const x402Enabled = Boolean(tiaBackend.x402?.enabled);
  const x402: { tone: ServiceTone; badge: string; detail: string } = x402Enabled
    ? {
        tone: "live",
        badge: "En línea",
        detail: [
          tiaBackend.x402?.network ?? "stellar:testnet",
          tiaBackend.x402?.routes?.["GET /premium/bridge-quote"]
            ? `puente ${tiaBackend.x402.routes["GET /premium/bridge-quote"]}`
            : null,
          tiaBackend.x402?.routes?.["GET /premium/fx"]
            ? `tipo de cambio ${tiaBackend.x402.routes["GET /premium/fx"]}`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
      }
    : { tone: "wait", badge: "En pausa", detail: "API premium no activa en esta demo" };

  const metrics = [
    { label: "Corredor", value: "US → MX" },
    { label: "Comisión", value: "0.25%" },
    { label: "Canal receptor", value: "WhatsApp" },
    { label: "Red", value: "devnet" },
  ];

  return (
    <div className="tia-page tia-page--admin">
      <div className="tia-shell">
        <SiteNav variant="dark" />

        <main id="contenido">
          <p className="text-label" style={{ margin: "0 0 8px", color: TIA.onDarkMuted }}>
            holatia.app
          </p>
          <h1 className="text-headline" style={{ margin: "0 0 28px", color: TIA.cream }}>
            Status
          </h1>

          <section style={{ marginBottom: 40 }} aria-labelledby="servicios-heading">
            <h2
              id="servicios-heading"
              className="text-label"
              style={{ margin: "0 0 16px", color: TIA.onDarkMuted }}
            >
              Servicios
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <StatusRow
                name="Web"
                tone="live"
                badge="En línea"
                detail="Producción Vercel"
                href="https://web-coral-pi-66.vercel.app"
              />
              <StatusRow
                name="TIA Backend"
                tone={tiaBackend.ok ? "live" : "wait"}
                badge={tiaBackend.ok ? "En línea" : "En pausa"}
                detail={humanBackendDetail(tiaBackend.detail)}
                href={backendUrl}
              />
              <StatusRow
                name="Contrato Solana"
                tone="live"
                badge="Devnet"
                href={`https://solscan.io/account/${programId}?cluster=devnet`}
                copy={{ value: programId, label: "dirección del contrato" }}
              />
              <StatusRow
                name="TIA Agent (Prova)"
                tone={prova.tone}
                badge={prova.badge}
                detail={prova.detail}
                href={
                  provaPda
                    ? provaExplorerUrl(provaPda)
                    : "https://www.theprova.xyz/explorer"
                }
              />
              <StatusRow
                name="Accesly Stellar"
                tone={accesly.tone}
                badge={accesly.badge}
                detail={accesly.detail}
                href="https://dev.accesly.xyz"
              />
              <StatusRow
                name="TIA Premium API"
                tone={x402.tone}
                badge={x402.badge}
                detail={x402.detail}
                href={`${backendUrl}/premium/fx`}
              />
            </div>
          </section>

          <section style={{ marginBottom: 40 }} aria-labelledby="metricas-heading">
            <h2
              id="metricas-heading"
              className="text-label"
              style={{ margin: "0 0 16px", color: TIA.onDarkMuted }}
            >
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
                  <p className="text-label" style={{ margin: 0, color: TIA.onDarkMuted }}>
                    {m.label}
                  </p>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: 18,
                      fontWeight: 600,
                      color: TIA.cream,
                      fontFamily: TIA_FONT.ui,
                    }}
                  >
                    {m.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="alert-liquidity">
            Ejemplo de alerta operativa: liquidez baja en tiendita — solo visible para operadores, no para la familia.
          </div>
        </main>
      </div>
    </div>
  );
}

function StatusRow({
  name,
  tone,
  badge,
  detail,
  href,
  copy,
}: {
  name: string;
  tone: ServiceTone;
  badge: string;
  detail?: string;
  href: string;
  copy?: { value: string; label: string };
}) {
  return (
    <div
      className="card-dark"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: tone === "live" ? TIA.onDarkMuted : TIA.calor,
          flexShrink: 0,
        }}
      />
      <span style={{ flex: "1 1 140px", fontWeight: 600, fontSize: 15, color: TIA.cream }}>
        {name}
      </span>
      <span className={`status-badge status-badge--${tone}`}>{badge}</span>
      {copy ? (
        <CopyValue value={copy.value} label={copy.label} />
      ) : detail ? (
        <span style={{ fontSize: 14, color: TIA.onDarkMuted, lineHeight: 1.4 }}>{detail}</span>
      ) : null}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          marginLeft: "auto",
          fontSize: 13,
          fontWeight: 600,
          color: TIA.calor,
          textDecoration: "none",
          minHeight: 44,
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        Abrir
      </a>
    </div>
  );
}

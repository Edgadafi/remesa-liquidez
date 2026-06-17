import idl from "@/idl/remesa_liquidez.json";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import Link from "next/link";

const sans = Instrument_Sans({ subsets: ["latin"], weight: ["400", "600"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "600"] });

const programId =
  typeof idl.address === "string" ? idl.address : "Fprb6jTLfjXfZ6yuWzS7LVXxwVvPbPgPZiEqDEL9bRfj";

const fg = "#e9ecf3";
const fgMuted = "rgba(233,236,243,0.58)";
const border = "#232937";
const accent = "#5eebc4";
const surface = "#10141f";

const backendUrl =
  process.env.RENDER_BACKEND_URL ?? "https://remesa-tia-backend.onrender.com";

export const dynamic = "force-dynamic";

async function fetchHealth(url: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${url}/health`, { next: { revalidate: 60 } });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const data = (await res.json()) as { status?: string; agent?: string };
    return { ok: true, detail: data.status ?? data.agent ?? "ok" };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "offline" };
  }
}

export default async function StatusPage() {
  const tiaBackend = await fetchHealth(backendUrl);

  const metrics = [
    { label: "Cluster", value: "devnet" },
    { label: "Fee protocolo", value: "0.25% (25 bps)" },
    { label: "Payout comercio", value: "99.75%" },
    { label: "Corredor MVP", value: "US → MX" },
    { label: "Programa Bridge", value: "16 jun – 9 jul 2026" },
  ];

  return (
    <main
      className={sans.className}
      style={{
        minHeight: "100vh",
        maxWidth: 720,
        margin: "0 auto",
        padding: "56px 28px 80px",
      }}
    >
      <Link
        href="/"
        className={mono.className}
        style={{ fontSize: 12, color: fgMuted, textDecoration: "none" }}
      >
        ← Remesa TIA
      </Link>

      <h1 style={{ margin: "24px 0 8px", fontSize: "2rem", fontWeight: 700, color: fg }}>
        Status & Métricas
      </h1>
      <p style={{ margin: "0 0 32px", color: fgMuted, fontSize: 15 }}>
        Data room lite — Semana 3 Bridge (Ivan / Sylvain)
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2
          className={mono.className}
          style={{
            margin: "0 0 16px",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: fgMuted,
          }}
        >
          Servicios
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <StatusRow
            name="Frontend (Vercel)"
            status="live"
            detail="web-coral-pi-66.vercel.app"
            href="https://web-coral-pi-66.vercel.app"
          />
          <StatusRow
            name="Backend TIA (Render)"
            status={tiaBackend.ok ? "live" : "degraded"}
            detail={tiaBackend.detail}
            href={backendUrl}
          />
          <StatusRow
            name="Anchor program"
            status="live"
            detail={programId.slice(0, 8) + "…"}
            href={`https://solscan.io/account/${programId}?cluster=devnet`}
          />
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2
          className={mono.className}
          style={{
            margin: "0 0 16px",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: fgMuted,
          }}
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
            <div
              key={m.label}
              style={{
                padding: "16px",
                background: surface,
                border: `1px solid ${border}`,
                borderRadius: 8,
              }}
            >
              <p
                className={mono.className}
                style={{ margin: 0, fontSize: 11, color: fgMuted, textTransform: "uppercase" }}
              >
                {m.label}
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 15, fontWeight: 600, color: fg }}>
                {m.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2
          className={mono.className}
          style={{
            margin: "0 0 12px",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: fgMuted,
          }}
        >
          Explorers
        </h2>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            {
              label: "Program transactions",
              href: `https://solscan.io/account/${programId}?cluster=devnet#transactions`,
            },
            {
              label: "Documentar txs E2E",
              href: "https://github.com/Edgadafi/remesa-liquidez/blob/main/docs/accelerator/week-03/e2e-transactions.md",
            },
          ].map((link) => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noopener noreferrer" style={{ color: accent, fontSize: 14 }}>
                {link.label} ↗
              </a>
            </li>
          ))}
        </ul>
      </section>
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
  const dot = status === "live" ? "#5eebc4" : "#ffb347";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        background: surface,
        border: `1px solid ${border}`,
        borderRadius: 8,
        textDecoration: "none",
        color: fg,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />
      <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{name}</span>
      <span style={{ fontSize: 12, color: fgMuted, fontFamily: "ui-monospace, monospace" }}>{detail}</span>
    </a>
  );
}

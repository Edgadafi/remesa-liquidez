import type { Metadata } from "next";
import idl from "@/idl/remesa_liquidez.json";
import Link from "next/link";
import nextDynamic from "next/dynamic";
import { TiaPill } from "@/components/TiaPill";
import { SiteNav } from "@/components/SiteNav";
import { CopyValue } from "@/components/CopyValue";
import { CopyCommand } from "@/components/CopyCommand";
import { TIA, TIA_FONT } from "@/lib/tia-brand";
import { resolveBackendHealth } from "@/lib/tia-backend";

const DualChainSender = nextDynamic(
  () => import("@/components/DualChainSender").then((m) => m.DualChainSender),
  { ssr: false, loading: () => null }
);

const programId =
  typeof idl.address === "string" ? idl.address : "Fprb6jTLfjXfZ6yuWzS7LVXxwVvPbPgPZiEqDEL9bRfj";

const FX_PATH = "/premium/fx";
const BRIDGE_PATH = "/premium/bridge-quote";
const FX_FALLBACK = "$0.10";
const BRIDGE_FALLBACK = "$0.25";
const PROOF_TX =
  "f20a580aed9220201c48aabd26eaf2a99ae840afd063bfb85131879eded35bfd";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "USD/MXN live — $0.10 por call",
  description:
    "GET /premium/fx. Tipo de cambio Bitso por HTTP 402. Pagas USDC en Stellar. Sin API key. Sin Stripe.",
  openGraph: {
    title: "USD/MXN live — $0.10 por call",
    description:
      "GET /premium/fx en Stellar pubnet. $0.10 el tick. curl y ves el 402.",
  },
};

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <div
      className="text-label"
      style={{
        display: "flex",
        gap: 10,
        alignItems: "baseline",
        marginBottom: 14,
        color: TIA.textSecondary,
      }}
    >
      <span style={{ color: TIA.calorWarm }} aria-hidden="true">
        {n}
      </span>
      <span>{title}</span>
    </div>
  );
}

export default async function Home() {
  const { backendUrl: apiBase, health } = await resolveBackendHealth();
  const x402 = health.x402;
  const fxUrl = `${apiBase}${FX_PATH}`;
  const bridgeUrl = `${apiBase}${BRIDGE_PATH}`;
  const fxPrice = x402?.routes?.[`GET ${FX_PATH}`] ?? FX_FALLBACK;
  const bridgePrice = x402?.routes?.[`GET ${BRIDGE_PATH}`] ?? BRIDGE_FALLBACK;
  const network = x402?.network ?? "stellar:pubnet";
  const fxLive = Boolean(x402?.enabled);
  const curlFx = `curl -i ${fxUrl}`;

  return (
    <div className="tia-page tia-page--web bg-grid">
      <div className="tia-left-accent" aria-hidden="true" />
      <div className="tia-shell">
        <SiteNav variant="light" />

        <main id="contenido">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <TiaPill label="HTTP 402" />
            <TiaPill label="USDC Stellar" />
            <TiaPill label="Bitso FX" />
            <TiaPill label="x402" technical />
          </div>

          <h1
            className="text-headline"
            style={{
              margin: "28px 0 0",
              color: TIA.textDark,
              fontFamily: TIA_FONT.display,
            }}
          >
            USD/MXN live.{" "}
            <span style={{ color: TIA.calorWarm }}>{fxPrice} por call.</span>
          </h1>

          <p className="text-body" style={{ margin: "20px 0 0", color: TIA.textSecondary, maxWidth: 560 }}>
            <code style={{ fontFamily: TIA_FONT.mono, fontSize: 14 }}>GET {FX_PATH}</code>
            {" "}devuelve el tipo de cambio Bitso. Sin pago ves un{" "}
            <strong style={{ color: TIA.textDark }}>402</strong>. Con USDC en Stellar,
            un 200 y el rate. Sin API key. Sin Stripe.
          </p>

          <p className="text-caption" style={{ margin: "12px 0 0", color: TIA.textSecondary }}>
            {fxLive ? `${network} · API premium en línea` : "API premium en pausa"} · holatia.app
          </p>

          <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 12 }}>
            <a href="#premium-fx" className="btn-primary">
              Probar el 402
            </a>
            <a
              href={fxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Abrir GET {FX_PATH}
            </a>
          </div>

          <div
            style={{
              marginTop: 36,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            <SkuCard
              lead
              method="GET"
              path={FX_PATH}
              price={fxPrice}
              detail="USD/MXN live (Bitso). El SKU que vendemos hoy."
            />
            <SkuCard
              method="GET"
              path={BRIDGE_PATH}
              price={bridgePrice}
              detail="Quote EVM → Solana. Mismo riel, otro precio."
            />
          </div>

          <div id="premium-fx" style={{ marginTop: 48, paddingTop: 32, borderTop: `1px solid ${TIA.softGreen}` }}>
            <SectionTitle n="00" title="Cómo se cobra" />
            <ol
              style={{
                margin: 0,
                padding: "0 0 0 20px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                color: TIA.textSecondary,
                fontSize: 16,
                lineHeight: 1.55,
              }}
            >
              <li>
                <strong style={{ color: TIA.textDark }}>Pegas el curl</strong> — sin pago responde 402 y el header de cobro.
              </li>
              <li>
                <strong style={{ color: TIA.textDark }}>Pagas USDC</strong> — cliente x402 + wallet Stellar con USDC Circle.
              </li>
              <li>
                <strong style={{ color: TIA.textDark }}>Lees el rate</strong> — 200 con pair, rate e isLive.
              </li>
            </ol>
          </div>

          <div style={{ marginTop: 36, paddingTop: 32, borderTop: `1px solid ${TIA.softGreen}` }}>
            <SectionTitle n="01" title="Endpoint" />
            <p style={{ margin: "0 0 12px", fontSize: 15, color: TIA.textSecondary, lineHeight: 1.55 }}>
              20 segundos. El 402 es la demo.
            </p>
            <div
              className="card"
              style={{
                color: TIA.textDark,
              }}
            >
              <CopyCommand command={curlFx} label="comando curl de tipo de cambio" />
            </div>
            <p style={{ margin: "16px 0 0", fontSize: 14, color: TIA.textSecondary, lineHeight: 1.55 }}>
              Puente (upsell):{" "}
              <a
                href={bridgeUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: TIA.institution, fontWeight: 600, textDecoration: "none" }}
              >
                GET {BRIDGE_PATH}
              </a>
              {" · "}
              {bridgePrice}
            </p>
          </div>

          <div style={{ marginTop: 36, paddingTop: 32, borderTop: `1px solid ${TIA.softGreen}` }}>
            <SectionTitle n="02" title="Oferta" />
            <p className="text-body" style={{ margin: 0, color: TIA.textSecondary, maxWidth: 560 }}>
              10 calls de prueba a {fxPrice}. Si el rate te sirve, $20 USDC al mes o sigues
              pay-per-call. Cobra en Stellar. Sin factura.
            </p>
            <p style={{ margin: "16px 0 0", fontSize: 15, color: TIA.textSecondary, lineHeight: 1.55 }}>
              Prueba on-chain:{" "}
              <a
                href={`https://stellar.expert/explorer/public/tx/${PROOF_TX}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: TIA.institution, fontWeight: 600, textDecoration: "none" }}
              >
                tx {PROOF_TX.slice(0, 8)}…
              </a>
            </p>
            <p className="text-caption" style={{ margin: "12px 0 0", color: TIA.textSecondary }}>
              Precios vivos en{" "}
              <Link href="/status" style={{ color: TIA.institution, fontWeight: 600, textDecoration: "none" }}>
                Status
              </Link>
              . La remesa a terceros aún no factura.
            </p>
          </div>

          <div style={{ marginTop: 36, paddingTop: 32, borderTop: `1px solid ${TIA.softGreen}` }}>
            <SectionTitle n="03" title="Ficha técnica" />
            <p style={{ margin: "0 0 12px", fontSize: 15, color: TIA.textSecondary, lineHeight: 1.55 }}>
              Contrato remesa en Solana devnet — no es el cobro de esta API.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                background: TIA.cream,
                borderRadius: 8,
                border: `1px solid ${TIA.softGreen}`,
                color: TIA.textDark,
              }}
            >
              <CopyValue value={programId} label="dirección del contrato" />
              <a
                href={`https://solscan.io/account/${programId}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: TIA.institution,
                  textDecoration: "none",
                  minHeight: 44,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                Ver en Solscan
              </a>
            </div>
          </div>

          <div id="sender-app" style={{ marginTop: 40, paddingTop: 32, borderTop: `1px solid ${TIA.softGreen}` }}>
            <SectionTitle n="04" title="Demo remesa (devnet)" />
            <p style={{ margin: "0 0 20px", fontSize: 15, color: TIA.textSecondary, lineHeight: 1.55 }}>
              Flujo sender aparte. No sustituye el 402 ni cobra a un extraño.
            </p>
            <div className="card">
              <DualChainSender />
            </div>
          </div>

          <footer
            style={{
              marginTop: 56,
              fontSize: 13,
              color: TIA.textSecondary,
              display: "flex",
              flexWrap: "wrap",
              gap: "8px 16px",
            }}
          >
            <span>TIA · holatia.app</span>
            <Link href="/status" style={{ color: TIA.institution, fontWeight: 600, textDecoration: "none" }}>
              Ver status
            </Link>
            <Link href="/merchant" style={{ color: TIA.institution, fontWeight: 600, textDecoration: "none" }}>
              Soy comercio
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}

function SkuCard({
  method,
  path,
  price,
  detail,
  lead = false,
}: {
  method: string;
  path: string;
  price: string;
  detail: string;
  lead?: boolean;
}) {
  return (
    <div
      className="card"
      style={{
        borderColor: lead ? TIA.calorWarm : TIA.softGreen,
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: TIA_FONT.mono,
          fontSize: 13,
          fontWeight: 600,
          color: TIA.textSecondary,
          letterSpacing: 0,
          textTransform: "none",
        }}
      >
        {method} {path}
      </p>
      <p
        style={{
          margin: "10px 0 0",
          fontSize: 28,
          fontWeight: 700,
          fontFamily: TIA_FONT.display,
          color: lead ? TIA.calorWarm : TIA.textDark,
          lineHeight: 1.1,
        }}
      >
        {price}
      </p>
      <p style={{ margin: "10px 0 0", fontSize: 14, color: TIA.textSecondary, lineHeight: 1.5 }}>
        {detail}
      </p>
    </div>
  );
}

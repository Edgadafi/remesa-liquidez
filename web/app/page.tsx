import idl from "@/idl/remesa_liquidez.json";
import Link from "next/link";
import dynamic from "next/dynamic";
import { TiaPill } from "@/components/TiaPill";
import { SiteNav } from "@/components/SiteNav";
import { CopyValue } from "@/components/CopyValue";
import { TIA, TIA_FONT, TIA_TAGLINE_ES } from "@/lib/tia-brand";

const DualChainSender = dynamic(
  () => import("@/components/DualChainSender").then((m) => m.DualChainSender),
  { ssr: false, loading: () => null }
);

const programId =
  typeof idl.address === "string" ? idl.address : "Fprb6jTLfjXfZ6yuWzS7LVXxwVvPbPgPZiEqDEL9bRfj";

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

export default function Home() {
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
            <TiaPill label="WhatsApp" />
            <TiaPill label="AI Agent" />
            <TiaPill label="USDC · MXNe" />
            <TiaPill label="Solana" technical />
            <TiaPill label="Stellar beta" technical />
          </div>

          <h1
            className="text-headline"
            style={{
              margin: "28px 0 0",
              color: TIA.textDark,
              fontFamily: TIA_FONT.display,
            }}
          >
            Manda dólares.{" "}
            <span style={{ color: TIA.calorWarm }}>Cóbralos en tu tienda.</span>
          </h1>

          <p className="text-body" style={{ margin: "20px 0 0", color: TIA.textSecondary, maxWidth: 560 }}>
            TradFi cobra hasta 7% y tarda días — sin automatizar remesas recurrentes.
            TIA envía al instante, enruta el efectivo al cajero o la tiendita,
            y avisa a tu familia por WhatsApp.
          </p>

          <p className="text-caption" style={{ margin: "12px 0 0", color: TIA.textSecondary }}>
            {TIA_TAGLINE_ES} · demo en devnet
          </p>

          <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 12 }}>
            <a href="#sender-app" className="btn-primary">
              Probar demo
            </a>
            <Link href="/merchant" className="btn-secondary">
              Soy comercio
            </Link>
          </div>

          <div style={{ marginTop: 48, paddingTop: 32, borderTop: `1px solid ${TIA.softGreen}` }}>
            <SectionTitle n="00" title="Cómo funciona" />
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
                <strong style={{ color: TIA.textDark }}>Envía</strong> — Conecta tu billetera y crea la remesa.
              </li>
              <li>
                <strong style={{ color: TIA.textDark }}>Enruta</strong> — TIA elige cajero o tiendita y avisa por WhatsApp.
              </li>
              <li>
                <strong style={{ color: TIA.textDark }}>Cobra</strong> — Tu familia retira efectivo sin instalar nada.
              </li>
            </ol>
          </div>

          <div style={{ marginTop: 36, paddingTop: 32, borderTop: `1px solid ${TIA.softGreen}` }}>
            <SectionTitle n="01" title="Ficha técnica" />
            <p style={{ margin: "0 0 12px", fontSize: 15, color: TIA.textSecondary, lineHeight: 1.55 }}>
              Contrato en Solana devnet — para desarrolladores y mentores Bridge.
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
            <SectionTitle n="02" title="Enviar remesa" />
            <p style={{ margin: "0 0 20px", fontSize: 15, color: TIA.textSecondary, lineHeight: 1.55 }}>
              Conecta tu billetera en el celular o computadora. TIA notifica a tu familia cuando la remesa está lista.
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
          </footer>
        </main>
      </div>
    </div>
  );
}

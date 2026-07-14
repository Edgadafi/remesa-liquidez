import idl from "@/idl/remesa_liquidez.json";
import Link from "next/link";
import dynamic from "next/dynamic";
import { TiaLogo } from "@/components/TiaLogo";
import { TiaPill } from "@/components/TiaPill";
import { TIA, TIA_FONT, TIA_TAGLINE_ES } from "@/lib/tia-brand";

const SenderApp = dynamic(
  () => import("@/components/SenderApp").then((m) => m.SenderApp),
  { ssr: false, loading: () => null }
);

const programId =
  typeof idl.address === "string" ? idl.address : "Fprb6jTLfjXfZ6yuWzS7LVXxwVvPbPgPZiEqDEL9bRfj";

const codeBlock: React.CSSProperties = {
  margin: 0,
  padding: "14px 16px",
  background: TIA.cream,
  borderRadius: 8,
  border: `1px solid ${TIA.softGreen}`,
  fontFamily: TIA_FONT.mono,
  fontSize: 13,
  lineHeight: 1.65,
  color: TIA.textSecondary,
  overflowX: "auto",
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
        color: TIA.textMuted,
      }}
    >
      <span style={{ color: TIA.calor }}>{n}</span>
      <span>{title}</span>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <div className="tia-left-accent" aria-hidden />

      <main
        className="bg-grid"
        style={{
          minHeight: "100vh",
          boxSizing: "border-box",
          maxWidth: 640,
          margin: "0 auto",
          padding: "48px 28px 80px",
          paddingLeft: 36,
          fontFamily: TIA_FONT.ui,
        }}
      >
        <TiaLogo variant="light" showTagline height={52} />

        <div
          style={{
            marginTop: 28,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <TiaPill label="WhatsApp" />
          <TiaPill label="AI Agent" />
          <TiaPill label="USDC · MXNe" />
          <TiaPill label="Solana" technical />
        </div>

        <h1
          className="text-headline"
          style={{
            margin: "32px 0 0",
            fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
            color: TIA.textDark,
            fontFamily: TIA_FONT.display,
          }}
        >
          Manda dólares.{" "}
          <span style={{ color: TIA.calor }}>Cóbralos en tu tienda.</span>
        </h1>

        <p className="text-body" style={{ margin: "20px 0 0", lineHeight: 1.6, color: TIA.textSecondary, maxWidth: 520 }}>
          TradFi cobra hasta 7% y tarda días — sin automatizar remesas recurrentes.
          TIA envía al instante, enruta el efectivo al cajero o la tiendita,
          y avisa a tu familia por WhatsApp.
        </p>

        <p
          className="text-caption"
          style={{ margin: "12px 0 0", color: TIA.sage, letterSpacing: "0.1em" }}
        >
          {TIA_TAGLINE_ES} · demo devnet
        </p>

        <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 12 }}>
          <a href="#sender-app" className="btn-primary">
            Probar demo
          </a>
          <Link href="/merchant" className="btn-secondary">
            Soy comercio
          </Link>
        </div>

        <div style={{ marginTop: 40, paddingTop: 32, borderTop: `1px solid ${TIA.softGreen}` }}>
          <SectionTitle n="00" title="Cómo funciona" />
          <ol
            style={{
              margin: 0,
              padding: "0 0 0 20px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              color: TIA.textSecondary,
              fontSize: 15,
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
          <p style={{ margin: "0 0 12px", fontSize: 14, color: TIA.textSecondary }}>
            Contrato en devnet — solo para desarrolladores y mentores Bridge.
          </p>
          <a
            href={`https://solscan.io/account/${programId}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "10px 12px",
              background: TIA.cream,
              borderRadius: 8,
              border: `1px solid ${TIA.softGreen}`,
              color: TIA.institution,
              fontSize: 12,
              fontFamily: TIA_FONT.mono,
              textDecoration: "none",
              wordBreak: "break-all",
            }}
          >
            {programId}
          </a>
        </div>

        <div id="sender-app" style={{ marginTop: 40, paddingTop: 32, borderTop: `1px solid ${TIA.softGreen}` }}>
          <SectionTitle n="02" title="Enviar remesa" />
          <p style={{ margin: "0 0 20px", fontSize: 14, color: TIA.textSecondary, lineHeight: 1.55 }}>
            Conecta tu billetera en el celular o computadora. TIA notifica a tu familia cuando la remesa está lista.
          </p>
          <div className="card">
            <SenderApp />
          </div>
        </div>

        <footer
          style={{
            marginTop: 56,
            fontSize: 12,
            color: TIA.textMuted,
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 16px",
          }}
        >
          <span>TIA · Bridge Dev3pack</span>
          <Link href="/status" style={{ color: TIA.institution, textDecoration: "none" }}>
            Status ↗
          </Link>
        </footer>
      </main>
    </>
  );
}

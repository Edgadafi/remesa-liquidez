import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import Link from "next/link";
import dynamic from "next/dynamic";

const MerchantCashout = dynamic(
  () => import("@/components/MerchantCashout").then((m) => m.MerchantCashout),
  { ssr: false, loading: () => null }
);

const sans = Instrument_Sans({ subsets: ["latin"], weight: ["400", "600", "700"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "600"] });

const fg = "#e9ecf3";
const fgMuted = "rgba(233,236,243,0.58)";
const border = "#232937";
const accent = "#5eebc4";

export default function MerchantPage() {
  return (
    <main
      className={sans.className}
      style={{
        minHeight: "100vh",
        maxWidth: 640,
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

      <h1
        style={{
          margin: "24px 0 12px",
          fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
          fontWeight: 700,
          color: fg,
        }}
      >
        Comercio — <span style={{ color: accent }}>Cashout</span>
      </h1>

      <p style={{ margin: "0 0 32px", fontSize: 16, lineHeight: 1.55, color: fgMuted }}>
        Escanea el QR del receptor o pega la PDA. Firma{" "}
        <code style={{ color: accent, fontFamily: mono.style.fontFamily, fontSize: 13 }}>
          validate_cashout
        </code>{" "}
        — recibes 99.75%, 0.25% al tesoro del protocolo.
      </p>

      <div
        style={{
          padding: "24px",
          border: `1px solid ${border}`,
          borderRadius: 12,
          background: "#10141f",
        }}
      >
        <MerchantCashout />
      </div>
    </main>
  );
}

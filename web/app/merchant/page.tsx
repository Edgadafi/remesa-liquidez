import { TIA, TIA_FONT } from "@/lib/tia-brand";
import Link from "next/link";
import dynamic from "next/dynamic";
import { TiaLogo } from "@/components/TiaLogo";

const MerchantCashout = dynamic(
  () => import("@/components/MerchantCashout").then((m) => m.MerchantCashout),
  { ssr: false, loading: () => null }
);

export default function MerchantPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        maxWidth: 640,
        margin: "0 auto",
        padding: "48px 28px 80px",
        fontFamily: TIA_FONT.ui,
        background: TIA.cream,
      }}
    >
      <Link
        href="/"
        style={{ fontSize: 12, color: TIA.textMuted, textDecoration: "none" }}
      >
        ← TIA
      </Link>

      <div style={{ marginTop: 24 }}>
        <TiaLogo variant="light" href="/" height={44} />
      </div>

      <h1
        style={{
          margin: "28px 0 12px",
          fontFamily: TIA_FONT.display,
          fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
          fontWeight: 700,
          color: TIA.textDark,
        }}
      >
        Activa TIA en tu{" "}
        <span style={{ color: TIA.calorWarm }}>negocio</span>
      </h1>

      <p style={{ margin: "0 0 32px", fontSize: 15, lineHeight: 1.55, color: TIA.textSecondary }}>
        Escanea el código del cliente o pega la referencia. Recibes el pago al instante;
        tu cliente retira en efectivo.
      </p>

      <div
        className="card"
        style={{ borderColor: TIA.calorWarm, borderWidth: 1 }}
      >
        <MerchantCashout />
      </div>
    </main>
  );
}

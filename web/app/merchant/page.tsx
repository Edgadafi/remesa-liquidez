import { TIA, TIA_FONT } from "@/lib/tia-brand";
import dynamic from "next/dynamic";
import { SiteNav } from "@/components/SiteNav";

const MerchantCashout = dynamic(
  () => import("@/components/MerchantCashout").then((m) => m.MerchantCashout),
  { ssr: false, loading: () => null }
);

export default function MerchantPage() {
  return (
    <div className="tia-page tia-page--web">
      <div className="tia-shell">
        <SiteNav variant="light" />
        <main id="contenido">
          <h1
            className="text-headline"
            style={{
              margin: "0 0 12px",
              fontFamily: TIA_FONT.display,
              color: TIA.textDark,
            }}
          >
            Activa TIA en tu{" "}
            <span style={{ color: TIA.calorWarm }}>negocio</span>
          </h1>

          <p className="text-body" style={{ margin: "0 0 32px", color: TIA.textSecondary, maxWidth: 560 }}>
            Escanea el código del cliente o pega la referencia. Recibes el pago al instante;
            tu cliente retira en efectivo.
          </p>

          <div className="card" style={{ borderColor: TIA.calorWarm }}>
            <MerchantCashout />
          </div>
        </main>
      </div>
    </div>
  );
}

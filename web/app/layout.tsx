import type { Metadata } from "next";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";

// WalletProvider accede a localStorage y APIs del browser en el constructor.
// ssr: false garantiza que NUNCA corre durante SSR/hydration de Next.js.
const WalletProvider = dynamic(
  () => import("@/providers/WalletProvider").then((m) => m.WalletProvider),
  { ssr: false }
);

const siteOrigin =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/?$/, "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "Remesa LiquidezIA — Solana · devnet",
    template: "%s · Remesa LiquidezIA",
  },
  description:
    "Mesa LATAM por turnos: escrow + whitelist de comercios + tesoro/fees definidos en contrato Anchor; frontend Next.js con Solana Actions (devnet).",
  keywords: ["Solana", "Anchor", "remesas", "Actions", "Blinks", "devnet", "LATAM"],
  openGraph: {
    type: "website",
    locale: "es",
    siteName: "Remesa LiquidezIA",
    title: "Remesa LiquidezIA — Solana · devnet",
    description:
      "Escrow por turnos, payout y tesoro on-chain expuestos vía HTTPS Actions para wallets.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          margin: 0,
          background: "#0b0d12",
          color: "#e7e9ee",
        }}
      >
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}

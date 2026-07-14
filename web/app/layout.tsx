import type { Metadata } from "next";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import "@/styles/tia-brand.css";
import "@solana/wallet-adapter-react-ui/styles.css";

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
    default: "TIA — Manda dólares. Cóbralos en tu tienda.",
    template: "%s · TIA",
  },
  description:
    "Send dollars. Cash out at your corner store. Remesas US→MX por WhatsApp. Fee 0.25%, no 7%.",
  keywords: ["TIA", "remesas", "US Mexico", "WhatsApp", "LATAM"],
  icons: { icon: "/brand/tia-monogram.svg" },
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "TIA",
    title: "TIA — Send dollars. Cash out at your corner store.",
    description:
      "Manda dólares. Cóbralos en tu tienda de la esquina. TIA avisa por WhatsApp.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="tia-surface-web">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}

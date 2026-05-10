"use client";

/**
 * WalletProvider — Remesa LiquidezIA
 *
 * Orden de wallets (prioridad LATAM Android):
 *   1. SolanaMobileWalletAdapter — MWA, se activa automáticamente en Android
 *      cuando hay una wallet instalada (Phantom, Solflare, Backpack Mobile, etc.)
 *   2. PhantomWalletAdapter    — fallback extensión web / Phantom in-app browser
 *   3. SolflareWalletAdapter   — fallback extensión web
 *   4. BackpackWalletAdapter   — fallback extensión web
 *
 * El MWA abre la wallet nativa vía Android Intent en lugar de abrir una página web,
 * dando UX nativa sin importar qué wallet tenga instalada el usuario.
 */

import { SolanaMobileWalletAdapter } from "@solana-mobile/wallet-adapter-mobile";
import {
  ConnectionProvider,
  WalletProvider as BaseWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";
import type { ReactNode } from "react";
import { useMemo } from "react";

// Importar estilos del modal de wallet
import "@solana/wallet-adapter-react-ui/styles.css";

const cluster = WalletAdapterNetwork.Devnet;
const endpoint =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl(cluster);

/** URL canónica de la dApp — necesaria para el MWA identity proof */
const APP_IDENTITY = {
  name: "Remesa LiquidezIA",
  uri:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "https://web-coral-pi-66.vercel.app"),
  icon: "/icon.png" as const,
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallets = useMemo(
    () => {
      // SolanaMobileWalletAdapter accede a localStorage en el constructor;
      // devolver array vacío en SSR evita el crash en Next.js.
      if (typeof window === "undefined") return [];
      return [
        new SolanaMobileWalletAdapter({
          addressSelector: {
            select: async (addresses) => addresses[0],
          },
          appIdentity: APP_IDENTITY,
          authorizationResultCache: undefined,
          cluster: "devnet",
          onWalletNotFound: undefined,
        }),
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter({ network: cluster }),
      ];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <BaseWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </BaseWalletProvider>
    </ConnectionProvider>
  );
}

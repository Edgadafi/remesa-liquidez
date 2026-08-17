"use client";

import dynamic from "next/dynamic";
import { ChainPicker } from "@/components/ChainPicker";
import { useChain } from "@/context/ChainContext";
import { SenderApp } from "@/components/SenderApp";
import { TIA, TIA_FONT } from "@/lib/tia-brand";

const StellarSenderApp = dynamic(
  () => import("@/components/StellarSenderApp").then((m) => m.StellarSenderApp),
  { ssr: false, loading: () => null }
);

export function DualChainSender() {
  const { chain } = useChain();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <ChainPicker />
      {chain === "stellar" ? (
        <StellarSenderApp />
      ) : (
        <SenderApp />
      )}
      <p style={{ margin: 0, fontSize: 13, color: TIA.textSecondary, fontFamily: TIA_FONT.ui }}>
        {chain === "stellar"
          ? "Stellar · Accesly smart account · testnet"
          : "Solana · devnet · piloto activo"}
      </p>
    </div>
  );
}

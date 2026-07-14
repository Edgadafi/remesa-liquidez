"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { TIA, TIA_FONT } from "@/lib/tia-brand";

function truncatePubkey(key: string) {
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export function ConnectButton() {
  const { publicKey, disconnect, connecting, connected } = useWallet();

  if (connecting) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          background: TIA.cream,
          border: `1px solid ${TIA.softGreen}`,
          borderRadius: 4,
          fontSize: 14,
          color: TIA.textSecondary,
          fontFamily: TIA_FONT.ui,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            background: TIA.calor,
            borderRadius: "50%",
          }}
        />
        Conectando…
      </div>
    );
  }

  if (connected && publicKey) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            background: TIA.cream,
            border: `1px solid ${TIA.grove}`,
            borderRadius: 4,
            fontSize: 13,
            fontFamily: TIA_FONT.mono,
            color: TIA.institution,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              background: TIA.calor,
              borderRadius: "50%",
            }}
          />
          {truncatePubkey(publicKey.toBase58())}
        </div>
        <button
          type="button"
          onClick={() => void disconnect()}
          className="btn-secondary"
          style={{ padding: "10px 16px", fontSize: 13 }}
        >
          Desconectar
        </button>
      </div>
    );
  }

  return (
    <WalletMultiButton
      style={{
        background: TIA.institution,
        color: TIA.cream,
        border: `1px solid ${TIA.grove}`,
        borderRadius: 4,
        padding: "12px 24px",
        fontSize: 14,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: TIA_FONT.ui,
        height: "auto",
        lineHeight: 1.4,
      }}
    >
      Conectar billetera
    </WalletMultiButton>
  );
}

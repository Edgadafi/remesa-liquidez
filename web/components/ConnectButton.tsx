"use client";

/**
 * ConnectButton — botón de conexión de wallet
 *
 * Comportamiento:
 * - Android con wallet instalada: MWA abre la app nativa via Intent
 * - Desktop: abre el modal de wallet-adapter con las opciones disponibles
 * - Conectado: muestra dirección abreviada + botón desconectar
 */

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const accent = "#5eebc4";
const surface = "#10141f";
const border = "#232937";
const fgMuted = "rgba(233,236,243,0.58)";

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
          background: surface,
          border: `1px solid ${border}`,
          borderRadius: 8,
          fontSize: 14,
          color: fgMuted,
          fontFamily: "ui-monospace, monospace",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            background: accent,
            borderRadius: "50%",
            animation: "pulse 1.2s ease-in-out infinite",
          }}
        />
        Conectando…
      </div>
    );
  }

  if (connected && publicKey) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            background: surface,
            border: `1px solid ${accent}33`,
            borderRadius: 8,
            fontSize: 13,
            fontFamily: "ui-monospace, monospace",
            color: accent,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              background: accent,
              borderRadius: "50%",
            }}
          />
          {truncatePubkey(publicKey.toBase58())}
        </div>
        <button
          onClick={() => void disconnect()}
          style={{
            padding: "10px 14px",
            background: "transparent",
            border: `1px solid ${border}`,
            borderRadius: 8,
            fontSize: 13,
            color: fgMuted,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "border-color 0.15s",
          }}
          onMouseOver={(e) =>
            ((e.currentTarget.style.borderColor = "#ff4f4f44"))
          }
          onMouseOut={(e) => ((e.currentTarget.style.borderColor = border))}
        >
          Desconectar
        </button>
      </div>
    );
  }

  return (
    <WalletMultiButton
      style={{
        background: accent,
        color: "#0b0d12",
        border: "none",
        borderRadius: 8,
        padding: "10px 20px",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
        height: "auto",
        lineHeight: 1.4,
      }}
    >
      Conectar Wallet
    </WalletMultiButton>
  );
}

"use client";

/**
 * SenderApp — UI interactiva para el sender (Mobile Wallet Adapter)
 *
 * Expone el flujo completo en una sola pantalla:
 *   1. Conectar wallet (MWA en Android, extensión en desktop)
 *   2. Crear reserva (initialize_reservation)
 *   3. Aprobar identidad del receptor (mark_verified) → notifica WhatsApp
 */

import { ConnectButton } from "./ConnectButton";
import { ReserveForm } from "./ReserveForm";
import { VerifyButton } from "./VerifyButton";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

const accent = "#5eebc4";
const surface = "#10141f";
const border = "#232937";
const fgMuted = "rgba(233,236,243,0.58)";

interface ReservationState {
  pda: string;
  signature: string;
  receiverWA: string;
}

export function SenderApp() {
  const { connected } = useWallet();
  const [reservation, setReservation] = useState<ReservationState | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Wallet */}
      <div>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: fgMuted, fontFamily: "ui-monospace, monospace" }}>
          {connected
            ? "Wallet conectada — listo para firmar transacciones."
            : "En Android abre la app nativa via MWA. En desktop usa extensión."}
        </p>
        <ConnectButton />
      </div>

      {/* Crear reserva */}
      <div
        style={{
          padding: "20px",
          background: surface,
          border: `1px solid ${border}`,
          borderRadius: 10,
          opacity: connected ? 1 : 0.5,
          transition: "opacity 0.2s",
        }}
      >
        <p
          style={{
            margin: "0 0 16px",
            fontSize: 12,
            color: accent,
            fontFamily: "ui-monospace, monospace",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          01 · initialize_reservation
        </p>
        <ReserveForm onReserved={setReservation} />
      </div>

      {/* Aprobar identidad */}
      <div
        style={{
          padding: "20px",
          background: surface,
          border: `1px solid ${border}`,
          borderRadius: 10,
          opacity: connected && reservation ? 1 : 0.4,
          transition: "opacity 0.2s",
        }}
      >
        <p
          style={{
            margin: "0 0 16px",
            fontSize: 12,
            color: accent,
            fontFamily: "ui-monospace, monospace",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          02 · mark_verified
        </p>

        {reservation ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 12, color: fgMuted, fontFamily: "ui-monospace, monospace" }}>
              PDA: <span style={{ color: accent, wordBreak: "break-all" }}>{reservation.pda}</span>
            </p>
            <VerifyButton
              reservationPda={reservation.pda}
              receiverWA={reservation.receiverWA}
            />
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: fgMuted, fontFamily: "ui-monospace, monospace" }}>
            Crea una reserva primero para activar este paso.
          </p>
        )}
      </div>
    </div>
  );
}

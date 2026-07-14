"use client";

import { ConnectButton } from "./ConnectButton";
import { ReserveForm } from "./ReserveForm";
import { VerifyButton } from "./VerifyButton";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { TIA, TIA_FONT } from "@/lib/tia-brand";

interface ReservationState {
  pda: string;
  signature: string;
  receiverWA: string;
}

export function SenderApp() {
  const { connected } = useWallet();
  const [reservation, setReservation] = useState<ReservationState | null>(null);

  const stepBox = (active: boolean) => ({
    padding: "20px",
    background: TIA.cream,
    border: `1px solid ${TIA.softGreen}`,
    borderRadius: 8,
    opacity: active ? 1 : 0.45,
    transition: "opacity 0.2s",
  });

  const stepLabel = {
    margin: "0 0 16px",
    fontSize: 11,
    color: TIA.sage,
    fontFamily: TIA_FONT.ui,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    fontWeight: 500,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: TIA.textSecondary }}>
          {connected
            ? "Billetera conectada — puedes enviar tu remesa."
            : "Conecta tu billetera para empezar."}
        </p>
        <ConnectButton />
      </div>

      <div style={stepBox(connected)}>
        <p style={stepLabel}>Paso 1 · Crear remesa</p>
        <ReserveForm onReserved={setReservation} />
      </div>

      <div style={stepBox(connected && !!reservation)}>
        <p style={stepLabel}>Paso 2 · Confirmar y avisar</p>
        {reservation ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 12, color: TIA.textMuted, fontFamily: TIA_FONT.mono }}>
              Ref: <span style={{ color: TIA.institution, wordBreak: "break-all" }}>{reservation.pda}</span>
            </p>
            <VerifyButton
              reservationPda={reservation.pda}
              receiverWA={reservation.receiverWA}
            />
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: TIA.textMuted }}>
            Completa el paso 1 para confirmar y notificar por WhatsApp.
          </p>
        )}
      </div>
    </div>
  );
}

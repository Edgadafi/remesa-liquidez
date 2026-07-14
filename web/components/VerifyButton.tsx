"use client";

/**
 * VerifyButton — sender aprueba la identidad del receptor on-chain
 *
 * Instrucción: mark_verified
 * Firmante requerido: sender (wallet conectada)
 *
 * Flujo post-firma:
 *   1. Firma mark_verified on-chain via MWA / extensión
 *   2. Llama POST /api/notify/verified → ElevenLabs TTS → WhatsApp receptor
 *   3. Muestra confirmación con link Solscan
 */

import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { useCallback, useState } from "react";
import idlJson from "@/idl/remesa_liquidez.json";
import type { RemesaLiquidez } from "@/types/remesa_liquidez";
import { TIA } from "@/lib/tia-brand";

const PROGRAM_ID = new PublicKey(
  typeof idlJson.address === "string"
    ? idlJson.address
    : "Fprb6jTLfjXfZ6yuWzS7LVXxwVvPbPgPZiEqDEL9bRfj"
);

const accent = TIA.institution;
const surface = TIA.cream;
const border = TIA.softGreen;
const fg = TIA.textDark;
const fgMuted = TIA.textSecondary;
const errorColor = TIA.calorWarm;

type Status = "idle" | "signing" | "confirming" | "notifying" | "done" | "error";

interface Props {
  /** PDA de la TurnReservation a verificar */
  reservationPda: string;
  /** WhatsApp del receptor para la notificación TTS */
  receiverWA?: string;
  /** Monto USDC (para el script de TTS) */
  amountUSDC?: number;
}

export function VerifyButton({ reservationPda, receiverWA, amountUSDC }: Props) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const handleVerify = useCallback(async () => {
    if (!publicKey || !connected) return;

    setStatus("signing");
    setError(null);
    setSignature(null);

    try {
      let pda: PublicKey;
      try {
        pda = new PublicKey(reservationPda);
      } catch {
        throw new Error("reservationPda inválida.");
      }

      const provider = new AnchorProvider(
        connection,
        {
          publicKey,
          signTransaction: async (tx) => tx,
          signAllTransactions: async (txs) => txs,
        },
        { commitment: "confirmed" }
      );
      const program = new Program<RemesaLiquidez>(
        idlJson as unknown as Idl,
        provider
      ) as unknown as Program<RemesaLiquidez>;

      const ix = await program.methods
        .markVerified()
        .accountsStrict({
          sender: publicKey,
          reservation: pda,
        })
        .instruction();

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      const tx = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(ix);

      const sig = await sendTransaction(tx, connection);

      setStatus("confirming");
      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed"
      );
      setSignature(sig);

      // Notificar a TIA vía /api/notify/verified → ElevenLabs → WhatsApp
      if (receiverWA) {
        setStatus("notifying");
        try {
          await fetch("/api/notify/verified", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reservationPda,
              txSignature: sig,
              receiverWA,
              amountUSDC,
            }),
          });
        } catch {
          // No bloquear si la notificación falla — la tx ya está confirmada
          console.warn("[VerifyButton] notify/verified falló, continuando");
        }
      }

      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Error desconocido.");
    }
  }, [publicKey, connected, connection, sendTransaction, reservationPda, receiverWA, amountUSDC]);

  const statusLabel: Record<Status, string> = {
    idle: "Aprobar Identidad",
    signing: "Firma en la wallet…",
    confirming: "Confirmando on-chain…",
    notifying: "Notificando al receptor…",
    done: "✓ Aprobado",
    error: "Reintentar",
  };

  const isLoading = ["signing", "confirming", "notifying"].includes(status);
  const isDone = status === "done";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button
        onClick={() => void handleVerify()}
        disabled={isLoading || isDone || !connected}
        style={{
          padding: "12px 20px",
          background: isDone
            ? `${accent}22`
            : isLoading
            ? `${accent}55`
            : connected
            ? accent
            : `${accent}33`,
          color: isDone ? TIA.institution : TIA.cream,
          border: isDone ? `1px solid ${accent}44` : "none",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: isLoading || isDone || !connected ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          transition: "all 0.15s",
        }}
      >
        {statusLabel[status]}
      </button>

      {error && (
        <p style={{ margin: 0, fontSize: 13, color: errorColor, fontFamily: "ui-monospace, monospace" }}>
          ✕ {error}
        </p>
      )}

      {signature && (
        <a
          href={`https://solscan.io/tx/${signature}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 12,
            color: accent,
            textDecoration: "none",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          {signature.slice(0, 12)}…{signature.slice(-8)} ↗ Solscan
        </a>
      )}
    </div>
  );
}

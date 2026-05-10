"use client";

/**
 * ReserveForm — inicializa una reserva en cadena via MWA
 *
 * Instrucción: initialize_reservation
 * Firmante requerido: sender (wallet conectada)
 *
 * Flujo:
 *   1. Sender ingresa monto USDC + número WA del receptor
 *   2. Se deriva la PDA del receptor como receiver pubkey (mock en demo)
 *   3. Se construye la tx con Anchor, se firma via MWA o extensión
 *   4. Se muestra el link Solscan con la firma resultante
 */

import { AnchorProvider, BN, Program, type Idl } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import { useCallback, useState } from "react";
import idlJson from "@/idl/remesa_liquidez.json";
import type { RemesaLiquidez } from "@/types/remesa_liquidez";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const PROGRAM_ID = new PublicKey(
  typeof idlJson.address === "string"
    ? idlJson.address
    : "Fprb6jTLfjXfZ6yuWzS7LVXxwVvPbPgPZiEqDEL9bRfj"
);

// USDC devnet mint
const USDC_DEVNET = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT ??
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

const DEFAULT_EXPIRY_SECONDS = 60 * 60 * 24 * 3; // 3 días

const accent = "#5eebc4";
const surface = "#10141f";
const border = "#232937";
const fg = "#e9ecf3";
const fgMuted = "rgba(233,236,243,0.58)";
const errorColor = "#ff6b6b";

type Status = "idle" | "building" | "signing" | "confirming" | "done" | "error";

interface Props {
  onReserved?: (params: { pda: string; signature: string; receiverWA: string }) => void;
}

export function ReserveForm({ onReserved }: Props) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [amountUSDC, setAmountUSDC] = useState("");
  const [receiverWA, setReceiverWA] = useState("");
  const [receiverPubkey, setReceiverPubkey] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ pda: string; sig: string } | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!publicKey || !connected) return;

      setStatus("building");
      setError(null);
      setResult(null);

      try {
        // Parse amount → lamports USDC (6 decimales)
        const parsed = parseFloat(amountUSDC);
        if (isNaN(parsed) || parsed <= 0) throw new Error("Monto inválido.");
        const amountRaw = new BN(Math.round(parsed * 1_000_000));

        // Receiver: usa la pubkey ingresada o genera una de demo
        let receiverKey: PublicKey;
        try {
          receiverKey = new PublicKey(receiverPubkey);
        } catch {
          throw new Error("Pubkey del receptor inválida. Ingresa una dirección Solana válida.");
        }

        // Derivar PDAs
        const [reservationPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("reservation"), receiverKey.toBuffer()],
          PROGRAM_ID
        );
        const [vaultPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("vault"), reservationPda.toBuffer()],
          PROGRAM_ID
        );
        const senderTokenAccount = getAssociatedTokenAddressSync(
          USDC_DEVNET,
          publicKey
        );

        // Construir provider client-side (la wallet firma via sendTransaction)
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
          .initializeReservation(
            amountRaw,
            new BN(DEFAULT_EXPIRY_SECONDS),
            null // sin merchant preferido
          )
          .accountsStrict({
            sender: publicKey,
            receiver: receiverKey,
            mint: USDC_DEVNET,
            senderTokenAccount,
            reservation: reservationPda,
            vault: vaultPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .instruction();

        setStatus("signing");
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash();
        const tx = new Transaction({
          feePayer: publicKey,
          blockhash,
          lastValidBlockHeight,
        }).add(ix);

        const signature = await sendTransaction(tx, connection);

        setStatus("confirming");
        await connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          "confirmed"
        );

        setStatus("done");
        const pda = reservationPda.toBase58();
        setResult({ pda, sig: signature });
        onReserved?.({ pda, signature, receiverWA });
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Error desconocido.");
      }
    },
    [publicKey, connected, connection, sendTransaction, amountUSDC, receiverPubkey, receiverWA, onReserved]
  );

  const statusLabel: Record<Status, string> = {
    idle: "Crear Reserva",
    building: "Construyendo tx…",
    signing: "Firma en la wallet…",
    confirming: "Confirmando on-chain…",
    done: "¡Reserva creada!",
    error: "Reintentar",
  };

  const isLoading = ["building", "signing", "confirming"].includes(status);

  return (
    <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, color: fgMuted, fontFamily: "ui-monospace, monospace" }}>
          Monto USDC
        </span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="10.00"
          value={amountUSDC}
          onChange={(e) => setAmountUSDC(e.target.value)}
          required
          disabled={isLoading || !connected}
          style={{
            padding: "10px 12px",
            background: surface,
            border: `1px solid ${border}`,
            borderRadius: 8,
            color: fg,
            fontSize: 15,
            fontFamily: "ui-monospace, monospace",
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
          }}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, color: fgMuted, fontFamily: "ui-monospace, monospace" }}>
          Pubkey del receptor (Solana)
        </span>
        <input
          type="text"
          placeholder="4Nd1m… dirección base58"
          value={receiverPubkey}
          onChange={(e) => setReceiverPubkey(e.target.value)}
          required
          disabled={isLoading || !connected}
          style={{
            padding: "10px 12px",
            background: surface,
            border: `1px solid ${border}`,
            borderRadius: 8,
            color: fg,
            fontSize: 13,
            fontFamily: "ui-monospace, monospace",
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
          }}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, color: fgMuted, fontFamily: "ui-monospace, monospace" }}>
          WhatsApp del receptor (para notificación)
        </span>
        <input
          type="tel"
          placeholder="521234567890"
          value={receiverWA}
          onChange={(e) => setReceiverWA(e.target.value)}
          disabled={isLoading || !connected}
          style={{
            padding: "10px 12px",
            background: surface,
            border: `1px solid ${border}`,
            borderRadius: 8,
            color: fg,
            fontSize: 14,
            fontFamily: "ui-monospace, monospace",
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
          }}
        />
      </label>

      <button
        type="submit"
        disabled={isLoading || !connected}
        style={{
          padding: "12px 20px",
          background: isLoading ? `${accent}55` : connected ? accent : `${accent}33`,
          color: "#0b0d12",
          border: "none",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: isLoading || !connected ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          transition: "opacity 0.15s",
        }}
      >
        {statusLabel[status]}
      </button>

      {error && (
        <p style={{ margin: 0, fontSize: 13, color: errorColor, fontFamily: "ui-monospace, monospace" }}>
          ✕ {error}
        </p>
      )}

      {result && (
        <div
          style={{
            padding: "14px 16px",
            background: "#0d1018",
            border: `1px solid ${accent}44`,
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            fontSize: 12,
            fontFamily: "ui-monospace, monospace",
          }}
        >
          <div>
            <span style={{ color: fgMuted }}>PDA: </span>
            <span style={{ color: accent, wordBreak: "break-all" }}>{result.pda}</span>
          </div>
          <div>
            <span style={{ color: fgMuted }}>Tx: </span>
            <a
              href={`https://solscan.io/tx/${result.sig}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: accent, textDecoration: "none" }}
            >
              {result.sig.slice(0, 12)}…{result.sig.slice(-8)} ↗
            </a>
          </div>
        </div>
      )}
    </form>
  );
}

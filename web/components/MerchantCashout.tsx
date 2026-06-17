"use client";

/**
 * MerchantCashout — comercio liquida reserva vía Blink Action
 *
 * Flujo:
 *   1. Conectar wallet del comercio (whitelist on-chain)
 *   2. Pegar PDA de la reserva (QR del receptor o WhatsApp TIA)
 *   3. POST /api/actions/cashout → firmar validate_cashout
 */

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { useCallback, useState } from "react";
import { ConnectButton } from "./ConnectButton";

const accent = "#5eebc4";
const surface = "#10141f";
const border = "#232937";
const fg = "#e9ecf3";
const fgMuted = "rgba(233,236,243,0.58)";
const errorColor = "#ff6b6b";

type Status = "idle" | "fetching" | "signing" | "confirming" | "done" | "error";

export function MerchantCashout() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [pda, setPda] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const handleCashout = useCallback(async () => {
    if (!publicKey || !connected || !pda.trim()) return;

    setStatus("fetching");
    setError(null);
    setMessage(null);
    setSignature(null);

    try {
      const res = await fetch(
        `/api/actions/cashout?pda=${encodeURIComponent(pda.trim())}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account: publicKey.toBase58() }),
        }
      );

      const data = (await res.json()) as {
        transaction?: string;
        message?: string;
      };

      if (!res.ok) {
        throw new Error(data.message ?? `Error ${res.status}`);
      }

      if (!data.transaction) {
        throw new Error("La Action no devolvió transacción.");
      }

      setMessage(data.message ?? null);

      const tx = Transaction.from(Buffer.from(data.transaction, "base64"));

      setStatus("signing");
      const sig = await sendTransaction(tx, connection);

      setStatus("confirming");
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      setSignature(sig);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Error desconocido.");
    }
  }, [publicKey, connected, pda, connection, sendTransaction]);

  const statusLabel: Record<Status, string> = {
    idle: "Liquidar reserva",
    fetching: "Preparando transacción…",
    signing: "Firma en la wallet…",
    confirming: "Confirmando on-chain…",
    done: "✓ Cashout completado",
    error: "Reintentar",
  };

  const isLoading = ["fetching", "signing", "confirming"].includes(status);
  const isDone = status === "done";
  const canSubmit = connected && pda.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ margin: 0, fontSize: 13, color: fgMuted, fontFamily: "ui-monospace, monospace" }}>
        {connected
          ? "Wallet comercio conectada — debe estar en whitelist devnet."
          : "Conecta la wallet del comercio registrado on-chain."}
      </p>
      <ConnectButton />

      <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span
          style={{
            fontSize: 12,
            color: accent,
            fontFamily: "ui-monospace, monospace",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Reservation PDA
        </span>
        <input
          type="text"
          value={pda}
          onChange={(e) => setPda(e.target.value)}
          placeholder="Pega la PDA del QR o WhatsApp TIA"
          disabled={isLoading || isDone}
          style={{
            padding: "12px 14px",
            background: surface,
            border: `1px solid ${border}`,
            borderRadius: 8,
            color: fg,
            fontSize: 13,
            fontFamily: "ui-monospace, monospace",
          }}
        />
      </label>

      {message && (
        <p style={{ margin: 0, fontSize: 13, color: fgMuted, lineHeight: 1.5 }}>
          {message}
        </p>
      )}

      <button
        onClick={() => void handleCashout()}
        disabled={!canSubmit || isLoading || isDone}
        style={{
          padding: "12px 20px",
          background: isDone
            ? `${accent}22`
            : canSubmit && !isLoading
            ? accent
            : `${accent}33`,
          color: isDone ? accent : "#0b0d12",
          border: isDone ? `1px solid ${accent}44` : "none",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: !canSubmit || isLoading || isDone ? "not-allowed" : "pointer",
          fontFamily: "inherit",
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

      <p style={{ margin: 0, fontSize: 12, color: fgMuted, lineHeight: 1.55 }}>
        Alternativa Blink:{" "}
        <a
          href={`https://dial.to/?action=solana-action:${typeof window !== "undefined" ? window.location.origin : "https://web-coral-pi-66.vercel.app"}/api/actions/cashout?pda=${encodeURIComponent(pda.trim() || "<pda>")}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: accent }}
        >
          Dial.to
        </a>
      </p>
    </div>
  );
}

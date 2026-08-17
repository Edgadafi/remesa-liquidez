"use client";

import { useChain } from "@/context/ChainContext";
import { getSelectableChains } from "@/lib/chain";
import type { ChainId } from "@/lib/chain/types";
import { TIA, TIA_FONT } from "@/lib/tia-brand";

export function ChainPicker() {
  const { chain, setChain, stellarPilotEnabled } = useChain();
  const chains = getSelectableChains();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span
        style={{
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: TIA.textSecondary,
          fontFamily: TIA_FONT.ui,
        }}
      >
        Red de liquidación
      </span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {chains.map((adapter) => {
          const id = adapter.chain as ChainId;
          const active = chain === id;
          const disabled = id === "stellar" && !stellarPilotEnabled;

          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => setChain(id)}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${active ? TIA.institution : TIA.softGreen}`,
                background: active ? `${TIA.institution}18` : TIA.cream,
                color: disabled ? TIA.textMuted : TIA.textDark,
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                cursor: disabled ? "not-allowed" : "pointer",
                fontFamily: TIA_FONT.ui,
                opacity: disabled ? 0.55 : 1,
              }}
            >
              {id === "solana" ? "Solana (piloto activo)" : adapter.getPilotLabel()}
            </button>
          );
        })}
      </div>
      {!stellarPilotEnabled && (
        <p style={{ margin: 0, fontSize: 14, color: TIA.textSecondary, lineHeight: 1.5 }}>
          Stellar está en lista de espera. El piloto activo hoy es Solana.
        </p>
      )}
    </div>
  );
}

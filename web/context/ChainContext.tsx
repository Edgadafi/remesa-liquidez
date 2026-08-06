"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ChainId } from "@/lib/chain/types";
import { getDefaultChain } from "@/lib/chain/types";
import { stellarAdapter } from "@/lib/chain/stellar";

const STORAGE_KEY = "tia-selected-chain";

interface ChainContextValue {
  chain: ChainId;
  setChain: (chain: ChainId) => void;
  stellarPilotEnabled: boolean;
}

const ChainContext = createContext<ChainContextValue | null>(null);

function readInitialChain(): ChainId {
  if (typeof window === "undefined") return getDefaultChain();
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored === "stellar" && stellarAdapter.isPilotActive()) return "stellar";
  if (stored === "solana") return "solana";
  return getDefaultChain();
}

export function ChainProvider({ children }: { children: ReactNode }) {
  const [chain, setChainState] = useState<ChainId>(getDefaultChain());
  const stellarPilotEnabled = stellarAdapter.isPilotActive();

  useEffect(() => {
    setChainState(readInitialChain());
  }, []);

  const setChain = useCallback(
    (next: ChainId) => {
      if (next === "stellar" && !stellarPilotEnabled) return;
      setChainState(next);
      sessionStorage.setItem(STORAGE_KEY, next);
    },
    [stellarPilotEnabled]
  );

  const value = useMemo(
    () => ({ chain, setChain, stellarPilotEnabled }),
    [chain, setChain, stellarPilotEnabled]
  );

  return <ChainContext.Provider value={value}>{children}</ChainContext.Provider>;
}

export function useChain(): ChainContextValue {
  const ctx = useContext(ChainContext);
  if (!ctx) {
    throw new Error("useChain must be used within ChainProvider");
  }
  return ctx;
}

"use client";

import type { ReactNode } from "react";
import { AcceslyProvider } from "@accesly/react";
import { TIA } from "@/lib/tia-brand";
import { getAcceslyConfig } from "@/lib/chain/stellar";

const acceslyTheme: React.CSSProperties = {
  ["--accesly-primary" as string]: TIA.institution,
  ["--accesly-primary-soft" as string]: `${TIA.institution}2e`,
  ["--accesly-card" as string]: TIA.cream,
  ["--accesly-card2" as string]: TIA.softGreen,
  ["--accesly-ink" as string]: TIA.textDark,
  ["--accesly-muted" as string]: TIA.textSecondary,
  ["--accesly-muted2" as string]: TIA.textMuted,
  ["--accesly-line" as string]: TIA.softGreen,
};

export function AcceslyRoot({ children }: { children: ReactNode }) {
  const { appId, env, configured } = getAcceslyConfig();

  if (!configured) {
    return <>{children}</>;
  }

  return (
    <div style={acceslyTheme}>
      <AcceslyProvider
        appId={appId}
        env={env}
        authCallbackPath="/auth/callback"
      >
        {children}
      </AcceslyProvider>
    </div>
  );
}

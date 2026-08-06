"use client";

import { useEffect, useState } from "react";
import {
  useAccesly,
  useBalance,
  useWalletStatus,
} from "@accesly/react";
import {
  AuthForm,
  BalanceCard,
  CreateWalletFlow,
  NetworkBadge,
} from "@accesly/react/kit";
import { TIA, TIA_FONT } from "@/lib/tia-brand";
import { getAcceslyConfig, getStellarContractId } from "@/lib/chain/stellar";

type Step = "recovery-password" | "create-wallet";

export function StellarSenderApp() {
  const { configured } = getAcceslyConfig();
  const contractId = getStellarContractId();
  const { auth } = useAccesly();
  const { status: walletStatus, walletAddress } = useWalletStatus();
  const balance = useBalance(walletAddress);

  const [step, setStep] = useState<Step>("recovery-password");
  const [recoveryPassword, setRecoveryPassword] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#sender-app") {
      sessionStorage.setItem("tia-selected-chain", "stellar");
    }
  }, []);

  if (!configured) {
    return (
      <SetupMessage
        title="Accesly no configurado"
        body="Registra TIA en dev.accesly.xyz, habilita Google OAuth y añade NEXT_PUBLIC_ACCESLY_APP_ID. Ver docs/accesly-integration.md."
      />
    );
  }

  if (auth.status !== "authenticated") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ margin: 0, fontSize: 13, color: TIA.textSecondary, lineHeight: 1.55 }}>
          Entra con Google — sin seed phrase. Accesly crea tu smart account Stellar
          testnet (no-custodial).
        </p>
        <AuthForm mode="sign-in" />
      </div>
    );
  }

  if (walletStatus === "no-wallet") {
    if (step === "create-wallet" && auth.username && recoveryPassword.length >= 8) {
      return (
        <CreateWalletFlow
          email={auth.username}
          password={recoveryPassword}
          passkeyRpName="TIA Remesas"
        />
      );
    }

    return (
      <RecoveryPasswordStep
        email={auth.username ?? ""}
        password={recoveryPassword}
        onPasswordChange={setRecoveryPassword}
        onContinue={() => setStep("create-wallet")}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: 13, color: TIA.textSecondary }}>
          {auth.username}
        </p>
        <NetworkBadge />
      </div>

      <BalanceCard primaryAsset="USDC" fiatLabel="USDC testnet" />

      {walletAddress && (
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontFamily: TIA_FONT.mono,
            color: TIA.textMuted,
            wordBreak: "break-all",
          }}
        >
          {walletAddress}
        </p>
      )}

      <div
        style={{
          padding: 16,
          borderRadius: 8,
          border: `1px solid ${TIA.softGreen}`,
          background: `${TIA.institution}08`,
        }}
      >
        <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: TIA.textDark }}>
          Remesa Stellar — Phase B
        </p>
        <p style={{ margin: 0, fontSize: 13, color: TIA.textSecondary, lineHeight: 1.55 }}>
          {contractId
            ? "Contrato Soroban configurado — invoke en web/lib/stellar/remesa.ts."
            : "Deploy contracts/remesa-tia-stellar y set STELLAR_CONTRACT_ID."}
          {" "}WhatsApp TIA igual al activar remesa on-chain.
        </p>
        {balance.usdc !== null && (
          <p style={{ margin: "12px 0 0", fontSize: 13, color: TIA.institution }}>
            Balance USDC: {balance.usdc}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => void auth.signOut()}
        style={{
          alignSelf: "flex-start",
          padding: "8px 12px",
          fontSize: 12,
          border: `1px solid ${TIA.softGreen}`,
          borderRadius: 6,
          background: "transparent",
          color: TIA.textSecondary,
          cursor: "pointer",
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}

function RecoveryPasswordStep({
  email,
  password,
  onPasswordChange,
  onContinue,
}: {
  email: string;
  password: string;
  onPasswordChange: (v: string) => void;
  onContinue: () => void;
}) {
  const valid = password.length >= 8;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ margin: 0, fontSize: 13, color: TIA.textSecondary, lineHeight: 1.55 }}>
        Sesión iniciada como <strong>{email}</strong>. Define una contraseña de
        recuperación (8+ caracteres) para cifrar los fragmentos Shamir de tu wallet.
      </p>
      <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 12, color: TIA.institution }}>Contraseña de recuperación</span>
        <input
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            border: `1px solid ${TIA.softGreen}`,
            fontSize: 14,
          }}
        />
      </label>
      <button
        type="button"
        disabled={!valid}
        onClick={onContinue}
        className="btn-primary"
        style={{
          opacity: valid ? 1 : 0.5,
          cursor: valid ? "pointer" : "not-allowed",
        }}
      >
        Continuar → crear wallet
      </button>
    </div>
  );
}

function SetupMessage({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 8,
        border: `1px dashed ${TIA.softGreen}`,
        background: TIA.cream,
      }}
    >
      <p style={{ margin: "0 0 8px", fontWeight: 600, color: TIA.textDark }}>{title}</p>
      <p style={{ margin: 0, fontSize: 13, color: TIA.textSecondary, lineHeight: 1.55 }}>
        {body}
      </p>
    </div>
  );
}

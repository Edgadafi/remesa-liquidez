"use client";

import { AuthCallback } from "@accesly/react/kit";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TIA, TIA_FONT } from "@/lib/tia-brand";

export default function AcceslyAuthCallbackPage() {
  const router = useRouter();

  return (
    <main
      id="contenido"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: TIA.cream,
        fontFamily: TIA_FONT.ui,
      }}
    >
      <AuthCallback
        onSuccess={() => {
          sessionStorage.setItem("tia-selected-chain", "stellar");
          router.replace("/#sender-app");
        }}
        loadingText="Completando inicio con Google…"
        errorText="No pudimos completar el inicio de sesión."
      />
      <Link
        href="/"
        style={{
          marginTop: 24,
          fontSize: 13,
          color: TIA.institution,
          textDecoration: "none",
        }}
      >
        ← Volver a TIA
      </Link>
    </main>
  );
}

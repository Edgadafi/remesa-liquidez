import idl from "@/idl/remesa_liquidez.json";
import { IBM_Plex_Mono } from "next/font/google";
import { Instrument_Sans } from "next/font/google";
import Link from "next/link";
import dynamic from "next/dynamic";

// MWA / wallet-adapter accede a localStorage → solo puede correr en el cliente
const SenderApp = dynamic(
  () => import("@/components/SenderApp").then((m) => m.SenderApp),
  { ssr: false, loading: () => null }
);

const sans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
});

const programId =
  typeof idl.address === "string" ? idl.address : "Fprb6jTLfjXfZ6yuWzS7LVXxwVvPbPgPZiEqDEL9bRfj";

const fg = "#e9ecf3";
const fgMuted = "rgba(233,236,243,0.58)";
const border = "#232937";
const surface = "#10141f";
const accent = "#5eebc4";

const codeBlock: React.CSSProperties = {
  margin: 0,
  padding: "14px 16px",
  background: "#0d1018",
  borderRadius: 8,
  border: `1px solid ${border}`,
  fontFamily: mono.style.fontFamily,
  fontSize: 13,
  lineHeight: 1.65,
  color: "#c9d7e8",
  overflowX: "auto",
};

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <div
      className={mono.className}
      style={{
        display: "flex",
        gap: 10,
        alignItems: "baseline",
        marginBottom: 14,
        fontSize: 11,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: fgMuted,
      }}
    >
      <span style={{ color: accent }}>{n}</span>
      <span>{title}</span>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: 5,
          background: `linear-gradient(180deg, ${accent} 0%, rgba(94,235,196,0.18) 45%, rgba(94,235,196,0.08) 100%)`,
          pointerEvents: "none",
        }}
      />

      <main
        className={sans.className}
        style={{
          minHeight: "100vh",
          boxSizing: "border-box",
          maxWidth: 640,
          margin: "0 auto",
          padding: "56px 28px 80px",
          paddingLeft: 36,
        }}
      >
        <p
          className={mono.className}
          style={{
            margin: "0 0 20px",
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: fgMuted,
          }}
        >
          bridge dev3pack · us → mx · devnet
        </p>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(1.95rem, 5vw, 2.65rem)",
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: "-0.035em",
            color: fg,
          }}
        >
          Remesa{" "}
          <span style={{ color: accent }}>TIA</span>
        </h1>

        <p
          style={{
            margin: "22px 0 0",
            fontSize: 17,
            fontWeight: 400,
            lineHeight: 1.55,
            color: fgMuted,
            maxWidth: 520,
          }}
        >
          Envía USDC desde EE.UU. Tu familia retira efectivo en México.
          TIA les avisa por WhatsApp — sin app, sin banco, fee 0.25% on-chain.
        </p>

        <div
          style={{
            marginTop: 28,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <a
            href="#sender-app"
            style={{
              padding: "12px 20px",
              background: accent,
              color: "#0b0d12",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Probar demo
          </a>
          <Link
            href="/merchant"
            style={{
              padding: "12px 20px",
              background: surface,
              color: fg,
              border: `1px solid ${border}`,
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Soy comercio
          </Link>
        </div>

        <div
          style={{
            marginTop: 40,
            paddingTop: 32,
            borderTop: `1px solid ${border}`,
          }}
        >
          <SectionTitle n="00" title="Cómo funciona" />
          <ol
            style={{
              margin: 0,
              padding: "0 0 0 20px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              color: fgMuted,
              fontSize: 15,
              lineHeight: 1.55,
            }}
          >
            <li>
              <strong style={{ color: fg }}>Envía</strong> — Conecta wallet, crea reserva USDC
              en escrow Anchor.
            </li>
            <li>
              <strong style={{ color: fg }}>Avisa</strong> — TIA notifica al receptor por WhatsApp
              cuando apruebas la identidad.
            </li>
            <li>
              <strong style={{ color: fg }}>Retira</strong> — Comercio aliado liquida con Blink;
              99.75% payout, 0.25% tesoro verificable en Solscan.
            </li>
          </ol>
        </div>

        <div
          style={{
            marginTop: 36,
            paddingTop: 32,
            borderTop: `1px solid ${border}`,
          }}
        >
          <SectionTitle n="01" title="Contrato vivo" />
          <p style={{ margin: "0 0 12px", fontSize: 15, color: fgMuted }}>
            Anchor program ID (devnet) — clic para ver en explorer.
          </p>
          <a
            href={`https://solscan.io/account/${programId}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className={mono.className}
            style={{
              display: "inline-block",
              padding: "10px 12px",
              background: surface,
              borderRadius: 8,
              border: `1px solid ${border}`,
              color: accent,
              fontSize: 12,
              textDecoration: "none",
              wordBreak: "break-all",
            }}
          >
            {programId}
          </a>
        </div>

        <div
          style={{
            marginTop: 40,
            paddingTop: 32,
            borderTop: `1px solid ${border}`,
          }}
        >
          <SectionTitle n="02" title="Endpoints Actions" />
          <p style={{ margin: "0 0 16px", fontSize: 15, color: fgMuted }}>
            Manifest + rutas Blink listas para integrar wallets.
          </p>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {[
              { href: "/actions.json", label: "Manifest", hint: "registro de rutas Action" },
              { href: "/api/actions/verify", label: "Verify", hint: "marca verified (firmado)" },
              { href: "/api/actions/cashout", label: "Cashout", hint: "liquida payout + fee tesoro" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={mono.className}
                  prefetch={false}
                  style={{
                    display: "inline-flex",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                    gap: "10px 16px",
                    fontSize: 14,
                    color: fg,
                    textDecorationColor: accent,
                  }}
                >
                  <strong style={{ color: fg, fontWeight: 600, minWidth: 110 }}>{item.label}</strong>
                  <span style={{ color: accent }}>{item.href}</span>
                  <span style={{ color: fgMuted, fontSize: 13 }}>{item.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{
            marginTop: 40,
            paddingTop: 32,
            borderTop: `1px solid ${border}`,
          }}
        >
          <SectionTitle n="03" title="Ejemplo query" />
          <p style={{ margin: "0 0 14px", fontSize: 15, color: fgMuted }}>
            Cashout espera la PDA de la reserva (reservation PDA).
          </p>
          <pre style={codeBlock}>
            {`GET /api/actions/cashout?pda=<reservationPda>`}
          </pre>
          <pre style={{ ...codeBlock, marginTop: 12 }}>
            {`GET /api/actions/verify?pda=<reservationPda>`}
          </pre>
          <pre style={{ ...codeBlock, marginTop: 12 }}>
            {`POST /api/notify/verified\n{ "reservationPda": "<pda>", "receiverWA": "521234567890" }\n# → TTS ElevenLabs + WhatsApp "dinero listo" vía TIA`}
          </pre>
        </div>

        <div
          style={{
            marginTop: 40,
            paddingTop: 32,
            borderTop: `1px solid ${border}`,
          }}
        >
          <SectionTitle n="04" title="Bridge cross-chain — LI.FI" />
          <p style={{ margin: "0 0 14px", fontSize: 15, color: fgMuted }}>
            ¿Tienes USDC en Arbitrum, Base o Polygon? Llévalo a Solana en un
            paso antes de crear la reserva. Powered by{" "}
            <a
              href="https://li.fi"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: accent, textDecoration: "none" }}
            >
              LI.FI
            </a>{" "}
            — 12 bridges integrados, gasless opcional.
          </p>
          <ul
            style={{
              margin: "0 0 16px",
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {[
              { chain: "ARB", label: "Arbitrum → Solana" },
              { chain: "BASE", label: "Base → Solana" },
              { chain: "POL", label: "Polygon → Solana" },
            ].map((item) => (
              <li
                key={item.chain}
                className={mono.className}
                style={{ fontSize: 13, color: fgMuted }}
              >
                <span style={{ color: accent, marginRight: 8 }}>→</span>
                {item.label}
              </li>
            ))}
          </ul>
          <pre style={codeBlock}>
            {`GET /api/bridge/quote\n  ?fromAddress=<EVM_WALLET>\n  &toAddress=<SOL_WALLET>\n  &fromAmount=10000000   # 10 USDC (6 decimales)\n  &fromChain=ARB        # ARB | BASE | POL`}
          </pre>
          <p
            className={mono.className}
            style={{
              margin: "12px 0 0",
              fontSize: 12,
              color: fgMuted,
              lineHeight: 1.6,
            }}
          >
            Responde con{" "}
            <span style={{ color: accent }}>toAmount</span>,{" "}
            <span style={{ color: accent }}>bridge</span> usado,{" "}
            <span style={{ color: accent }}>feeCostUsd</span> y tiempo estimado
            — listo para presentar al usuario antes de firmar.
          </p>
        </div>

        {/* ── 05 Sender App — Mobile Wallet Adapter ── */}
        <div
          id="sender-app"
          style={{
            marginTop: 40,
            paddingTop: 32,
            borderTop: `1px solid ${border}`,
          }}
        >
          <SectionTitle n="05" title="Sender App — Mobile Wallet Adapter" />
          <p style={{ margin: "0 0 20px", fontSize: 15, color: fgMuted }}>
            Conecta Phantom, Solflare o Backpack. En Android usa MWA — abre la
            wallet nativa via Intent sin salir del navegador. Firma{" "}
            <span style={{ color: accent, fontFamily: mono.style.fontFamily, fontSize: 13 }}>
              initialize_reservation
            </span>{" "}
            y{" "}
            <span style={{ color: accent, fontFamily: mono.style.fontFamily, fontSize: 13 }}>
              mark_verified
            </span>{" "}
            on-chain; TIA notifica al receptor por WhatsApp.
          </p>
          <SenderApp />
        </div>

        <footer
          className={mono.className}
          style={{
            marginTop: 56,
            fontSize: 12,
            color: fgMuted,
            letterSpacing: "0.04em",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 16px",
          }}
        >
          <span>Remesa TIA · Bridge Dev3pack · devnet only</span>
          <Link href="/status" style={{ color: accent, textDecoration: "none" }}>
            Status ↗
          </Link>
        </footer>
      </main>
    </>
  );
}

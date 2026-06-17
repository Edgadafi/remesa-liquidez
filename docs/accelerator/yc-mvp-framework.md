# YC Startup School: How to Plan an MVP

**Speaker:** Michael Seibel (Y Combinator)  
**Aplicado a:** Remesa TIA · Bridge Dev3pack · 16 jun – 9 jul 2026

> **Checklist operativo (immutable):** [SPEC.md](../../SPEC.md) en la raíz del repo.

---

## 1. Definition and Core Mindset

- **MVP:** Algo ridículamente simple. Lo primero que das a tus primeros usuarios para ver si entregas **algún valor**.
- **Meta pre-launch:** (1) Lanzar rápido, algo malo pero rápido · (2) Primeros clientes · (3) Hablar con usuarios · (4) Iterar.
- **Framework Remesa TIA:**
  - **Problema (apretado):** Cash-out digital→físico seguro en LATAM; remesas US→MX caras y lentas.
  - **Cliente (apretado):** Receptores unbanked + *tienditas* de barrio.
  - **Solución (suelta):** Hoy = Blinks + Anchor + WhatsApp. Adaptar si hay fricción.
- **Iterar vs pivotar:** Si el Blink no funciona, arregla cashout UX. No cambies de usuario.

## 2. Characteristics of a Lean MVP

- Construido en **semanas**, no meses (Bridge = 4 semanas; pilotos prod = **2 semanas** fijas).
- Funcionalidad **mínima:** un corredor, un flujo.
- Base para iterar — no es permanente ni especial.

## 3. Analogías YC → Remesa TIA

| Ejemplo YC | Remesa TIA |
|------------|------------|
| Airbnb sin pagos in-app | WhatsApp **texto + Blink link** antes de audio PTT / ElevenLabs |
| Twitch un solo canal | Un corredor US→MX, un comercio |
| Stripe integración manual | Deploy Render + bot QR manual Sem 1 |

## 4. Heavy MVP (remesas)

Industria regulada → atajo YC: **website + demo + conversaciones** mientras legal madura (Sem 3 Yarden). Devnet no requiere licencia MSB. Piloto mainnet-beta = datos reales con overrides manuales.

## 5. Launch vs Press Launch

| Tipo | Cuándo |
|------|--------|
| **Launch (aprender)** | Sem 2 — 5–10 beta users |
| **Press launch** | Posponer — Sem 4 deck es para mentores, no medios |

## 6. MVP Building Hacks (TIA Workflow)

### 6.1 Time-box the spec

- **Fecha fija, scope variable.** Bridge deadline: 9 jul.
- **Regla 3 días:** feature >3 días design→deploy → Post-MVP.
- **Cursor:** código que funciona *hoy*, no arquitectura perfecta la próxima semana.

### 6.2 Write the spec

- [SPEC.md](../../SPEC.md) en raíz — checklist immutable.
- Prompt: *"Analyze `@SPEC.md`. Only check off the current item. No extra endpoints/fields."*

### 6.3 Cut the spec

Orden en [SPEC.md](../../SPEC.md) y [mvp-spec-bridge.md](./mvp-spec-bridge.md):

1. LI.FI UI, World ID prod → mock
2. ElevenLabs / PTT → texto WhatsApp + Blink
3. Merchant UI fancy → Dial.to
4. **Nunca cortar:** WhatsApp + E2E + entrevistas

### 6.4 Do Things That Don't Scale

| Override | Cuándo |
|----------|--------|
| `POST /api/tia/manual-notify` | Webhook Helius falla en test en vivo |
| `NEXT_PUBLIC_FALLBACK_MERCHANT_PUBKEY` | Routing de tiendas falla |
| `TIA_ALLOW_NOTIFY_WITHOUT_BOT` | Demo sin bot (solo dev) |

**Traction > polish.** Volumen transaccionado con seguridad > infra 100% automatizada día 1.

## 7. Q&A / Pitfalls

- **No pedir features** — pedir problemas ([user-interview-script.md](./week-01/user-interview-script.md))
- **Perfeccionismo** — asume básico, corre, mide
- **PMF real** — meta post-Bridge; Sem 4 = aprendizaje + piloto 10 users
- **Vision big, MVP small** — pitch LATAM; producto US→MX devnet → mainnet-beta piloto

---

## Reglas de corte (equipo)

1. Si no cabe antes del deadline → Post-MVP en SPEC.md
2. Viernes = revisar spec, cortar 1 feature si hay retraso
3. Nunca cortar: WhatsApp notify + 1 flujo E2E + entrevistas
4. Pitch deck Sem 4 **después** de tracción Sem 2–3

Ver: [SPEC.md](../../SPEC.md) · [mvp-spec-bridge.md](./mvp-spec-bridge.md)

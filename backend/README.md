# Backend TIA — Remesa LiquidezIA

Backend TIA de holatia.app — notificaciones WhatsApp y API premium x402.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/tia/notify` | Notificación TIA → WhatsApp |
| POST | `/api/tia/manual-notify` | Override manual (Bearer `TIA_MANUAL_OVERRIDE_SECRET`) |
| POST | `/api/lidia/notify` | Alias legacy (mismo handler) |

## Payload `POST /api/tia/notify`

```json
{
  "walletSolana": "<pubkey receptor>",
  "userWA": "521234567890",
  "amountUSDC": 10,
  "reservationPda": "<pda>",
  "txSignature": "<sig>",
  "isVerified": true,
  "audioBase64": "<opcional desde Vercel/ElevenLabs>"
}
```

## Local

```bash
cp .env.example .env   # desde backend/
npm install
npm run dev
npm run smoke:notify -- 521234567890
```

## Deploy Vercel (`remesa-tia-backend`)

Root Directory = `backend`. Adapter: [`api/index.ts`](api/index.ts) (`export default createApp()`).

1. `BOT_INTERNAL_URL` = HTTPS **público** del bot Baileys (Render o túnel). Nunca localhost.
2. `BOT_INTERNAL_SECRET` = el mismo del bot. Sin URL pública el secret no evita el 502.
3. En el proyecto Vercel **del frontend** (`web`): `RENDER_BACKEND_URL=https://remesa-tia-backend.vercel.app`
4. No subir `STELLAR_TESTNET_SECRET` (solo `npm run x402:smoke` en tu máquina).

Producción: https://remesa-tia-backend.vercel.app — `GET /health` 200, `GET /premium/fx` 402.

## Semana 1 — limitaciones

- WhatsApp: **texto TIA** vía bot Baileys (`/internal/send`) + link Dial.to Blink en el mensaje
- `audioBase64`: recibido y logueado; nota de voz PTT = Post-MVP (ver [SPEC.md](../SPEC.md))
- Manual override: `POST /api/tia/manual-notify` cuando webhooks fallen en test en vivo

Ver también: [TIA-MIGRATION.md](./TIA-MIGRATION.md)

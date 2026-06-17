# Backend TIA — Remesa LiquidezIA

Servicio mínimo para Bridge Dev3pack Semana 1.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/tia/notify` | Notificación TIA → WhatsApp |
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

## Deploy Render

1. Blueprint: `render.yaml` en raíz del monorepo
2. Configurar `BOT_INTERNAL_URL` + `BOT_INTERNAL_SECRET`
3. Actualizar `RENDER_BACKEND_URL` en Vercel → URL del nuevo servicio

## Semana 1 — limitaciones

- WhatsApp: **texto TIA** vía bot Baileys (`/internal/send`)
- `audioBase64`: recibido y logueado; nota de voz PTT requiere patch bot (`/internal/send-audio-base64`) en Sem 2

Ver también: [TIA-MIGRATION.md](./TIA-MIGRATION.md)

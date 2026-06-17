# Deploy — Remesa TIA (Render + Vercel)

Guía para completar Semana 1: backend TIA + WhatsApp real.

## 1. Render — `remesa-tia-backend`

1. [render.com](https://render.com) → **New Blueprint**
2. Conectar repo `Edgadafi/remesa-liquidez`
3. Render detecta [`render.yaml`](../../render.yaml) → servicio `remesa-tia-backend`
4. **Environment** (manual):

| Variable | Valor |
|----------|-------|
| `BOT_INTERNAL_URL` | `https://remesa-blink-bot.onrender.com` |
| `BOT_INTERNAL_SECRET` | Mismo secret que el bot Baileys |
| `TIA_ALLOW_NOTIFY_WITHOUT_BOT` | `false` (prod) |

5. Deploy → anotar URL: `https://remesa-tia-backend.onrender.com`

### Verificar

```bash
curl https://remesa-tia-backend.onrender.com/health

curl -X POST https://remesa-tia-backend.onrender.com/api/tia/notify \
  -H "Content-Type: application/json" \
  -d '{
    "walletSolana": "BsuHTPQxWPyiToz8fZcrP2STGripLmbAaT11AezwBaw",
    "userWA": "TU_NUMERO_SIN_PLUS",
    "amountUSDC": 10,
    "isVerified": true,
    "reservationPda": "DemoPda123"
  }'
```

Respuesta esperada: `{ "ok": true, "messageSent": true, "agent": "TIA" }`

## 2. Vercel — actualizar env

Dashboard → Settings → Environment Variables:

```
RENDER_BACKEND_URL=https://remesa-tia-backend.onrender.com
ELEVENLABS_API_KEY=<tu_key>
```

Redeploy production.

## 3. Bot WhatsApp (remesa-blink-bot)

Si el bot está offline en Render free tier:
1. Abrir Shell del servicio bot
2. Re-escanear QR WhatsApp
3. Verificar `BOT_INTERNAL_SECRET` coincide en backend y bot

## 4. Smoke E2E completo

```bash
# Desde raíz monorepo
npm run e2e:devnet          # crea reserva on-chain
npm run backend:smoke -- 521234567890
```

O desde la landing: Sender App → reserva → verify → WhatsApp al receptor.

## Troubleshooting

| Síntoma | Fix |
|---------|-----|
| `502 fetch failed` | Bot offline o BOT_INTERNAL_URL incorrecto |
| `401 Unauthorized` | BOT_INTERNAL_SECRET mismatch |
| `400 Payload inválido` | userWA sin +, mínimo 10 dígitos |
| Vercel sigue en lidia 404 | RENDER_BACKEND_URL apunta al servicio TIA nuevo |
| Webhook Helius falló en test | Manual override (ver abajo) |

## Manual override — WhatsApp (Do Things That Don't Scale)

Si la tx on-chain confirmó pero el receptor no recibió WhatsApp:

```bash
curl -X POST https://remesa-tia-backend.onrender.com/api/tia/manual-notify \
  -H "Authorization: Bearer $TIA_MANUAL_OVERRIDE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "walletSolana": "BsuHTPQxWPyiToz8fZcrP2STGripLmbAaT11AezwBaw",
    "userWA": "521234567890",
    "amountUSDC": 10,
    "isVerified": true,
    "reservationPda": "<PDA>"
  }'
```

El mensaje incluye link Dial.to Blink para cashout (sin ElevenLabs).

## Hardcoded merchant (piloto)

En Vercel, set `NEXT_PUBLIC_FALLBACK_MERCHANT_PUBKEY` al comercio de confianza.
Las reservas lo pre-bloquean on-chain si el routing de tiendas falla.

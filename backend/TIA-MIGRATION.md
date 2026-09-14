# Migración backend → agente TIA

## Estado (holatia.app)

**Implementado en monorepo:** `backend/` con `POST /api/tia/notify` + alias `/api/lidia/notify`.

El frontend Vercel ([web/lib/tia-backend.ts](../web/lib/tia-backend.ts)) llama primero `/api/tia/notify`.

## Deploy

1. Vercel proyecto `remesa-tia-backend` (Root Directory `backend`)
2. Env en **ese** proyecto: `BOT_INTERNAL_URL` (HTTPS público, nunca localhost), `BOT_INTERNAL_SECRET`
3. En el proyecto **frontend** `web` (web-coral-pi-66): `RENDER_BACKEND_URL=https://remesa-tia-backend.vercel.app`
4. `STELLAR_TESTNET_SECRET` solo en `.env` local — no en Vercel

## WhatsApp

Proxy a `remesa-blink-bot`:

```
POST {BOT_INTERNAL_URL}/internal/send
Authorization: Bearer {BOT_INTERNAL_SECRET}
{ "to": "521234567890", "text": "..." }
```

## Sem 2 — audio PTT

Añadir en bot Baileys:

```
POST /internal/send-audio-base64
{ "to", "audioBase64" }
```

Hasta entonces, TIA envía el mismo copy por texto WhatsApp.

## Legacy remesa-blink

No clonar `remesa-blink` completo — otro programa Anchor (`remesas_recurrentes`). Solo reutilizar bot WhatsApp.

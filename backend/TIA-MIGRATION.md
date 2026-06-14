# Migración backend → agente TIA (Bridge Dev3pack)

El agente conversacional se llama **TIA**. El frontend en Vercel ya llama:

1. `POST {RENDER_BACKEND_URL}/api/tia/notify` (canónico)
2. Si responde **404**, cae a `POST /api/lidia/notify` (legacy en Render)

## Cambios en `backend/src/app.ts`

```ts
import tiaRouter from "./routes/tia.js";
import lidiaRouter from "./routes/lidia.js"; // legacy — mismo handler o re-export

app.use("/api/tia", tiaRouter);
app.use("/api/lidia", tiaRouter); // alias hasta deprecar remesa-blink
```

## Renombrar rutas (recomendado)

| Antes | Después |
|-------|---------|
| `routes/lidia.ts` | `routes/tia.ts` |
| `services/lidiaAgent.ts` | `services/tiaAgent.ts` |
| `lidiaScript` en DB/types | `tiaScript` (columna nueva o alias) |
| Logs `[LidIA Route]` | `[TIA]` |

## Handler `/notify` — logs y copy

```ts
console.log("[TIA] notify →", userWA, amountUSDC, "USDC");
// Mensajes WhatsApp: "Soy TIA, tu asistente de remesas..."
```

## Payload (sin cambios)

```json
{
  "walletSolana": "<pubkey>",
  "userWA": "521234567890",
  "amountUSDC": 10,
  "reservationPda": "<pda>",
  "txSignature": "<sig>",
  "isVerified": true,
  "audioBase64": "<opcional — MP3 desde Vercel/ElevenLabs>"
}
```

## Deploy en Render

1. Aplicar cambios en el servicio `remesa-blink-backend`
2. Verificar `GET /health`
3. Probar `POST /api/tia/notify` con body mínimo
4. Confirmar que Vercel recibe `whatsapp.path: "/api/tia/notify"` en la respuesta de `/api/notify/verified`

## Monorepo local

Cuando `backend/` exista en este repo:

```bash
cp .env.example .env   # RENDER_BACKEND_URL, WhatsApp, DB, etc.
npm run sync-env
cd backend && npm install && npm run dev
```

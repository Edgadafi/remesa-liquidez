# Ops Runbook — Remesa TIA

> Sylvain · Semana 3 · Deploy cada viernes (YC momentum)

## Smoke semanal (15 min)

```bash
# 1. On-chain E2E
npm run e2e:devnet

# 2. Backend TIA
curl https://remesa-tia-backend.onrender.com/health

# 3. Frontend
curl -s https://web-coral-pi-66.vercel.app/actions.json | head -c 200

# 4. WhatsApp (opcional — número test)
npm run backend:smoke -- 521234567890
```

## Deploy checklist

| Servicio | Trigger | Verificar |
|----------|---------|-----------|
| Vercel (web) | push `main` | Landing + Sender App |
| Render (backend) | Blueprint / manual | `/health` |
| remesa-blink-bot | Shell QR si offline | `/internal/send` 200 |

Ver [DEPLOY.md](../DEPLOY.md).

## Incidentes comunes

| Síntoma | Causa | Fix |
|---------|-------|-----|
| Render cold start 502 | Free tier sleep | Retry; upgrade si demo en vivo |
| Bot WhatsApp desconectado | Baileys session expired | Shell → re-scan QR |
| Wallet MWA crash | SSR / cache | `WalletProvider` dynamic `ssr: false` |
| Cashout 412 | `mark_verified` pendiente | Sender aprueba primero |

## Rollback

- **Vercel:** Promote deployment anterior en dashboard
- **Render:** Manual deploy commit previo
- **On-chain:** No rollback — devnet only; redeploy program si crítico

## Calendario content (2 posts/semana)

| Día | Tipo | Tema sugerido |
|-----|------|---------------|
| Lun | Build log | Tx E2E screenshot + fee 0.25% |
| Jue | User insight | Quote entrevista Laura (anon) |

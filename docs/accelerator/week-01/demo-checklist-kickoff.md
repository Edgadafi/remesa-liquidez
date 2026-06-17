# Demo Checklist — Kick Off Solene (16 jun)

## Pre-demo (15 min antes)

- [ ] Wallet sender con SOL + USDC devnet (`npm run e2e:devnet` si hace falta)
- [ ] Phantom en **Devnet**
- [ ] Teléfono receptor con WhatsApp activo (número en `.env`)
- [ ] `ELEVENLABS_API_KEY` en Vercel (opcional — TTS)
- [ ] `RENDER_BACKEND_URL` apuntando a `remesa-tia-backend` o legacy
- [ ] `BOT_INTERNAL_SECRET` configurado si bot en Render
- [ ] Abrir [web-coral-pi-66.vercel.app](https://web-coral-pi-66.vercel.app) en móvil o desktop

## Storyboard demo (2 min)

1. **Problema** — "7% de fee, días de espera, receptor sin banco"
2. **Sender** — Conectar wallet → crear reserva 10 USDC
3. **Verify** — Aprobar identidad → `mark_verified`
4. **TIA** — Mostrar respuesta `/api/notify/verified` + WhatsApp recibido
5. **Comercio** — Blink cashout (Dial.to o `/remesa/<pda>`)
6. **Solscan** — Program ID + tx confirmada

## Links rápidos

| Recurso | URL |
|---------|-----|
| Demo | https://web-coral-pi-66.vercel.app |
| Program | https://solscan.io/account/Fprb6jTLfjXfZ6yuWzS7LVXxwVvPbPgPZiEqDEL9bRfj?cluster=devnet |
| Repo | https://github.com/Edgadafi/remesa-liquidez |
| VPC | docs/accelerator/week-01/value-proposition-canvas.md |

## Si algo falla

| Error | Plan B |
|-------|--------|
| Sin USDC devnet | Mostrar video grabado + Solscan tx previa |
| WhatsApp offline | Mostrar JSON `whatsapp.textSent` + audio base64 en respuesta API |
| Wallet error | Usar Blink verify pre-generado con PDA de e2e |

## Objetivos para Solene

- Posición #43 → meta top 25 LATAM al cierre Bridge
- Pedir feedback: ¿corredor US→MX es el PMF correcto?
- Agendar follow-up post-entrevistas Laura

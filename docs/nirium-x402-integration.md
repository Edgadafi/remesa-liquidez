# Nirium x402 — TIA Premium API

Monetiza datos de corredor remittance (LI.FI bridge + Bitso FX) con micropagos USDC en Stellar. Sin suscripción, tarjeta ni KYC del vendedor — el pago se verifica on-chain vía [HTTP 402](https://github.com/coinbase/x402) + facilitator OpenZeppelin.

**Rail de cobro:** Stellar testnet (mainnet post-audit)  
**Rail de remesa:** Solana devnet — sin cambios; premium es B2B paralelo.

## Endpoints

| Ruta | Precio default | Datos |
|------|----------------|-------|
| `GET /premium/bridge-quote` | $0.02 USDC | Quote LI.FI EVM → Solana |
| `GET /premium/fx` | $0.01 USDC | USD/MXN live (Bitso) |

**Free tier (UI TIA):** `GET /api/bridge/quote` en Vercel — no reemplazar.

## Prerequisitos

1. **Facilitator API key** (testnet, gratis): [channels.openzeppelin.com/testnet/gen](https://channels.openzeppelin.com/testnet/gen)
2. **Cuenta Stellar testnet** (`STELLAR_PAY_TO`) — recibe USDC
3. Backend TIA en Vercel (`remesa-tia-backend`) con vars de cobro — **no** `STELLAR_TESTNET_SECRET`

## Activación

```bash
# .env (raíz del monorepo) — STELLAR_TESTNET_SECRET solo aquí, nunca en Vercel
NIRIUM_X402_ENABLED=true
STELLAR_PAY_TO=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X402_FACILITATOR_API_KEY=<key de OpenZeppelin testnet>
STELLAR_NETWORK=testnet
NIRIUM_X402_BRIDGE_PRICE=0.02
NIRIUM_X402_FX_PRICE=0.01

npm run sync-env
```

Redeploy `remesa-tia-backend` en Vercel. En el proyecto **web**: `RENDER_BACKEND_URL=https://remesa-tia-backend.vercel.app`.

## Verificar 402 (sin pago)

```bash
curl -i https://remesa-tia-backend.vercel.app/premium/fx
# Esperado: HTTP 402 + header payment-required
```

## Smoke test (cliente paga y recibe datos)

`STELLAR_TESTNET_SECRET` es la cuenta **pagadora** del script. Solo en tu máquina.

```bash
# 1. Preparar pagador (XLM + trustline USDC)
npm run fund-x402-payer

# 2. Si USDC = 0: https://faucet.circle.com/ → Stellar Testnet → pegar public key

# 3. Smoke contra prod o local
RENDER_BACKEND_URL=https://remesa-tia-backend.vercel.app npm run x402:smoke
# o: RENDER_BACKEND_URL=http://localhost:3000 npm run x402:smoke
```

## Mainnet / pubnet

No es rotar `X402_FACILITATOR_API_KEY` y poner `STELLAR_NETWORK=pubnet`. Hace falta:

| Pieza | Testnet | Mainnet |
|-------|---------|---------|
| `STELLAR_NETWORK` | `testnet` | `pubnet` o `mainnet` |
| `STELLAR_PAY_TO` | `G…` testnet + trustline USDC | `G…` **mainnet** + trustline USDC (~1.5 XLM de reserva) |
| Facilitator | [testnet/gen](https://channels.openzeppelin.com/testnet/gen) | [gen](https://channels.openzeppelin.com/gen) |

Mezclar un `G` de testnet (p. ej. `GAAXQWE6…`) con `stellar:pubnet` no cobra.

Verifica el pago en [Stellar Expert testnet](https://stellar.expert/explorer/testnet).

## Smoke log (tracker)

Checked only when observed on **prod**, not scaffold. No cierra las 3 txs sender → cashout.

| Fecha | Probe | Resultado | Evidencia |
|-------|-------|-----------|-----------|
| 14 sep 2026 | `GET /health` | **200** `ok:true` agent TIA | `https://remesa-tia-backend.vercel.app/health` — GitHub deploy `15981ab` / `dpl_2suARVcSE5D7Ma7buo5fh4G46nsa` |
| 14 sep 2026 | `GET /premium/fx` unpaid | **402** + `payment-required` | `stellar:testnet` · asset SAC `CBIELTK6…` · payTo `GAAXQWE6…` |
| 14 sep 2026 | `/status` Premium API | **EN LÍNEA** | `web-coral-pi-66` · puente $0.02 · FX $0.01 |
| 14 sep 2026 | `npm run x402:smoke` paid testnet | **200** settle + handler | `{ ok, pair: USD/MXN, rate: 17.111, isLive: true }` · [e08479dc…f655](https://stellar.expert/explorer/testnet/tx/e08479dcbca161deb0886f8c0d738940704c923c468371c4ec60b6635af5f655) · secret local, no Vercel |
| 14 sep 2026 | `GET /health` + unpaid `/premium/fx` | **200** / **402** pubnet | `stellar:pubnet` · payTo Lobstr `GBRMBOE…` · facilitator `/gen` |
| 14 sep 2026 | `/status` Premium API | **EN LÍNEA** pubnet | `web-coral-pi-66` · `stellar:pubnet` · puente $0.02 · FX $0.01 |
| 14 sep 2026 | `npm run x402:smoke` paid pubnet | **200** settle + handler | `{ ok, pair: USD/MXN, rate: 17.141, isLive: true }` · 0.01 USDC Circle · [f20a580a…d35bfd](https://stellar.expert/explorer/public/tx/f20a580aed9220201c48aabd26eaf2a99ae840afd063bfb85131879eded35bfd) · Freighter `GB3RZCIA…` → Lobstr `GBRMBOE…` · secret local, no Vercel |

Vars de cobro viven en Vercel `remesa-tia-backend`. `RENDER_BACKEND_URL` vive en el proyecto **web**.

## Archivos clave

| Path | Rol |
|------|-----|
| `backend/src/app.ts` | Monta `x402Serve()` + router premium |
| `backend/src/routes/premium.ts` | Handlers bridge-quote + fx |
| `backend/src/services/x402Config.ts` | Env + status para `/health` |
| `scripts/x402-smoke.ts` | E2E cliente con `Agent.initX402()` |

## Referencias

- [nirium-sdk](https://github.com/nirium-protocol/nirium-sdk)
- [nirium.xyz/docs](https://nirium.xyz/docs)
- [quickstart x402](https://github.com/nirium-protocol/nirium-sdk/blob/main/docs/quickstart-x402.md)

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
3. Backend Render con vars configuradas

## Activación

```bash
# .env (raíz del monorepo)
NIRIUM_X402_ENABLED=true
STELLAR_PAY_TO=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X402_FACILITATOR_API_KEY=<key de OpenZeppelin testnet>
STELLAR_NETWORK=testnet
NIRIUM_X402_BRIDGE_PRICE=0.02
NIRIUM_X402_FX_PRICE=0.01

npm run sync-env
```

Redeploy `remesa-tia-backend` en Render.

## Verificar 402 (sin pago)

```bash
curl -i "$RENDER_BACKEND_URL/premium/fx"
# Esperado: HTTP 402 + JSON x402 payment requirements
```

## Smoke test (cliente paga y recibe datos)

```bash
# 1. Preparar pagador (XLM + trustline USDC)
npm run fund-x402-payer

# 2. Si USDC = 0: https://faucet.circle.com/ → Stellar Testnet → pegar public key

# 3. Backend local corriendo + smoke
RENDER_BACKEND_URL=http://localhost:3000 npm run x402:smoke
```

Verifica el pago en [Stellar Expert testnet](https://stellar.expert/explorer/testnet).

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

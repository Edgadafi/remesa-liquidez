# TIA agent client example

Pays for one call to the [TIA Premium API](../../docs/agents/README.md) with x402 on **Stellar mainnet** and prints the JSON payload.

## Prerequisites

- Node.js ≥ 20
- A Stellar **mainnet** account with:
  - a USDC trustline (`USDC` issued by `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`)
  - a few cents of USDC ($0.10 per quote, $0.25 per route call)
  - network fees are sponsored by the facilitator — you only spend USDC

## Run it

```bash
cd examples/agent-client
npm install
cp .env.example .env      # set STELLAR_SECRET (never commit .env)
npm run quote
```

Expected output:

```
[probe] https://remesa-tia-backend.vercel.app/v1/quote → HTTP 402
[probe] price: 0.1 USDC on stellar:pubnet → GBRMBOEG…
[paid] HTTP 200 — payload:
{
  "ok": true,
  "apiVersion": "1",
  "pair": "USD/MXN",
  "rate": 17.13,
  "bid": 17.12,
  "ask": 17.15,
  "spread": 0.03,
  ...
}
```

Try the route estimator instead: set `TIA_TARGET_PATH=/v1/route?amount=250` in `.env`.

## Notes

- `STELLAR_SECRET` stays in your local `.env` — the repo only ships `.env.example` with empty values.
- The unpaid probe shows you the exact price/asset/destination **before** any payment is signed.
- Every payment is publicly verifiable on [stellar.expert](https://stellar.expert/explorer/public/account/GBRMBOEGDTF72FP72D7OQLICBXVTSG25GYWZ3W7TNCLD47NEYVU7JUBS).

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

# 1) Inspect the payment terms WITHOUT paying (no secret key needed):
npm run dry-run

# 2) Pay and consume:
cp .env.example .env      # set STELLAR_SECRET (never commit .env)
npm run quote
```

`dry-run` output — prints the 402 terms and exits without signing anything:

```
[dry-run] https://remesa-tia-backend.vercel.app/v1/quote → HTTP 402
[dry-run] payment terms offered:
{
  "resourceUrl": "https://remesa-tia-backend.vercel.app/v1/quote",
  "network": "stellar:pubnet",
  "asset": "CCW67TSZ…MI75",
  "amountBaseUnits": "1000000",
  "amountUsdc": 0.1,
  "payTo": "GBRMBOEG…JUBS"
}
[dry-run] no payment was signed. Remove --dry-run to pay.
```

`quote` output — a **single** `x402Fetch` call (the SDK signs the terms of the same 402 it receives, so there is no probe/payment mismatch window):

```
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

Settled on-chain: https://stellar.expert/explorer/public/tx/<hash>
```

Try the route estimator instead: set `TIA_TARGET_PATH=/v1/route?amount=250` in `.env`.

## Notes

- `STELLAR_SECRET` stays in your local `.env` — the repo only ships `.env.example` with empty values.
- `dry-run` never signs: it is read-only inspection of the offer. The paid path signs exactly the 402 that `x402Fetch` itself receives.
- Verification comes from the settlement receipt of your own payment (`payment-response` header → tx on stellar.expert), with the expected receiving account documented in [docs/agents/README.md](../../docs/agents/README.md).

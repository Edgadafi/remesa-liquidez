# TIA Premium API — FX intelligence for AI agents, paid per request with x402

Live USD/MXN market intelligence your agent can buy per request — no API key, no signup, no subscription. Payment is a ~$0.10 USDC micro-transaction on Stellar mainnet, negotiated automatically over HTTP with the [x402 protocol](https://x402.org).

**Base URL:** `https://remesa-tia-backend.vercel.app`

## What you're buying (not just a number)

| Endpoint | Price | What you get |
|----------|-------|--------------|
| `GET /v1/quote` | $0.10 | USD/MXN from Bitso: last, **bid/ask, spread + spread%, 24h volume**, vwap, high/low. Versioned JSON (`apiVersion: "1"`) |
| `GET /v1/route?amount=USD` | $0.25 | Best USD→MXN rail for a given amount: Bitso spot / USDC via Stellar / traditional SPEI wire — total cost, effective rate, ETA, and **published assumptions per option** |
| `GET /premium/fx` | $0.10 | Legacy: USD/MXN last price only |

Discovery: [`GET /health`](https://remesa-tia-backend.vercel.app/health) lists every paid route and its current price (no payment needed).

> `POST /v1/alert` (threshold alerts with webhook delivery) exists in the API but its production scheduling/persistence setup is still being finalized — don't build on it yet. Quote and route are fully live.

## Network and payment details

| | |
|--|--|
| Network | `stellar:pubnet` (Stellar mainnet) |
| Asset | USDC (Circle) — SAC `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75` |
| Scheme | x402 `exact` via the [OpenZeppelin facilitator](https://channels.openzeppelin.com) (transaction fees are sponsored — your agent spends USDC only) |
| Receiving account | [`GBRMBOEGDTF72FP72D7OQLICBXVTSG25GYWZ3W7TNCLD47NEYVU7JUBS`](https://stellar.expert/explorer/public/account/GBRMBOEGDTF72FP72D7OQLICBXVTSG25GYWZ3W7TNCLD47NEYVU7JUBS) — every payment is publicly verifiable on stellar.expert |

## The x402 flow

```
agent                         API                        facilitator
  │  GET /v1/quote             │                              │
  │───────────────────────────>│                              │
  │  402 + payment-required    │                              │
  │<───────────────────────────│                              │
  │  (sign USDC payment for the quoted amount)                │
  │  GET /v1/quote + PAYMENT header                           │
  │───────────────────────────>│  verify + settle on Stellar  │
  │                            │─────────────────────────────>│
  │  200 + JSON payload        │                              │
  │<───────────────────────────│                              │
```

Your client does all of this in one call — the `402 → sign → retry` loop is handled by the SDK.

## Minimal TypeScript client (mainnet, copy-paste)

Prerequisites: a Stellar mainnet account with a **USDC trustline** and a little USDC (a few cents per call). Fees are sponsored by the facilitator.

```typescript
import { Agent } from "nirium"; // npm install nirium

const agent = new Agent({
  apiKey: "unused-for-x402",
  baseUrl: "https://remesa-tia-backend.vercel.app",
});

agent.initX402({
  secretKey: process.env.STELLAR_SECRET!, // S... — never hardcode, never commit
  network: "stellar:pubnet",
});

// One call: unpaid probe → 402 → sign USDC payment → retry → 200
const res = await agent.x402Fetch(
  "https://remesa-tia-backend.vercel.app/v1/quote"
);
const quote = await res.json();

console.log(quote);
// {
//   ok: true, apiVersion: "1", pair: "USD/MXN",
//   rate: 17.13, bid: 17.12, ask: 17.15,
//   spread: 0.03, spreadPct: 0.17,
//   volume24hUsd: 1234567, vwap24h: 17.10, ...
// }
```

Browser/wallet variant: `agent.initX402({ signer, network: "stellar:pubnet" })` keeps the key inside the wallet (e.g. Freighter).

A runnable version with `.env` handling lives in [`examples/agent-client/`](../../examples/agent-client/).

## Verifying you actually paid

1. Run the client — the paid response is HTTP 200 with the JSON above.
2. Open the [receiving account on stellar.expert](https://stellar.expert/explorer/public/account/GBRMBOEGDTF72FP72D7OQLICBXVTSG25GYWZ3W7TNCLD47NEYVU7JUBS) — your USDC payment appears within seconds.
3. Inspect the unpaid 402 yourself: `curl -i https://remesa-tia-backend.vercel.app/v1/quote` and base64-decode the `payment-required` header to see the exact amount, asset, and payTo before spending anything.

## FAQ

- **Data source?** Bitso (`usd_mxn` book), 60 s cache, `isLive` flag in every response. If the upstream feed is down the API says so instead of silently serving stale data.
- **Do I need an account with you?** No. The payment is the authentication.
- **Testnet?** The live deployment is mainnet-only. Prices are cents precisely so you can test against production.
- **Rate limits?** None beyond payment — every paid request is served.

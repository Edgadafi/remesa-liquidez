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

# 2) Pin the recipient and pay:
cp .env.example .env      # set STELLAR_SECRET + EXPECTED_PAY_TO (never commit .env)
npm run quote
```

## Client-side spend guards

The client refuses to sign unless the offered terms pass three checks:

| Guard | Env var | Effect |
|---|---|---|
| payTo allowlist | `EXPECTED_PAY_TO` (**required**) | Terms whose recipient is not pinned are filtered out before signing — a compromised DNS/server 402 pointing at an attacker's account is never paid. Pin the value you saw in `dry-run` after verifying it out-of-band. |
| Network pin | `STELLAR_NETWORK` (default `stellar:pubnet`) | The payment scheme is registered only for this network; terms on any other network never match. |
| Spend cap | `MAX_PRICE_USDC` (default `0.50`) | Per-payment USD cap enforced by the SDK's spend controls before any signature. |

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
[dry-run] no payment was signed. Pin this payTo as EXPECTED_PAY_TO in .env, then remove --dry-run to pay.
```

`quote` output — a **single** wrapped-fetch call (the client signs the terms of the same 402 it receives — after the allowlist and spend-cap filters — so there is no probe/payment mismatch window):

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
- `dry-run` never signs: it is read-only inspection of the offer. The paid path signs exactly the 402 that the wrapped fetch itself receives, filtered through the allowlist policy and the spend cap.
- Verification comes from the settlement receipt of your own payment (`payment-response` header → tx on stellar.expert), with the expected receiving account documented in [docs/agents/README.md](../../docs/agents/README.md).
- If your agent takes natural-language instructions from an LLM, sanitize them before they can influence `TIA_API_BASE`, `EXPECTED_PAY_TO`, or `MAX_PRICE_USDC` — prompt injection that rewrites the target or the allowlist defeats every guard above (see [SECURITY.md](../../SECURITY.md)).

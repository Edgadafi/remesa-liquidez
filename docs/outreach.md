# Outreach — Paso 4 (material listo para pegar)

Pitch técnico, sin hype, para los primeros agentes. GitHub ya queda cubierto por
[docs/agents/README.md](agents/README.md). No publicar hasta completar
[paso4-checklist.md](paso4-checklist.md).

---

## 1. Comunidades de frameworks de agentes (LangChain / CrewAI / r/AI_Agents)

> **Subject: Live FX API your agent pays for per request (x402 on Stellar mainnet) — no API key**
>
> I run a small paid API for agents that need USD/MXN market data, and I'm looking for early users to break it.
>
> - `GET /v1/quote` — $0.10: last/bid/ask, spread, 24h volume (Bitso feed, 60s cache, `isLive` flag)
> - `GET /v1/route?amount=100` — $0.25: compares USD→MXN rails (exchange spot vs USDC vs bank wire) with total cost and published assumptions
>
> No signup, no API key. The request gets HTTP 402 with the price, your client signs a USDC micropayment on Stellar mainnet, retries, gets 200. The whole loop is one SDK call in TypeScript:
>
> ```typescript
> agent.initX402({ secretKey: process.env.STELLAR_SECRET, network: "stellar:pubnet" });
> const quote = await (await agent.x402Fetch("https://remesa-tia-backend.vercel.app/v1/quote")).json();
> ```
>
> You can inspect the 402 before paying anything (`curl -i https://remesa-tia-backend.vercel.app/v1/quote`) and every payment is publicly verifiable on stellar.expert. Runnable example + docs: https://github.com/Edgadafi/remesa-liquidez/tree/main/docs/agents
>
> If your agent framework can call a tool that runs a Node script, it can consume this. Feedback on pricing, payload shape, or the payment UX is exactly what I'm after.

---

## 2. Stellar Developers Discord

> **Live x402 `exact` API on pubnet — FX intelligence priced in cents, looking for agent devs to test it**
>
> Shipped a paid API on Stellar mainnet using the x402 protocol with the OpenZeppelin facilitator (fees sponsored, payer only spends USDC):
>
> - `GET /v1/quote` $0.10 — USD/MXN with bid/ask, spread, 24h volume
> - `GET /v1/route?amount=…` $0.25 — USD→MXN rail comparison (one option is USDC over Stellar, with the cost math shown)
>
> Unpaid probe: `curl -i https://remesa-tia-backend.vercel.app/v1/quote` → decode the `payment-required` header to see amount/asset/payTo. Receiving account is public: https://stellar.expert/explorer/public/account/GBRMBOEGDTF72FP72D7OQLICBXVTSG25GYWZ3W7TNCLD47NEYVU7JUBS
>
> TypeScript client is ~10 lines (402 → sign → retry handled by the SDK). Docs + runnable example: https://github.com/Edgadafi/remesa-liquidez/tree/main/docs/agents
>
> Interested in feedback from anyone building agent payments on Stellar — especially on the payload spec and what other LATAM FX data would be worth paying for.

---

## 3. Versión corta (foros con límite de caracteres / X)

> Live paid API for AI agents: USD/MXN quote with spread + volume for $0.10 USDC per request, x402 on Stellar mainnet. No API key — HTTP 402 → sign → 200. TypeScript example: https://github.com/Edgadafi/remesa-liquidez/tree/main/docs/agents

---

## Reglas al publicar

- No prometer `/v1/alert` como listo (requiere setup ops — cron + store) ni mencionar `/v1/execute` o sesiones.
- No pegar secrets ni claves de facilitador; el payTo es público por diseño.
- Responder issues/preguntas con el ejemplo de `examples/agent-client/` como primera referencia.

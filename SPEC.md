# SPEC.md — Remesa TIA (immutable sprint checklist)

> **Source:** YC Startup School (Michael Seibel) · TIA Workflow Engineering Framework  
> **Rule:** If it is not checked here before the sprint starts, it does not exist.  
> **Cursor constraint:** Only generate bare-minimum production-ready code to check off the **current** item. No auxiliary DB fields, complex config states, or extra endpoints unless this file explicitly requests them.

---

## Ground rules (8-week Bridge)

1. **Hold the problem tightly:** Seamless, secure digital-to-physical remittance cash-outs in LATAM.
2. **Hold the customer tightly:** Unbanked receivers + neighborhood merchants (*tienditas*).
3. **Hold the solution loosely:** Blinks + WhatsApp + **hybrid routing (ATM ↔ tiendita)**. Adapt rails by liquidity/geo data.
4. **Vision big, MVP small.**

---

## Time-box

| Phase | Window | Launch date |
|-------|--------|-------------|
| Bridge MVP (devnet) | 16 jun – 9 jul 2026 | **9 jul 2026** (fixed) |
| Production pilot sprint | **2 weeks** per pilot | Scope is the variable, date is not |

**3-day rule:** Any feature/integration taking >3 days design→deploy → **Post-MVP** automatically.

---

## Sprint checklist — Bridge MVP (devnet)

Check only when **working in prod/devnet**, not when scaffolded.

### On-chain flow

- [x] Sender creates reservation (`initialize_reservation`) via MWA
- [x] Sender approves receiver (`mark_verified`)
- [ ] Comercio liquidates (`validate_cashout` Blink) — E2E with beta user
- [x] Merchant UI (`/merchant`) + Dial.to fallback

### TIA / WhatsApp

- [x] Backend `POST /api/tia/notify` (text)
- [ ] Render deploy `remesa-tia-backend` live
- [ ] 1 real WhatsApp delivery to non-founder
- [x] WhatsApp template includes Blink `preview_url` (text fallback; no ElevenLabs required)
- [x] Manual override `POST /api/tia/manual-notify` (Do Things That Don't Scale)

### Prova attestation (devnet — fail-open)

- [ ] `npm run register-prova:devnet` → `NEXT_PUBLIC_PROVA_AGENT_PDA` in `.env`
- [ ] `PROVA_ENABLED=true` on Render + Vercel (agent/operator keys server-side only)
- [ ] Notify attest: backend `ToolCall` on WhatsApp send (`privacyMode`)
- [ ] Tx attest: `/api/notify/verified` (`Transaction` + optional `Decision`)
- [ ] Cashout attest: `/api/notify/cashout` after merchant `validate_cashout`
- [ ] `/status` shows Prova explorer link for TIA agent

### Nirium x402 (premium API — fail-closed when disabled)

- [x] `X402_FACILITATOR_API_KEY` from [OpenZeppelin](https://channels.openzeppelin.com/gen) on `remesa-tia-backend` — testnet `/testnet/gen` then pubnet `/gen` (14 sep 2026)
- [x] `STELLAR_PAY_TO` + `NIRIUM_X402_ENABLED=true` on Vercel `remesa-tia-backend` — pubnet Lobstr `GBRMBOE…` (14 sep 2026; was testnet `GAAXQWE6…`)
- [x] `curl -i $BACKEND/premium/fx` returns **402** without payment — prod `https://remesa-tia-backend.vercel.app/premium/fx` (14 sep 2026, GitHub deploy `15981ab`; now `stellar:pubnet`)
- [x] `npm run x402:smoke` returns **200** + Stellar **pubnet** tx verifiable — `{ ok, pair: USD/MXN, rate: 17.141, isLive: true }` + [f20a580a…d35bfd](https://stellar.expert/explorer/public/tx/f20a580aed9220201c48aabd26eaf2a99ae840afd063bfb85131879eded35bfd) · 0.01 USDC Circle Freighter `GB3RZCIA…` → Lobstr `GBRMBOE…` (14 sep 2026; no cierra las 3 txs remesa E2E). Testnet prior: [e08479dc…f655](https://stellar.expert/explorer/testnet/tx/e08479dcbca161deb0886f8c0d738940704c923c468371c4ec60b6635af5f655)
- [x] `/status` shows TIA Premium API (x402) row with prices — `stellar:pubnet · puente $0.02 · tipo de cambio $0.01` on `web-coral-pi-66`

### Users & GTM

- [ ] 3 user interviews logged ([interview-tracker.md](docs/accelerator/week-01/interview-tracker.md))
- [ ] 5 beta users contacted ([beta-users-tracker.md](docs/accelerator/week-02/beta-users-tracker.md))
- [ ] ≥1 non-founder reservation attempt
- [x] VPC + founder story + positioning docs
- [x] Landing v2 hero TIA + "Cómo funciona"

### Ops & pitch

- [x] Ops runbook + legal checklist (devnet)
- [x] Status / data room lite (`/status`)
- [ ] 3 E2E txs documented ([e2e-transactions.md](docs/accelerator/week-03/e2e-transactions.md))
- [ ] Pitch deck with real screenshots
- [ ] Pilot plan 10 users — **no press launch**

---

## Post-MVP (do not build during Bridge unless spec change approved)

- **Stellar Soroban escrow deploy** — USDC SAC lock/cashout is wired in `contracts/remesa-tia-stellar/` (testnet, not deployed); Solana wins pilot until metrics say otherwise ([dual-chain-decision.md](docs/dual-chain-decision.md))
- Mainnet + formal audit
- **Recurring / automated transfers** (keeper — set once, TIA runs every payday) — @remesatia blueprint
- ElevenLabs real-time voice pipeline / WhatsApp PTT
- **TIA auto-routing v1** (geo + tiendita liquidity → ATM vs tiendita) — [hybrid-routing-model.md](docs/accelerator/week-02/hybrid-routing-model.md)
- **ATM cardless withdrawal partner API** (urban rail)
- Store location distance math (`/api/pricing/stores`)
- Pricing engine / subscriptions (remesa-blink)
- cNFT tickets, Etherfuse off-ramp
- LI.FI UI (API quote only is IN scope)
- Multi-corridor / multi-country
- Press / media launch

---

## Cut order (deadline at risk — do not move the date)

1. LI.FI UI, World ID prod → mock ([world-id-mock.md](docs/accelerator/week-02/world-id-mock.md))
2. ElevenLabs / audio PTT → raw WhatsApp text + Blink link
3. Fancy merchant UI → Dial.to manual
4. **Never cut:** WhatsApp notify + 1 E2E flow + user interviews

---

## Do Things That Don't Scale (production pilots)

| Override | When | How |
|----------|------|-----|
| Manual WhatsApp push | Helius/webhook missed a block during live test | `POST /api/tia/manual-notify` + `TIA_MANUAL_OVERRIDE_SECRET` |
| Hardcoded merchant | Store routing fails under pressure | `NEXT_PUBLIC_FALLBACK_MERCHANT_PUBKEY` on reservation |
| Degraded notify OK | Bot offline during demo | `TIA_ALLOW_NOTIFY_WITHOUT_BOT=true` (dev only) |
| Prova attest off | Agent unregistered or RPC down | `PROVA_ENABLED=false` (default) — remesa flow unaffected |

---

## Prova setup (devnet)

```bash
# 1. Fund KEEPER on devnet (~0.5 SOL)
# 2. Register TIA agent
npm run register-prova:devnet

# 3. Copy printed vars to .env, then:
npm run sync-env
PROVA_ENABLED=true

# 4. Smoke (local backend)
npm run backend:dev
npm run backend:smoke
```

**Deploy vars:** `PROVA_ENABLED`, `PROVA_RPC_URL`, `PROVA_AGENT_SECRET_KEY`, `PROVA_OPERATOR_SECRET_KEY` (or `KEEPER_PRIVATE_KEY`) on `remesa-tia-backend`; `NEXT_PUBLIC_PROVA_AGENT_PDA` on the **web** Vercel project.

---

## Nirium x402 setup (testnet)

```bash
# 1. Facilitator key (testnet): channels.openzeppelin.com/testnet/gen
# 2. Stellar G... testnet con trustline USDC → STELLAR_PAY_TO
# 3. Enable on Vercel proyecto remesa-tia-backend:
NIRIUM_X402_ENABLED=true
STELLAR_NETWORK=testnet
STELLAR_PAY_TO=G...
X402_FACILITATOR_API_KEY=...

npm run sync-env

# 4. Unpaid probe
curl -i https://remesa-tia-backend.vercel.app/premium/fx

# 5. Paid smoke — STELLAR_TESTNET_SECRET solo en .env local, NUNCA en Vercel
STELLAR_TESTNET_SECRET=S...
RENDER_BACKEND_URL=https://remesa-tia-backend.vercel.app npm run x402:smoke
```

**Mainnet / pubnet:** no basta rotar la key y `STELLAR_NETWORK`. Necesitas (1) `STELLAR_PAY_TO` mainnet `G…` con trustline USDC (~1.5 XLM de reserva), (2) facilitator de [channels.openzeppelin.com/gen](https://channels.openzeppelin.com/gen) — no `/testnet/gen`. Un `G` de testnet + `stellar:pubnet` no cobra.

See [docs/nirium-x402-integration.md](docs/nirium-x402-integration.md).

---

## Spec change log

| Date | Change | Reason (user **problem**, not feature) | Approved |
|------|--------|----------------------------------------|----------|
| 16 jun | Initial Bridge spec | Kick Off | Founder |
| 14 sep | x402 unpaid smoke checked; Soroban USDC lock/cashout | Rail cobraba 402 pero el escrow Stellar no movía USDC | Founder |
| 14 sep | x402 paid smoke 200 + tx e08479dc | Cobro FX live verificado; no sustituye 3 txs remesa E2E | Founder |
| 14 sep | x402 paid smoke pubnet 200 + tx f20a580a | Cobro USDC real Circle; no sustituye 3 txs remesa E2E | Founder |

---

## References

- [docs/accelerator/yc-mvp-framework.md](docs/accelerator/yc-mvp-framework.md)
- [docs/accelerator/mvp-spec-bridge.md](docs/accelerator/mvp-spec-bridge.md)
- [docs/accelerator/DEPLOY.md](docs/accelerator/DEPLOY.md)
- [docs/dual-chain-decision.md](docs/dual-chain-decision.md) — Solana vs Stellar kill/win criteria

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

---

## Spec change log

| Date | Change | Reason (user **problem**, not feature) | Approved |
|------|--------|----------------------------------------|----------|
| 16 jun | Initial Bridge spec | Kick Off | Founder |
| | | | |

---

## References

- [docs/accelerator/yc-mvp-framework.md](docs/accelerator/yc-mvp-framework.md)
- [docs/accelerator/mvp-spec-bridge.md](docs/accelerator/mvp-spec-bridge.md)
- [docs/accelerator/DEPLOY.md](docs/accelerator/DEPLOY.md)

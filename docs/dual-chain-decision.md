# Dual-chain decision — Solana vs Stellar

> **Decided 14 sep 2026: Stellar only.** Solana is paused — code stays, no new
> onboarding, no new features. The kill/win comparison below never ran; this
> call was made on focus, not on metrics.  
> **Revenue path:** Stellar x402 premium API first (already working, no custody,
> no mainnet escrow required), then ecosystem grants, then the remittance fee.

## What pausing Solana costs

Worth stating plainly so nobody rediscovers it mid-sprint:

- `programs/remesa-liquidez` is the **only escrow that actually moves tokens** —
  8 instructions, real SPL transfers, verified 99.75/0.25 split. The Soroban
  sibling persists metadata and nothing else, so the remittance rail goes back
  to zero and has to be rebuilt.
- **Prova attestation is Solana-only.** The agent-accountability layer wired
  into `backend/src/services/prova.ts` has no Stellar equivalent.

What it buys: Accesly onboarding via Google/passkey (better for receivers with
no wallet), x402 already native on Stellar, and access to Stellar ecosystem
grants.

---

## Architecture (monorepo)

| Path | Role |
|------|------|
| `programs/remesa-liquidez/` | Solana Anchor — **paused**, kept for reference |
| `contracts/remesa-tia-stellar/` | Soroban Rust — **active rail**, USDC wiring pending |
| `client/` | Solana ix builders · Stellar client (stub) |
| `web/lib/chain/` | Chain-agnostic types + adapters |
| `backend/` | WhatsApp TIA — **chain-agnostic** |
| `web/lib/fx.ts` | Bitso MXN estimate — **shared** |

---

## Product UX (sender)

Stellar only — `NEXT_PUBLIC_DEFAULT_CHAIN=stellar`, and the Solana option is
hidden rather than deleted.

Promise unchanged: **2.25% all-in** · WhatsApp · tiendita cash-out. Note that
only 0.25 of those 2.25 points is implemented anywhere; where the remaining
2.00 splits between merchant commission, FX spread and TIA's take is still
undefined, and that is the actual revenue line.

---

## Success criteria (Stellar, review at 30 real txs OR 60 days)

Same bar as the old cross-chain comparison, now absolute instead of relative:

| Metric | Target |
|--------|--------|
| Completion rate (reserve → cashout) | ≥50% |
| WhatsApp delivery | ≥90% |
| Merchant NPS | ≥7 |
| Ops burden (manual-notify count) | trending down |
| TIA net revenue | GMV × effective take rate |
| Legal clarity (Yarden) | path to mainnet custody |

**Reopen rule:** Solana comes back only if Soroban cannot reach a working USDC
settlement, since the Anchor program already does.

---

## Phase plan (Stellar)

| Phase | Scope |
|-------|-------|
| Now | x402 premium API live on testnet; `STELLAR_PAY_TO` funded on mainnet to receive revenue |
| +30d | Soroban escrow moves USDC on testnet; merchant registry + 25 bps treasury implemented |
| +60d | Guided testnet pilot, then mainnet only after legal sign-off |

The escrow is **not** on the critical path to first revenue. The premium API
carries no custody, so it can bill real USDC while the escrow is still on
testnet.

---

## Operating budget — 101 XLM

At ~$0.185/XLM that is roughly **$18.70**. Stellar mainnet costs for this plan:

| Item | Cost | USD |
|------|------|-----|
| Account minimum balance (2 × 0.5 XLM base reserve) | 1 XLM | $0.19 |
| USDC trustline (1 subentry) | 0.5 XLM | $0.09 |
| Base fee per operation (100 stroops) | 0.00001 XLM | negligible |
| 1,000 operations | 0.01 XLM | $0.002 |
| Soroban deploy (2.8 KB wasm upload + create + rent) | single-digit XLM | ~$1–3 |
| Everything on testnet (friendbot) | 0 XLM | $0 |

**Receiving revenue needs one account with a USDC trustline: 1.5 XLM.** The
full plan lands under 20 XLM, leaving >80 XLM of headroom.

Cost is therefore not the constraint — a paying counterparty is. 101 XLM is
infrastructure budget, not working capital, and self-paying the x402 endpoint
converts the only capital on hand into a transaction counter while losing fees.

---

## Stellar build

```bash
cd contracts/remesa-tia-stellar
cargo test                                    # host tests
cargo build --release --target wasm32v1-none  # 2.8 KB deployable wasm
```

Build constraints and the `ed25519-dalek` pin are documented in the crate
[README](../contracts/remesa-tia-stellar/README.md).

```bash
# Smoke (Accesly + invoke spec)
npm run e2e:stellar:testnet
```

---

## Accesly onboarding (primary)

| Component | Role |
|-----------|------|
| `@accesly/react` | Google OAuth + smart account + passkey |
| `web/components/StellarSenderApp.tsx` | Sender UI Stellar |
| `web/app/auth/callback` | OAuth redirect handler |

Setup: [accesly-integration.md](./accesly-integration.md)

**Policy:** Accesly is now the default sender onboarding path. Google OAuth plus
passkey is the reason Stellar-only is viable for receivers with no wallet.

---

## Env (future)

| Var | Chain |
|-----|-------|
| `NEXT_PUBLIC_DEFAULT_CHAIN` | `solana` \| `stellar` |
| `NEXT_PUBLIC_STELLAR_PILOT_ENABLED` | `true` to show Stellar in UI |
| `NEXT_PUBLIC_ACCESLY_APP_ID` | Accesly app from dev.accesly.xyz |
| `NEXT_PUBLIC_ACCESLY_ENV` | `dev` \| `staging` \| `prod` |
| `STELLAR_NETWORK` | `testnet` \| `mainnet` |
| `STELLAR_RPC_URL` | Horizon / Soroban RPC |
| `STELLAR_CONTRACT_ID` | Deployed escrow contract |

Solana vars unchanged — see `.env.example`.

---

## References

- [SPEC.md](../SPEC.md) — Solana pilot checklist
- [pilot-plan-10-users.md](./accelerator/week-04/pilot-plan-10-users.md)
- [first-mile-onramp-proposals.md](./accelerator/first-mile-onramp-proposals.md)

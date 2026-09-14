# Dual-chain decision — Solana vs Stellar

> **Policy:** One repo · two settlement rails · one WhatsApp · until one chain wins.  
> **Revenue path:** Solana mainnet-beta first; Stellar = optionality + ecosystem (grants, USDC-native senders).

---

## Architecture (monorepo)

| Path | Role |
|------|------|
| `programs/remesa-liquidez/` | Solana Anchor — **production pilot** |
| `contracts/remesa-tia-stellar/` | Soroban Rust — **PoC → beta** |
| `client/` | Solana ix builders · Stellar client (stub) |
| `web/lib/chain/` | Chain-agnostic types + adapters |
| `backend/` | WhatsApp TIA — **chain-agnostic** |
| `web/lib/fx.ts` | Bitso MXN estimate — **shared** |

---

## Product UX (sender)

At reservation time:

- **Solana** (recommended — active pilot)
- **Stellar** (beta — limited slots)

Same promise: **2.25% all-in** · WhatsApp · tiendita cash-out.

---

## Kill / win criteria (review at 30 real txs per chain OR 60 days)

| Metric | Winner = higher / better |
|--------|---------------------------|
| Completion rate (reserve → cashout) | ≥50% target; compare chains |
| Sender onboarding time (guided) | Lower minutes |
| Merchant NPS | Higher |
| Ops burden (manual-notify count) | Lower |
| All-in cost to sender | Lower at same service level |
| Legal clarity (Yarden) | Clearer path |
| TIA net revenue | GMV × effective take rate |

**Kill rule:** If a chain stays **<30% completion** after 10 guided users → **freeze** that rail (keep code, stop onboarding).

**Win rule:** Declare default chain when the other is frozen **or** 2× completion rate advantage for 30 days.

---

## Phase plan

| Phase | Solana | Stellar |
|-------|--------|---------|
| Now | Mainnet-beta 1 tiendita, real fees | Soroban escrow **locks/unlocks USDC SAC** in tests (`cargo test` in `contracts/remesa-tia-stellar`); **not deployed** |
| +30d | 10 txs, repeat users | 2 Stellar-native beta senders |
| +60d | Scale if metrics win | Beta only if tied; else maintenance |

---

## Stellar build (when ready)

```bash
cd contracts/remesa-tia-stellar
# Install Soroban CLI: https://soroban.stellar.org/docs/getting-started/setup
soroban contract build
```

```bash
# Smoke (Accesly + invoke spec)
npm run e2e:stellar:testnet
```

---

## Accesly onboarding (Stellar beta)

| Component | Role |
|-----------|------|
| `@accesly/react` | Google OAuth + smart account + passkey |
| `web/components/StellarSenderApp.tsx` | Sender UI Stellar |
| `web/app/auth/callback` | OAuth redirect handler |

Setup: [accesly-integration.md](./accesly-integration.md)

**Policy:** Stellar onboarding via Accesly does not replace Solana pilot until kill/win metrics favor Stellar.

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

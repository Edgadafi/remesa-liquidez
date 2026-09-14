# remesa-tia-stellar — Soroban escrow (USDC SAC)

Dual-chain sibling of `programs/remesa-liquidez` (Solana Anchor).

**Status:** USDC lock/cashout wired on **testnet semantics** — **not deployed**. Constructor takes Circle USDC SAC + treasury.

| Solana (Anchor) | Stellar (Soroban) |
|-----------------|-------------------|
| `initialize_reservation` + SPL transfer in | `initialize_reservation` + SAC `transfer` into contract |
| `mark_verified` | `mark_verified` |
| `validate_cashout` + 25 bps treasury | `validate_cashout` + 25 bps treasury |
| Merchant whitelist | `register_merchant` |
| `cancel_reservation` refund | `cancel_reservation` refund |

Testnet USDC SAC (from x402 `payment-required`): `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUZ2BQN4WFRIE3USCIHMXQDAMAA`  
Issuer (classic): `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`

## Build / test

```bash
cd contracts/remesa-tia-stellar
cargo test
# wasm (needs target wasm32v1-none):
# soroban contract build
```

## Deploy (testnet — when founder asks)

```bash
soroban contract deploy \
  --wasm target/wasm32v1-none/release/remesa_tia_stellar.wasm \
  --source-account <DEPLOYER_SECRET> \
  --network testnet \
  -- \
  <ADMIN_G> \
  CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUZ2BQN4WFRIE3USCIHMXQDAMAA \
  <TREASURY_G>
```

Sender and treasury need a USDC trustline. Contract holds the SAC balance until cashout or cancel.

This crate is **outside** the Anchor `[workspace]` (`[workspace]` empty in this `Cargo.toml`).

If `cargo test` fails on `ed25519_dalek` / `rand_core`, pin: `cargo update -p ed25519-dalek@3.0.0 --precise 2.2.0`.

See [docs/dual-chain-decision.md](../../docs/dual-chain-decision.md).

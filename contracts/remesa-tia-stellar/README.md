# remesa-tia-stellar — Soroban escrow (PoC)

Dual-chain sibling of `programs/remesa-liquidez` (Solana Anchor).

**Status:** Builds and tests clean; **not deployed**. Release wasm is ~2.8 KB.

No entrypoint moves USDC yet — `initialize_reservation` and `mark_verified`
only persist metadata, so nothing here can settle a remittance.

| Behaviour | Solana (Anchor) | Stellar (Soroban) |
|-----------|-----------------|-------------------|
| `initialize_reservation` | tokens locked in vault PDA | metadata only |
| `mark_verified` | flips `is_verified` | flips `verified` |
| `validate_cashout` | 99.75/0.25 split transfer | `NotImplemented` |
| Merchant whitelist | `register_merchant` + status | `NotImplemented` |
| 25 bps → treasury | enforced on settlement | constant only, never applied |
| Reservation expiry | `expires_at` checked | absent |

## Build

```bash
cd contracts/remesa-tia-stellar
cargo test                                    # host tests
cargo build --release --target wasm32v1-none  # deployable artifact
```

`stellar contract build` works too, but plain cargo needs no CLI install.

This crate declares an empty `[workspace]` table so it resolves independently
of the root Anchor workspace, which pins a different toolchain. `Cargo.lock`
is committed and holds `ed25519-dalek` at 2.2.0: `soroban-env-host` requires
`>=2.0.0` with no upper bound, and 3.0.0 does not compile against the
`rand_core` version it passes in. Re-running `cargo update` unpinned will
break `cargo test` again.

## Deploy (testnet — free via friendbot)

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/remesa_tia_stellar.wasm \
  --source-account <DEPLOYER_SECRET> \
  --network testnet
```

Deploying before `validate_cashout` transfers USDC only pays upload and rent
fees for a contract that cannot settle anything. Wire the token transfers,
the merchant registry and the 25 bps treasury first.

See [docs/dual-chain-decision.md](../../docs/dual-chain-decision.md).

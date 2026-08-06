# remesa-tia-stellar — Soroban escrow (PoC)

Dual-chain sibling of `programs/remesa-liquidez` (Solana Anchor).

**Status:** Scaffold only — not deployed. Parity target:

| Solana (Anchor) | Stellar (Soroban) |
|-----------------|-------------------|
| `initialize_reservation` | `initialize_reservation` |
| `mark_verified` | `mark_verified` |
| `validate_cashout` | `validate_cashout` |
| Merchant whitelist | Merchant registry |
| 25 bps → treasury | 25 bps → treasury |

## Build

Requires [Soroban CLI](https://soroban.stellar.org/docs/getting-started/setup).

```bash
cd contracts/remesa-tia-stellar
soroban contract build
```

## Deploy (testnet — when implemented)

```bash
soroban contract deploy \
  --wasm target/wasm32v1-none/release/remesa_tia_stellar.wasm \
  --source-account <DEPLOYER_SECRET> \
  --network testnet
```

Register merchant pubkeys via admin entrypoint (TBD).

## Not in workspace root

This crate is **outside** the Anchor `[workspace]` in root `Cargo.toml` to avoid toolchain conflicts.

See [docs/dual-chain-decision.md](../../docs/dual-chain-decision.md).

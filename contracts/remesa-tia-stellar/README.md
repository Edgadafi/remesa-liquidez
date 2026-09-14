# remesa-tia-stellar — Soroban escrow (USDC SAC)

Dual-chain sibling of `programs/remesa-liquidez` (Solana Anchor).

**Status:** deployed on **Stellar mainnet** (14 sep 2026). Constructor bound Circle USDC SAC + treasury.

| | Mainnet |
|--|--|
| Contract | `CBCWBOZBCKJ4FSCMQ2OJUI3UDDNT7QSPURTSAELKESPY6D7DUA22M5MP` |
| Deploy tx | [113f072b…32e6](https://stellar.expert/explorer/public/tx/113f072b09b6addd41f9d2e98cb2e6d91d83f6da1b9c7f265231e0e4c5c432e6) |
| `version()` | `v0_b2` |
| Admin | Freighter `GB3RZCIAUDTUDLQZTJ3OFVZPS3VNTYKJST3M66NMOXUQFKYFPEN4OII4` |
| Treasury | Lobstr `GBRMBOEGDTF72FP72D7OQLICBXVTSG25GYWZ3W7TNCLD47NEYVU7JUBS` |
| USDC SAC | `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75` |
| Issuer | `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` |

[Contract on Expert](https://stellar.expert/explorer/public/contract/CBCWBOZBCKJ4FSCMQ2OJUI3UDDNT7QSPURTSAELKESPY6D7DUA22M5MP)

| Solana (Anchor) | Stellar (Soroban) |
|-----------------|-------------------|
| `initialize_reservation` + SPL transfer in | `initialize_reservation` + SAC `transfer` into contract |
| `mark_verified` | `mark_verified` |
| `validate_cashout` + 25 bps treasury | `validate_cashout` + 25 bps treasury |
| Merchant whitelist | `register_merchant` |
| `cancel_reservation` refund | `cancel_reservation` refund |

Testnet USDC SAC (x402 unpaid historically): `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUZ2BQN4WFRIE3USCIHMXQDAMAA`

Set `STELLAR_CONTRACT_ID` / `NEXT_PUBLIC_STELLAR_CONTRACT_ID` to the `C…` above (Vercel `web`, never the Freighter `S…`).

## Build / test

```bash
cd contracts/remesa-tia-stellar
cargo test
# stellar contract build
```

## Redeploy (only if founder asks)

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/remesa_tia_stellar.wasm \
  --source-account <DEPLOYER_S> \
  --rpc-url https://rpc.lightsail.network/ \
  --network-passphrase "Public Global Stellar Network ; September 2015" \
  -- \
  --admin GB3RZCIAUDTUDLQZTJ3OFVZPS3VNTYKJST3M66NMOXUQFKYFPEN4OII4 \
  --token CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75 \
  --treasury GBRMBOEGDTF72FP72D7OQLICBXVTSG25GYWZ3W7TNCLD47NEYVU7JUBS
```

Sender and treasury need a USDC trustline. Contract holds the SAC balance until cashout or cancel.

This crate is **outside** the Anchor `[workspace]` (`[workspace]` empty in this `Cargo.toml`).

If `cargo test` fails on `ed25519_dalek` / `rand_core`, pin: `cargo update -p ed25519-dalek@3.0.0 --precise 2.2.0`.

See [docs/dual-chain-decision.md](../../docs/dual-chain-decision.md).

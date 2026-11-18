# remesa-tia-stellar — Soroban escrow (USDC SAC)

Dual-chain sibling of `programs/remesa-liquidez` (Solana Anchor).

**Status:** the mainnet deployment below is **v0_b2** and is **not safe for third-party funds**. KupiaSec reported the flaws (cashout not bound to a merchant, sender-signed verification, no merchant deactivation, caller-chosen ids, no TTL extension). That contract is not upgradeable. `version()` in this source is `v0_c2` and needs a new deploy. Do not redeploy unless the founder asks.

| | Mainnet |
|--|--|
| Contract | `CBCWBOZBCKJ4FSCMQ2OJUI3UDDNT7QSPURTSAELKESPY6D7DUA22M5MP` |
| Deploy tx | [113f072b…32e6](https://stellar.expert/explorer/public/tx/113f072b09b6addd41f9d2e98cb2e6d91d83f6da1b9c7f265231e0e4c5c432e6) |
| `version()` on that deploy | `v0_b2` (vulnerable). Source in this repo is `v0_c2` and is not this address. |
| Admin | Freighter `GB3RZCIAUDTUDLQZTJ3OFVZPS3VNTYKJST3M66NMOXUQFKYFPEN4OII4` |
| Treasury | Lobstr `GBRMBOEGDTF72FP72D7OQLICBXVTSG25GYWZ3W7TNCLD47NEYVU7JUBS` |
| USDC SAC | `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75` |
| Issuer | `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` |

[Contract on Expert](https://stellar.expert/explorer/public/contract/CBCWBOZBCKJ4FSCMQ2OJUI3UDDNT7QSPURTSAELKESPY6D7DUA22M5MP)

| Solana (Anchor) | Stellar (Soroban) |
|-----------------|-------------------|
| `initialize_reservation` + SPL transfer in. Id is `Config.next_reservation_id` (PDA seed sender + id). Merchant account is bound. Expiry is at least 1 second and at most 30 days. | `initialize_reservation(sender, receiver, merchant, amount, expiry_seconds) -> u64`. The contract assigns the id and stores `expires_at` from the ledger timestamp. `expiry_seconds` must be from 1 hour through 30 days (`BadExpiry` otherwise). |
| `mark_verified` signed by admin or `Config.verifier` | `mark_verified` signed by admin or the stored verifier. The sender cannot. |
| `validate_cashout` + 25 bps. Merchant and receiver both sign. Merchant must be the one stored on the reservation. Fails with `ReservationExpired` once `now >= expires_at`. | `validate_cashout` + 25 bps. `merchant.require_auth()` and `receiver.require_auth()`. Merchant must equal `reservation.merchant` and be active. Fails with `Expired` once `ledger.timestamp >= expires_at`. |
| `set_merchant_status(merchant, active)` creates the PDA on first use (`init_if_needed`) | `set_merchant_status(merchant, active)` writes the persistent flag. `register_merchant` is gone. |
| `set_admin` / `set_verifier` | `set_admin` / `set_verifier` |
| `cancel_reservation` refunds an unverified reservation. `refund_expired` returns 100% to the sender, with no fee, after expiry of a verified reservation. Sender, or admin who is not the merchant or the receiver. Not the merchant. Not the receiver. A second refund fails because the account is closed. Cashout and refund do not overlap. | `cancel_reservation` refunds an unverified reservation. `refund_expired(caller, reservation_id)` returns 100% to the sender, with no fee, for a verified, expired, unsettled reservation. Same caller rule. Emits `refunded`. A settled reservation returns `Settled`. Cashout and refund do not overlap. |
| Rent-exempt accounts | `extend_ttl` on instance storage and on Reservation / Merchant entries |

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

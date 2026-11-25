# remesa-tia-stellar — Soroban escrow (USDC SAC)

Dual-chain sibling of `programs/remesa-liquidez` (Solana Anchor).

**Status:** the mainnet deployment below is **v0_b2** and is **not safe for third-party funds**. KupiaSec reported the flaws (cashout not bound to a merchant, sender-signed verification, no merchant deactivation, caller-chosen ids, no TTL extension). That contract is not upgradeable. `version()` in this source is `v0_c3` and needs a new deploy. Do not redeploy unless the founder asks.

| | Mainnet |
|--|--|
| Contract | `CBCWBOZBCKJ4FSCMQ2OJUI3UDDNT7QSPURTSAELKESPY6D7DUA22M5MP` |
| Deploy tx | [113f072b…32e6](https://stellar.expert/explorer/public/tx/113f072b09b6addd41f9d2e98cb2e6d91d83f6da1b9c7f265231e0e4c5c432e6) |
| `version()` on that deploy | `v0_b2` (vulnerable). Source in this repo is `v0_c3` and is not this address. |
| Admin | Freighter `GB3RZCIAUDTUDLQZTJ3OFVZPS3VNTYKJST3M66NMOXUQFKYFPEN4OII4` |
| Treasury | Lobstr `GBRMBOEGDTF72FP72D7OQLICBXVTSG25GYWZ3W7TNCLD47NEYVU7JUBS` |
| USDC SAC | `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75` |
| Issuer | `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` |

[Contract on Expert](https://stellar.expert/explorer/public/contract/CBCWBOZBCKJ4FSCMQ2OJUI3UDDNT7QSPURTSAELKESPY6D7DUA22M5MP)

| Solana (Anchor) | Stellar (Soroban) |
|-----------------|-------------------|
| `initialize_reservation` + SPL transfer in. Id is `Config.next_reservation_id` (PDA seed sender + id). Merchant account is bound. A deploy build accepts `expiry_seconds` from 1 hour (`MIN_EXPIRY_SECONDS = 3600`) through 30 days. The Cargo feature `test-short-expiry` lowers the floor to 1 second for the Anchor suite and must not be enabled in a deploy build. | `initialize_reservation(sender, receiver, merchant, amount, expiry_seconds) -> u64`. The contract assigns the id and stores `expires_at` from the ledger timestamp. `expiry_seconds` must be from 1 hour through 30 days (`BadExpiry` otherwise). |
| `mark_verified` signed by admin or `Config.verifier` | `mark_verified` signed by admin or the stored verifier. The sender cannot. |
| `validate_cashout` + 25 bps. Merchant and receiver both sign. Merchant must be the one stored on the reservation. Fails with `ReservationExpired` once `now >= expires_at`. | `validate_cashout` + 25 bps. `merchant.require_auth()` and `receiver.require_auth()`. Merchant must equal `reservation.merchant` and be active. Fails with `Expired` once `ledger.timestamp >= expires_at`. |
| `set_merchant_status(merchant, active)` creates the PDA on first use (`init_if_needed`) | `set_merchant_status(merchant, active)` writes the persistent flag. `register_merchant` is gone. |
| `set_admin` / `set_verifier` | `set_admin` / `set_verifier` |
| `cancel_reservation` refunds an unverified reservation. `refund_expired` returns 100% to the sender, with no fee, after expiry of a verified reservation. Sender, or admin who is not the merchant or the receiver. Not the merchant. Not the receiver. A second refund fails because the account is closed. Cashout and refund do not overlap. | `cancel_reservation` refunds an unverified reservation. `refund_expired(caller, reservation_id)` returns 100% to the sender, with no fee, for a verified, expired, unsettled reservation. Same caller rule. Emits `refunded`. A settled reservation returns `Settled`. Cashout and refund do not overlap. |
| Rent-exempt accounts | `extend_ttl` on instance storage and on Reservation / Merchant entries |

Testnet USDC SAC (x402 unpaid historically): `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` (`stellar contract id asset --asset USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 --network testnet`)

Set `STELLAR_CONTRACT_ID` / `NEXT_PUBLIC_STELLAR_CONTRACT_ID` to the `C…` above (Vercel `web`, never the Freighter `S…`).

## Receipt registry (`register_receipt`, since `v0_c3`)

Source: [`src/receipts.rs`](src/receipts.rs), tests: [`src/receipts_test.rs`](src/receipts_test.rs).

Each TIA quote receipt is the sha256 of the canonical payload, signed with ed25519 over the utf8 string `nirium-audit-v1:<hex>` and pinned to IPFS (see `backend/src/lib/receipt.ts`). The contract checks that signature itself:

| Function | Who | What |
|--|--|--|
| `set_receipt_signer(signer: BytesN<32>)` | admin | Sets or rotates the ed25519 key (raw 32 bytes of TIA's receipt `G…`) |
| `register_receipt(submitter, receipt_hash: BytesN<32>, cid: String, signature: BytesN<64>) -> u64` | anyone, `submitter.require_auth()` | Fails with `NoReceiptSigner` (#16) if no key is set, `BadCid` (#17) if the CID is not 46–100 alphanumeric chars, `ReceiptExists` (#18) if the hash is already registered, and traps (`Error(Crypto, InvalidInput)`) if the signature does not verify. Stores `{id, cid, signer, submitter, registered_at, ledger}`, bumps the counter, emits `("receipt", receipt_hash) -> (id, cid, submitter)` |
| `get_receipt(receipt_hash) -> Option<ReceiptRecord>` / `receipt_count()` / `receipt_signer()` | read | |

Only receipts registered through this function are anchored on Stellar. Receipts issued before are on IPFS only.

`scripts/receipt-args.mjs <CID>` fetches the record from IPFS, verifies it locally, and prints the `register_receipt` arguments as `export` lines (public data only).

Testnet flow:

```bash
stellar keys generate tia-testnet --network testnet --fund
stellar contract build
stellar contract deploy --wasm target/wasm32v1-none/release/remesa_tia_stellar.wasm \
  --source-account tia-testnet --network testnet --alias tia-receipts -- \
  --admin $(stellar keys address tia-testnet) \
  --token CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA \
  --treasury $(stellar keys address tia-testnet)
eval "$(node scripts/receipt-args.mjs <CID>)"
stellar contract invoke --id tia-receipts --source-account tia-testnet --network testnet --send=yes -- \
  set_receipt_signer --signer $RECEIPT_SIGNER_HEX
stellar contract invoke --id tia-receipts --source-account tia-testnet --network testnet --send=yes -- \
  register_receipt --submitter $(stellar keys address tia-testnet) \
  --receipt_hash $RECEIPT_HASH --cid $RECEIPT_CID --signature $RECEIPT_SIG
```

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

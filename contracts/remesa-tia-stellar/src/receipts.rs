//! On-chain registry for TIA quote receipts.
//!
//! Every paid `/v1/route` quote gets a receipt: the canonical JSON payload is
//! hashed with sha256, the TIA receipt key signs the utf8 message
//! `nirium-audit-v1:<hex>` with ed25519, and the record is pinned to IPFS
//! (CID). See `backend/src/lib/receipt.ts`.
//!
//! `register_receipt` lets anyone anchor one of those receipts in Soroban, but
//! only if the contract can verify the TIA signature itself. A forged or
//! altered receipt fails, and a hash can only be registered once. Receipts
//! issued before this contract was deployed are not anchored until somebody
//! registers them here.

use soroban_sdk::{contracttype, Address, Bytes, BytesN, Env, String, Symbol};

use crate::{
    bump_persistent_key, require_cfg, Error, RemesaTiaContract, RemesaTiaContractArgs,
    RemesaTiaContractClient,
};

/// Same prefix as `STATEMENT_PREFIX` in `backend/src/lib/receipt.ts`.
pub const RECEIPT_STATEMENT_PREFIX: &[u8; 16] = b"nirium-audit-v1:";
/// CIDv0 (`Qm…`) is 46 chars; CIDv1 base32 sha256 (`bafy…`/`bafk…`) is 59.
pub const MIN_CID_LEN: u32 = 46;
pub const MAX_CID_LEN: u32 = 100;

#[contracttype]
#[derive(Clone)]
pub enum ReceiptKey {
    /// ed25519 public key (32 bytes) of the TIA receipt signer.
    Signer,
    /// Number of receipts registered so far. Also the last id handed out.
    Count,
    /// Record for one receipt, keyed by its sha256.
    Receipt(BytesN<32>),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReceiptRecord {
    /// Sequential id, starting at 1.
    pub id: u64,
    /// IPFS CID of the signed record.
    pub cid: String,
    /// Key that signed this receipt. Kept so a later key rotation does not
    /// change what was verified at registration time.
    pub signer: BytesN<32>,
    /// Account that paid for and authorized the registration.
    pub submitter: Address,
    /// Ledger timestamp (unix seconds) at registration.
    pub registered_at: u64,
    /// Ledger sequence at registration.
    pub ledger: u32,
}

/// Builds the exact bytes TIA signs: `nirium-audit-v1:` + 64 lowercase hex chars.
pub fn receipt_message(env: &Env, receipt_hash: &BytesN<32>) -> Bytes {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut buf = [0u8; 80];
    buf[..16].copy_from_slice(RECEIPT_STATEMENT_PREFIX);
    for (i, byte) in receipt_hash.to_array().iter().enumerate() {
        buf[16 + 2 * i] = HEX[(byte >> 4) as usize];
        buf[17 + 2 * i] = HEX[(byte & 0x0f) as usize];
    }
    Bytes::from_array(env, &buf)
}

/// A CID must have a sane length and only base58/base32 characters.
fn cid_is_valid(cid: &String) -> bool {
    let len = cid.len();
    if !(MIN_CID_LEN..=MAX_CID_LEN).contains(&len) {
        return false;
    }
    let mut buf = [0u8; MAX_CID_LEN as usize];
    let slice = &mut buf[..len as usize];
    cid.copy_into_slice(slice);
    slice.iter().all(|c| c.is_ascii_alphanumeric())
}

#[soroban_sdk::contractimpl]
impl RemesaTiaContract {
    /// Set or rotate the ed25519 key whose signatures `register_receipt`
    /// accepts. Admin only. Pass the raw 32 bytes of TIA's receipt key
    /// (the `G…` in `TIA_RECEIPT_SECRET`'s public half, decoded).
    pub fn set_receipt_signer(env: Env, signer: BytesN<32>) -> Result<(), Error> {
        let (admin, _, _, _) = require_cfg(&env);
        admin.require_auth();
        env.storage().instance().set(&ReceiptKey::Signer, &signer);
        env.events()
            .publish((Symbol::new(&env, "receipt_signer"),), signer);
        Ok(())
    }

    /// Anchor a signed TIA receipt on Stellar.
    ///
    /// * `submitter` must authorize the call (it pays the fee and is recorded).
    /// * `cid` must look like an IPFS CID.
    /// * `receipt_hash` must not be registered yet.
    /// * `signature` must be TIA's ed25519 signature over
    ///   `nirium-audit-v1:<hex(receipt_hash)>`; the contract verifies it with
    ///   the configured signer key and traps if it does not match.
    ///
    /// Stores the record, bumps the counter, emits
    /// `("receipt", receipt_hash) -> (id, cid, submitter)` and returns the id.
    pub fn register_receipt(
        env: Env,
        submitter: Address,
        receipt_hash: BytesN<32>,
        cid: String,
        signature: BytesN<64>,
    ) -> Result<u64, Error> {
        submitter.require_auth();
        require_cfg(&env);

        let signer: BytesN<32> = env
            .storage()
            .instance()
            .get(&ReceiptKey::Signer)
            .ok_or(Error::NoReceiptSigner)?;
        if !cid_is_valid(&cid) {
            return Err(Error::BadCid);
        }
        let key = ReceiptKey::Receipt(receipt_hash.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::ReceiptExists);
        }

        let message = receipt_message(&env, &receipt_hash);
        env.crypto().ed25519_verify(&signer, &message, &signature);

        let id: u64 = env
            .storage()
            .instance()
            .get(&ReceiptKey::Count)
            .unwrap_or(0u64)
            .checked_add(1)
            .ok_or(Error::BadAmount)?;
        let record = ReceiptRecord {
            id,
            cid: cid.clone(),
            signer,
            submitter: submitter.clone(),
            registered_at: env.ledger().timestamp(),
            ledger: env.ledger().sequence(),
        };
        env.storage().persistent().set(&key, &record);
        bump_persistent_key(&env, &key);
        env.storage().instance().set(&ReceiptKey::Count, &id);

        env.events().publish(
            (Symbol::new(&env, "receipt"), receipt_hash),
            (id, cid, submitter),
        );
        Ok(id)
    }

    /// Read a registered receipt by its sha256. `None` if it was never registered.
    pub fn get_receipt(env: Env, receipt_hash: BytesN<32>) -> Option<ReceiptRecord> {
        let key = ReceiptKey::Receipt(receipt_hash);
        let record = env.storage().persistent().get(&key);
        if record.is_some() {
            bump_persistent_key(&env, &key);
        }
        record
    }

    /// How many receipts have been registered.
    pub fn receipt_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&ReceiptKey::Count)
            .unwrap_or(0)
    }

    /// The configured receipt signer key, if any.
    pub fn receipt_signer(env: Env) -> Option<BytesN<32>> {
        env.storage().instance().get(&ReceiptKey::Signer)
    }
}

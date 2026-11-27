//! TIA remittance escrow on Stellar (Soroban) — USDC via SAC transfer.
//!
//! Mirrors Solana `programs/remesa-liquidez`: the sender locks USDC into the
//! contract, the TIA admin (or a configured verifier) marks the reservation
//! verified, and cashout pays the assigned merchant only if that merchant and
//! the receiver both authorize the call. Fee is 25 bps to treasury.

#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token::TokenClient, Address,
    BytesN, Env, Symbol,
};

const FEE_BPS: i128 = 25;
const BPS_DENOM: i128 = 10_000;

/// ~5s ledgers. Named so every TTL bump uses the same horizon.
const LEDGERS_PER_DAY: u32 = 17_280;
const INSTANCE_TTL_THRESHOLD: u32 = 30 * LEDGERS_PER_DAY;
const INSTANCE_TTL_EXTEND_TO: u32 = 60 * LEDGERS_PER_DAY;
const PERSISTENT_TTL_THRESHOLD: u32 = 30 * LEDGERS_PER_DAY;
const PERSISTENT_TTL_EXTEND_TO: u32 = 90 * LEDGERS_PER_DAY;
/// Shortest pickup window. One hour.
const MIN_EXPIRY_SECONDS: u64 = 60 * 60;
/// Longest pickup window. 30 days.
const MAX_EXPIRY_SECONDS: u64 = 30 * 24 * 60 * 60;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    BadAmount = 1,
    Exists = 2,
    NotFound = 3,
    NotSender = 4,
    Settled = 5,
    NotMerchant = 6,
    NotVerified = 7,
    NotParty = 8,
    WrongMerchant = 9,
    NotVerifier = 10,
    AlreadyVerified = 11,
    CannotCancel = 12,
    BadExpiry = 13,
    NotExpired = 14,
    Expired = 15,
    /// `register_receipt` before the admin set a receipt signer key.
    NoReceiptSigner = 16,
    /// CID is too short, too long, or has non base58/base32 characters.
    BadCid = 17,
    /// That receipt hash is already registered.
    ReceiptExists = 18,
    /// Receipt not found in the registry.
    ReceiptNotFound = 19,
    /// Receipt has already been used to settle a reservation.
    ReceiptAlreadyUsed = 20,
    /// Action blocked because the reservation is disputed.
    Disputed = 21,
    /// Caller is not authorized to dispute this reservation.
    NotAuthorizedToDispute = 22,
    /// Caller is not the admin.
    NotAdmin = 23,
    /// Reservation is not disputed.
    NotDisputed = 24,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Verifier,
    Token,
    Treasury,
    NextId,
    Reservation(u64),
    Merchant(Address),
    /// Maps receipt_hash -> reservation_id to prevent receipt reuse.
    ReceiptUsage(BytesN<32>),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Reservation {
    pub sender: Address,
    pub receiver: Address,
    pub merchant: Address,
    pub amount: i128,
    /// Unix time from the ledger. Cashout closes at this instant; `refund_expired` opens.
    pub expires_at: u64,
    pub verified: bool,
    pub settled: bool,
    /// True if a dispute was opened on this reservation.
    pub disputed: bool,
}

#[contract]
pub struct RemesaTiaContract;

mod receipts;
pub use receipts::{ReceiptKey, ReceiptRecord};

#[cfg(test)]
mod receipts_test;

fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_EXTEND_TO);
}

fn bump_persistent(env: &Env, key: &DataKey) {
    bump_persistent_key(env, key);
}

pub(crate) fn bump_persistent_key<K>(env: &Env, key: &K)
where
    K: soroban_sdk::IntoVal<Env, soroban_sdk::Val>,
{
    env.storage()
        .persistent()
        .extend_ttl(key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_EXTEND_TO);
}

pub(crate) fn require_cfg(env: &Env) -> (Address, Address, Address, Address) {
    let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
    let verifier: Address = env
        .storage()
        .instance()
        .get(&DataKey::Verifier)
        .unwrap_or(admin.clone());
    let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
    let treasury: Address = env.storage().instance().get(&DataKey::Treasury).unwrap();
    bump_instance(env);
    (admin, verifier, token, treasury)
}

fn read_reservation(env: &Env, reservation_id: u64) -> Result<Reservation, Error> {
    let key = DataKey::Reservation(reservation_id);
    let reservation = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::NotFound)?;
    bump_persistent(env, &key);
    Ok(reservation)
}

fn write_reservation(env: &Env, reservation_id: u64, reservation: &Reservation) {
    let key = DataKey::Reservation(reservation_id);
    env.storage().persistent().set(&key, reservation);
    bump_persistent(env, &key);
}

fn merchant_is_active(env: &Env, merchant: &Address) -> bool {
    let key = DataKey::Merchant(merchant.clone());
    let active: bool = env.storage().persistent().get(&key).unwrap_or(false);
    if env.storage().persistent().has(&key) {
        bump_persistent(env, &key);
    }
    active
}

fn emit(env: &Env, name: &str, id: u64, data: impl soroban_sdk::IntoVal<Env, soroban_sdk::Val>) {
    env.events().publish((Symbol::new(env, name), id), data);
}

#[contractimpl]
impl RemesaTiaContract {
    pub fn __constructor(env: Env, admin: Address, token: Address, treasury: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Verifier, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Treasury, &treasury);
        env.storage().instance().set(&DataKey::NextId, &0u64);
        bump_instance(&env);
    }

    pub fn version(_env: Env) -> Symbol {
        symbol_short!("v0_d1")
    }

    /// Rotate the protocol admin. Only the current admin can call this.
    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        let (admin, _, _, _) = require_cfg(&env);
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        bump_instance(&env);
        Ok(())
    }

    /// Rotate the verifier allowed to call `mark_verified`. Admin only.
    /// The constructor sets this to the admin.
    pub fn set_verifier(env: Env, new_verifier: Address) -> Result<(), Error> {
        let (admin, _, _, _) = require_cfg(&env);
        admin.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::Verifier, &new_verifier);
        bump_instance(&env);
        Ok(())
    }

    /// Register or deactivate a merchant. Admin only. `active = false` blocks
    /// later cashouts for that merchant.
    pub fn set_merchant_status(env: Env, merchant: Address, active: bool) -> Result<(), Error> {
        let (admin, _, _, _) = require_cfg(&env);
        admin.require_auth();
        let key = DataKey::Merchant(merchant.clone());
        env.storage().persistent().set(&key, &active);
        bump_persistent(&env, &key);
        emit(&env, "mch_status", 0, (merchant, active));
        Ok(())
    }

    /// Lock `amount` of the configured USDC SAC from `sender`.
    /// The contract assigns the reservation id from an instance counter.
    /// `merchant` is bound to the reservation and is the only merchant that
    /// can later cash it out. `expiry_seconds` must sit between
    /// `MIN_EXPIRY_SECONDS` (1 hour) and `MAX_EXPIRY_SECONDS` (30 days).
    /// The reservation stores the resulting ledger timestamp in `expires_at`.
    pub fn initialize_reservation(
        env: Env,
        sender: Address,
        receiver: Address,
        merchant: Address,
        amount: i128,
        expiry_seconds: u64,
    ) -> Result<u64, Error> {
        sender.require_auth();
        if amount <= 0 {
            return Err(Error::BadAmount);
        }
        if expiry_seconds < MIN_EXPIRY_SECONDS || expiry_seconds > MAX_EXPIRY_SECONDS {
            return Err(Error::BadExpiry);
        }
        if !merchant_is_active(&env, &merchant) {
            return Err(Error::NotMerchant);
        }
        let expires_at = env
            .ledger()
            .timestamp()
            .checked_add(expiry_seconds)
            .ok_or(Error::BadExpiry)?;
        let (_, _, token, _) = require_cfg(&env);
        let reservation_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::NextId, &(reservation_id + 1));
        bump_instance(&env);

        TokenClient::new(&env, &token).transfer(
            &sender,
            &env.current_contract_address(),
            &amount,
        );
        let reservation = Reservation {
            sender: sender.clone(),
            receiver: receiver.clone(),
            merchant: merchant.clone(),
            amount,
            expires_at,
            verified: false,
            settled: false,
            disputed: false,
        };
        write_reservation(&env, reservation_id, &reservation);
        emit(
            &env,
            "rsv_created",
            reservation_id,
            (sender, receiver, merchant, amount),
        );
        Ok(reservation_id)
    }

    /// Mark a reservation verified. The caller must be the TIA admin or the
    /// configured verifier. The sender cannot verify their own reservation.
    pub fn mark_verified(env: Env, caller: Address, reservation_id: u64) -> Result<(), Error> {
        caller.require_auth();
        let (admin, verifier, _, _) = require_cfg(&env);
        if caller != admin && caller != verifier {
            return Err(Error::NotVerifier);
        }
        let mut reservation = read_reservation(&env, reservation_id)?;
        if reservation.settled {
            return Err(Error::Settled);
        }
        if reservation.verified {
            return Err(Error::AlreadyVerified);
        }
        reservation.verified = true;
        write_reservation(&env, reservation_id, &reservation);
        emit(&env, "rsv_verified", reservation_id, caller);
        Ok(())
    }

    /// Pay the assigned merchant (gross − 25 bps) and treasury (25 bps).
    /// Requires the merchant's authorization and the receiver's authorization
    /// (proof the receiver collected cash). Fails with `Expired` once
    /// `ledger.timestamp >= expires_at`, so cashout and `refund_expired`
    /// never both succeed for the same reservation.
    pub fn validate_cashout(env: Env, merchant: Address, reservation_id: u64) -> Result<(), Error> {
        merchant.require_auth();
        let mut reservation = read_reservation(&env, reservation_id)?;
        reservation.receiver.require_auth();
        if reservation.settled {
            return Err(Error::Settled);
        }
        if reservation.disputed {
            return Err(Error::Disputed);
        }
        if !reservation.verified {
            return Err(Error::NotVerified);
        }
        if env.ledger().timestamp() >= reservation.expires_at {
            return Err(Error::Expired);
        }
        if !merchant_is_active(&env, &merchant) {
            return Err(Error::NotMerchant);
        }
        if merchant != reservation.merchant {
            return Err(Error::WrongMerchant);
        }
        let fee = reservation
            .amount
            .checked_mul(FEE_BPS)
            .and_then(|v| v.checked_div(BPS_DENOM))
            .ok_or(Error::BadAmount)?;
        let net = reservation
            .amount
            .checked_sub(fee)
            .ok_or(Error::BadAmount)?;
        let (_, _, token, treasury) = require_cfg(&env);
        let client = TokenClient::new(&env, &token);
        let vault = env.current_contract_address();
        if net > 0 {
            client.transfer(&vault, &merchant, &net);
        }
        if fee > 0 {
            client.transfer(&vault, &treasury, &fee);
        }
        reservation.settled = true;
        write_reservation(&env, reservation_id, &reservation);
        emit(
            &env,
            "rsv_cashed",
            reservation_id,
            (merchant, reservation.amount, fee, net),
        );
        Ok(())
    }

    /// Refund locked USDC to the sender if the reservation is not yet settled.
    pub fn cancel_reservation(env: Env, caller: Address, reservation_id: u64) -> Result<(), Error> {
        caller.require_auth();
        let mut reservation = read_reservation(&env, reservation_id)?;
        if reservation.settled {
            return Err(Error::Settled);
        }
        if reservation.disputed {
            return Err(Error::Disputed);
        }
        if reservation.verified {
            return Err(Error::CannotCancel);
        }
        if caller != reservation.sender && caller != reservation.receiver {
            return Err(Error::NotParty);
        }
        let (_, _, token, _) = require_cfg(&env);
        TokenClient::new(&env, &token).transfer(
            &env.current_contract_address(),
            &reservation.sender,
            &reservation.amount,
        );
        reservation.settled = true;
        write_reservation(&env, reservation_id, &reservation);
        emit(&env, "rsv_cancelled", reservation_id, caller);
        Ok(())
    }

    /// Return 100% of a verified, unsettled, expired reservation to the sender.
    /// No fee. The sender may call this, and so may the admin, unless that
    /// admin is the merchant or the receiver. The merchant and the receiver
    /// cannot. At `expires_at` cashout is already closed.
    pub fn refund_expired(env: Env, caller: Address, reservation_id: u64) -> Result<(), Error> {
        caller.require_auth();
        let (admin, _, token, _) = require_cfg(&env);
        let mut reservation = read_reservation(&env, reservation_id)?;
        if reservation.settled {
            return Err(Error::Settled);
        }
        if reservation.disputed {
            return Err(Error::Disputed);
        }
        if !reservation.verified {
            return Err(Error::NotVerified);
        }
        if caller == reservation.merchant {
            return Err(Error::NotParty);
        }
        if caller == reservation.receiver && caller != reservation.sender {
            return Err(Error::NotParty);
        }
        if caller != reservation.sender && caller != admin {
            return Err(Error::NotParty);
        }
        if env.ledger().timestamp() < reservation.expires_at {
            return Err(Error::NotExpired);
        }
        TokenClient::new(&env, &token).transfer(
            &env.current_contract_address(),
            &reservation.sender,
            &reservation.amount,
        );
        reservation.settled = true;
        write_reservation(&env, reservation_id, &reservation);
        emit(&env, "refunded", reservation_id, caller);
        Ok(())
    }

    /// Settle reservation with a registered TIA receipt. Like `validate_cashout`,
    /// but only releases escrowed funds if a receipt with `receipt_hash` is
    /// already registered and not used. Links the receipt to the reservation,
    /// prevents reuse, marks reservation settled, and emits an event.
    pub fn settle_with_receipt(
        env: Env,
        merchant: Address,
        reservation_id: u64,
        receipt_hash: BytesN<32>,
    ) -> Result<(), Error> {
        merchant.require_auth();
        let mut reservation = read_reservation(&env, reservation_id)?;
        reservation.receiver.require_auth();
        if reservation.settled {
            return Err(Error::Settled);
        }
        if reservation.disputed {
            return Err(Error::Disputed);
        }
        if !reservation.verified {
            return Err(Error::NotVerified);
        }
        if env.ledger().timestamp() >= reservation.expires_at {
            return Err(Error::Expired);
        }
        if !merchant_is_active(&env, &merchant) {
            return Err(Error::NotMerchant);
        }
        if merchant != reservation.merchant {
            return Err(Error::WrongMerchant);
        }

        // Check that the receipt exists in the registry.
        let receipt_key = crate::receipts::ReceiptKey::Receipt(receipt_hash.clone());
        if !env.storage().persistent().has(&receipt_key) {
            return Err(Error::ReceiptNotFound);
        }

        // Check that the receipt has not been used before.
        let usage_key = DataKey::ReceiptUsage(receipt_hash.clone());
        if env.storage().persistent().has(&usage_key) {
            return Err(Error::ReceiptAlreadyUsed);
        }

        // Mark the receipt as used for this reservation.
        env.storage()
            .persistent()
            .set(&usage_key, &reservation_id);
        bump_persistent(&env, &usage_key);

        // Calculate fee and net amount (same as validate_cashout).
        let fee = reservation
            .amount
            .checked_mul(FEE_BPS)
            .and_then(|v| v.checked_div(BPS_DENOM))
            .ok_or(Error::BadAmount)?;
        let net = reservation
            .amount
            .checked_sub(fee)
            .ok_or(Error::BadAmount)?;

        // Transfer funds.
        let (_, _, token, treasury) = require_cfg(&env);
        let client = TokenClient::new(&env, &token);
        let vault = env.current_contract_address();
        if net > 0 {
            client.transfer(&vault, &merchant, &net);
        }
        if fee > 0 {
            client.transfer(&vault, &treasury, &fee);
        }

        reservation.settled = true;
        write_reservation(&env, reservation_id, &reservation);
        emit(
            &env,
            "rsv_settled_rcpt",
            reservation_id,
            (merchant, receipt_hash, reservation.amount, fee, net),
        );
        Ok(())
    }

    /// Open a dispute on a reservation. Sender, admin, or verifier can freeze
    /// an open reservation. While disputed, validate_cashout, settle_with_receipt,
    /// cancel_reservation, and refund_expired are blocked.
    pub fn open_dispute(
        env: Env,
        caller: Address,
        reservation_id: u64,
        reason_hash: BytesN<32>,
    ) -> Result<(), Error> {
        caller.require_auth();
        let (admin, verifier, _, _) = require_cfg(&env);
        let mut reservation = read_reservation(&env, reservation_id)?;

        if reservation.settled {
            return Err(Error::Settled);
        }
        if reservation.disputed {
            return Err(Error::Disputed);
        }

        // Only sender, admin, or verifier can dispute.
        if caller != reservation.sender && caller != admin && caller != verifier {
            return Err(Error::NotAuthorizedToDispute);
        }

        reservation.disputed = true;
        write_reservation(&env, reservation_id, &reservation);
        emit(&env, "rsv_disputed", reservation_id, (caller, reason_hash));
        Ok(())
    }

    /// Resolve a dispute. Admin-only. Releases funds to merchant or refunds
    /// the sender, closes the dispute, and emits an event.
    pub fn resolve_dispute(
        env: Env,
        reservation_id: u64,
        release_to_merchant: bool,
    ) -> Result<(), Error> {
        let (admin, _, token, treasury) = require_cfg(&env);
        admin.require_auth();
        let mut reservation = read_reservation(&env, reservation_id)?;

        if reservation.settled {
            return Err(Error::Settled);
        }
        if !reservation.disputed {
            return Err(Error::NotDisputed);
        }

        // Calculate amounts (with fee if releasing to merchant).
        let client = TokenClient::new(&env, &token);
        let vault = env.current_contract_address();

        if release_to_merchant {
            let fee = reservation
                .amount
                .checked_mul(FEE_BPS)
                .and_then(|v| v.checked_div(BPS_DENOM))
                .ok_or(Error::BadAmount)?;
            let net = reservation
                .amount
                .checked_sub(fee)
                .ok_or(Error::BadAmount)?;

            if net > 0 {
                client.transfer(&vault, &reservation.merchant, &net);
            }
            if fee > 0 {
                client.transfer(&vault, &treasury, &fee);
            }
            emit(
                &env,
                "dispute_resolved_merchant",
                reservation_id,
                (reservation.merchant.clone(), reservation.amount, fee, net),
            );
        } else {
            // Refund full amount to sender (no fee).
            client.transfer(&vault, &reservation.sender, &reservation.amount);
            emit(
                &env,
                "dispute_resolved_refund",
                reservation_id,
                (reservation.sender.clone(), reservation.amount),
            );
        }

        reservation.settled = true;
        reservation.disputed = false;
        write_reservation(&env, reservation_id, &reservation);
        Ok(())
    }

    pub fn get_reservation(env: Env, reservation_id: u64) -> Option<Reservation> {
        let key = DataKey::Reservation(reservation_id);
        let reservation = env.storage().persistent().get(&key);
        if reservation.is_some() {
            bump_persistent(&env, &key);
        }
        reservation
    }
}

#[cfg(test)]
pub mod test {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger as _, MockAuth, MockAuthInvoke},
        token::{StellarAssetClient, TokenClient},
        Address, Env, IntoVal,
    };

    pub const GROSS: i128 = 10_000_000; // 1 USDC (7 decimals on Stellar)
    const EXPIRY: u64 = 3_600;

    pub struct Fixture {
        pub env: Env,
        pub contract: Address,
        pub token: Address,
        pub admin: Address,
        pub sender: Address,
        pub receiver: Address,
        pub merchant: Address,
        pub treasury: Address,
    }

    pub fn setup() -> Fixture {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let issuer = Address::generate(&env);
        let sender = Address::generate(&env);
        let receiver = Address::generate(&env);
        let merchant = Address::generate(&env);
        let treasury = Address::generate(&env);
        let sac = env.register_stellar_asset_contract_v2(issuer);
        let token = sac.address();
        StellarAssetClient::new(&env, &token).mint(&sender, &(GROSS * 4));
        let contract = env.register(
            RemesaTiaContract,
            (admin.clone(), token.clone(), treasury.clone()),
        );
        let client = RemesaTiaContractClient::new(&env, &contract);
        client.set_merchant_status(&merchant, &true);
        Fixture {
            env,
            contract,
            token,
            admin,
            sender,
            receiver,
            merchant,
            treasury,
        }
    }

    fn open_for(f: &Fixture, expiry_seconds: u64) -> u64 {
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        client.initialize_reservation(&f.sender, &f.receiver, &f.merchant, &GROSS, &expiry_seconds)
    }

    fn open(f: &Fixture) -> u64 {
        open_for(f, EXPIRY)
    }

    #[test]
    fn fee_constants_match_solana_client() {
        assert_eq!(FEE_BPS, 25);
        assert_eq!(BPS_DENOM, 10_000);
    }

    #[test]
    fn version_is_v0_d1_snapshot() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        assert_eq!(client.version(), symbol_short!("v0_d1"));
    }

    #[test]
    fn initialize_reservation_locks_usdc_and_assigns_id() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let token_client = TokenClient::new(&f.env, &f.token);
        let id = client.initialize_reservation(&f.sender, &f.receiver, &f.merchant, &GROSS, &EXPIRY);
        assert_eq!(id, 0);
        assert_eq!(token_client.balance(&f.contract), GROSS);
        assert_eq!(token_client.balance(&f.sender), GROSS * 3);
        let res = client.get_reservation(&id).unwrap();
        assert_eq!(res.amount, GROSS);
        assert_eq!(res.merchant, f.merchant);
        assert!(!res.verified);
        assert!(!res.settled);
    }

    #[test]
    fn cashout_splits_fee_to_treasury() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let token_client = TokenClient::new(&f.env, &f.token);
        let id = open(&f);
        client.mark_verified(&f.admin, &id);
        client.validate_cashout(&f.merchant, &id);
        let fee = GROSS * FEE_BPS / BPS_DENOM;
        let net = GROSS - fee;
        assert_eq!(token_client.balance(&f.merchant), net);
        assert_eq!(token_client.balance(&f.treasury), fee);
        assert_eq!(token_client.balance(&f.contract), 0);
        assert!(client.get_reservation(&id).unwrap().settled);
    }

    #[test]
    fn cancel_refunds_sender() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let token_client = TokenClient::new(&f.env, &f.token);
        let id = open(&f);
        client.cancel_reservation(&f.sender, &id);
        assert_eq!(token_client.balance(&f.sender), GROSS * 4);
        assert_eq!(token_client.balance(&f.contract), 0);
    }

    #[test]
    fn cashout_rejects_unregistered_merchant() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);
        client.mark_verified(&f.admin, &id);
        let stranger = Address::generate(&f.env);
        assert_eq!(
            client.try_validate_cashout(&stranger, &id),
            Err(Ok(Error::NotMerchant))
        );
    }

    #[test]
    fn other_registered_merchant_cannot_cash_out() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let other = Address::generate(&f.env);
        client.set_merchant_status(&other, &true);
        let id = open(&f);
        client.mark_verified(&f.admin, &id);
        assert_eq!(
            client.try_validate_cashout(&other, &id),
            Err(Ok(Error::WrongMerchant))
        );
    }

    #[test]
    fn sender_cannot_mark_own_reservation_verified() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);
        assert_eq!(
            client.try_mark_verified(&f.sender, &id),
            Err(Ok(Error::NotVerifier))
        );
        assert!(!client.get_reservation(&id).unwrap().verified);
        client.mark_verified(&f.admin, &id);
        assert!(client.get_reservation(&id).unwrap().verified);
    }

    #[test]
    fn cashout_without_receiver_signature_fails() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);
        client.mark_verified(&f.admin, &id);

        // Replace blanket auth with a merchant-only mock. The receiver's
        // require_auth is then unsatisfied and the host aborts.
        f.env.mock_auths(&[MockAuth {
            address: &f.merchant,
            invoke: &MockAuthInvoke {
                contract: &f.contract,
                fn_name: "validate_cashout",
                args: (f.merchant.clone(), id).into_val(&f.env),
                sub_invokes: &[],
            },
        }]);
        let result = client.try_validate_cashout(&f.merchant, &id);
        assert!(
            matches!(result, Err(Err(_))),
            "expected a host auth failure, got {result:?}"
        );
        assert!(!client.get_reservation(&id).unwrap().settled);
    }

    #[test]
    fn deactivated_merchant_cannot_cash_out() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);
        client.mark_verified(&f.admin, &id);
        client.set_merchant_status(&f.merchant, &false);
        assert_eq!(
            client.try_validate_cashout(&f.merchant, &id),
            Err(Ok(Error::NotMerchant))
        );
    }

    #[test]
    fn reservation_ids_are_assigned_and_distinct() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let first =
            client.initialize_reservation(&f.sender, &f.receiver, &f.merchant, &GROSS, &EXPIRY);
        let second =
            client.initialize_reservation(&f.sender, &f.receiver, &f.merchant, &GROSS, &EXPIRY);
        assert_eq!(first, 0);
        assert_eq!(second, 1);
        assert_ne!(first, second);
        let stored = client.get_reservation(&first).unwrap();
        assert_eq!(stored.sender, f.sender);
        assert!(client.get_reservation(&99).is_none());
    }

    #[test]
    fn cannot_cancel_after_verified() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);
        client.mark_verified(&f.admin, &id);
        assert_eq!(
            client.try_cancel_reservation(&f.sender, &id),
            Err(Ok(Error::CannotCancel))
        );
        assert_eq!(
            client.try_cancel_reservation(&f.receiver, &id),
            Err(Ok(Error::CannotCancel))
        );
        assert!(!client.get_reservation(&id).unwrap().settled);
    }

    #[test]
    fn refund_expired_returns_full_amount_to_sender() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let token_client = TokenClient::new(&f.env, &f.token);
        let id = open(&f);
        client.mark_verified(&f.admin, &id);
        let expires_at = client.get_reservation(&id).unwrap().expires_at;
        f.env.ledger().set_timestamp(expires_at);
        let before = token_client.balance(&f.sender);
        client.refund_expired(&f.sender, &id);
        assert_eq!(token_client.balance(&f.sender), before + GROSS);
        assert_eq!(token_client.balance(&f.contract), 0);
        assert_eq!(token_client.balance(&f.treasury), 0);
        assert!(client.get_reservation(&id).unwrap().settled);
        assert_eq!(
            client.try_refund_expired(&f.sender, &id),
            Err(Ok(Error::Settled))
        );
    }

    #[test]
    fn admin_can_refund_expired() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let token_client = TokenClient::new(&f.env, &f.token);
        let id = open(&f);
        client.mark_verified(&f.admin, &id);
        let expires_at = client.get_reservation(&id).unwrap().expires_at;
        f.env.ledger().set_timestamp(expires_at);
        client.refund_expired(&f.admin, &id);
        assert_eq!(token_client.balance(&f.sender), GROSS * 4);
        assert!(client.get_reservation(&id).unwrap().settled);
    }

    #[test]
    fn refund_expired_rejects_before_expiry() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open_for(&f, EXPIRY);
        client.mark_verified(&f.admin, &id);
        assert_eq!(
            client.try_refund_expired(&f.sender, &id),
            Err(Ok(Error::NotExpired))
        );
        assert!(!client.get_reservation(&id).unwrap().settled);
    }

    #[test]
    fn merchant_cannot_refund_expired() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);
        client.mark_verified(&f.admin, &id);
        let expires_at = client.get_reservation(&id).unwrap().expires_at;
        f.env.ledger().set_timestamp(expires_at);
        assert_eq!(
            client.try_refund_expired(&f.merchant, &id),
            Err(Ok(Error::NotParty))
        );
        assert!(!client.get_reservation(&id).unwrap().settled);
    }

    #[test]
    fn cashed_out_reservation_cannot_be_refunded() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);
        client.mark_verified(&f.admin, &id);
        client.validate_cashout(&f.merchant, &id);
        let expires_at = client.get_reservation(&id).unwrap().expires_at;
        f.env.ledger().set_timestamp(expires_at);
        assert_eq!(
            client.try_refund_expired(&f.sender, &id),
            Err(Ok(Error::Settled))
        );
    }

    #[test]
    fn initialize_rejects_expiry_out_of_range() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let token_client = TokenClient::new(&f.env, &f.token);
        let before = token_client.balance(&f.sender);
        for bad in [0_u64, MIN_EXPIRY_SECONDS - 1, MAX_EXPIRY_SECONDS + 1] {
            assert_eq!(
                client.try_initialize_reservation(
                    &f.sender,
                    &f.receiver,
                    &f.merchant,
                    &GROSS,
                    &bad
                ),
                Err(Ok(Error::BadExpiry))
            );
        }
        assert_eq!(token_client.balance(&f.sender), before);
        assert_eq!(token_client.balance(&f.contract), 0);

        let at_min = client.initialize_reservation(
            &f.sender,
            &f.receiver,
            &f.merchant,
            &GROSS,
            &MIN_EXPIRY_SECONDS,
        );
        let at_max = client.initialize_reservation(
            &f.sender,
            &f.receiver,
            &f.merchant,
            &GROSS,
            &MAX_EXPIRY_SECONDS,
        );
        let now = f.env.ledger().timestamp();
        assert_eq!(
            client.get_reservation(&at_min).unwrap().expires_at,
            now + MIN_EXPIRY_SECONDS
        );
        assert_eq!(
            client.get_reservation(&at_max).unwrap().expires_at,
            now + MAX_EXPIRY_SECONDS
        );
    }

    #[test]
    fn cashout_fails_after_expiry() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let token_client = TokenClient::new(&f.env, &f.token);
        let id = open(&f);
        client.mark_verified(&f.admin, &id);
        let expires_at = client.get_reservation(&id).unwrap().expires_at;
        f.env.ledger().set_timestamp(expires_at);
        assert_eq!(
            client.try_validate_cashout(&f.merchant, &id),
            Err(Ok(Error::Expired))
        );
        assert!(!client.get_reservation(&id).unwrap().settled);
        assert_eq!(token_client.balance(&f.contract), GROSS);
        assert_eq!(token_client.balance(&f.merchant), 0);
        assert_eq!(token_client.balance(&f.treasury), 0);
    }

    #[test]
    fn receiver_cannot_refund_expired() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let token_client = TokenClient::new(&f.env, &f.token);
        let id = open(&f);
        client.mark_verified(&f.admin, &id);
        let expires_at = client.get_reservation(&id).unwrap().expires_at;
        f.env.ledger().set_timestamp(expires_at);
        assert_eq!(
            client.try_refund_expired(&f.receiver, &id),
            Err(Ok(Error::NotParty))
        );
        assert!(!client.get_reservation(&id).unwrap().settled);
        assert_eq!(token_client.balance(&f.contract), GROSS);
        assert_eq!(token_client.balance(&f.sender), GROSS * 3);
    }

    #[test]
    fn settle_with_receipt_requires_registered_receipt() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);
        client.mark_verified(&f.admin, &id);

        let receipt_hash = BytesN::from_array(&f.env, &[1u8; 32]);
        assert_eq!(
            client.try_settle_with_receipt(&f.merchant, &id, &receipt_hash),
            Err(Ok(Error::ReceiptNotFound))
        );
        assert!(!client.get_reservation(&id).unwrap().settled);
    }

    #[test]
    fn settle_with_receipt_prevents_receipt_reuse() {
        use crate::receipts_test::register_test_receipt;
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let token_client = TokenClient::new(&f.env, &f.token);

        let receipt_hash = register_test_receipt(&f);

        let id1 = open(&f);
        client.mark_verified(&f.admin, &id1);
        client.settle_with_receipt(&f.merchant, &id1, &receipt_hash);

        assert!(client.get_reservation(&id1).unwrap().settled);
        assert_eq!(
            token_client.balance(&f.merchant),
            GROSS - (GROSS * FEE_BPS / BPS_DENOM)
        );

        let id2 = open(&f);
        client.mark_verified(&f.admin, &id2);
        assert_eq!(
            client.try_settle_with_receipt(&f.merchant, &id2, &receipt_hash),
            Err(Ok(Error::ReceiptAlreadyUsed))
        );
        assert!(!client.get_reservation(&id2).unwrap().settled);
    }

    #[test]
    fn settle_with_receipt_splits_fee_to_treasury() {
        use crate::receipts_test::register_test_receipt;
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let token_client = TokenClient::new(&f.env, &f.token);

        let receipt_hash = register_test_receipt(&f);

        let id = open(&f);
        client.mark_verified(&f.admin, &id);
        client.settle_with_receipt(&f.merchant, &id, &receipt_hash);

        let fee = GROSS * FEE_BPS / BPS_DENOM;
        let net = GROSS - fee;
        assert_eq!(token_client.balance(&f.merchant), net);
        assert_eq!(token_client.balance(&f.treasury), fee);
        assert_eq!(token_client.balance(&f.contract), 0);
        assert!(client.get_reservation(&id).unwrap().settled);
    }

    #[test]
    fn settle_with_receipt_blocked_when_disputed() {
        use crate::receipts_test::register_test_receipt;
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);

        let receipt_hash = register_test_receipt(&f);

        let id = open(&f);
        client.mark_verified(&f.admin, &id);

        let reason_hash = BytesN::from_array(&f.env, &[99u8; 32]);
        client.open_dispute(&f.sender, &id, &reason_hash);

        assert_eq!(
            client.try_settle_with_receipt(&f.merchant, &id, &receipt_hash),
            Err(Ok(Error::Disputed))
        );
    }

    #[test]
    fn open_dispute_by_sender() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);

        let reason_hash = BytesN::from_array(&f.env, &[99u8; 32]);
        client.open_dispute(&f.sender, &id, &reason_hash);

        let res = client.get_reservation(&id).unwrap();
        assert!(res.disputed);
        assert!(!res.settled);
    }

    #[test]
    fn open_dispute_by_admin() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);

        let reason_hash = BytesN::from_array(&f.env, &[88u8; 32]);
        client.open_dispute(&f.admin, &id, &reason_hash);

        assert!(client.get_reservation(&id).unwrap().disputed);
    }

    #[test]
    fn open_dispute_by_verifier() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let verifier = Address::generate(&f.env);
        client.set_verifier(&verifier);

        let id = open(&f);
        let reason_hash = BytesN::from_array(&f.env, &[77u8; 32]);
        client.open_dispute(&verifier, &id, &reason_hash);

        assert!(client.get_reservation(&id).unwrap().disputed);
    }

    #[test]
    fn open_dispute_unauthorized_caller() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);

        let stranger = Address::generate(&f.env);
        let reason_hash = BytesN::from_array(&f.env, &[66u8; 32]);
        assert_eq!(
            client.try_open_dispute(&stranger, &id, &reason_hash),
            Err(Ok(Error::NotAuthorizedToDispute))
        );
        assert!(!client.get_reservation(&id).unwrap().disputed);
    }

    #[test]
    fn open_dispute_on_settled_reservation() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);
        client.mark_verified(&f.admin, &id);
        client.validate_cashout(&f.merchant, &id);

        let reason_hash = BytesN::from_array(&f.env, &[55u8; 32]);
        assert_eq!(
            client.try_open_dispute(&f.sender, &id, &reason_hash),
            Err(Ok(Error::Settled))
        );
    }

    #[test]
    fn open_dispute_on_already_disputed() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);

        let reason_hash1 = BytesN::from_array(&f.env, &[44u8; 32]);
        client.open_dispute(&f.sender, &id, &reason_hash1);

        let reason_hash2 = BytesN::from_array(&f.env, &[33u8; 32]);
        assert_eq!(
            client.try_open_dispute(&f.admin, &id, &reason_hash2),
            Err(Ok(Error::Disputed))
        );
    }

    #[test]
    fn validate_cashout_blocked_when_disputed() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);
        client.mark_verified(&f.admin, &id);

        let reason_hash = BytesN::from_array(&f.env, &[22u8; 32]);
        client.open_dispute(&f.sender, &id, &reason_hash);

        assert_eq!(
            client.try_validate_cashout(&f.merchant, &id),
            Err(Ok(Error::Disputed))
        );
    }

    #[test]
    fn cancel_reservation_blocked_when_disputed() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);

        let reason_hash = BytesN::from_array(&f.env, &[11u8; 32]);
        client.open_dispute(&f.sender, &id, &reason_hash);

        assert_eq!(
            client.try_cancel_reservation(&f.sender, &id),
            Err(Ok(Error::Disputed))
        );
    }

    #[test]
    fn refund_expired_blocked_when_disputed() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);
        client.mark_verified(&f.admin, &id);

        let reason_hash = BytesN::from_array(&f.env, &[10u8; 32]);
        client.open_dispute(&f.sender, &id, &reason_hash);

        let expires_at = client.get_reservation(&id).unwrap().expires_at;
        f.env.ledger().set_timestamp(expires_at);

        assert_eq!(
            client.try_refund_expired(&f.sender, &id),
            Err(Ok(Error::Disputed))
        );
    }

    #[test]
    fn resolve_dispute_release_to_merchant() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let token_client = TokenClient::new(&f.env, &f.token);
        let id = open(&f);

        let reason_hash = BytesN::from_array(&f.env, &[9u8; 32]);
        client.open_dispute(&f.sender, &id, &reason_hash);

        client.resolve_dispute(&id, &true);

        let res = client.get_reservation(&id).unwrap();
        assert!(res.settled);
        assert!(!res.disputed);

        let fee = GROSS * FEE_BPS / BPS_DENOM;
        let net = GROSS - fee;
        assert_eq!(token_client.balance(&f.merchant), net);
        assert_eq!(token_client.balance(&f.treasury), fee);
        assert_eq!(token_client.balance(&f.contract), 0);
    }

    #[test]
    fn resolve_dispute_refund_to_sender() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let token_client = TokenClient::new(&f.env, &f.token);
        let id = open(&f);

        let reason_hash = BytesN::from_array(&f.env, &[8u8; 32]);
        client.open_dispute(&f.sender, &id, &reason_hash);

        let before = token_client.balance(&f.sender);
        client.resolve_dispute(&id, &false);

        let res = client.get_reservation(&id).unwrap();
        assert!(res.settled);
        assert!(!res.disputed);

        assert_eq!(token_client.balance(&f.sender), before + GROSS);
        assert_eq!(token_client.balance(&f.merchant), 0);
        assert_eq!(token_client.balance(&f.treasury), 0);
        assert_eq!(token_client.balance(&f.contract), 0);
    }

    #[test]
    fn resolve_dispute_requires_admin() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);

        let reason_hash = BytesN::from_array(&f.env, &[7u8; 32]);
        client.open_dispute(&f.sender, &id, &reason_hash);

        f.env.mock_auths(&[MockAuth {
            address: &f.sender,
            invoke: &MockAuthInvoke {
                contract: &f.contract,
                fn_name: "resolve_dispute",
                args: (id, true).into_val(&f.env),
                sub_invokes: &[],
            },
        }]);

        let result = client.try_resolve_dispute(&id, &true);
        assert!(
            matches!(result, Err(Err(_))),
            "expected a host auth failure, got {result:?}"
        );
        assert!(client.get_reservation(&id).unwrap().disputed);
    }

    #[test]
    fn resolve_dispute_on_non_disputed() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);

        assert_eq!(
            client.try_resolve_dispute(&id, &true),
            Err(Ok(Error::NotDisputed))
        );
    }

    #[test]
    fn resolve_dispute_on_settled() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);
        client.mark_verified(&f.admin, &id);
        client.validate_cashout(&f.merchant, &id);

        assert_eq!(
            client.try_resolve_dispute(&id, &true),
            Err(Ok(Error::Settled))
        );
    }

    #[test]
    fn resolve_dispute_cannot_be_called_twice() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let id = open(&f);

        let reason_hash = BytesN::from_array(&f.env, &[6u8; 32]);
        client.open_dispute(&f.sender, &id, &reason_hash);

        client.resolve_dispute(&id, &true);

        assert_eq!(
            client.try_resolve_dispute(&id, &false),
            Err(Ok(Error::Settled))
        );
    }

    #[test]
    fn version_is_v0_d1() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        assert_eq!(client.version(), symbol_short!("v0_d1"));
    }
}

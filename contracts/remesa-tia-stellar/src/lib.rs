//! TIA remittance escrow on Stellar (Soroban) — USDC via SAC transfer.
//!
//! Mirrors Solana `programs/remesa-liquidez`: sender locks USDC into the
//! contract, TIA marks verified, merchant cashout splits 25 bps to treasury.

#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token::TokenClient, Address,
    Env, Symbol,
};

const FEE_BPS: i128 = 25;
const BPS_DENOM: i128 = 10_000;

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
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    Treasury,
    Reservation(u64),
    Merchant(Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Reservation {
    pub sender: Address,
    pub receiver: Address,
    pub amount: i128,
    pub verified: bool,
    pub settled: bool,
}

#[contract]
pub struct RemesaTiaContract;

fn require_cfg(env: &Env) -> (Address, Address, Address) {
    let admin: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .unwrap();
    let token: Address = env
        .storage()
        .instance()
        .get(&DataKey::Token)
        .unwrap();
    let treasury: Address = env
        .storage()
        .instance()
        .get(&DataKey::Treasury)
        .unwrap();
    (admin, token, treasury)
}

#[contractimpl]
impl RemesaTiaContract {
    pub fn __constructor(env: Env, admin: Address, token: Address, treasury: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Treasury, &treasury);
    }

    pub fn version(_env: Env) -> Symbol {
        symbol_short!("v0_b2")
    }

    pub fn register_merchant(env: Env, merchant: Address) -> Result<(), Error> {
        let (admin, _, _) = require_cfg(&env);
        admin.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::Merchant(merchant), &true);
        Ok(())
    }

    /// Lock `amount` of configured USDC SAC from `sender` into this contract.
    pub fn initialize_reservation(
        env: Env,
        sender: Address,
        receiver: Address,
        amount: i128,
        reservation_id: u64,
    ) -> Result<(), Error> {
        sender.require_auth();
        if amount <= 0 {
            return Err(Error::BadAmount);
        }
        let key = DataKey::Reservation(reservation_id);
        if env.storage().persistent().has(&key) {
            return Err(Error::Exists);
        }
        let (_, token, _) = require_cfg(&env);
        TokenClient::new(&env, &token).transfer(
            &sender,
            &env.current_contract_address(),
            &amount,
        );
        env.storage().persistent().set(
            &key,
            &Reservation {
                sender,
                receiver,
                amount,
                verified: false,
                settled: false,
            },
        );
        Ok(())
    }

    pub fn mark_verified(env: Env, sender: Address, reservation_id: u64) -> Result<(), Error> {
        sender.require_auth();
        let key = DataKey::Reservation(reservation_id);
        let mut reservation: Reservation = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::NotFound)?;
        if reservation.sender != sender {
            return Err(Error::NotSender);
        }
        if reservation.settled {
            return Err(Error::Settled);
        }
        reservation.verified = true;
        env.storage().persistent().set(&key, &reservation);
        Ok(())
    }

    /// Pay merchant (gross − 25 bps) and treasury (25 bps) from locked USDC.
    pub fn validate_cashout(
        env: Env,
        merchant: Address,
        reservation_id: u64,
    ) -> Result<(), Error> {
        merchant.require_auth();
        let registered: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Merchant(merchant.clone()))
            .unwrap_or(false);
        if !registered {
            return Err(Error::NotMerchant);
        }
        let key = DataKey::Reservation(reservation_id);
        let mut reservation: Reservation = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::NotFound)?;
        if reservation.settled {
            return Err(Error::Settled);
        }
        if !reservation.verified {
            return Err(Error::NotVerified);
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
        let (_, token, treasury) = require_cfg(&env);
        let client = TokenClient::new(&env, &token);
        let vault = env.current_contract_address();
        if net > 0 {
            client.transfer(&vault, &merchant, &net);
        }
        if fee > 0 {
            client.transfer(&vault, &treasury, &fee);
        }
        reservation.settled = true;
        env.storage().persistent().set(&key, &reservation);
        Ok(())
    }

    /// Refund locked USDC to sender if the reservation is not yet settled.
    pub fn cancel_reservation(
        env: Env,
        caller: Address,
        reservation_id: u64,
    ) -> Result<(), Error> {
        caller.require_auth();
        let key = DataKey::Reservation(reservation_id);
        let mut reservation: Reservation = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::NotFound)?;
        if reservation.settled {
            return Err(Error::Settled);
        }
        if caller != reservation.sender && caller != reservation.receiver {
            return Err(Error::NotParty);
        }
        let (_, token, _) = require_cfg(&env);
        TokenClient::new(&env, &token).transfer(
            &env.current_contract_address(),
            &reservation.sender,
            &reservation.amount,
        );
        reservation.settled = true;
        env.storage().persistent().set(&key, &reservation);
        Ok(())
    }

    pub fn get_reservation(env: Env, reservation_id: u64) -> Option<Reservation> {
        env.storage()
            .persistent()
            .get(&DataKey::Reservation(reservation_id))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        token::{StellarAssetClient, TokenClient},
        Address, Env,
    };

    const GROSS: i128 = 10_000_000; // 1 USDC (7 decimals on Stellar)

    struct Fixture {
        env: Env,
        contract: Address,
        token: Address,
        sender: Address,
        receiver: Address,
        merchant: Address,
        treasury: Address,
    }

    fn setup() -> Fixture {
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
        StellarAssetClient::new(&env, &token).mint(&sender, &(GROSS * 2));
        let contract = env.register(
            RemesaTiaContract,
            (admin, token.clone(), treasury.clone()),
        );
        Fixture {
            env,
            contract,
            token,
            sender,
            receiver,
            merchant,
            treasury,
        }
    }

    #[test]
    fn fee_constants_match_solana_client() {
        assert_eq!(FEE_BPS, 25);
        assert_eq!(BPS_DENOM, 10_000);
    }

    #[test]
    fn initialize_reservation_locks_usdc() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let token_client = TokenClient::new(&f.env, &f.token);
        client.initialize_reservation(&f.sender, &f.receiver, &GROSS, &1);
        assert_eq!(token_client.balance(&f.contract), GROSS);
        assert_eq!(token_client.balance(&f.sender), GROSS);
        let res = client.get_reservation(&1).unwrap();
        assert_eq!(res.amount, GROSS);
        assert!(!res.verified);
        assert!(!res.settled);
    }

    #[test]
    fn cashout_splits_fee_to_treasury() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let token_client = TokenClient::new(&f.env, &f.token);
        client.register_merchant(&f.merchant);
        client.initialize_reservation(&f.sender, &f.receiver, &GROSS, &7);
        client.mark_verified(&f.sender, &7);
        client.validate_cashout(&f.merchant, &7);
        let fee = GROSS * FEE_BPS / BPS_DENOM;
        let net = GROSS - fee;
        assert_eq!(token_client.balance(&f.merchant), net);
        assert_eq!(token_client.balance(&f.treasury), fee);
        assert_eq!(token_client.balance(&f.contract), 0);
        assert!(client.get_reservation(&7).unwrap().settled);
    }

    #[test]
    fn cancel_refunds_sender() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        let token_client = TokenClient::new(&f.env, &f.token);
        client.initialize_reservation(&f.sender, &f.receiver, &GROSS, &2);
        client.cancel_reservation(&f.sender, &2);
        assert_eq!(token_client.balance(&f.sender), GROSS * 2);
        assert_eq!(token_client.balance(&f.contract), 0);
    }

    #[test]
    fn cashout_rejects_unregistered_merchant() {
        let f = setup();
        let client = RemesaTiaContractClient::new(&f.env, &f.contract);
        client.initialize_reservation(&f.sender, &f.receiver, &GROSS, &3);
        client.mark_verified(&f.sender, &3);
        assert_eq!(
            client.try_validate_cashout(&f.merchant, &3),
            Err(Ok(Error::NotMerchant))
        );
    }
}

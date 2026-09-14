//! TIA remittance escrow on Stellar (Soroban) — Phase B minimal storage.
//!
//! USDC transfer wiring follows in next iteration; this PoC stores reservation
//! metadata on-chain for E2E + Accesly signing integration.

#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, Symbol,
};

const FEE_BPS: i128 = 25;
const BPS_DENOM: i128 = 10_000;

/// Contract errors must be a `#[contracterror]` enum with a stable `u32`
/// discriminant — Soroban cannot return a `Symbol` as the `Err` variant.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidAmount = 1,
    ReservationNotFound = 2,
    NotSender = 3,
    NotImplemented = 4,
}

#[contracttype]
#[derive(Clone)]
pub struct Reservation {
    pub sender: Address,
    pub receiver: Address,
    pub amount: i128,
    pub verified: bool,
}

#[contract]
pub struct RemesaTiaContract;

#[contractimpl]
impl RemesaTiaContract {
    pub fn version(_env: Env) -> Symbol {
        symbol_short!("v0_b1")
    }

    /// Lock reservation metadata (USDC transfer — next sprint).
    pub fn initialize_reservation(
        env: Env,
        sender: Address,
        receiver: Address,
        amount: i128,
        reservation_id: u64,
    ) -> Result<(), Error> {
        sender.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let key = (symbol_short!("res"), reservation_id);
        let reservation = Reservation {
            sender,
            receiver,
            amount,
            verified: false,
        };
        env.storage().persistent().set(&key, &reservation);
        Ok(())
    }

    pub fn mark_verified(env: Env, sender: Address, reservation_id: u64) -> Result<(), Error> {
        sender.require_auth();
        let key = (symbol_short!("res"), reservation_id);
        let mut reservation: Reservation = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::ReservationNotFound)?;
        if reservation.sender != sender {
            return Err(Error::NotSender);
        }
        reservation.verified = true;
        env.storage().persistent().set(&key, &reservation);
        Ok(())
    }

    pub fn validate_cashout(
        _env: Env,
        _merchant: Address,
        _reservation_id: u64,
    ) -> Result<(), Error> {
        Err(Error::NotImplemented)
    }

    pub fn register_merchant(_env: Env, _merchant: Address) -> Result<(), Error> {
        Err(Error::NotImplemented)
    }
}

#[cfg(test)]
mod test {
    use super::{BPS_DENOM, FEE_BPS};

    #[test]
    fn fee_constants_match_solana_client() {
        assert_eq!(FEE_BPS, 25);
        assert_eq!(BPS_DENOM, 10_000);
    }
}

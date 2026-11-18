use anchor_lang::prelude::*;

#[event]
pub struct ReservationCreated {
    pub id: u64,
    pub reservation: Pubkey,
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub merchant: Pubkey,
    pub amount: u64,
}

#[event]
pub struct ReservationVerified {
    pub id: u64,
    pub reservation: Pubkey,
    pub verifier: Pubkey,
}

#[event]
pub struct ReservationCashed {
    pub id: u64,
    pub reservation: Pubkey,
    pub merchant: Pubkey,
    pub gross: u64,
    pub fee: u64,
    pub net: u64,
}

#[event]
pub struct ReservationCancelled {
    pub id: u64,
    pub reservation: Pubkey,
    pub caller: Pubkey,
}

#[event]
pub struct MerchantStatusChanged {
    pub merchant: Pubkey,
    pub active: bool,
}

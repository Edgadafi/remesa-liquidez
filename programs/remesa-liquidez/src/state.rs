use anchor_lang::prelude::*;

/// Lifecycle of a turn-based remittance reservation.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum ReservationStatus {
    Active,
    Completed,
    Cancelled,
}

/// Escrow record that bridges a digital remittance with a physical cash-out.
///
/// PDA seeds: `[b"reservation", sender, id.to_le_bytes()]`. The id comes
/// from `Config.next_reservation_id`, so a caller cannot squat an id.
#[account]
#[derive(Debug)]
pub struct TurnReservation {
    /// Funder of the remittance (pays the SPL tokens, also pays rent).
    pub sender: Pubkey,
    /// Recipient that collects cash at the assigned merchant.
    pub receiver: Pubkey,
    /// Merchant bound at init. Cashout requires this exact pubkey.
    pub merchant: Pubkey,
    /// SPL mint backing the escrow (USDC, MXNe, etc.).
    pub mint: Pubkey,
    /// Tokens held in escrow.
    pub amount: u64,
    /// Unix timestamp after which the sender may cancel.
    pub expires_at: i64,
    /// Off-chain verification flag. Flipped by `mark_verified`, which only
    /// the protocol admin or the configured verifier may sign.
    pub is_verified: bool,
    /// Lifecycle status.
    pub status: ReservationStatus,
    /// Bump for the reservation PDA.
    pub bump: u8,
    /// Bump for the vault token account PDA.
    pub vault_bump: u8,
    /// Id assigned from `Config.next_reservation_id` at init.
    pub id: u64,
}

impl TurnReservation {
    /// 8 (disc) + 32*4 (pubkeys) + 8 (amount) + 8 (expires_at)
    /// + 1 (is_verified) + 1 (status) + 1 (bump) + 1 (vault_bump) + 8 (id).
    pub const SPACE: usize = 8 + 32 * 4 + 8 + 8 + 1 + 1 + 1 + 1 + 8;

    pub const SEED_PREFIX: &'static [u8] = b"reservation";
    pub const VAULT_SEED_PREFIX: &'static [u8] = b"vault";
}

/// Whitelist entry that authorizes a merchant pubkey to settle reservations.
///
/// PDA seeds: `[b"merchant", merchant.key().as_ref()]`.
#[account]
#[derive(Debug)]
pub struct MerchantAccount {
    pub merchant: Pubkey,
    pub admin: Pubkey,
    pub active: bool,
    pub bump: u8,
}

impl MerchantAccount {
    /// 8 (disc) + 32 + 32 + 1 + 1.
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 1;

    pub const SEED_PREFIX: &'static [u8] = b"merchant";
}

/// Singleton governance account that owns the protocol treasury. Its pubkey
/// is `[CONFIG_SEED]`. The `admin` is the only account allowed to drain the
/// per-mint treasury vaults via `withdraw_treasury`.
#[account]
#[derive(Debug)]
pub struct Config {
    pub admin: Pubkey,
    /// May call `mark_verified`. Initialized to `admin`.
    pub verifier: Pubkey,
    /// Next reservation id. Callers must pass this exact value.
    pub next_reservation_id: u64,
    pub bump: u8,
}

impl Config {
    /// 8 (disc) + 32 (admin) + 32 (verifier) + 8 (next id) + 1 (bump).
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 1;

    pub const SEED_PREFIX: &'static [u8] = b"config";
}

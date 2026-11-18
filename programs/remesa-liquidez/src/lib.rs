use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

pub use instructions::*;

declare_id!("Fprb6jTLfjXfZ6yuWzS7LVXxwVvPbPgPZiEqDEL9bRfj");

#[program]
pub mod remesa_liquidez {
    use super::*;

    /// Sender locks `amount` SPL tokens into a PDA-controlled vault.
    /// `reservation_id` must equal `Config.next_reservation_id`. The merchant
    /// account passed in is bound to the reservation.
    pub fn initialize_reservation(
        ctx: Context<InitializeReservation>,
        amount: u64,
        expiry_seconds: i64,
        reservation_id: u64,
    ) -> Result<()> {
        instructions::initialize_reservation::handler(ctx, amount, expiry_seconds, reservation_id)
    }

    /// Records off-chain verification. Signed by the protocol admin or the
    /// configured verifier, never by the sender.
    pub fn mark_verified(ctx: Context<MarkVerified>, reservation_id: u64) -> Result<()> {
        instructions::mark_verified::handler(ctx, reservation_id)
    }

    /// Settlement for the merchant bound at init. The receiver must sign, as
    /// proof they collected cash. Fee is 25 bps to the treasury vault.
    pub fn validate_cashout(ctx: Context<ValidateCashout>, reservation_id: u64) -> Result<()> {
        instructions::validate_cashout::handler(ctx, reservation_id)
    }

    /// Refund path while the reservation is still unverified. The receiver may
    /// cancel anytime; the sender only after `expires_at`. A verified
    /// reservation uses `refund_expired` instead.
    pub fn cancel_reservation(ctx: Context<CancelReservation>, reservation_id: u64) -> Result<()> {
        instructions::cancel_reservation::handler(ctx, reservation_id)
    }

    /// Return 100% of a verified reservation to the sender after `expires_at`.
    /// The sender may sign, and so may the admin, unless that admin is the
    /// merchant or the receiver. The merchant and the receiver may not.
    /// `validate_cashout` already fails at `expires_at`, so the two exits
    /// do not overlap.
    pub fn refund_expired(ctx: Context<RefundExpired>, reservation_id: u64) -> Result<()> {
        instructions::refund_expired::handler(ctx, reservation_id)
    }

    /// Create or toggle a merchant whitelist entry. Admin only.
    /// `active = false` blocks that merchant's cashouts.
    pub fn set_merchant_status(
        ctx: Context<SetMerchantStatus>,
        merchant: Pubkey,
        active: bool,
    ) -> Result<()> {
        instructions::register_merchant::set_status_handler(ctx, merchant, active)
    }

    /// Rotate the protocol admin. Current admin only.
    pub fn set_admin(ctx: Context<SetAdmin>, new_admin: Pubkey) -> Result<()> {
        instructions::set_admin::set_admin_handler(ctx, new_admin)
    }

    /// Rotate the verifier allowed to call `mark_verified`. Admin only.
    pub fn set_verifier(ctx: Context<SetVerifier>, new_verifier: Pubkey) -> Result<()> {
        instructions::set_admin::set_verifier_handler(ctx, new_verifier)
    }

    /// One-shot bootstrap: persists the protocol admin pubkey in a singleton
    /// Config PDA. Required before any treasury withdrawal.
    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        instructions::initialize_config::handler(ctx)
    }

    /// Drain accumulated fees from the per-mint treasury vault. Admin-only.
    pub fn withdraw_treasury(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
        instructions::withdraw_treasury::handler(ctx, amount)
    }
}

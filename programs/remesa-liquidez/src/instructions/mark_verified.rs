use anchor_lang::prelude::*;

use crate::errors::ErrorCode;
use crate::events::ReservationVerified;
use crate::state::{Config, ReservationStatus, TurnReservation};

/// Flips `is_verified`. Only the protocol admin or the configured verifier
/// may sign. The sender is not an authority for this instruction.
#[derive(Accounts)]
#[instruction(reservation_id: u64)]
pub struct MarkVerified<'info> {
    pub verifier: Signer<'info>,

    #[account(
        seeds = [Config::SEED_PREFIX],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    /// CHECK: PDA seed. `has_one = sender` checks the stored funder.
    pub sender: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            TurnReservation::SEED_PREFIX,
            sender.key().as_ref(),
            &reservation_id.to_le_bytes(),
        ],
        bump = reservation.bump,
        has_one = sender @ ErrorCode::SenderMismatch,
    )]
    pub reservation: Account<'info, TurnReservation>,
}

pub fn handler(ctx: Context<MarkVerified>, reservation_id: u64) -> Result<()> {
    let verifier = ctx.accounts.verifier.key();
    require!(
        verifier == ctx.accounts.config.admin || verifier == ctx.accounts.config.verifier,
        ErrorCode::UnauthorizedVerifier
    );

    let reservation = &mut ctx.accounts.reservation;
    require!(
        reservation.status == ReservationStatus::Active,
        ErrorCode::ReservationNotActive
    );
    require!(!reservation.is_verified, ErrorCode::AlreadyVerified);
    require!(reservation.id == reservation_id, ErrorCode::ReservationIdMismatch);

    reservation.is_verified = true;

    emit!(ReservationVerified {
        id: reservation_id,
        reservation: reservation.key(),
        verifier,
    });

    Ok(())
}

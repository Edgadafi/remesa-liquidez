use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::ErrorCode;
use crate::events::ReservationCreated;
use crate::state::{Config, MerchantAccount, ReservationStatus, TurnReservation};

#[derive(Accounts)]
#[instruction(amount: u64, expiry_seconds: i64, reservation_id: u64)]
pub struct InitializeReservation<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    /// CHECK: The receiver does not need to sign at init time. The pubkey is
    /// recorded on the reservation and must sign `validate_cashout`.
    pub receiver: UncheckedAccount<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = sender_token_account.owner == sender.key(),
        constraint = sender_token_account.mint == mint.key() @ ErrorCode::MintMismatch,
    )]
    pub sender_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [Config::SEED_PREFIX],
        bump = config.bump,
        constraint = reservation_id == config.next_reservation_id @ ErrorCode::ReservationIdMismatch,
    )]
    pub config: Account<'info, Config>,

    #[account(
        seeds = [MerchantAccount::SEED_PREFIX, merchant_account.merchant.as_ref()],
        bump = merchant_account.bump,
        constraint = merchant_account.active @ ErrorCode::InvalidMerchant,
    )]
    pub merchant_account: Account<'info, MerchantAccount>,

    #[account(
        init,
        payer = sender,
        space = TurnReservation::SPACE,
        seeds = [
            TurnReservation::SEED_PREFIX,
            sender.key().as_ref(),
            &reservation_id.to_le_bytes(),
        ],
        bump,
    )]
    pub reservation: Account<'info, TurnReservation>,

    #[account(
        init,
        payer = sender,
        seeds = [TurnReservation::VAULT_SEED_PREFIX, reservation.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = reservation,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializeReservation>,
    amount: u64,
    expiry_seconds: i64,
    reservation_id: u64,
) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(expiry_seconds > 0, ErrorCode::InvalidExpiry);

    let clock = Clock::get()?;
    let expires_at = clock
        .unix_timestamp
        .checked_add(expiry_seconds)
        .ok_or(ErrorCode::NumericOverflow)?;

    let merchant = ctx.accounts.merchant_account.merchant;
    let sender = ctx.accounts.sender.key();
    let receiver = ctx.accounts.receiver.key();

    ctx.accounts.config.next_reservation_id = ctx
        .accounts
        .config
        .next_reservation_id
        .checked_add(1)
        .ok_or(ErrorCode::NumericOverflow)?;

    let reservation = &mut ctx.accounts.reservation;
    reservation.sender = sender;
    reservation.receiver = receiver;
    reservation.merchant = merchant;
    reservation.mint = ctx.accounts.mint.key();
    reservation.amount = amount;
    reservation.expires_at = expires_at;
    reservation.is_verified = false;
    reservation.status = ReservationStatus::Active;
    reservation.bump = ctx.bumps.reservation;
    reservation.vault_bump = ctx.bumps.vault;
    reservation.id = reservation_id;

    let cpi_accounts = Transfer {
        from: ctx.accounts.sender_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.sender.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    emit!(ReservationCreated {
        id: reservation_id,
        reservation: reservation.key(),
        sender,
        receiver,
        merchant,
        amount,
    });

    Ok(())
}

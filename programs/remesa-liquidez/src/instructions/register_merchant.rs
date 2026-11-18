use anchor_lang::prelude::*;

use crate::errors::ErrorCode;
use crate::events::MerchantStatusChanged;
use crate::state::{Config, MerchantAccount};

/// Creates the merchant PDA on the first call and toggles `active` after that.
/// Only the protocol admin (Config) may call this.
#[derive(Accounts)]
#[instruction(merchant: Pubkey, active: bool)]
pub struct SetMerchantStatus<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [Config::SEED_PREFIX],
        bump = config.bump,
        constraint = config.admin == admin.key() @ ErrorCode::UnauthorizedAdmin,
    )]
    pub config: Account<'info, Config>,

    #[account(
        init_if_needed,
        payer = admin,
        space = MerchantAccount::SPACE,
        seeds = [MerchantAccount::SEED_PREFIX, merchant.as_ref()],
        bump,
    )]
    pub merchant_account: Account<'info, MerchantAccount>,

    pub system_program: Program<'info, System>,
}

pub fn set_status_handler(
    ctx: Context<SetMerchantStatus>,
    merchant: Pubkey,
    active: bool,
) -> Result<()> {
    let acc = &mut ctx.accounts.merchant_account;
    if acc.merchant == Pubkey::default() {
        acc.merchant = merchant;
        acc.admin = ctx.accounts.config.admin;
        acc.bump = ctx.bumps.merchant_account;
    } else {
        require_keys_eq!(acc.merchant, merchant, ErrorCode::InvalidMerchant);
    }
    acc.active = active;
    emit!(MerchantStatusChanged { merchant, active });
    Ok(())
}

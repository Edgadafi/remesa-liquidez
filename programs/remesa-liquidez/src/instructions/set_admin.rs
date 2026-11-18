use anchor_lang::prelude::*;

use crate::errors::ErrorCode;
use crate::state::Config;

#[derive(Accounts)]
pub struct SetAdmin<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [Config::SEED_PREFIX],
        bump = config.bump,
        constraint = config.admin == admin.key() @ ErrorCode::UnauthorizedAdmin,
    )]
    pub config: Account<'info, Config>,
}

pub fn set_admin_handler(ctx: Context<SetAdmin>, new_admin: Pubkey) -> Result<()> {
    require!(new_admin != Pubkey::default(), ErrorCode::InvalidAdmin);
    ctx.accounts.config.admin = new_admin;
    msg!("Protocol admin rotated to {}", new_admin);
    Ok(())
}

#[derive(Accounts)]
pub struct SetVerifier<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [Config::SEED_PREFIX],
        bump = config.bump,
        constraint = config.admin == admin.key() @ ErrorCode::UnauthorizedAdmin,
    )]
    pub config: Account<'info, Config>,
}

pub fn set_verifier_handler(ctx: Context<SetVerifier>, new_verifier: Pubkey) -> Result<()> {
    require!(new_verifier != Pubkey::default(), ErrorCode::InvalidAdmin);
    ctx.accounts.config.verifier = new_verifier;
    msg!("Protocol verifier rotated to {}", new_verifier);
    Ok(())
}

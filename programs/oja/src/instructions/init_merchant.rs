use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

use crate::{constants::*, error::OjaError, state::Merchant};

#[derive(Accounts)]
pub struct InitMerchant<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = owner,
        space = 8 + Merchant::INIT_SPACE,
        seeds = [MERCHANT_SEED, owner.key().as_ref()],
        bump
    )]
    pub merchant: Account<'info, Merchant>,
    pub system_program: Program<'info, System>,
}

pub fn handle_init_merchant(ctx: Context<InitMerchant>, name: String) -> Result<()> {
    require!(
        !name.is_empty() && name.len() <= MAX_NAME_LEN,
        OjaError::InvalidName
    );

    let merchant = &mut ctx.accounts.merchant;
    merchant.owner = ctx.accounts.owner.key();
    merchant.mint = ctx.accounts.mint.key();
    merchant.name = name;
    merchant.total_received = 0;
    merchant.sale_count = 0;
    merchant.unique_payers = 0;
    merchant.recent_payers = [Pubkey::default(); RECENT_PAYERS_LEN];
    merchant.payer_cursor = 0;
    merchant.advance_count = 0;
    merchant.completed_advances = 0;
    merchant.first_sale_ts = 0;
    merchant.last_sale_ts = 0;
    merchant.current_advance = None;
    merchant.bump = ctx.bumps.merchant;
    Ok(())
}

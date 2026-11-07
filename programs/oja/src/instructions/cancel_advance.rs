use anchor_lang::prelude::*;

use crate::{
    constants::*,
    error::OjaError,
    state::{Advance, AdvanceStatus, Merchant},
};

#[derive(Accounts)]
pub struct CancelAdvance<'info> {
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [MERCHANT_SEED, owner.key().as_ref()],
        bump = merchant.bump,
        has_one = owner @ OjaError::NotMerchantOwner
    )]
    pub merchant: Account<'info, Merchant>,
    #[account(
        mut,
        seeds = [ADVANCE_SEED, merchant.key().as_ref(), &advance.index.to_le_bytes()],
        bump = advance.bump,
        has_one = merchant @ OjaError::WrongAdvance
    )]
    pub advance: Account<'info, Advance>,
}

pub fn handle_cancel_advance(ctx: Context<CancelAdvance>) -> Result<()> {
    require!(
        ctx.accounts.advance.status == AdvanceStatus::Requested,
        OjaError::AdvanceNotRequested
    );
    require!(
        ctx.accounts.merchant.current_advance == Some(ctx.accounts.advance.key()),
        OjaError::WrongAdvance
    );
    ctx.accounts.advance.status = AdvanceStatus::Cancelled;
    ctx.accounts.merchant.current_advance = None;
    Ok(())
}

use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

use crate::{
    constants::*,
    error::OjaError,
    state::{Advance, AdvanceRequested, AdvanceStatus, Merchant},
};

#[derive(Accounts)]
pub struct RequestAdvance<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [MERCHANT_SEED, owner.key().as_ref()],
        bump = merchant.bump,
        has_one = owner @ OjaError::NotMerchantOwner
    )]
    pub merchant: Account<'info, Merchant>,
    #[account(address = merchant.mint @ OjaError::WrongMint)]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = owner,
        space = 8 + Advance::INIT_SPACE,
        seeds = [ADVANCE_SEED, merchant.key().as_ref(), &merchant.advance_count.to_le_bytes()],
        bump
    )]
    pub advance: Account<'info, Advance>,
    pub system_program: Program<'info, System>,
}

pub fn handle_request_advance(
    ctx: Context<RequestAdvance>,
    principal: u64,
    fee_bps: u16,
    repay_bps: u16,
) -> Result<()> {
    let merchant = &mut ctx.accounts.merchant;

    require!(merchant.current_advance.is_none(), OjaError::AdvanceAlreadyOpen);
    require!(principal > 0, OjaError::ZeroAmount);
    require!(
        merchant.sale_count >= MIN_SALES_FOR_ADVANCE,
        OjaError::NotEnoughHistory
    );
    let limit = (merchant.total_received as u128)
        .checked_mul(MAX_ADVANCE_BPS_OF_VOLUME as u128)
        .ok_or(OjaError::Overflow)?
        / BPS as u128;
    require!(
        merchant.unique_payers >= MIN_UNIQUE_PAYERS_FOR_ADVANCE,
        OjaError::NotEnoughPayers
    );
    require!((principal as u128) <= limit, OjaError::AdvanceTooLarge);
    let step = (merchant.completed_advances as usize).min(CREDIT_LADDER.len() - 1);
    let ladder_cap = CREDIT_LADDER[step]
        .checked_mul(10u64.pow(ctx.accounts.mint.decimals as u32))
        .ok_or(OjaError::Overflow)?;
    require!(principal <= ladder_cap, OjaError::AboveCreditLadder);
    require!(
        (MIN_REPAY_BPS..=MAX_REPAY_BPS).contains(&repay_bps),
        OjaError::RepayShareOutOfRange
    );
    require!(fee_bps <= MAX_FEE_BPS, OjaError::FeeTooHigh);

    let fee = (principal as u128)
        .checked_mul(fee_bps as u128)
        .ok_or(OjaError::Overflow)?
        / BPS as u128;
    let total_due = principal
        .checked_add(fee as u64)
        .ok_or(OjaError::Overflow)?;

    let advance = &mut ctx.accounts.advance;
    advance.merchant = merchant.key();
    advance.index = merchant.advance_count;
    advance.lender = Pubkey::default();
    advance.principal = principal;
    advance.fee_bps = fee_bps;
    advance.repay_bps = repay_bps;
    advance.total_due = total_due;
    advance.repaid = 0;
    advance.status = AdvanceStatus::Requested;
    advance.requested_ts = Clock::get()?.unix_timestamp;
    advance.funded_ts = 0;
    advance.bump = ctx.bumps.advance;

    merchant.current_advance = Some(advance.key());
    merchant.advance_count = merchant
        .advance_count
        .checked_add(1)
        .ok_or(OjaError::Overflow)?;

    emit!(AdvanceRequested {
        merchant: merchant.key(),
        advance: advance.key(),
        principal,
        total_due,
        repay_bps,
    });
    Ok(())
}

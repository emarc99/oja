use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

use crate::{
    constants::*,
    error::OjaError,
    state::{Advance, AdvanceFunded, AdvanceStatus, Merchant},
};

#[derive(Accounts)]
pub struct FundAdvance<'info> {
    #[account(mut)]
    pub lender: Signer<'info>,
    #[account(
        mut,
        seeds = [MERCHANT_SEED, merchant.owner.as_ref()],
        bump = merchant.bump
    )]
    pub merchant: Account<'info, Merchant>,
    #[account(
        mut,
        seeds = [ADVANCE_SEED, merchant.key().as_ref(), &advance.index.to_le_bytes()],
        bump = advance.bump,
        has_one = merchant @ OjaError::WrongAdvance
    )]
    pub advance: Account<'info, Advance>,
    #[account(address = merchant.mint @ OjaError::WrongMint)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub lender_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub merchant_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

pub fn handle_fund_advance(mut ctx: Context<FundAdvance>) -> Result<()> {
    let accounts = &mut ctx.accounts;
    let mint_key = accounts.merchant.mint;

    require!(
        accounts.advance.status == AdvanceStatus::Requested,
        OjaError::AdvanceNotRequested
    );
    require!(
        accounts.merchant.current_advance == Some(accounts.advance.key()),
        OjaError::WrongAdvance
    );
    require_keys_neq!(accounts.lender.key(), accounts.merchant.owner, OjaError::SelfFunding);
    require_keys_eq!(accounts.lender_token.owner, accounts.lender.key(), OjaError::WrongLenderAccount);
    require_keys_eq!(accounts.lender_token.mint, mint_key, OjaError::WrongMint);
    require_keys_eq!(
        accounts.merchant_token.owner,
        accounts.merchant.owner,
        OjaError::WrongMerchantAccount
    );
    require_keys_eq!(accounts.merchant_token.mint, mint_key, OjaError::WrongMint);

    let principal = accounts.advance.principal;
    token::transfer_checked(
        CpiContext::new(
            Token::id(),
            TransferChecked {
                from: accounts.lender_token.to_account_info(),
                mint: accounts.mint.to_account_info(),
                to: accounts.merchant_token.to_account_info(),
                authority: accounts.lender.to_account_info(),
            },
        ),
        principal,
        accounts.mint.decimals,
    )?;

    let advance = &mut accounts.advance;
    advance.lender = accounts.lender.key();
    advance.status = AdvanceStatus::Active;
    advance.funded_ts = Clock::get()?.unix_timestamp;

    emit!(AdvanceFunded {
        merchant: accounts.merchant.key(),
        advance: advance.key(),
        lender: advance.lender,
        principal,
    });
    Ok(())
}

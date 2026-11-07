use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

use crate::{
    constants::*,
    error::OjaError,
    state::{Advance, AdvanceRepaid, AdvanceStatus, Merchant, Receipt, SaleRecorded},
};

#[derive(Accounts)]
#[instruction(invoice_id: [u8; 16])]
pub struct PayInvoice<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// Pays the receipt's rent and usually the transaction fee: the shop's sponsor, or the payer.
    #[account(mut, dup)]
    pub fee_payer: Signer<'info>,
    #[account(
        mut,
        seeds = [MERCHANT_SEED, merchant.owner.as_ref()],
        bump = merchant.bump
    )]
    pub merchant: Account<'info, Merchant>,
    #[account(address = merchant.mint @ OjaError::WrongMint)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub payer_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub merchant_token: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = fee_payer,
        space = 8 + Receipt::INIT_SPACE,
        seeds = [RECEIPT_SEED, merchant.key().as_ref(), invoice_id.as_ref()],
        bump
    )]
    pub receipt: Account<'info, Receipt>,
    #[account(mut)]
    pub advance: Option<Account<'info, Advance>>,
    #[account(mut)]
    pub lender_token: Option<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_pay_invoice(mut ctx: Context<PayInvoice>, invoice_id: [u8; 16], amount: u64) -> Result<()> {
    require!(amount > 0, OjaError::ZeroAmount);

    let accounts = &mut ctx.accounts;
    let mint_key = accounts.merchant.mint;

    require_keys_neq!(accounts.payer.key(), accounts.merchant.owner, OjaError::SelfPayment);
    require_keys_eq!(accounts.payer_token.mint, mint_key, OjaError::WrongMint);
    require_keys_eq!(accounts.payer_token.owner, accounts.payer.key(), OjaError::WrongPayerAccount);
    require_keys_eq!(accounts.merchant_token.mint, mint_key, OjaError::WrongMint);
    require_keys_eq!(
        accounts.merchant_token.owner,
        accounts.merchant.owner,
        OjaError::WrongMerchantAccount
    );

    let decimals = accounts.mint.decimals;
    let now = Clock::get()?.unix_timestamp;
    let mut lender_share: u64 = 0;

    if let Some(current) = accounts.merchant.current_advance {
        let advance = accounts
            .advance
            .as_mut()
            .ok_or(OjaError::AdvanceAccountsMissing)?;
        require_keys_eq!(advance.key(), current, OjaError::WrongAdvance);

        if advance.status == AdvanceStatus::Active {
            let lender_token = accounts
                .lender_token
                .as_ref()
                .ok_or(OjaError::AdvanceAccountsMissing)?;
            require_keys_eq!(lender_token.owner, advance.lender, OjaError::WrongLenderAccount);
            require_keys_eq!(lender_token.mint, mint_key, OjaError::WrongMint);

            let remaining = advance
                .total_due
                .checked_sub(advance.repaid)
                .ok_or(OjaError::Overflow)?;
            let share = (amount as u128)
                .checked_mul(advance.repay_bps as u128)
                .ok_or(OjaError::Overflow)?
                / BPS as u128;
            lender_share = (share as u64).min(remaining);

            if lender_share > 0 {
                token::transfer_checked(
                    CpiContext::new(
                        Token::id(),
                        TransferChecked {
                            from: accounts.payer_token.to_account_info(),
                            mint: accounts.mint.to_account_info(),
                            to: lender_token.to_account_info(),
                            authority: accounts.payer.to_account_info(),
                        },
                    ),
                    lender_share,
                    decimals,
                )?;
            }

            advance.repaid = advance
                .repaid
                .checked_add(lender_share)
                .ok_or(OjaError::Overflow)?;

            if advance.repaid >= advance.total_due {
                advance.status = AdvanceStatus::Repaid;
                emit!(AdvanceRepaid {
                    merchant: accounts.merchant.key(),
                    advance: advance.key(),
                    total_repaid: advance.repaid,
                });
                accounts.merchant.current_advance = None;
                accounts.merchant.completed_advances = accounts
                    .merchant
                    .completed_advances
                    .checked_add(1)
                    .ok_or(OjaError::Overflow)?;
            }
        }
    }

    let to_merchant = amount - lender_share;
    if to_merchant > 0 {
        token::transfer_checked(
            CpiContext::new(
                Token::id(),
                TransferChecked {
                    from: accounts.payer_token.to_account_info(),
                    mint: accounts.mint.to_account_info(),
                    to: accounts.merchant_token.to_account_info(),
                    authority: accounts.payer.to_account_info(),
                },
            ),
            to_merchant,
            decimals,
        )?;
    }

    let merchant = &mut accounts.merchant;
    merchant.total_received = merchant
        .total_received
        .checked_add(amount)
        .ok_or(OjaError::Overflow)?;
    merchant.sale_count = merchant.sale_count.checked_add(1).ok_or(OjaError::Overflow)?;
    let payer_key = accounts.payer.key();
    if !merchant.recent_payers.contains(&payer_key) {
        merchant.unique_payers = merchant.unique_payers.checked_add(1).ok_or(OjaError::Overflow)?;
        let slot = merchant.payer_cursor as usize % RECENT_PAYERS_LEN;
        merchant.recent_payers[slot] = payer_key;
        merchant.payer_cursor = ((slot + 1) % RECENT_PAYERS_LEN) as u8;
    }
    if merchant.first_sale_ts == 0 {
        merchant.first_sale_ts = now;
    }
    merchant.last_sale_ts = now;

    let receipt = &mut accounts.receipt;
    receipt.merchant = merchant.key();
    receipt.payer = accounts.payer.key();
    receipt.invoice_id = invoice_id;
    receipt.amount = amount;
    receipt.lender_share = lender_share;
    receipt.ts = now;
    receipt.bump = ctx.bumps.receipt;

    emit!(SaleRecorded {
        merchant: merchant.key(),
        receipt: receipt.key(),
        payer: receipt.payer,
        invoice_id,
        amount,
        lender_share,
        ts: now,
    });
    Ok(())
}

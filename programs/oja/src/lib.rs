pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("6rpwpnvUSRzTMNR5R7kNAC9PFJJugJLCQUL9yZfRAwRu");

#[program]
pub mod oja {
    use super::*;

    pub fn init_merchant(ctx: Context<InitMerchant>, name: String) -> Result<()> {
        crate::instructions::init_merchant::handle_init_merchant(ctx, name)
    }

    pub fn pay_invoice(ctx: Context<PayInvoice>, invoice_id: [u8; 16], amount: u64) -> Result<()> {
        crate::instructions::pay_invoice::handle_pay_invoice(ctx, invoice_id, amount)
    }

    pub fn request_advance(
        ctx: Context<RequestAdvance>,
        principal: u64,
        fee_bps: u16,
        repay_bps: u16,
    ) -> Result<()> {
        crate::instructions::request_advance::handle_request_advance(ctx, principal, fee_bps, repay_bps)
    }

    pub fn fund_advance(ctx: Context<FundAdvance>) -> Result<()> {
        crate::instructions::fund_advance::handle_fund_advance(ctx)
    }

    pub fn cancel_advance(ctx: Context<CancelAdvance>) -> Result<()> {
        crate::instructions::cancel_advance::handle_cancel_advance(ctx)
    }
}

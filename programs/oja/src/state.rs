use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Merchant {
    pub owner: Pubkey,
    pub mint: Pubkey,
    #[max_len(32)]
    pub name: String,
    pub total_received: u64,
    pub sale_count: u32,
    pub unique_payers: u32,
    pub recent_payers: [Pubkey; 16],
    pub payer_cursor: u8,
    pub advance_count: u32,
    pub completed_advances: u16,
    pub first_sale_ts: i64,
    pub last_sale_ts: i64,
    pub current_advance: Option<Pubkey>,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Receipt {
    pub merchant: Pubkey,
    pub payer: Pubkey,
    pub invoice_id: [u8; 16],
    pub amount: u64,
    pub lender_share: u64,
    pub ts: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum AdvanceStatus {
    Requested,
    Active,
    Repaid,
    Cancelled,
}

#[account]
#[derive(InitSpace)]
pub struct Advance {
    pub merchant: Pubkey,
    pub index: u32,
    pub lender: Pubkey,
    pub principal: u64,
    pub fee_bps: u16,
    pub repay_bps: u16,
    pub total_due: u64,
    pub repaid: u64,
    pub status: AdvanceStatus,
    pub requested_ts: i64,
    pub funded_ts: i64,
    pub bump: u8,
}

#[event]
pub struct SaleRecorded {
    pub merchant: Pubkey,
    pub receipt: Pubkey,
    pub payer: Pubkey,
    pub invoice_id: [u8; 16],
    pub amount: u64,
    pub lender_share: u64,
    pub ts: i64,
}

#[event]
pub struct AdvanceRequested {
    pub merchant: Pubkey,
    pub advance: Pubkey,
    pub principal: u64,
    pub total_due: u64,
    pub repay_bps: u16,
}

#[event]
pub struct AdvanceFunded {
    pub merchant: Pubkey,
    pub advance: Pubkey,
    pub lender: Pubkey,
    pub principal: u64,
}

#[event]
pub struct AdvanceRepaid {
    pub merchant: Pubkey,
    pub advance: Pubkey,
    pub total_repaid: u64,
}

pub const MERCHANT_SEED: &[u8] = b"merchant";
pub const RECEIPT_SEED: &[u8] = b"receipt";
pub const ADVANCE_SEED: &[u8] = b"advance";

pub const BPS: u64 = 10_000;

pub const MAX_NAME_LEN: usize = 32;
pub const RECENT_PAYERS_LEN: usize = 16;

/// A merchant needs this many recorded sales, from this many different payers, before asking for an advance.
pub const MIN_SALES_FOR_ADVANCE: u32 = 5;
pub const MIN_UNIQUE_PAYERS_FOR_ADVANCE: u32 = 3;
/// An advance can be at most this share of the merchant's lifetime recorded sales.
pub const MAX_ADVANCE_BPS_OF_VOLUME: u64 = 3_000;
/// Credit ladder, in whole currency units: the cap for a merchant's first advance, then after each fully repaid one.
pub const CREDIT_LADDER: [u64; 4] = [10, 25, 50, 100];
/// Share of each sale routed to the lender while an advance is active.
pub const MIN_REPAY_BPS: u16 = 500;
pub const MAX_REPAY_BPS: u16 = 5_000;
pub const MAX_FEE_BPS: u16 = 2_000;

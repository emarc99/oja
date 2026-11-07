use anchor_lang::prelude::*;

#[error_code]
pub enum OjaError {
    #[msg("Shop name must be 1 to 32 bytes")]
    InvalidName,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("This token is not the currency this shop accepts")]
    WrongMint,
    #[msg("The paying token account does not belong to the payer")]
    WrongPayerAccount,
    #[msg("The receiving token account does not belong to the shop owner")]
    WrongMerchantAccount,
    #[msg("This shop has an advance, so the advance account must be included")]
    AdvanceAccountsMissing,
    #[msg("That is not this shop's current advance")]
    WrongAdvance,
    #[msg("Repayment must go to the lender's own token account")]
    WrongLenderAccount,
    #[msg("Only the shop owner can do this")]
    NotMerchantOwner,
    #[msg("This shop already has an open advance")]
    AdvanceAlreadyOpen,
    #[msg("A shop cannot pay itself")]
    SelfPayment,
    #[msg("Not enough recorded sales to qualify for an advance yet")]
    NotEnoughHistory,
    #[msg("Not enough different customers to qualify for an advance yet")]
    NotEnoughPayers,
    #[msg("Advance is larger than the limit set by recorded sales")]
    AdvanceTooLarge,
    #[msg("Advance is above this shop's credit ladder step; repay advances to climb")]
    AboveCreditLadder,
    #[msg("Repayment share must be between 5% and 50% of each sale")]
    RepayShareOutOfRange,
    #[msg("Fee can be at most 20%")]
    FeeTooHigh,
    #[msg("This advance is not waiting for funding")]
    AdvanceNotRequested,
    #[msg("A shop cannot fund its own advance")]
    SelfFunding,
    #[msg("Arithmetic overflow")]
    Overflow,
}

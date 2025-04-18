use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::constants::{TREASURY_SEED, FIRST_PLACE_PERCENTAGE, SECOND_PLACE_PERCENTAGE, THIRD_PLACE_PERCENTAGE};
use crate::context::*;
use crate::errors::ContestError;
use crate::state::{TreasuryAccount};

pub fn add_funds_to_prize_pool(
    ctx: Context<AddFundsToPrizePool>,
    amount: u64,
) -> Result<()> {
    let contest = &mut ctx.accounts.contest;
    let treasury = &mut ctx.accounts.treasury;
    
    // Transfer funds to treasury
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.contributor.to_account_info(),
            to: treasury.to_account_info(),
        },
    );
    
    system_program::transfer(cpi_context, amount)?;
    
    // Update treasury and contest
    treasury.total_funds = treasury.total_funds.checked_add(amount).unwrap();
    treasury.prize_pool = treasury.prize_pool.checked_add(amount).unwrap();
    contest.total_prize_pool = contest.total_prize_pool.checked_add(amount).unwrap();
    
    Ok(())
}

pub fn distribute_prizes(
    ctx: Context<DistributePrizes>,
) -> Result<()> {
    let contest = &ctx.accounts.contest;
    let treasury = &mut ctx.accounts.treasury;
    
    require!(
        !treasury.is_distributed,
        ContestError::PrizesAlreadyDistributed
    );
    
    // Calculate prize amounts
    let prize_pool = treasury.prize_pool;
    
    let first_place_amount = prize_pool
        .checked_mul(FIRST_PLACE_PERCENTAGE as u64)
        .unwrap()
        .checked_div(100)
        .unwrap();
    
    let second_place_amount = prize_pool
        .checked_mul(SECOND_PLACE_PERCENTAGE as u64)
        .unwrap()
        .checked_div(100)
        .unwrap();
    
    let third_place_amount = prize_pool
        .checked_mul(THIRD_PLACE_PERCENTAGE as u64)
        .unwrap()
        .checked_div(100)
        .unwrap();
    
    // Transfer platform fee
    let platform_fee = treasury.platform_fee;
    let contest_key = contest.key();
    let platform_seeds = &[
        TREASURY_SEED,
        contest_key.as_ref(),
        &[treasury.bump],
    ];

    let seeds_array = &[&platform_seeds[..]];

    let platform_fee_cpi_context = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: treasury.to_account_info(),
            to: ctx.accounts.platform_wallet.to_account_info(),
        },
        seeds_array
    );
    
    system_program::transfer(platform_fee_cpi_context, platform_fee)?;
    
    // Transfer first place prize
    let first_place_cpi_context = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: treasury.to_account_info(),
            to: ctx.accounts.first_place_recipient.to_account_info(),
        },
        seeds_array
    );
    
    system_program::transfer(first_place_cpi_context, first_place_amount)?;
    
    // Transfer second place prize
    let second_place_cpi_context = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: treasury.to_account_info(),
            to: ctx.accounts.second_place_recipient.to_account_info(),
        },
        seeds_array
    );
    
    system_program::transfer(second_place_cpi_context, second_place_amount)?;
    
    // Transfer third place prize
    let third_place_cpi_context = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: treasury.to_account_info(),
            to: ctx.accounts.third_place_recipient.to_account_info(),
        },
        seeds_array
    );
    
    system_program::transfer(third_place_cpi_context, third_place_amount)?;
    
    // Mark treasury as distributed
    treasury.is_distributed = true;
    
    Ok(())
} 
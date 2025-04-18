use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::context::*;
use crate::errors::ContestError;
use crate::constants::*;

pub fn submit_entry(
    ctx: Context<SubmitEntry>,
    content_uri: String,
) -> Result<()> {
    let contest = &ctx.accounts.contest;
    let entry = &mut ctx.accounts.entry;
    let treasury = &mut ctx.accounts.treasury;
    
    // Transfer entry fee to treasury
    let entry_fee = contest.entry_fee;
    
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.participant.to_account_info(),
            to: treasury.to_account_info(),
        },
    );
    
    system_program::transfer(cpi_context, entry_fee)?;

    // Initialize entry
    let clock = Clock::get()?;
    
    entry.contest = contest.key();
    entry.participant = ctx.accounts.participant.key();
    entry.content_uri = content_uri;
    entry.timestamp = clock.unix_timestamp;
    entry.vote_count = 0;
    entry.weighted_votes = 0;
    entry.rank = None;
    entry.bump = ctx.bumps.entry;

    // Update contest's entry count
    let contest = &mut ctx.accounts.contest;
    contest.entry_count = contest.entry_count.checked_add(1).unwrap();

    // Update treasury
    treasury.total_funds = treasury.total_funds.checked_add(entry_fee).unwrap();
    
    // Split between platform fee and prize pool based on platform fee percentage
    let platform_fee = entry_fee
        .checked_mul(PLATFORM_FEE_PERCENTAGE as u64)
        .unwrap()
        .checked_div(100)
        .unwrap();
    let prize_amount = entry_fee.checked_sub(platform_fee).unwrap();
    
    treasury.platform_fee = treasury.platform_fee.checked_add(platform_fee).unwrap();
    treasury.prize_pool = treasury.prize_pool.checked_add(prize_amount).unwrap();
    
    // Update contest's total prize pool
    contest.total_prize_pool = contest.total_prize_pool.checked_add(prize_amount).unwrap();

    Ok(())
}

// Update entry function implementation
pub fn update_entry(
    ctx: Context<UpdateEntry>,
    content_uri: String,
) -> Result<()> {
    let entry = &mut ctx.accounts.entry;
    entry.content_uri = content_uri;

    Ok(())
} 
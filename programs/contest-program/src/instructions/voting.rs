use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::context::*;
use crate::errors::ContestError;
use crate::state::*;
use crate::constants::PLATFORM_FEE_PERCENTAGE;

pub fn cast_vote(
    ctx: Context<CastVote>,
    token_amount: u64,
) -> Result<()> {
    let contest = &ctx.accounts.contest;
    let treasury = &ctx.accounts.treasury;
    
    // Transfer vote fee to treasury
    let vote_fee = contest.vote_fee.checked_mul(token_amount).unwrap();
    
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.voter.to_account_info(),
            to: treasury.to_account_info(),
        },
    );
    
    system_program::transfer(cpi_context, vote_fee)?;

    // Create vote record
    let vote = &mut ctx.accounts.vote;
    let clock = Clock::get()?;
    
    vote.voter = ctx.accounts.voter.key();
    vote.contest = contest.key();
    vote.entry = ctx.accounts.entry.key();
    vote.timestamp = clock.unix_timestamp;
    vote.token_amount = token_amount;
    vote.bump = ctx.bumps.vote;

    // Update entry's vote count
    let entry = &mut ctx.accounts.entry;
    entry.vote_count = entry.vote_count.checked_add(1).unwrap();
    entry.weighted_votes = entry.weighted_votes.checked_add(token_amount).unwrap();

    // Update contest's vote count
    let contest = &mut ctx.accounts.contest;
    contest.vote_count = contest.vote_count.checked_add(1).unwrap();

    // Update treasury
    let treasury = &mut ctx.accounts.treasury;
    treasury.total_funds = treasury.total_funds.checked_add(vote_fee).unwrap();
    
    // Split between platform fee and prize pool
    let platform_fee = vote_fee.checked_mul(PLATFORM_FEE_PERCENTAGE as u64).unwrap().checked_div(100).unwrap();
    let prize_amount = vote_fee.checked_sub(platform_fee).unwrap();
    
    treasury.platform_fee = treasury.platform_fee.checked_add(platform_fee).unwrap();
    treasury.prize_pool = treasury.prize_pool.checked_add(prize_amount).unwrap();
    
    // Update contest's total prize pool
    contest.total_prize_pool = contest.total_prize_pool.checked_add(prize_amount).unwrap();

    Ok(())
}

pub fn count_votes(
    ctx: Context<CountVotes>,
) -> Result<()> {
    let contest = &mut ctx.accounts.contest;
    
    // This is a simplified implementation
    // In a real system, this would involve fetching all entries,
    // sorting them by weighted votes, and assigning ranks
    
    // For now, we just mark that winners have been decided
    contest.winners_decided = true;
    
    Ok(())
} 
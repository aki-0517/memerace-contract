use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::constants::*;
use crate::context::*;
use crate::errors::ContestError;
use crate::state::*;

pub fn initialize_platform(
    ctx: Context<InitializePlatform>,
    platform_fee_percentage: u8,
    min_entry_fee: u64,
    min_vote_fee: u64,
) -> Result<()> {
    require!(
        platform_fee_percentage <= 100,
        ContestError::InvalidFeePercentage
    );

    let platform_config = &mut ctx.accounts.platform_config;
    platform_config.authority = ctx.accounts.authority.key();
    platform_config.platform_fee_percentage = platform_fee_percentage;
    platform_config.min_entry_fee = min_entry_fee;
    platform_config.min_vote_fee = min_vote_fee;
    platform_config.bump = ctx.bumps.platform_config;

    Ok(())
}

pub fn create_contest(
    ctx: Context<CreateContest>,
    contest_id: [u8; 32],
    title: String,
    description: String,
    start_time: i64,
    end_time: i64,
    entry_fee: u64,
    vote_fee: u64,
) -> Result<()> {
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Validate time parameters
    require!(
        start_time > current_time,
        ContestError::InvalidTimestamp
    );
    require!(
        end_time > start_time,
        ContestError::InvalidTimestamp
    );
    require!(
        end_time - start_time >= MIN_CONTEST_DURATION,
        ContestError::InvalidTimestamp
    );
    require!(
        end_time - start_time <= MAX_CONTEST_DURATION,
        ContestError::InvalidTimestamp
    );

    // Validate fees against platform minimums
    let platform_config = &ctx.accounts.platform_config;
    require!(
        entry_fee >= platform_config.min_entry_fee,
        ContestError::InsufficientEntryFee
    );
    require!(
        vote_fee >= platform_config.min_vote_fee,
        ContestError::InsufficientVoteFee
    );

    // Initialize contest account
    let contest = &mut ctx.accounts.contest;
    contest.contest_id = contest_id;
    contest.authority = ctx.accounts.authority.key();
    contest.title = title;
    contest.description = description;
    contest.start_time = start_time;
    contest.end_time = end_time;
    contest.entry_fee = entry_fee;
    contest.vote_fee = vote_fee;
    contest.status = ContestStatus::Upcoming;
    contest.treasury = ctx.accounts.treasury.key();
    contest.entry_count = 0;
    contest.vote_count = 0;
    contest.total_prize_pool = 0;
    contest.winners_decided = false;
    contest.bump = ctx.bumps.contest;

    // Initialize treasury account
    let treasury = &mut ctx.accounts.treasury;
    treasury.contest = contest.key();
    treasury.authority = ctx.accounts.contest.key();
    treasury.total_funds = 0;
    treasury.platform_fee = 0;
    treasury.prize_pool = 0;
    treasury.is_distributed = false;
    treasury.bump = ctx.bumps.treasury;

    Ok(())
}

pub fn update_contest(
    ctx: Context<UpdateContest>,
    title: Option<String>,
    description: Option<String>,
    start_time: Option<i64>,
    end_time: Option<i64>,
) -> Result<()> {
    let contest = &mut ctx.accounts.contest;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Update title if provided
    if let Some(new_title) = title {
        contest.title = new_title;
    }

    // Update description if provided
    if let Some(new_description) = description {
        contest.description = new_description;
    }

    // Update start time if provided
    if let Some(new_start_time) = start_time {
        require!(
            new_start_time > current_time,
            ContestError::InvalidTimestamp
        );
        require!(
            contest.end_time > new_start_time,
            ContestError::InvalidTimestamp
        );
        require!(
            contest.end_time - new_start_time >= MIN_CONTEST_DURATION,
            ContestError::InvalidTimestamp
        );
        require!(
            contest.end_time - new_start_time <= MAX_CONTEST_DURATION,
            ContestError::InvalidTimestamp
        );
        contest.start_time = new_start_time;
    }

    // Update end time if provided
    if let Some(new_end_time) = end_time {
        let start_time = if start_time.is_some() {
            start_time.unwrap()
        } else {
            contest.start_time
        };
        require!(
            new_end_time > start_time,
            ContestError::InvalidTimestamp
        );
        require!(
            new_end_time - start_time >= MIN_CONTEST_DURATION,
            ContestError::InvalidTimestamp
        );
        require!(
            new_end_time - start_time <= MAX_CONTEST_DURATION,
            ContestError::InvalidTimestamp
        );
        contest.end_time = new_end_time;
    }

    Ok(())
}

pub fn update_contest_status(
    ctx: Context<UpdateContestStatus>,
    new_status: ContestStatus,
) -> Result<()> {
    let contest = &mut ctx.accounts.contest;
    let current_status = &contest.status;
    
    // Validate status transition
    match (current_status, &new_status) {
        // Upcoming -> Live
        (ContestStatus::Upcoming, ContestStatus::Live) => {
            let clock = Clock::get()?;
            let current_time = clock.unix_timestamp;
            
            require!(
                contest.start_time <= current_time,
                ContestError::InvalidTimestamp
            );
        },
        
        // Live -> Voting
        (ContestStatus::Live, ContestStatus::Voting) => {
            // Ensure there are enough entries
            require!(
                contest.entry_count >= MIN_ENTRIES_FOR_CONTEST,
                ContestError::MinimumEntriesNotMet
            );
        },
        
        // Voting -> Closed
        (ContestStatus::Voting, ContestStatus::Closed) => {
            let clock = Clock::get()?;
            let current_time = clock.unix_timestamp;
            
            require!(
                contest.end_time <= current_time,
                ContestError::ContestNotEnded
            );
        },
        
        // Closed -> Finalized
        (ContestStatus::Closed, ContestStatus::Finalized) => {
            // Ensure winners have been decided
            require!(
                contest.winners_decided,
                ContestError::WinnersNotDecided
            );
        },
        
        // All other transitions are invalid
        _ => return Err(ContestError::InvalidStatusTransition.into()),
    }
    
    // Update the status
    contest.status = new_status;
    
    Ok(())
}

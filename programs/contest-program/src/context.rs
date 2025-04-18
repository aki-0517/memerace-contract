use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ContestError;

#[derive(Accounts)]
#[instruction(platform_fee_percentage: u8, min_entry_fee: u64, min_vote_fee: u64)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + PlatformConfig::SIZE,
        seeds = [PLATFORM_CONFIG_SEED],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(contest_id: [u8; 32], title: String, description: String)]
pub struct CreateContest<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + ContestAccount::SIZE,
        seeds = [CONTEST_SEED, contest_id.as_ref()],
        bump
    )]
    pub contest: Account<'info, ContestAccount>,

    #[account(
        init,
        payer = authority,
        space = 8 + TreasuryAccount::SIZE,
        seeds = [TREASURY_SEED, contest.key().as_ref()],
        bump
    )]
    pub treasury: Account<'info, TreasuryAccount>,

    #[account(
        seeds = [PLATFORM_CONFIG_SEED],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateContest<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [CONTEST_SEED, contest.contest_id.as_ref()],
        bump = contest.bump,
        constraint = contest.authority == authority.key() @ ContestError::Unauthorized,
        constraint = contest.status == ContestStatus::Upcoming @ ContestError::ContestAlreadyStarted
    )]
    pub contest: Account<'info, ContestAccount>,
}

#[derive(Accounts)]
pub struct UpdateContestStatus<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [CONTEST_SEED, contest.contest_id.as_ref()],
        bump = contest.bump,
        constraint = contest.authority == authority.key() @ ContestError::Unauthorized
    )]
    pub contest: Account<'info, ContestAccount>,
}

#[derive(Accounts)]
pub struct SubmitEntry<'info> {
    #[account(mut)]
    pub participant: Signer<'info>,

    #[account(
        mut,
        seeds = [CONTEST_SEED, contest.contest_id.as_ref()],
        bump = contest.bump,
        constraint = contest.status == ContestStatus::Live @ ContestError::EntryPeriodEnded
    )]
    pub contest: Account<'info, ContestAccount>,

    #[account(
        init,
        payer = participant,
        space = 8 + EntryAccount::SIZE,
        seeds = [ENTRY_SEED, contest.key().as_ref(), participant.key().as_ref()],
        bump
    )]
    pub entry: Account<'info, EntryAccount>,

    #[account(
        mut,
        seeds = [TREASURY_SEED, contest.key().as_ref()],
        bump
    )]
    pub treasury: Account<'info, TreasuryAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateEntry<'info> {
    #[account(mut)]
    pub participant: Signer<'info>,

    #[account(
        seeds = [CONTEST_SEED, contest.contest_id.as_ref()],
        bump = contest.bump,
        constraint = contest.status == ContestStatus::Live @ ContestError::EntryPeriodEnded
    )]
    pub contest: Account<'info, ContestAccount>,

    #[account(
        mut,
        seeds = [ENTRY_SEED, contest.key().as_ref(), participant.key().as_ref()],
        bump = entry.bump,
        constraint = entry.participant == participant.key() @ ContestError::Unauthorized
    )]
    pub entry: Account<'info, EntryAccount>,
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

    #[account(
        mut,
        seeds = [CONTEST_SEED, contest.contest_id.as_ref()],
        bump = contest.bump,
        constraint = contest.status == ContestStatus::Voting @ ContestError::VotingPeriodEnded
    )]
    pub contest: Account<'info, ContestAccount>,

    #[account(
        mut,
        seeds = [ENTRY_SEED, contest.key().as_ref(), entry.participant.as_ref()],
        bump = entry.bump,
        constraint = entry.contest == contest.key()
    )]
    pub entry: Account<'info, EntryAccount>,

    #[account(
        init,
        payer = voter,
        space = 8 + VoteAccount::SIZE,
        seeds = [VOTE_SEED, voter.key().as_ref(), entry.key().as_ref()],
        bump
    )]
    pub vote: Account<'info, VoteAccount>,

    #[account(
        mut,
        seeds = [TREASURY_SEED, contest.key().as_ref()],
        bump
    )]
    pub treasury: Account<'info, TreasuryAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CountVotes<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [CONTEST_SEED, contest.contest_id.as_ref()],
        bump = contest.bump,
        constraint = contest.authority == authority.key() @ ContestError::Unauthorized,
        constraint = contest.status == ContestStatus::Closed @ ContestError::ContestNotEnded
    )]
    pub contest: Account<'info, ContestAccount>,
}

#[derive(Accounts)]
pub struct AddFundsToPrizePool<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        mut,
        seeds = [CONTEST_SEED, contest.contest_id.as_ref()],
        bump = contest.bump
    )]
    pub contest: Account<'info, ContestAccount>,

    #[account(
        mut,
        seeds = [TREASURY_SEED, contest.key().as_ref()],
        bump
    )]
    pub treasury: Account<'info, TreasuryAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DistributePrizes<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [CONTEST_SEED, contest.contest_id.as_ref()],
        bump = contest.bump,
        constraint = contest.authority == authority.key() @ ContestError::Unauthorized,
        constraint = contest.status == ContestStatus::Finalized @ ContestError::ContestNotEnded,
        constraint = contest.winners_decided @ ContestError::WinnersNotDecided
    )]
    pub contest: Account<'info, ContestAccount>,

    #[account(
        mut,
        seeds = [TREASURY_SEED, contest.key().as_ref()],
        bump,
        constraint = !treasury.is_distributed @ ContestError::PrizesAlreadyDistributed
    )]
    pub treasury: Account<'info, TreasuryAccount>,

    /// CHECK: This is the platform wallet that receives the platform fee
    #[account(mut)]
    pub platform_wallet: AccountInfo<'info>,

    /// CHECK: This is the first place winner
    #[account(mut)]
    pub first_place_recipient: AccountInfo<'info>,

    /// CHECK: This is the second place winner
    #[account(mut)]
    pub second_place_recipient: AccountInfo<'info>,

    /// CHECK: This is the third place winner
    #[account(mut)]
    pub third_place_recipient: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

use anchor_lang::prelude::*;

pub mod constants;
pub mod context;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
use context::*;

declare_id!("Contes1111111111111111111111111111111111111");

#[program]
pub mod contest_program {
    use super::*;

    // コンテスト管理
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
        contest::create_contest(ctx, contest_id, title, description, start_time, end_time, entry_fee, vote_fee)
    }

    pub fn update_contest(
        ctx: Context<UpdateContest>,
        title: Option<String>,
        description: Option<String>,
        start_time: Option<i64>,
        end_time: Option<i64>,
    ) -> Result<()> {
        contest::update_contest(ctx, title, description, start_time, end_time)
    }

    pub fn update_contest_status(
        ctx: Context<UpdateContestStatus>,
        new_status: state::ContestStatus,
    ) -> Result<()> {
        contest::update_contest_status(ctx, new_status)
    }

    // エントリー管理
    pub fn submit_entry(
        ctx: Context<SubmitEntry>,
        content_uri: String,
    ) -> Result<()> {
        entry::submit_entry(ctx, content_uri)
    }

    pub fn update_entry(
        ctx: Context<UpdateEntry>,
        content_uri: String,
    ) -> Result<()> {
        entry::update_entry(ctx, content_uri)
    }

    // 投票システム
    pub fn cast_vote(
        ctx: Context<CastVote>,
        token_amount: u64,
    ) -> Result<()> {
        voting::cast_vote(ctx, token_amount)
    }

    pub fn count_votes(
        ctx: Context<CountVotes>,
    ) -> Result<()> {
        voting::count_votes(ctx)
    }

    // 資金管理
    pub fn add_funds_to_prize_pool(
        ctx: Context<AddFundsToPrizePool>,
        amount: u64,
    ) -> Result<()> {
        treasury::add_funds_to_prize_pool(ctx, amount)
    }

    pub fn distribute_prizes(
        ctx: Context<DistributePrizes>,
    ) -> Result<()> {
        treasury::distribute_prizes(ctx)
    }

    // プラットフォーム設定
    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        platform_fee_percentage: u8,
        min_entry_fee: u64,
        min_vote_fee: u64,
    ) -> Result<()> {
        contest::initialize_platform(ctx, platform_fee_percentage, min_entry_fee, min_vote_fee)
    }
} 
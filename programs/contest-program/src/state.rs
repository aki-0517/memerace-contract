use anchor_lang::prelude::*;

// アカウントサイズの計算用定数
pub const MAX_TITLE_LENGTH: usize = 100;
pub const MAX_DESCRIPTION_LENGTH: usize = 1000;
pub const MAX_URI_LENGTH: usize = 200;

pub const PLATFORM_CONFIG_SEED: &[u8] = b"platform-config";
pub const CONTEST_SEED: &[u8] = b"contest";
pub const ENTRY_SEED: &[u8] = b"entry";
pub const VOTE_SEED: &[u8] = b"vote";
pub const TREASURY_SEED: &[u8] = b"treasury";

// 賞金分配率
pub const FIRST_PLACE_PERCENTAGE: u8 = 50;
pub const SECOND_PLACE_PERCENTAGE: u8 = 30;
pub const THIRD_PLACE_PERCENTAGE: u8 = 20;

#[account]
pub struct PlatformConfig {
    pub authority: Pubkey,              // プラットフォーム管理者のアドレス
    pub platform_fee_percentage: u8,    // プラットフォームが徴収する手数料割合（0-100）
    pub min_entry_fee: u64,             // 最小エントリー料金（lamports）
    pub min_vote_fee: u64,              // 最小投票料金（lamports）
    pub bump: u8,                       // PDA bump seed
}

impl PlatformConfig {
    pub const SIZE: usize = 32 + 1 + 8 + 8 + 1;
}

#[account]
pub struct ContestAccount {
    pub contest_id: [u8; 32],           // コンテストの一意のID
    pub authority: Pubkey,              // コンテスト作成者のアドレス
    pub title: String,                  // コンテストのタイトル
    pub description: String,            // コンテストの説明
    pub start_time: i64,                // 開始タイムスタンプ
    pub end_time: i64,                  // 終了タイムスタンプ
    pub entry_fee: u64,                 // エントリー料金（lamports）
    pub vote_fee: u64,                  // 投票料金（lamports）
    pub status: ContestStatus,          // コンテストの現在のステータス
    pub treasury: Pubkey,               // 賞金プール用トレジャリーアカウント
    pub entry_count: u32,               // 現在のエントリー数
    pub vote_count: u32,                // 現在の投票数
    pub total_prize_pool: u64,          // 総賞金プール（lamports）
    pub winners_decided: bool,          // 勝者が決定されたかどうか
    pub bump: u8,                       // PDA bump seed
}

impl ContestAccount {
    pub const SIZE: usize = 32 + 32 + MAX_TITLE_LENGTH + MAX_DESCRIPTION_LENGTH + 8 + 8 + 8 + 8 + 1 + 32 + 4 + 4 + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ContestStatus {
    Upcoming,    // まだ開始していない
    Live,        // 現在進行中
    Voting,      // エントリー終了、投票中
    Closed,      // 投票終了、集計中
    Finalized,   // 結果確定、賞金分配済み
}

#[account]
pub struct EntryAccount {
    pub contest: Pubkey,                // 関連するコンテストアカウント
    pub participant: Pubkey,            // エントリーしたユーザーのアドレス
    pub content_uri: String,            // エントリーコンテンツへのURIリンク
    pub timestamp: i64,                 // エントリー時のタイムスタンプ
    pub vote_count: u32,                // このエントリーへの投票数
    pub weighted_votes: u64,            // トークン加重された投票値
    pub rank: Option<u8>,               // 最終ランキング（Noneは未決定）
    pub bump: u8,                       // PDA bump seed
}

impl EntryAccount {
    pub const SIZE: usize = 32 + 32 + MAX_URI_LENGTH + 8 + 4 + 8 + (1 + 1) + 1;
}

#[account]
pub struct VoteAccount {
    pub voter: Pubkey,                  // 投票者のアドレス
    pub contest: Pubkey,                // 投票対象のコンテスト
    pub entry: Pubkey,                  // 投票対象のエントリー
    pub timestamp: i64,                 // 投票時のタイムスタンプ
    pub token_amount: u64,              // 投票に使用したトークン量
    pub bump: u8,                       // PDA bump seed
}

impl VoteAccount {
    pub const SIZE: usize = 32 + 32 + 32 + 8 + 8 + 1;
}

#[account]
pub struct TreasuryAccount {
    pub contest: Pubkey,                // 関連するコンテスト
    pub authority: Pubkey,              // トレジャリー管理者（コンテストプログラム）
    pub total_funds: u64,               // 保管されている総資金（lamports）
    pub platform_fee: u64,              // プラットフォーム手数料分（lamports）
    pub prize_pool: u64,                // 賞金プール分（lamports）
    pub is_distributed: bool,           // 賞金が分配済みかどうか
    pub bump: u8,                       // PDA bump seed
}

impl TreasuryAccount {
    pub const SIZE: usize = 32 + 32 + 8 + 8 + 8 + 1 + 1;
} 
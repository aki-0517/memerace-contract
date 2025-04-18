use anchor_lang::prelude::*;

#[error_code]
pub enum ContestError {
    #[msg("コンテストはすでに開始されています")]
    ContestAlreadyStarted,

    #[msg("無効なコンテストステータス遷移")]
    InvalidStatusTransition,

    #[msg("エントリー期間が終了しています")]
    EntryPeriodEnded,

    #[msg("投票期間が終了しています")]
    VotingPeriodEnded,

    #[msg("エントリー料金が不足しています")]
    InsufficientEntryFee,

    #[msg("投票料金が不足しています")]
    InsufficientVoteFee,

    #[msg("このコンテストにはすでに投票しています")]
    AlreadyVoted,

    #[msg("賞金はすでに分配されています")]
    PrizesAlreadyDistributed,

    #[msg("権限がありません")]
    Unauthorized,

    #[msg("無効なタイムスタンプ")]
    InvalidTimestamp,

    #[msg("プラットフォーム手数料は0-100の範囲内である必要があります")]
    InvalidFeePercentage,

    #[msg("勝者はまだ決定されていません")]
    WinnersNotDecided,

    #[msg("コンテストはまだ終了していません")]
    ContestNotEnded,

    #[msg("ランキングは1-3である必要があります")]
    InvalidRanking,

    #[msg("十分なエントリーがありません")]
    InsufficientEntries,

    #[msg("最小エントリー数に達していません")]
    MinimumEntriesNotMet,
} 
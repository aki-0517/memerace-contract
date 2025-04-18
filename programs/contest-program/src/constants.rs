// Platform constants
pub const PLATFORM_FEE_PERCENTAGE: u8 = 10;  // 10% platform fee

// Time constraints
pub const MIN_CONTEST_DURATION: i64 = 60 * 60 * 24;  // 1 day in seconds
pub const MAX_CONTEST_DURATION: i64 = 60 * 60 * 24 * 30;  // 30 days in seconds

// Contest requirements
pub const MIN_ENTRIES_FOR_CONTEST: u32 = 3;  // Minimum entries required for a valid contest

// Prize distribution percentages - also defined in state.rs
pub const FIRST_PLACE_PERCENTAGE: u8 = 50;   // 50% to first place
pub const SECOND_PLACE_PERCENTAGE: u8 = 30;  // 30% to second place
pub const THIRD_PLACE_PERCENTAGE: u8 = 20;   // 20% to third place

// Seeds
pub const TREASURY_SEED: &[u8] = b"treasury";

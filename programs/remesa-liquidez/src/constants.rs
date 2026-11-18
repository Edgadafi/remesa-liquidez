/// Protocol fee charged on every successful `validate_cashout`, expressed in
/// basis points (1 bp = 0.01%). 25 bps = 0.25%.
pub const FEE_BPS: u64 = 25;

/// Denominator for basis-point math.
pub const BPS_DENOMINATOR: u64 = 10_000;

/// Shortest pickup window a deployment build accepts. One hour.
/// The `test-short-expiry` feature lowers this to 1 second for the Anchor
/// suite. A deploy build must not enable that feature.
#[cfg(not(feature = "test-short-expiry"))]
pub const MIN_EXPIRY_SECONDS: i64 = 3_600;

/// Anchor suite only. One second, so tests can wait out expiry on the
/// validator clock. Not for a deploy build.
#[cfg(feature = "test-short-expiry")]
pub const MIN_EXPIRY_SECONDS: i64 = 1;

/// Longest pickup window `initialize_reservation` accepts. 30 days.
pub const MAX_EXPIRY_SECONDS: i64 = 30 * 24 * 60 * 60;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn min_expiry_matches_the_build() {
        #[cfg(not(feature = "test-short-expiry"))]
        assert_eq!(MIN_EXPIRY_SECONDS, 3_600);
        #[cfg(feature = "test-short-expiry")]
        assert_eq!(MIN_EXPIRY_SECONDS, 1);
    }
}

/// Seed for the treasury authority PDA. The PDA at `[TREASURY_AUTHORITY_SEED]`
/// owns every per-mint treasury vault and is the only entity that can move
/// the accumulated fees out (via a future `withdraw_treasury` instruction).
pub const TREASURY_AUTHORITY_SEED: &[u8] = b"treasury";

/// Seed for the per-mint treasury token account PDA. One token account per
/// SPL mint, derived as `[TREASURY_VAULT_SEED, mint.key().as_ref()]`. The
/// account is initialized lazily on the first `validate_cashout` for that
/// mint via `init_if_needed`.
pub const TREASURY_VAULT_SEED: &[u8] = b"treasury_vault";

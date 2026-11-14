/**
 * Values of `sm-mock-admin-stats` (development and e2e): `few` answers a shelf with 2 real users
 * (everything "not enough users yet"), `fails` makes the call fail, `slow` never answers (the
 * loading state). Unset: a full fixture with realistic numbers and some hidden groups.
 */
export const MOCK_ADMIN_STATS_MODE = {
  Few: 'few',
  Fails: 'fails',
  Slow: 'slow',
} as const;

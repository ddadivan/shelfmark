/** Size of the API's `pg` pool: the default, and the range `DATABASE_POOL_MAX` may set. */
export const DATABASE_POOL_LIMIT = {
  Default: 5,
  Min: 1,
  Max: 20,
} as const;

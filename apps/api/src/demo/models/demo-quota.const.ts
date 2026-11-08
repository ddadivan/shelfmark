const HOUR_MS = 60 * 60 * 1000;

/**
 * Abuse limits of demo creation, enforced in Postgres (not in the per-instance throttler, ADR 0031):
 * `PerNetwork` is the same for an IPv6 /48 network (several /64s).
 * `PerSource` demo users per hashed client IP within `WindowMs`, and `ActiveCap` demo users alive at
 * once (the sandbox is full beyond it, which answers 503).
 */
export const DEMO_QUOTA = {
  PerSource: 5,
  PerNetwork: 20,
  WindowMs: HOUR_MS,
  ActiveCap: 1000,
} as const;

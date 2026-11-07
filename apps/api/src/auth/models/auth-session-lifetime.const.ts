const SECONDS_PER_DAY = 24 * 60 * 60;

/** Sessions last 7 days and slide forward at most once a day (author decision C). */
export const AUTH_SESSION_LIFETIME = {
  ExpiresInSeconds: 7 * SECONDS_PER_DAY,
  UpdateAgeSeconds: SECONDS_PER_DAY,
} as const;

/**
 * Better Auth endpoints that stay off: Shelfmark signs in with Google and GitHub only and uses
 * `/sign-in/social`, `/callback/:id`, `/get-session` and `/sign-out`. Everything else returns 404
 * (`isDemo` and the profile can never be changed through the auth router). Paths are matched
 * exactly, relative to the base path.
 */
export const DISABLED_AUTH_PATHS: readonly string[] = [
  '/sign-up/email',
  '/sign-in/email',
  '/update-user',
  '/update-session',
  '/delete-user',
  '/delete-user/callback',
  '/change-email',
  '/change-password',
  '/set-password',
  '/request-password-reset',
  '/reset-password',
  '/verify-email',
  '/verify-password',
  '/send-verification-email',
  '/list-sessions',
  '/revoke-session',
  '/revoke-sessions',
  '/revoke-other-sessions',
  '/link-social',
  '/unlink-account',
  '/list-accounts',
  '/account-info',
  '/refresh-token',
  '/get-access-token',
  '/ok',
  '/error',
];

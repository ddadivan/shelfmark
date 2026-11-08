/** Environment variable names set by Vercel that `readAuthConfig` reads on preview deployments. */
export const VERCEL_ENV_VAR = {
  Environment: 'VERCEL_ENV',
  Url: 'VERCEL_URL',
  BranchUrl: 'VERCEL_BRANCH_URL',
} as const;

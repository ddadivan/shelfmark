/** Environment variable names read by `readAuthConfig` (Better Auth's conventional names). */
export const AUTH_ENV = {
  Secret: 'BETTER_AUTH_SECRET',
  Url: 'BETTER_AUTH_URL',
  TrustedOrigins: 'BETTER_AUTH_TRUSTED_ORIGINS',
  GoogleClientId: 'GOOGLE_CLIENT_ID',
  GoogleClientSecret: 'GOOGLE_CLIENT_SECRET',
  GitHubClientId: 'GITHUB_CLIENT_ID',
  GitHubClientSecret: 'GITHUB_CLIENT_SECRET',
} as const;

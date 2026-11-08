/** Better Auth `?error=` codes the sign-in page explains (the rest show a generic notice). */
export const SIGN_IN_ERROR = {
  EmailNotFound: 'email_not_found',
  AccessDenied: 'access_denied',
  StateMismatch: 'state_mismatch',
  PleaseRestart: 'please_restart_the_process',
  AccountNotLinked: 'account_not_linked',
  UnableToLinkAccount: 'unable_to_link_account',
} as const;

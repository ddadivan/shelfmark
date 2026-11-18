/** The account fields the AI entitlements are computed from (never written from the environment). */
export interface AiAccount {
  email: string;
  emailVerified: boolean;
  isDemo: boolean;
  plan: string;
  aiPack: boolean;
}

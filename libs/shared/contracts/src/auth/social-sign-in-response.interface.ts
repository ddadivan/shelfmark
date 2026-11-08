/** Response of `POST /api/auth/sign-in/social`: the provider authorize URL to navigate to. */
export interface SocialSignInResponse {
  url: string;
  redirect: boolean;
}

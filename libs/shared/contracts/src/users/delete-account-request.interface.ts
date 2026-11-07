/**
 * Body of `DELETE /api/me`. `email` must equal the signed-in user's email (case-insensitive).
 * This is an accidental-deletion guard only, not re-authentication: sign-in is OAuth-only, so
 * there is no password to re-enter. Cross-site request forgery is covered separately by
 * SameSite=Lax cookies, the JSON-only body and the absence of CORS (no preflight is ever granted).
 */
export interface DeleteAccountRequest {
  email: string;
}

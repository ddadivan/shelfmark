/**
 * Body of `DELETE /api/me`. `email` must equal the signed-in user's email (case-insensitive): the
 * typed confirmation guards against accidental and cross-site triggered deletion.
 */
export interface DeleteAccountRequest {
  email: string;
}

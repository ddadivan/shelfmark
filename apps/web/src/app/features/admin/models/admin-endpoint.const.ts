/**
 * Admin routes the web calls. Defined here until `libs/shared/contracts/src/admin/` lands with
 * the API (then this file is replaced by the contract's constant).
 */
export const ADMIN_ENDPOINT = {
  /** `GET`: 200 `{ admin: true }` for the author, 404 for everyone else. */
  Status: '/api/admin/status',
  /** `GET` lists every message (`AdminFeedbackListResponse`), `PATCH <id>` updates one. */
  Feedback: '/api/admin/feedback',
} as const;

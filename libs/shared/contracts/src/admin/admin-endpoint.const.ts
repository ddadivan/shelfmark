/** Admin routes (the author only; everyone else gets 404). Item routes append `/<id>` and `/<id>/screenshot`. */
export const ADMIN_ENDPOINT = {
  Status: '/api/admin/status',
  Feedback: '/api/admin/feedback',
} as const;

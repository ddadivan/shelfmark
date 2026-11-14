/** Admin routes (the author only; everyone else gets 404). Item routes append `/<id>` and `/<id>/screenshots/<position>`. */
export const ADMIN_ENDPOINT = {
  Status: '/api/admin/status',
  Feedback: '/api/admin/feedback',
} as const;

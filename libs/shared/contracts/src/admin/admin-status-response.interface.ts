/** `GET /api/admin/status`: 200 for an admin, 404 for everyone else. */
export interface AdminStatusResponse {
  admin: true;
}

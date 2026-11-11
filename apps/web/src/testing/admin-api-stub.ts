import type { AdminApi } from '../app/features/admin/models/admin-api.interface';

/** An `AdminApi` for specs that only render the shell or the You list: `admin` is the status answer. */
export function adminApiStub(admin = false): AdminApi {
  return {
    isAdmin: vi.fn(() => Promise.resolve(admin)),
    listFeedback: vi.fn(() => Promise.resolve({ items: [], nextCursor: null })),
    updateFeedback: vi.fn(() => Promise.reject(new Error('Not stubbed'))),
  };
}

import type { ADMIN_PATH } from './admin-path.const';

export type AdminPath = (typeof ADMIN_PATH)[keyof typeof ADMIN_PATH];

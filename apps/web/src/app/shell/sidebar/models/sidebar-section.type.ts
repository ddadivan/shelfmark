import type { SIDEBAR_SECTION } from './sidebar-section.const';

export type SidebarSection = (typeof SIDEBAR_SECTION)[keyof typeof SIDEBAR_SECTION];

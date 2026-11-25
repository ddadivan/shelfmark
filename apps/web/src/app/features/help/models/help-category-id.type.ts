import type { HELP_CATEGORY } from './help-category-id.const';

export type HelpCategoryId = (typeof HELP_CATEGORY)[keyof typeof HELP_CATEGORY];

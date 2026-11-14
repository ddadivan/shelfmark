import type { CHANGELOG_ITEM_KIND } from './changelog-item-kind.const';

export type ChangelogItemKind = (typeof CHANGELOG_ITEM_KIND)[keyof typeof CHANGELOG_ITEM_KIND];

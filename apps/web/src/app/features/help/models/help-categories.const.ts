import { HELP_CATEGORY } from './help-category-id.const';
import type { HelpCategory } from './help-category.interface';

/** The topics in the order of the help home (Shelf 17-help); texts under `help.categories.<id>`. */
export const HELP_CATEGORIES: readonly HelpCategory[] = [
  {
    id: HELP_CATEGORY.GettingStarted,
    icon: 'add',
    articles: ['save-first-link', 'install-extension', 'import-bookmarks', 'use-on-phone'],
  },
  {
    id: HELP_CATEGORY.Organise,
    icon: 'folder',
    articles: ['folders', 'tags', 'rules', 'favorites-pins', 'trash'],
  },
  {
    id: HELP_CATEGORY.Find,
    icon: 'search',
    articles: ['search', 'search-by-meaning', 'saved-views', 'side-by-side'],
  },
  {
    id: HELP_CATEGORY.ComeBack,
    icon: 'clock',
    articles: ['today', 'reminders', 'recently-opened'],
  },
  {
    id: HELP_CATEGORY.Read,
    icon: 'book',
    articles: ['link-preview', 'reader'],
  },
  {
    id: HELP_CATEGORY.Ai,
    icon: 'spark',
    articles: ['turn-on-ai', 'ai-suggestions', 'ask-your-shelf', 'ai-privacy'],
  },
  {
    id: HELP_CATEGORY.Account,
    icon: 'user',
    articles: ['export', 'themes', 'keyboard-shortcuts', 'notifications', 'delete-account'],
  },
];

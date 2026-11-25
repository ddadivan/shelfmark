import { HELP_BLOCK } from './help-block-kind.const';
import { HELP_CATEGORY } from './help-category-id.const';
import type { HelpArticle } from './help-article.interface';

/** Every help article in reading order (previous / next follow it); texts are in `help.articles.<id>`. */
export const HELP_ARTICLES: readonly HelpArticle[] = [
  {
    id: 'save-first-link',
    category: HELP_CATEGORY.GettingStarted,
    minutes: 2,
    updated: '2026-11-20',
    related: ['install-extension', 'import-bookmarks', 'tags', 'folders'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'install-extension',
    category: HELP_CATEGORY.GettingStarted,
    minutes: 2,
    updated: '2026-11-20',
    related: ['save-first-link', 'import-bookmarks', 'use-on-phone', 'folders'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'import-bookmarks',
    category: HELP_CATEGORY.GettingStarted,
    minutes: 2,
    updated: '2026-11-20',
    related: ['save-first-link', 'install-extension', 'use-on-phone', 'folders'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'use-on-phone',
    category: HELP_CATEGORY.GettingStarted,
    minutes: 2,
    updated: '2026-11-20',
    related: ['save-first-link', 'install-extension', 'import-bookmarks', 'folders'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'folders',
    category: HELP_CATEGORY.Organise,
    minutes: 2,
    updated: '2026-11-20',
    related: ['tags', 'rules', 'favorites-pins', 'search'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'tags',
    category: HELP_CATEGORY.Organise,
    minutes: 2,
    updated: '2026-11-20',
    related: ['folders', 'rules', 'favorites-pins', 'search'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'rules',
    category: HELP_CATEGORY.Organise,
    minutes: 3,
    updated: '2026-11-20',
    related: ['folders', 'ai-suggestions', 'import-bookmarks', 'tags'],
    sections: [
      {
        id: 'create',
        blocks: [
          {
            kind: HELP_BLOCK.Steps,
            keys: ['sections.create.steps.0', 'sections.create.steps.1', 'sections.create.steps.2'],
          },
          { kind: HELP_BLOCK.RuleMock, keys: [] },
          { kind: HELP_BLOCK.Tip, keys: ['sections.create.tip'] },
        ],
      },
      { id: 'existing', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.existing.b0'] }] },
      { id: 'offer', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.offer.b0'] }] },
      { id: 'limits', blocks: [{ kind: HELP_BLOCK.Warn, keys: ['sections.limits.warn'] }] },
    ],
  },
  {
    id: 'favorites-pins',
    category: HELP_CATEGORY.Organise,
    minutes: 2,
    updated: '2026-11-20',
    related: ['folders', 'tags', 'rules', 'search'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'trash',
    category: HELP_CATEGORY.Organise,
    minutes: 2,
    updated: '2026-11-20',
    related: ['folders', 'tags', 'rules', 'search'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'search',
    category: HELP_CATEGORY.Find,
    minutes: 2,
    updated: '2026-11-20',
    related: ['search-by-meaning', 'saved-views', 'keyboard-shortcuts', 'tags'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'search-by-meaning',
    category: HELP_CATEGORY.Find,
    minutes: 2,
    updated: '2026-11-20',
    related: ['search', 'saved-views', 'side-by-side', 'today'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'saved-views',
    category: HELP_CATEGORY.Find,
    minutes: 2,
    updated: '2026-11-20',
    related: ['search', 'search-by-meaning', 'side-by-side', 'today'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'side-by-side',
    category: HELP_CATEGORY.Find,
    minutes: 2,
    updated: '2026-11-20',
    related: ['search', 'search-by-meaning', 'saved-views', 'today'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'today',
    category: HELP_CATEGORY.ComeBack,
    minutes: 2,
    updated: '2026-11-20',
    related: ['reminders', 'recently-opened', 'link-preview', 'reader'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'reminders',
    category: HELP_CATEGORY.ComeBack,
    minutes: 2,
    updated: '2026-11-20',
    related: ['today', 'notifications', 'keyboard-shortcuts', 'recently-opened'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'recently-opened',
    category: HELP_CATEGORY.ComeBack,
    minutes: 2,
    updated: '2026-11-20',
    related: ['today', 'reminders', 'link-preview', 'reader'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'link-preview',
    category: HELP_CATEGORY.Read,
    minutes: 2,
    updated: '2026-11-20',
    related: ['reader', 'turn-on-ai', 'ai-suggestions', 'ask-your-shelf'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'reader',
    category: HELP_CATEGORY.Read,
    minutes: 2,
    updated: '2026-11-20',
    related: ['link-preview', 'turn-on-ai', 'ai-suggestions', 'ask-your-shelf'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'turn-on-ai',
    category: HELP_CATEGORY.Ai,
    minutes: 2,
    updated: '2026-11-20',
    related: ['ai-suggestions', 'ai-privacy', 'ask-your-shelf', 'search-by-meaning'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'ai-suggestions',
    category: HELP_CATEGORY.Ai,
    minutes: 2,
    updated: '2026-11-20',
    related: ['turn-on-ai', 'ask-your-shelf', 'ai-privacy', 'export'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'ask-your-shelf',
    category: HELP_CATEGORY.Ai,
    minutes: 2,
    updated: '2026-11-20',
    related: ['turn-on-ai', 'ai-suggestions', 'ai-privacy', 'export'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'ai-privacy',
    category: HELP_CATEGORY.Ai,
    minutes: 2,
    updated: '2026-11-20',
    related: ['turn-on-ai', 'ai-suggestions', 'ask-your-shelf', 'export'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'export',
    category: HELP_CATEGORY.Account,
    minutes: 2,
    updated: '2026-11-20',
    related: ['import-bookmarks', 'delete-account', 'ai-privacy', 'trash'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'themes',
    category: HELP_CATEGORY.Account,
    minutes: 2,
    updated: '2026-11-20',
    related: ['export', 'keyboard-shortcuts', 'notifications', 'save-first-link'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'keyboard-shortcuts',
    category: HELP_CATEGORY.Account,
    minutes: 2,
    updated: '2026-11-20',
    related: ['export', 'themes', 'notifications', 'save-first-link'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'notifications',
    category: HELP_CATEGORY.Account,
    minutes: 2,
    updated: '2026-11-20',
    related: ['export', 'themes', 'keyboard-shortcuts', 'save-first-link'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
  {
    id: 'delete-account',
    category: HELP_CATEGORY.Account,
    minutes: 2,
    updated: '2026-11-20',
    related: ['export', 'themes', 'keyboard-shortcuts', 'save-first-link'],
    sections: [
      { id: 's1', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s1.b0'] }] },
      { id: 's2', blocks: [{ kind: HELP_BLOCK.Text, keys: ['sections.s2.b0'] }] },
    ],
  },
];

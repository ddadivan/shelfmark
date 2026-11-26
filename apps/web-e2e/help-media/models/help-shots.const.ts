import {
  askChatScreen,
  importScreen,
  searchScreen,
  settingsScreen,
  todayScreen,
} from '../support/help-scenes';
import type { HelpShot } from './help-shot.interface';

/** The screenshots of the help articles (`HELP_BLOCK.Image` in `help-articles.const.ts`). */
export const HELP_SHOTS: readonly HelpShot[] = [
  {
    slug: 'settings-appearance',
    article: 'themes',
    prepare: (page) => settingsScreen(page, 'appearance', 'Appearance'),
  },
  {
    slug: 'settings-ai',
    article: 'turn-on-ai',
    prepare: (page) => settingsScreen(page, 'ai', 'AI'),
  },
  { slug: 'import-page', article: 'import-bookmarks', prepare: importScreen },
  { slug: 'today', article: 'today', prepare: todayScreen },
  { slug: 'ask-chat', article: 'ask-your-shelf', prepare: askChatScreen },
  {
    slug: 'settings-shortcuts',
    article: 'keyboard-shortcuts',
    prepare: (page) => settingsScreen(page, 'shortcuts', 'Keyboard shortcuts'),
  },
  { slug: 'search-results', article: 'search', prepare: searchScreen },
];

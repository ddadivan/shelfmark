import type { IconName } from '@shelfmark/ui';

/**
 * A "Go there" action of an article: a place in the app the article describes. `route` is an app
 * path built from `APP_PATH` and `SETTINGS_PATH` (see `HELP_LINK`); a reader who is signed out is
 * sent to sign-in by the route guard and comes back to it afterwards.
 */
export interface HelpArticleLink {
  /** Absolute app path, e.g. `/settings/appearance`. */
  readonly route: string;
  /** Translation key of the label, under `help.links.`. */
  readonly labelKey: string;
  readonly icon: IconName;
}

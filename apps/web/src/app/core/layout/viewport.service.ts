import { Service, computed } from '@angular/core';
import { COMPACT_MEDIA_QUERY, PHONE_MEDIA_QUERY, mediaMatch } from '@shelfmark/ui';

/** From 80em a desktop has room for the full set of sign-in cards; narrower ones show fewer. */
const BELOW_WIDE_DESKTOP_QUERY = '(width < 80em)';

/**
 * The layout breakpoint the viewport is in, for the few places where CSS alone is not enough:
 * what is not shown should not be rendered (and fetch its data), and touch controls use the touch
 * sizes. Two levels (#316): `compact` (below 64em, phones and iPad portrait) is the mobile shell
 * with the tab bar and the mobile pages (Library, Tags, You); `phone` (below 40em) is only for
 * small-screen details (bottom sheets, one column, stacked buttons). Without `matchMedia` (tests,
 * server) it assumes a desktop.
 */
@Service()
export class ViewportService {
  /** Below 40em (the Sass `phone` mixin): small-screen details. */
  readonly phone = mediaMatch(PHONE_MEDIA_QUERY);
  /** Below 64em (the Sass `compact` mixin): the mobile shell, tab bar instead of the sidebar. */
  readonly compact = mediaMatch(COMPACT_MEDIA_QUERY);
  /** From 64em: the sidebar layout. */
  readonly desktop = computed(() => !this.compact());
  private readonly belowWideDesktop = mediaMatch(BELOW_WIDE_DESKTOP_QUERY);
  /** From 80em. */
  readonly wideDesktop = computed(() => !this.belowWideDesktop());
}

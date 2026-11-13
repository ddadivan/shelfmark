import { Service, computed } from '@angular/core';
import { COMPACT_MEDIA_QUERY, PHONE_MEDIA_QUERY, mediaMatch } from '@shelfmark/ui';

/** The Sass `wide` mixin starts at 80em. */
const BELOW_WIDE_QUERY = '(width < 80em)';

/** 160em = 2560 CSS pixels: 4K and 5K screens. */
const HUGE_QUERY = '(width >= 160em)';

/**
 * The layout breakpoint the viewport is in, for the few places where CSS alone is not enough:
 * what is not shown should not be rendered (and fetch its data), and touch controls use the touch
 * sizes. Three levels (#316, #329): `compact` (below 64em, phones and iPad portrait) is the mobile shell
 * with the tab bar and the mobile pages (Library, Tags, You); `phone` (below 40em) is only for
 * small-screen details (bottom sheets, one column, stacked buttons); `wide` (from 80em) is the inline search. Without `matchMedia` (tests,
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
  private readonly belowWide = mediaMatch(BELOW_WIDE_QUERY);
  /**
   * From 80em (the Sass `wide` mixin): the header search is a real field with a results panel
   * (#329) and the sign-in screen has room for the full set of cards. From 64em to 80em the
   * header has a "Search" button that opens the dialog.
   */
  readonly wide = computed(() => !this.belowWide());
  /**
   * From 160em (2560px, 4K and 5K screens, #350): the sign-in lanes are large enough for eleven
   * cards a side. Without `matchMedia` it is off.
   */
  readonly huge = mediaMatch(HUGE_QUERY);
}

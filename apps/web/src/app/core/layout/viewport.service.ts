import { Service, computed } from '@angular/core';
import { PHONE_MEDIA_QUERY, mediaMatch } from '@shelfmark/ui';

/** Same breakpoint as the Sass mixin `desktop` (ADR 0015); the phone one is `PHONE_MEDIA_QUERY`. */
const BELOW_DESKTOP_QUERY = '(width < 64em)';

/**
 * The layout breakpoint the viewport is in, for the few places where CSS alone is not enough:
 * what is not shown should not be rendered (and fetch its data), and phone controls use the
 * touch sizes. Without `matchMedia` (tests, server) it assumes a desktop.
 */
@Service()
export class ViewportService {
  /** Below the phone breakpoint (40em): the sidebar is a drawer. */
  readonly phone = mediaMatch(PHONE_MEDIA_QUERY);
  private readonly belowDesktop = mediaMatch(BELOW_DESKTOP_QUERY);
  /** From 64em: the recent panel has room. */
  readonly desktop = computed(() => !this.belowDesktop());
}

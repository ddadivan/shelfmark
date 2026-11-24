import { KEYBOARD_KEY } from '@shelfmark/ui';
import { isTypingTarget } from '../../links/utils/is-typing-target';
import { isLetter } from '../../links/utils/link-select-keys';
import { PREVIEW_FULL_SCREEN_SHORTCUT } from '../models/preview-full-screen-shortcut.const';
import { PREVIEW_KEY } from '../models/preview-key.const';
import type { PreviewKey } from '../models/preview-key.type';

/** Widgets that own the arrows themselves. */
const ARROW_OWNERS =
  '.cdk-overlay-container, [role="tree"], [role="radiogroup"], [role="tablist"], [role="slider"], [role="separator"], [role="grid"]';
/** Where ↵ means "open the previewed link in a new tab": a feed link or nothing in particular. */
const ENTER_TARGETS = '.ui-card__link, .ui-list-item__link';

/**
 * The preview meaning of a key on the library page (#553): ↑ / ↓ the previous or next link, ↵ the
 * link in a new tab (on a feed link or with nothing focused), Esc closes (the caller leaves full
 * screen first), F turns full screen on and off. Never in a field, menu, dialog or overlay, with
 * a modifier, or once someone else handled the key.
 */
export function previewKey(event: KeyboardEvent): PreviewKey | null {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    isTypingTarget(event.target)
  ) {
    return null;
  }
  const target = event.target instanceof Element ? event.target : null;
  switch (event.key) {
    case KEYBOARD_KEY.ArrowUp:
    case KEYBOARD_KEY.ArrowDown:
      if (target?.closest(ARROW_OWNERS)) {
        return null;
      }
      return event.key === KEYBOARD_KEY.ArrowUp ? PREVIEW_KEY.Previous : PREVIEW_KEY.Next;
    case KEYBOARD_KEY.Enter: {
      const plain =
        target === null || target === target.ownerDocument.body || target.matches(ENTER_TARGETS);
      return plain ? PREVIEW_KEY.OpenInNewTab : null;
    }
    case KEYBOARD_KEY.Escape:
      return target?.closest('.cdk-overlay-container') ? null : PREVIEW_KEY.Close;
    default:
      if (target?.closest('.cdk-overlay-container')) {
        return null;
      }
      return isLetter(event, PREVIEW_FULL_SCREEN_SHORTCUT.Key, PREVIEW_FULL_SCREEN_SHORTCUT.Code)
        ? PREVIEW_KEY.FullScreen
        : null;
  }
}

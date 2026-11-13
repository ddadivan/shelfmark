import { KEYBOARD_KEY } from '@shelfmark/ui';
import { PAGE_SCROLL_KEY } from '../models/page-scroll-key.const';

/** Share of the visible height that Page Down and Space move (the browsers keep a little overlap). */
const PAGE_SHARE = 0.9;
/** Pixels of one arrow key press (what browsers scroll by a line step). */
const LINE_PX = 40;

/**
 * The scroll distance a key asks for in a scroll area, `Infinity` / `-Infinity` for its end and
 * start, or `null` when the key does nothing here. Mirrors what the browser does for the page:
 * Space and Page Down, Shift+Space and Page Up, Home, End, the arrows.
 */
export function feedScrollDelta(event: KeyboardEvent, visibleHeight: number): number | null {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return null;
  }
  const page = visibleHeight * PAGE_SHARE;
  switch (event.key) {
    case PAGE_SCROLL_KEY.PageDown:
      return page;
    case PAGE_SCROLL_KEY.PageUp:
      return -page;
    case KEYBOARD_KEY.Space:
      return event.shiftKey ? -page : page;
    case KEYBOARD_KEY.Home:
      return -Infinity;
    case KEYBOARD_KEY.End:
      return Infinity;
    case KEYBOARD_KEY.ArrowDown:
      return LINE_PX;
    case KEYBOARD_KEY.ArrowUp:
      return -LINE_PX;
    default:
      return null;
  }
}

/** The feed area when it scrolls (desktop), else its nearest scrolling ancestor (the shell's main column). */
function scrollingArea(area: HTMLElement): HTMLElement | null {
  for (let element: HTMLElement | null = area; element; element = element.parentElement) {
    const overflow = getComputedStyle(element).overflowY;
    if (overflow === 'auto' || overflow === 'scroll') {
      return element;
    }
  }
  return null;
}

/**
 * The page never scrolls in the app shell (#352): the feed area does on desktop, the shell's main
 * column in the mobile shell. With no element focused the keys would do nothing, so that area
 * scrolls for them, as the page used to. Does nothing while an element has focus (it handles its
 * own keys, and the browser scrolls the area around a focused card), or when nothing scrolls.
 * Returns whether it scrolled.
 */
export function scrollFeedForKey(feed: HTMLElement, event: KeyboardEvent): boolean {
  const doc = feed.ownerDocument;
  const area = scrollingArea(feed);
  if (event.defaultPrevented || (doc.activeElement && doc.activeElement !== doc.body) || !area) {
    return false;
  }
  const delta = feedScrollDelta(event, area.clientHeight);
  if (delta === null) {
    return false;
  }
  event.preventDefault();
  area.scrollTop = Number.isFinite(delta)
    ? area.scrollTop + delta
    : delta > 0
      ? area.scrollHeight
      : 0;
  return true;
}

import { afterNextRender, type Injector } from '@angular/core';
import { ReducedMotion } from '@shelfmark/ui';

/** Turns the per-item `view-transition-name`s on for the duration of one transition. */
export interface ViewTransitionNames {
  on(): void;
  off(): void;
  /**
   * The scroll area the named items live in. Only items that show in it take part: the snapshots
   * are drawn above the whole page, so an item scrolled out of the area would otherwise fly over
   * the toolbar and the rest of the page (author, Nov 27).
   */
  clip?: () => Element | null;
}

/**
 * Whether motion should be left out: the device or the Animations setting asks for less
 * (`ReducedMotion`); without `matchMedia` (jsdom, odd embeds) assume so.
 */
export function prefersReducedMotion(doc: Document, injector: Injector): boolean {
  return typeof doc.defaultView?.matchMedia !== 'function' || injector.get(ReducedMotion).reduced();
}

/**
 * Drops the `view-transition-name` of every named item inside `area` that is not wholly inside it
 * (scrolled out, or cut by the top or bottom edge): a snapshot is drawn whole and above the page,
 * so a cut item would spill over the toolbar. Items wholly inside on both sides glide between two
 * boxes inside the area and never leave it; the rest change with the page's cross-fade. Angular
 * clears the inline value with its own binding once the names turn off.
 */
export function nameOnlyVisible(area: Element | null | undefined): void {
  if (!area) {
    return;
  }
  const box = area.getBoundingClientRect();
  area.querySelectorAll<HTMLElement>('[style*="view-transition-name"]').forEach((item) => {
    const r = item.getBoundingClientRect();
    if (r.top < box.top || r.bottom > box.bottom) {
      item.style.setProperty('view-transition-name', 'none');
    }
  });
}

/** The name the clip area carries during a transition (`styles.scss` clips its children). */
export const VIEW_TRANSITION_CLIP_NAME = 'vt-clip-area';

/** Whether the browser nests groups (`view-transition-group: contain`), so a parent can clip them. */
export function canNestViewTransitions(doc: Document): boolean {
  const css = doc.defaultView?.CSS;
  return typeof css?.supports === 'function' && css.supports('view-transition-group', 'contain');
}

/**
 * Makes `area` the clip of the transition: it takes the clip name and nests the named items in its
 * group. Returns the undo.
 */
function clipTo(area: HTMLElement): () => void {
  area.style.setProperty('view-transition-name', VIEW_TRANSITION_CLIP_NAME);
  area.style.setProperty('view-transition-group', 'contain');
  return () => {
    area.style.removeProperty('view-transition-name');
    area.style.removeProperty('view-transition-group');
  };
}

/** Whether a transition can run now: a hidden tab cannot paint one, the browser aborts it. */
export function canRunViewTransition(doc: Document): boolean {
  return doc.visibilityState !== 'hidden';
}

/**
 * A skipped or aborted transition (a newer one started, the tab went to the background, the page
 * changed under it) rejects `ready`, `updateCallbackDone` and `finished` with an `AbortError` or
 * `InvalidStateError`. That is expected, not a failure: nobody awaits the animation, so the
 * rejections are swallowed here and never reach the console as unhandled.
 */
export function settleViewTransition(transition: ViewTransition): void {
  const ignore = (): void => undefined;
  transition.ready.catch(ignore);
  transition.updateCallbackDone.catch(ignore);
  transition.finished.catch(ignore);
}

/**
 * Runs `update` (a state change that re-renders the page) inside a View Transition so elements
 * that share a `view-transition-name` glide from their old box to the new one. Without browser
 * support, or with reduced motion, `update` just runs and the view swaps. The callback waits
 * for the next Angular render, so the "new" snapshot is taken after the DOM changed (zoneless).
 *
 * `names` scopes the names: they are on only while this transition runs (set before the old
 * snapshot is taken, cleared when it finishes), so they cannot disturb the router's page
 * transition (`withViewTransitions`), where the same link ids would otherwise glide across pages.
 */
export function runViewTransition(
  doc: Document,
  injector: Injector,
  update: () => void,
  names?: ViewTransitionNames,
): void {
  if (
    prefersReducedMotion(doc, injector) ||
    !('startViewTransition' in doc) ||
    !canRunViewTransition(doc)
  ) {
    update();
    return;
  }
  const start = (): void => {
    const area = names?.clip?.();
    // With nesting the area clips the gliding items at its edges; without it, only the items wholly
    // inside the area take part, so none spills over the page.
    const nested = area instanceof HTMLElement && canNestViewTransitions(doc);
    const unclip = nested ? clipTo(area) : undefined;
    const limit = (): void => {
      if (!nested) {
        nameOnlyVisible(names?.clip?.());
      }
    };
    limit();
    const transition = doc.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          update();
          afterNextRender(
            {
              read: () => {
                limit();
                resolve();
              },
            },
            { injector },
          );
        }),
    );
    settleViewTransition(transition);
    if (names || unclip) {
      const off = (): void => {
        names?.off();
        unclip?.();
      };
      void transition.finished.then(off, off);
    }
  };
  if (names) {
    names.on();
    // The old snapshot must already see the names: wait for the render that sets them.
    afterNextRender({ read: start }, { injector });
  } else {
    start();
  }
}

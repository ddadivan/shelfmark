Loading indicators. Pick by what is loading, not by taste — one indicator per wait.

**Angular:** `ui-progress-bar` (global, bound to `UiStore.pendingRequests` from the loading interceptor), `ui-spinner` (`size: 'sm' | 'md' | 'lg'`), `ui-meter` (`value: 0–100`), `ui-load-more`, `ui-save-status` (`state: 'saving' | 'saved' | 'error'`). Skeletons live in `ui-skeleton`.

**Classes:** `sm-progress` (+ `--fixed`, `--inline`), `sm-spinner` (+ `--sm`, `--lg`), `sm-meter` + `sm-meter__fill`, `sm-loadmore`, `sm-status` (+ `--done`), `sm-reveal`, `sm-ptr`, `sm-boot`.

Which one:
- **First load of a list, tree or page** → skeleton in the shape of the content (Skeleton). Never a centred spinner.
- **Navigation and background requests** (folder switch, refetch, sort) → 2px sage bar at the very top; old content stays visible.
- **An action the user started** (save, delete, sign in, export) → spinner inside that button, label changes to the -ing form (“Saving…”), `aria-busy="true"`.
- **Small, safe changes** (favorite, move, rename, tag) → optimistic update, no loader; on failure roll back and show an error toast with Retry.
- **Infinite scroll** → `sm-loadmore` row under the last item.
- **Link preview** → skeleton inside the preview box; after 8 s give up and let the user fill the title.
- **Search** → keep previous results as they are (never dim them: faded text drops below 4.5:1), mark the list `aria-busy="true"` and show the spinner in the field instead of the search icon.
- **Export** → `sm-meter` with a percentage when the size is known, otherwise inline bar.
- **App start** → `sm-boot`: logo and a 96px inline bar, only if start takes longer than 300 ms.

Appearing and leaving:
- A spinner never pops in. In a button it fades and scales in from 40% while the label slides over to make room (`sm-spinner-grow`, 200 ms); in fields, statuses and the load-more row it fades and scales in place (`sm-spinner-in`).
- When loading ends it leaves the same way in 120 ms (`sm-spinner--leave`), then the label or the search icon comes back with `sm-icon-in`. In Angular: `animate.enter` / `animate.leave` with these classes.
- The search icon and the spinner swap in the same 16px slot, so the field never shifts.

Timing:
- Show any loader only after **300 ms**; fast responses never flash a loader.
- Once shown, keep it for at least **400 ms** so it doesn't blink.
- Content replaces a skeleton with `sm-reveal` (200 ms fade), no slide.

Accessibility: the loading container gets `aria-busy="true"`; a visually hidden `aria-live="polite"` region says “Loading links” and “Loaded 24 links”. With reduced motion the shimmer stops, spinner and bar slow down but keep moving — they are status, not decoration.

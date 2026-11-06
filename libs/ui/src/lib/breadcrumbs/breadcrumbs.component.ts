import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { IconComponent } from '../icon/icon.component';
import { MenuItemComponent } from '../menu/menu-item.component';
import { MenuTriggerDirective } from '../menu/menu-trigger.directive';
import { MenuComponent } from '../menu/menu.component';
import { TooltipDirective } from '../tooltip/tooltip.directive';
import { breadcrumbTrail } from './breadcrumbs-trail';
import { BREADCRUMB_ENTRY_KIND } from './models/breadcrumb-entry-kind.const';
import { BREADCRUMB_PHONE_QUERY } from './models/breadcrumb-phone-query.const';
import type { BreadcrumbClick } from './models/breadcrumb-click.interface';
import type { BreadcrumbItem } from './models/breadcrumb-item.interface';

/**
 * Where the current folder sits, with a jump to any level above. A `nav` (named by `ariaLabel`)
 * with an ordered list; the last item is the current page (`aria-current="page"`, not a link).
 * Links are real `<a href>`: a plain click emits `linkClick` (call `preventDefault()` to route
 * in the app), middle and Cmd/Ctrl-click keep native behaviour, like `ui-button`.
 *
 * More than `maxItems` levels (default 4, "…" counts): the root, a "…" button that opens a
 * `ui-menu` with the folded levels, and the last `maxItems - 2` levels. Choosing a level from
 * that menu emits `linkClick` with `event: null`. On a phone only the parent and the current
 * level show next to "…" (the root moves into the menu so no level becomes unreachable).
 *
 * Long names are cut with an ellipsis; the full name shows in a tooltip (hover; keyboard
 * focus on links) when the text is actually truncated. Separators are `aria-hidden`. Sits above the feed,
 * never in the header.
 */
@Component({
  selector: 'ui-breadcrumbs',
  imports: [
    ButtonComponent,
    IconComponent,
    MenuComponent,
    MenuItemComponent,
    MenuTriggerDirective,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-crumbs' },
  templateUrl: './breadcrumbs.component.html',
  styleUrl: './breadcrumbs.component.scss',
})
export class BreadcrumbsComponent {
  protected readonly BREADCRUMB_ENTRY_KIND = BREADCRUMB_ENTRY_KIND;

  /** The trail from the root to the current level (last). */
  readonly items = input.required<readonly BreadcrumbItem[]>();
  /** Accessible name of the `nav`, for example "Breadcrumb". */
  readonly ariaLabel = input.required<string>();
  /** Accessible name of the "…" button and of its menu, for example "Show hidden folders". */
  readonly collapsedLabel = input.required<string>();
  /** Levels shown before the middle ones fold into "…" (the "…" slot counts). */
  readonly maxItems = input(4, { transform: numberAttribute });

  /** A visible link was clicked, or a level was chosen from the "…" menu. */
  readonly linkClick = output<BreadcrumbClick>();

  private readonly phone = signal(false);
  /** Keys of the entries whose text is cut right now; only they get a tooltip. */
  protected readonly truncated = signal<ReadonlySet<string>>(new Set());

  protected readonly trail = computed(() =>
    breadcrumbTrail(this.items(), this.maxItems(), this.phone()),
  );

  constructor() {
    const query = inject(DOCUMENT).defaultView?.matchMedia?.(BREADCRUMB_PHONE_QUERY);
    if (query) {
      this.phone.set(query.matches);
      const onChange = (event: MediaQueryListEvent): void => {
        this.phone.set(event.matches);
      };
      query.addEventListener('change', onChange);
      inject(DestroyRef).onDestroy(() => {
        query.removeEventListener('change', onChange);
      });
    }
  }

  protected onLinkClick(event: MouseEvent, item: BreadcrumbItem): void {
    // Modified and non-primary clicks keep the browser's own navigation.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    this.linkClick.emit({ item, event });
  }

  protected onMenuChoice(item: BreadcrumbItem): void {
    this.linkClick.emit({ item, event: null });
  }

  /** Measures the element on hover / focus: the tooltip is wanted only for cut text. */
  protected measure(key: string, element: HTMLElement): void {
    const cut = element.scrollWidth > element.clientWidth;
    if (cut !== this.truncated().has(key)) {
      const next = new Set(this.truncated());
      if (cut) {
        next.add(key);
      } else {
        next.delete(key);
      }
      this.truncated.set(next);
    }
  }
}

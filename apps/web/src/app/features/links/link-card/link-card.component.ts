import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BadgeComponent,
  ButtonComponent,
  CheckboxComponent,
  CardComponent,
  ChipComponent,
  FaviconComponent,
  ICON_SIZE,
  LongPressDirective,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  MenuTriggerDirective,
  PointerShadowDirective,
  TooltipDirective,
} from '@shelfmark/ui';
import type { LinkCardItem } from '../models/link-card-item.type';
import { ViewportService } from '../../../core/layout/viewport.service';
import { linkKeyIntent } from '../selection/link-select-keys';
import { LINK_KEY_INTENT } from '../selection/models/link-key-intent.const';
import type { LinkSelectToggle } from '../models/link-select-toggle.interface';
import { LocaleService } from '../../../core/i18n/locale.service';
import {
  linkAddress,
  linkHost,
  ownImageUrl,
  placeholderTone,
  safeHref,
  siteLetter,
} from '../link-view';

const MAX_TAGS = 3;

/**
 * One saved link in the cards view. It only renders and emits; the favorite and delete flows
 * live in `LinkActionsService`. The title opens the link in a new tab (http and https only).
 */
import { UserSettingsStore } from '../../../stores/user-settings.store';

@Component({
  selector: 'app-link-card',
  imports: [
    TranslocoPipe,
    BadgeComponent,
    ButtonComponent,
    CheckboxComponent,
    LongPressDirective,
    CardComponent,
    ChipComponent,
    FaviconComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
    PointerShadowDirective,
    TooltipDirective,
  ],
  templateUrl: './link-card.component.html',
  styleUrl: './link-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkCardComponent {
  /** Settings › Library › Open links in: a new tab (default) or the same tab. */
  protected readonly newTab = inject(UserSettingsStore).openInNewTab;
  protected readonly viewport = inject(ViewportService);
  protected readonly ICON_SIZE = ICON_SIZE;
  private readonly locale = inject(LocaleService);
  private readonly now = Date.now();

  readonly link = input.required<LinkCardItem>();
  /** No favorite button and no actions menu: a guest looks at someone else's link (#276). */
  readonly readOnly = input(false);
  /** Plays the fade-in of cards that replace the skeleton. */
  readonly reveal = input(false);

  /** The link is shown inside a folder: its menu offers "Pin to top" (a pinned link leads the folder). */
  readonly pinnable = input(false);
  /** The link is pinned to the sidebar. */
  readonly pinnedToSidebar = input(false);

  readonly pinToTopToggled = output<void>();
  readonly pinToSidebarToggled = output<void>();

  /** Pinned to the top of the folder that is open. */
  protected readonly pinnedToTop = computed(
    () => this.pinnable() && this.link().pinnedInFolderAt !== null,
  );

  readonly opened = output<void>();
  /** "Open" from the actions menu: the link opens in a new tab. */
  readonly openRequested = output<void>();
  readonly favoriteToggled = output<void>();
  readonly editRequested = output<void>();
  /** "Move to folder…" from the actions menu. */
  readonly moveRequested = output<void>();
  readonly deleteRequested = output<void>();

  /** A selection is in progress: a click toggles the link instead of opening it (#267). */
  readonly selecting = input(false);
  /** The link is picked for a bulk action. */
  readonly selected = input(false);
  /** The checkbox, a click while selecting, Space or a long press (phone) asks to toggle. */
  readonly selectToggled = output<LinkSelectToggle>();

  /**
   * The checkbox is in the DOM for every editable card. Hover devices reveal it on hover and
   * focus; touch devices (`hover: none`, drawn by `ui-card`) see it at rest, so a link can be
   * picked without a long press (which still works).
   */
  protected readonly showCheckbox = computed(() => !this.readOnly());

  /** The checkbox is drawn from `selected`; the native toggle is cancelled and the page decides. */
  protected onCheckboxClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectToggled.emit({ range: event.shiftKey });
  }

  protected onLongPress(): void {
    if (this.viewport.phone() && !this.readOnly()) {
      this.selectToggled.emit({ range: false });
    }
  }

  /** Space toggles the selection, M moves the link (keys pressed on the link itself). */
  protected onKeydown(event: KeyboardEvent): void {
    if (this.readOnly()) {
      return;
    }
    const intent = linkKeyIntent(event);
    if (intent === LINK_KEY_INTENT.Toggle) {
      event.preventDefault();
      this.selectToggled.emit({ range: event.shiftKey });
    } else if (intent === LINK_KEY_INTENT.Move) {
      event.preventDefault();
      this.moveRequested.emit();
    }
  }

  protected readonly href = computed(() => safeHref(this.link().url));
  protected readonly host = computed(() => linkHost(this.link().url));
  protected readonly address = computed(() => linkAddress(this.link().url));
  protected readonly letter = computed(() => siteLetter(this.link().url));
  protected readonly favicon = computed(() => ownImageUrl(this.link().faviconUrl));
  protected readonly tone = computed(() => placeholderTone(this.link().id));
  /** "2 days ago", "Last week", "Oct 28": when the link was saved, in the interface language. */
  protected readonly saved = computed(() => {
    const created = this.link().createdAt;
    return created ? this.locale.formatSaved(created, this.now) : '';
  });
  protected readonly image = computed(() => ownImageUrl(this.link().imageUrl));
  protected readonly tags = computed(() => this.link().tags.slice(0, MAX_TAGS));
  protected readonly hiddenTags = computed(() => Math.max(0, this.link().tags.length - MAX_TAGS));

  protected open(event?: MouseEvent): void {
    if (this.selecting()) {
      // While selecting, the card toggles instead of opening.
      event?.preventDefault();
      this.selectToggled.emit({ range: event?.shiftKey ?? false });
      return;
    }
    if (this.href() !== undefined) {
      this.opened.emit();
    }
  }
}

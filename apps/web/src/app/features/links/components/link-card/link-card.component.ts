import { AI_JOB_STATUS, LINK_KIND, normalizeRuleDomain } from '@shelfmark/contracts';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BadgeComponent,
  ButtonComponent,
  CheckboxComponent,
  CardComponent,
  FaviconComponent,
  CARD_MEDIA,
  type CardMedia,
  FolderColourDirective,
  type HeadingLevel,
  HighlightComponent,
  ICON_SIZE,
  IconComponent,
  LongPressDirective,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  MenuTriggerDirective,
  TooltipDirective,
} from '@shelfmark/ui';
import type { LinkCardItem } from '../../models/link-card-item.type';
import { LinkSummaryComponent } from '../../../ai/components/link-summary/link-summary.component';
import type { FolderChipView } from '../../models/folder-chip-view.interface';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { linkKeyIntent } from '../../utils/link-select-keys';
import { LINK_KEY_INTENT } from '../../models/link-key-intent.const';
import type { LinkSelectToggle } from '../../models/link-select-toggle.interface';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { BADGE_TONE, KEYBOARD_KEY } from '@shelfmark/ui';
import { ReminderFormatService } from '../../../reminders/services/reminder-format.service';
import {
  linkAddress,
  linkHost,
  ownImageUrl,
  placeholderTone,
  safeHref,
  siteColour,
  siteLetter,
} from '../../utils/link-view';
import { SITE_COLOURS } from '../../models/site-colours.const';
import { LinkCardTagsComponent } from '../link-card-tags/link-card-tags.component';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { LinkPreviewRoute } from '../../../link-preview/services/link-preview-route.service';

/**
 * One saved link in the cards view. It only renders and emits; the favorite and delete flows
 * live in `LinkActionsService`. The title opens the link in a new tab (http and https only).
 */
@Component({
  selector: 'app-link-card',
  imports: [
    TranslocoPipe,
    BadgeComponent,
    ButtonComponent,
    CheckboxComponent,
    HighlightComponent,
    LongPressDirective,
    CardComponent,
    FaviconComponent,
    FolderColourDirective,
    IconComponent,
    LinkCardTagsComponent,
    LinkSummaryComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
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
  private readonly reminders = inject(ReminderFormatService);
  private readonly now = Date.now();
  protected readonly BADGE_TONE = BADGE_TONE;
  protected readonly AI_JOB_STATUS = AI_JOB_STATUS;

  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly menu = viewChild(MenuComponent);

  readonly link = input.required<LinkCardItem>();
  /** No favorite button and no actions menu: a guest looks at someone else's link (#276). */
  readonly readOnly = input(false);
  /** Level of the title heading (2 in a feed; 3 under a section heading, as on Today). */
  readonly headingLevel = input<HeadingLevel>(2);
  /** The search text whose words are marked in the title (Shelf search feed); empty for none. */
  readonly highlight = input('');
  /** Plays the fade-in of cards that replace the skeleton. */
  readonly reveal = input(false);
  /** The link's folder as a chip, in mixed feeds only (#418); `null` for none. */
  readonly folder = input<FolderChipView | null>(null);

  /**
   * How the preview sits (Shelf): `natural` in the Masonry view, 4:3 `cover` in Cards; shops are
   * always `contain` (the product on a light fill).
   */
  readonly media = input<CardMedia>(CARD_MEDIA.Cover);
  /** The card fields of the View menu (Shelf): Note, Hashtags, Folder, Date. */
  readonly showNote = input(true);
  readonly showTags = input(true);
  readonly showFolder = input(true);
  readonly showDate = input(true);
  /** The description (the site's or AI's summary) under the site row; the View menu's switch. */
  readonly showDescription = input(true);
  protected readonly cardMedia = computed<CardMedia>(() =>
    this.link().kind === LINK_KIND.Shopping ? CARD_MEDIA.Contain : this.media(),
  );
  protected readonly isVideo = computed(() => this.link().kind === LINK_KIND.Video);
  /** The site's brand colour for the favicon square, where known. */
  protected readonly colour = computed(() => siteColour(this.link().url, SITE_COLOURS));

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
  /**
   * The page shows the link preview (#553): the eye button, "Preview here" first in the menu, Space
   * on the link, and a click that the "Clicking a link" setting (or an open preview) turns into a
   * preview ask `previewRequested`.
   */
  readonly previewable = input(false);
  readonly previewRequested = output<void>();
  private readonly previewRoute = inject(LinkPreviewRoute);
  /** "Open" from the actions menu: the link opens in a new tab. */
  readonly openRequested = output<void>();
  readonly favoriteToggled = output<void>();
  readonly editRequested = output<void>();
  /** "Move to folder…" from the actions menu. */
  readonly moveRequested = output<void>();
  /** "Remind me…" from the actions menu (#275). */
  readonly remindRequested = output<void>();
  /** "Create a rule for youtube.com…" from the actions menu (#398). */
  readonly ruleRequested = output<void>();
  /**
   * Offer "Show related" (AI-3): the page sets it while search by meaning is ready and the side by
   * side view can open.
   */
  readonly relatable = input(false);
  /** "Show related" from the actions menu: the split picker offers the related folders. */
  readonly relatedRequested = output<void>();
  /** The domain a rule for this link would match; `null` hides the menu item. */
  protected readonly ruleDomain = computed(() => normalizeRuleDomain(this.link().url));
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
    if (this.viewport.compact() && !this.readOnly()) {
      this.selectToggled.emit({ range: false });
    }
  }

  /** Right click: the card menu at the pointer (the same menu the keyboard opens). */
  protected onContextMenu(event: MouseEvent): void {
    const menu = this.menu();
    if (this.readOnly() || !menu) {
      return;
    }
    event.preventDefault();
    menu.openAt({ x: event.clientX, y: event.clientY });
  }

  /** Space previews (where the page offers it, #553) or toggles the selection; M moves the link. */
  protected onKeydown(event: KeyboardEvent): void {
    if (this.readOnly()) {
      return;
    }
    if (
      event.key === KEYBOARD_KEY.ContextMenu ||
      (event.shiftKey && event.key === KEYBOARD_KEY.F10)
    ) {
      // The context-menu key and Shift+F10 open the card menu under the card.
      event.preventDefault();
      this.menu()?.openFrom(this.hostElement);
      return;
    }
    const intent = linkKeyIntent(event);
    if (
      intent === LINK_KEY_INTENT.Toggle &&
      this.previewable() &&
      this.href() !== undefined &&
      !this.selecting() &&
      !event.shiftKey
    ) {
      // Space previews the link (#553); while selecting, and with Shift, it still selects.
      event.preventDefault();
      this.previewRequested.emit();
    } else if (intent === LINK_KEY_INTENT.Toggle) {
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
  /** The reminder chip in the meta line instead of the date: its time, or "Due …" once it came. */
  protected readonly reminder = computed(() => {
    const at = this.link().remindAt;
    return at
      ? { text: this.reminders.chip(at, this.now), due: this.reminders.isDue(at, this.now) }
      : null;
  });
  protected open(event?: MouseEvent): void {
    if (this.selecting()) {
      // While selecting, the card toggles instead of opening.
      event?.preventDefault();
      this.selectToggled.emit({ range: event?.shiftKey ?? false });
      return;
    }
    if (this.previewable() && event && this.previewRoute.wantsPreview(this.link().url, event)) {
      event.preventDefault();
      this.previewRequested.emit();
      return;
    }
    if (this.href() !== undefined) {
      this.opened.emit();
    }
  }
}

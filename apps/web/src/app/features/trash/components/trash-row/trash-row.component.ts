import { NgTemplateOutlet } from '@angular/common';
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
import { TRASH_ITEM_KIND, type TrashItem } from '@shelfmark/contracts';
import {
  BADGE_TONE,
  BadgeComponent,
  BUTTON_VARIANT,
  ButtonComponent,
  CheckboxComponent,
  FolderIconComponent,
  HistoryRowComponent,
  LongPressDirective,
  MenuComponent,
  MenuItemComponent,
  MenuTriggerDirective,
  TooltipDirective,
} from '@shelfmark/ui';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { SwipeReveal } from '../../../../core/layout/swipe-reveal';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { ownImageUrl, siteLetter } from '../../../links/utils/link-view';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { TRASH_EXPIRING_SOON_DAYS } from '../../models/trash-expiring-soon-days.const';
import { daysLeft } from '../../utils/trash-days-left';

/**
 * One entry of Trash as a `ui-history-row`: preview (the link's image, else its letter; a folder
 * tile for a folder), title, where it came from and when it was deleted (separate elements), the
 * days-left badge and Restore. It only renders and emits; the page does the work.
 *
 * Desktop: a checkbox before the preview, a Restore button and a menu with Delete forever. Phone:
 * the same row, swiped left to reveal Restore and Delete; the two buttons are always in the DOM
 * behind the row, so keyboard and screen reader users never need the swipe (focusing one slides
 * the row aside). A long press starts the selection; while selecting, the row has a checkbox and a
 * tap selects.
 */
@Component({
  selector: 'app-trash-row',
  imports: [
    NgTemplateOutlet,
    TranslocoPipe,
    BadgeComponent,
    ButtonComponent,
    CheckboxComponent,
    FolderIconComponent,
    HistoryRowComponent,
    LongPressDirective,
    MenuComponent,
    MenuItemComponent,
    MenuTriggerDirective,
    TooltipDirective,
  ],
  templateUrl: './trash-row.component.html',
  styleUrl: './trash-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'none' },
})
export class TrashRowComponent {
  protected readonly viewport = inject(ViewportService);
  private readonly locale = inject(LocaleService);

  protected readonly BADGE_TONE = BADGE_TONE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly TRASH_ITEM_KIND = TRASH_ITEM_KIND;
  protected readonly pluralKey = pluralKey;

  readonly item = input.required<TrashItem>();
  readonly selected = input(false);
  /** The checkbox shows: always on desktop, on a phone while a selection is going on. */
  readonly selecting = input(false);
  /** "Now" in milliseconds, one value for the whole list. */
  readonly now = input.required<number>();

  readonly selectedChange = output<boolean>();
  readonly restoreRequested = output<void>();
  readonly deleteRequested = output<void>();
  /** Phone: a long press, which starts the selection with this entry. */
  readonly selectionStarted = output<void>();

  private readonly actions = viewChild<ElementRef<HTMLElement>>('actions');
  private readonly surface = viewChild<ElementRef<HTMLElement>>('surface');

  protected readonly isFolder = computed(() => this.item().kind === TRASH_ITEM_KIND.Folder);
  protected readonly preview = computed(() => ownImageUrl(this.item().imageUrl));
  protected readonly letter = computed(() => {
    const { url, title } = this.item();
    return url === null ? title.charAt(0).toUpperCase() : siteLetter(url);
  });
  protected readonly left = computed(() => daysLeft(this.item().expiresAt, this.now()));
  protected readonly soon = computed(() => this.left() <= TRASH_EXPIRING_SOON_DAYS);
  protected readonly deletedAgo = computed(() =>
    this.locale.formatRelative(this.item().deletedAt, this.now()),
  );

  protected readonly swipeable = computed(() => this.viewport.compact() && !this.selecting());
  /** Swipe state of the phone row (Restore and Delete wait behind it). */
  protected readonly swipe = new SwipeReveal(
    () => this.swipeable(),
    () => this.actions()?.nativeElement,
    () => this.surface()?.nativeElement,
  );

  protected onActivated(): void {
    if (this.swipe.takeClick()) {
      return;
    }
    if (this.swipeable()) {
      this.swipe.setOpen(!this.swipe.open());
    } else {
      this.selectedChange.emit(!this.selected());
    }
  }

  protected onLongPress(): void {
    if (this.swipeable()) {
      this.swipe.setOpen(false);
      this.selectionStarted.emit();
    }
  }

  protected restoreFromSwipe(): void {
    this.swipe.setOpen(false);
    this.restoreRequested.emit();
  }

  protected deleteFromSwipe(): void {
    this.swipe.setOpen(false);
    this.deleteRequested.emit();
  }
}

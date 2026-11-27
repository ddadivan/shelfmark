import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
  TooltipDirective,
} from '@shelfmark/ui';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { SwipeRevealDirective } from '../../../../core/layout/directives/swipe-reveal.directive';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { ownImageUrl, siteLetter } from '../../../links/utils/link-view';
import { TRASH_EXPIRING_SOON_DAYS } from '../../models/trash-expiring-soon-days.const';
import { daysLeft } from '../../utils/trash-days-left';

/**
 * One entry of Trash as a `ui-history-row`: preview (the link's image, else its letter; a folder
 * tile for a folder), title, where it came from and the days left (separate elements; a warning
 * badge in the last days) and Restore (Shelf `04-organise` Trash). It only renders and emits.
 *
 * Desktop: a checkbox before the preview, a Restore button and a trash button for Delete forever. Phone:
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
    SwipeRevealDirective,
    TooltipDirective,
  ],
  templateUrl: './trash-row.component.html',
  styleUrl: './trash-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'none' },
})
export class TrashRowComponent {
  protected readonly viewport = inject(ViewportService);

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

  protected readonly isFolder = computed(() => this.item().kind === TRASH_ITEM_KIND.Folder);
  protected readonly preview = computed(() => ownImageUrl(this.item().imageUrl));
  protected readonly letter = computed(() => {
    const { url, title } = this.item();
    return url === null ? title.charAt(0).toUpperCase() : siteLetter(url);
  });
  protected readonly left = computed(() => daysLeft(this.item().expiresAt, this.now()));
  protected readonly soon = computed(() => this.left() <= TRASH_EXPIRING_SOON_DAYS);

  protected readonly swipeable = computed(() => this.viewport.compact() && !this.selecting());
  /** Swipe state of the phone row (Restore and Delete wait behind it); absent on desktop. */
  private readonly swipeReveal = viewChild(SwipeRevealDirective);

  protected onActivated(): void {
    const swipe = this.swipeReveal();
    if (swipe?.takeClick()) {
      return;
    }
    if (swipe && this.swipeable()) {
      swipe.setOpen(!swipe.open());
    } else {
      this.selectedChange.emit(!this.selected());
    }
  }

  protected onLongPress(): void {
    if (this.swipeable()) {
      this.swipeReveal()?.setOpen(false);
      this.selectionStarted.emit();
    }
  }

  protected restoreFromSwipe(): void {
    this.swipeReveal()?.setOpen(false);
    this.restoreRequested.emit();
  }

  protected deleteFromSwipe(): void {
    this.swipeReveal()?.setOpen(false);
    this.deleteRequested.emit();
  }
}

import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
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
import { pluralKey } from '../../../core/i18n/plural-key';
import { ViewportService } from '../../../core/layout/viewport.service';
import { ownImageUrl, siteLetter } from '../../links/link-view';
import { relativeTime } from '../../links/relative-time';
import { TRASH_EXPIRING_SOON_DAYS } from '../models/trash-expiring-soon-days.const';
import { daysLeft } from '../trash-days-left';

/** A drag of this many pixels (sideways, more than up or down) starts the swipe. */
const SWIPE_START_PX = 8;

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
  private readonly transloco = inject(TranslocoService);

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
    relativeTime(this.item().deletedAt, this.now(), this.transloco.getActiveLang()),
  );

  /** Swipe state of the phone row: the surface is moved by `offset` pixels (0 closed, negative open). */
  protected readonly offset = signal(0);
  protected readonly dragging = signal(false);
  private readonly open = signal(false);
  private start: { x: number; y: number; base: number } | null = null;
  private suppressClick = false;

  protected readonly swipeable = computed(() => this.viewport.phone() && !this.selecting());

  protected onActivated(): void {
    if (this.suppressClick) {
      return;
    }
    if (this.swipeable()) {
      this.setOpen(!this.open());
    } else {
      this.selectedChange.emit(!this.selected());
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    if (!this.swipeable() || !event.isPrimary || event.button !== 0) {
      return;
    }
    this.start = { x: event.clientX, y: event.clientY, base: this.open() ? -this.width() : 0 };
  }

  protected onPointerMove(event: PointerEvent): void {
    const start = this.start;
    if (!start) {
      return;
    }
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!this.dragging()) {
      if (Math.abs(dy) > SWIPE_START_PX && Math.abs(dy) >= Math.abs(dx)) {
        this.start = null;
        return;
      }
      if (Math.abs(dx) <= SWIPE_START_PX) {
        return;
      }
      this.dragging.set(true);
      this.surface()?.nativeElement.setPointerCapture(event.pointerId);
    }
    this.offset.set(Math.min(0, Math.max(-this.width(), start.base + dx)));
  }

  protected onPointerEnd(): void {
    if (this.dragging()) {
      this.dragging.set(false);
      this.setOpen(this.offset() < -this.width() / 2);
      // The click that may follow the release belongs to the drag.
      this.suppressClick = true;
      setTimeout(() => (this.suppressClick = false));
    }
    this.start = null;
  }

  protected onActionsFocusIn(): void {
    this.setOpen(true);
  }

  protected onActionsFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !this.actions()?.nativeElement.contains(next)) {
      this.setOpen(false);
    }
  }

  protected onLongPress(): void {
    if (this.swipeable()) {
      this.setOpen(false);
      this.selectionStarted.emit();
    }
  }

  protected restoreFromSwipe(): void {
    this.setOpen(false);
    this.restoreRequested.emit();
  }

  protected deleteFromSwipe(): void {
    this.setOpen(false);
    this.deleteRequested.emit();
  }

  private setOpen(open: boolean): void {
    this.open.set(open);
    this.offset.set(open ? -this.width() : 0);
  }

  private width(): number {
    return this.actions()?.nativeElement.offsetWidth ?? 0;
  }
}

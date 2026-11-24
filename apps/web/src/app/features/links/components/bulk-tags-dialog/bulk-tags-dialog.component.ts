import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { TAG_LIMIT } from '@shelfmark/contracts';
import {
  BUTTON_VARIANT,
  ButtonComponent,
  CheckboxComponent,
  DialogComponent,
  injectDialogData,
  InputComponent,
  UiDialogRef,
} from '@shelfmark/ui';
import { pluralKey } from '../../../../core/i18n/plural-key';
import type { BulkTagsChange } from '../../models/bulk-tags-change.interface';
import type { BulkTagsDialogData } from '../../models/bulk-tags-dialog-data.interface';
import type { BulkTagRow } from '../../models/bulk-tag-row.interface';
import { BULK_TAG_STATE } from '../../models/bulk-tag-state.const';
import type { BulkTagState } from '../../models/bulk-tag-state.type';
import { bulkTagsChange, initialTagState, nextTagState } from '../../utils/bulk-tag-rows';

/**
 * "Tags" for a selection (Shelf `08-select-move`): one field to add or find a tag, then every tag
 * as a checkbox: ticked when all selected links carry it, a dash when some do. A click adds it to
 * all, the next one takes it off all (a dash comes back after that). Enter in the field adds a new
 * tag ticked. Nothing changes until "Apply to N links"; it closes with the change, or with nothing.
 */
@Component({
  selector: 'app-bulk-tags-dialog',
  imports: [ButtonComponent, CheckboxComponent, DialogComponent, InputComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bulk-tags-dialog.component.html',
  styleUrl: './bulk-tags-dialog.component.scss',
})
export class BulkTagsDialogComponent {
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly BULK_TAG_STATE = BULK_TAG_STATE;
  protected readonly pluralKey = pluralKey;

  private readonly ref = inject<UiDialogRef<BulkTagsChange>>(UiDialogRef);
  protected readonly data = injectDialogData<BulkTagsDialogData>();

  protected readonly query = signal('');
  /** The tags typed in this dialog (new ones), newest first. */
  private readonly created = signal<readonly string[]>([]);
  /** The choices made so far, by lower-case name. */
  private readonly choices = signal<ReadonlyMap<string, BulkTagState>>(new Map());

  private readonly all = computed<BulkTagRow[]>(() => {
    const choices = this.choices();
    const row = (name: string, count: number): BulkTagRow => {
      const initial = initialTagState(count, this.data.total);
      return { name, count, initial, state: choices.get(name.toLowerCase()) ?? initial };
    };
    return [
      ...this.created().map((name) => row(name, 0)),
      ...this.data.tags.map((tag) => row(tag.name, tag.count)),
    ];
  });

  /** The list as shown: the rows whose name holds the typed text. */
  protected readonly rows = computed(() => {
    const text = this.query().trim().toLowerCase();
    return text === ''
      ? this.all()
      : this.all().filter((row) => row.name.toLowerCase().includes(text));
  });

  private readonly change = computed(() => bulkTagsChange(this.all()));
  protected readonly empty = computed(
    () => this.change().add.length === 0 && this.change().remove.length === 0,
  );

  protected toggle(row: BulkTagRow): void {
    this.choices.update((map) =>
      new Map(map).set(row.name.toLowerCase(), nextTagState(row.state, row.initial)),
    );
  }

  /** Enter in the field: an existing tag is ticked, a new name is added ticked. */
  protected addTyped(event: Event): void {
    event.preventDefault();
    const name = this.query().trim().slice(0, TAG_LIMIT.NameMax);
    if (name === '') {
      return;
    }
    const existing = this.all().find((row) => row.name.toLowerCase() === name.toLowerCase());
    if (!existing) {
      this.created.update((names) => [name, ...names]);
    }
    this.choices.update((map) => new Map(map).set(name.toLowerCase(), BULK_TAG_STATE.All));
    this.query.set('');
  }

  protected cancel(): void {
    this.ref.close();
  }

  protected apply(): void {
    this.ref.close(this.empty() ? undefined : this.change());
  }
}

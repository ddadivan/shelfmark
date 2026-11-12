import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import { LINK_LIMIT } from '@shelfmark/contracts';
import {
  BUTTON_TYPE,
  BUTTON_VARIANT,
  ButtonComponent,
  DialogComponent,
  injectDialogData,
  TagInputComponent,
  UiDialogRef,
} from '@shelfmark/ui';
import type { BulkTagsChange } from '../../models/bulk-tags-change.interface';
import type { BulkTagsDialogData } from '../../models/bulk-tags-dialog-data.interface';

interface BulkTagsModel {
  add: string[];
  remove: string[];
}

/**
 * "Tags" for a selection: names to add to every selected link and names to take off every one.
 * A name in both lists is only removed from "Add" (the later choice wins on save). Closes with the
 * change, or with nothing when both lists are empty or the dialog is cancelled.
 */
@Component({
  selector: 'app-bulk-tags-dialog',
  imports: [
    ButtonComponent,
    DialogComponent,
    FormField,
    FormRoot,
    TagInputComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bulk-tags-dialog.component.html',
  styleUrl: './bulk-tags-dialog.component.scss',
})
export class BulkTagsDialogComponent {
  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly LINK_LIMIT = LINK_LIMIT;

  private readonly ref = inject<UiDialogRef<BulkTagsChange>>(UiDialogRef);
  protected readonly data = injectDialogData<BulkTagsDialogData>();

  private readonly model = signal<BulkTagsModel>({ add: [], remove: [] });

  protected readonly form = form(this.model, () => undefined, {
    submission: { action: () => this.save() },
  });

  protected readonly suggestions = computed(() => [...this.data.suggestions]);
  protected readonly present = computed(() => [...this.data.present]);
  protected readonly empty = computed(
    () => this.model().add.length === 0 && this.model().remove.length === 0,
  );

  protected cancel(): void {
    this.ref.close();
  }

  private save(): Promise<undefined> {
    const { add, remove } = this.model();
    const removing = new Set(remove.map((name) => name.toLowerCase()));
    const change: BulkTagsChange = {
      add: add.filter((name) => !removing.has(name.toLowerCase())),
      remove,
    };
    this.ref.close(change.add.length > 0 || change.remove.length > 0 ? change : undefined);
    return Promise.resolve(undefined);
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ChoiceGridComponent, SpinnerComponent } from '@shelfmark/ui';
import { map } from 'rxjs';
import { LINKS_API } from '../../../links/models/links-api.const';
import { COVER_CHOICES_MAX } from '../../models/cover-choices-max.const';
import { coverOptions } from '../../utils/cover-options';

/**
 * The cover of a folder (#418) in its "Colour and icon" dialog: "No cover" and the preview
 * pictures of the folder's links (first page, pinned links first) as a radio group of thumbnails.
 * `value` is the chosen link id (empty for none); `image` follows with its picture, so the folder
 * can show the new cover before the server answers.
 */
@Component({
  selector: 'app-folder-cover-picker',
  imports: [ChoiceGridComponent, SpinnerComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './folder-cover-picker.component.html',
  styleUrl: './folder-cover-picker.component.scss',
})
export class FolderCoverPickerComponent {
  private readonly api = inject(LINKS_API);
  private readonly transloco = inject(TranslocoService);
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  readonly folderId = input.required<string>();
  /** The cover the folder has now (its link id and picture), or `null`. */
  readonly current = input<{ id: string; url: string | null } | null>(null);
  /** The chosen link id; empty for no cover. */
  readonly value = model('');
  /** The picture of the chosen link (`null` for none). */
  readonly image = model<string | null>(null);

  private readonly links = rxResource({
    params: () => this.folderId(),
    stream: ({ params }) =>
      this.api
        .list({ folderId: params, limit: COVER_CHOICES_MAX })
        .pipe(map((page) => [...page.pinned, ...page.items])),
  });

  protected readonly loading = this.links.isLoading;
  protected readonly options = computed(() => {
    this.i18n();
    return coverOptions(this.links.hasValue() ? this.links.value() : [], this.current(), {
      none: this.transloco.translate('folders.style.cover.none'),
      current: this.transloco.translate('folders.style.cover.current'),
      option: (title) => this.transloco.translate('folders.style.cover.option', { title }),
    });
  });

  constructor() {
    // The picture follows the choice (also when the options arrive after it).
    effect(() => {
      const chosen = this.options().find((option) => option.value === this.value());
      this.image.set(chosen?.image ?? null);
    });
  }
}

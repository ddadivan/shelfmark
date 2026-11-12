import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  FOLDER_COLOUR,
  FOLDER_DEFAULT_COLOUR,
  FOLDER_DEFAULT_ICON,
  FOLDER_ICON,
  type FolderColour,
  type FolderIcon,
} from '@shelfmark/contracts';
import {
  BUTTON_TYPE,
  BUTTON_VARIANT,
  ButtonComponent,
  ChoiceGridComponent,
  DialogComponent,
  FolderIconComponent,
  injectDialogData,
  UiDialogRef,
  type ChoiceOption,
} from '@shelfmark/ui';
import { pluralKey } from '../../../../core/i18n/plural-key';
import type { FolderStyleDialogData } from '../../models/folder-style-dialog-data.interface';
import type { FolderStyleFormModel } from '../../models/folder-style-form-model.interface';

const COLOURS: readonly FolderColour[] = Object.values(FOLDER_COLOUR);
const ICONS: readonly FolderIcon[] = Object.values(FOLDER_ICON);

function isColour(value: string): value is FolderColour {
  return COLOURS.some((colour) => colour === value);
}

function isIcon(value: string): value is FolderIcon {
  return ICONS.some((icon) => icon === value);
}

/**
 * "Colour and icon" of a folder (FolderStyle spec): a preview tile with the name and counts, the
 * eight colours and the icon allow-list as two radio groups (arrows move within a group), Reset
 * (graphite folder), Cancel and Save. Save closes at once; the service saves optimistically.
 */
@Component({
  selector: 'app-folder-style-dialog',
  imports: [
    ButtonComponent,
    ChoiceGridComponent,
    DialogComponent,
    FolderIconComponent,
    FormField,
    FormRoot,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './folder-style-dialog.component.html',
  styleUrl: './folder-style-dialog.component.scss',
})
export class FolderStyleDialogComponent {
  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;

  private readonly ref = inject<UiDialogRef<boolean>>(UiDialogRef);
  private readonly transloco = inject(TranslocoService);
  protected readonly data = injectDialogData<FolderStyleDialogData>();

  private readonly model = signal<FolderStyleFormModel>({
    colour: this.data.folder.colour,
    icon: this.data.folder.icon,
  });

  protected readonly form = form(this.model, () => undefined, {
    submission: { action: () => this.save() },
  });

  protected readonly previewColour = computed<FolderColour>(() => {
    const value = this.model().colour;
    return isColour(value) ? value : FOLDER_DEFAULT_COLOUR;
  });
  protected readonly previewIcon = computed<FolderIcon>(() => {
    const value = this.model().icon;
    return isIcon(value) ? value : FOLDER_DEFAULT_ICON;
  });

  protected readonly colourOptions: readonly ChoiceOption[] = COLOURS.map((colour) => ({
    value: colour,
    colour,
    label: this.transloco.translate(`folders.style.colours.${colour}`),
  }));

  protected readonly iconOptions: readonly ChoiceOption[] = ICONS.map((icon) => ({
    value: icon,
    icon,
    label: this.transloco.translate(`folders.style.icons.${icon}`),
  }));

  /** "12 links, 2 subfolders" (the counts of the folder itself, as on the folder tile). */
  protected readonly meta = computed(() => {
    const { linkCount, subfolderCount } = this.data;
    const links = this.transloco.translate(pluralKey('library.subfolders.links', linkCount), {
      count: linkCount,
    });
    if (subfolderCount === 0) {
      return this.transloco.translate('library.subfolders.meta', { links });
    }
    const folders = this.transloco.translate(
      pluralKey('library.subfolders.folders', subfolderCount),
      { count: subfolderCount },
    );
    return this.transloco.translate('library.subfolders.metaWithFolders', { links, folders });
  });

  protected reset(): void {
    this.model.set({ colour: FOLDER_DEFAULT_COLOUR, icon: FOLDER_DEFAULT_ICON });
  }

  protected cancel(): void {
    this.ref.close();
  }

  private save(): Promise<undefined> {
    const { colour, icon } = this.model();
    if (isColour(colour) && isIcon(icon)) {
      this.data.submit({ colour, icon });
    }
    this.ref.close(true);
    return Promise.resolve(undefined);
  }
}

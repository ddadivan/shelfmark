import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, FormRoot, validate } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  FOLDER_COLOUR,
  FOLDER_DEFAULT_COLOUR,
  FOLDER_DEFAULT_ICON,
  FOLDER_ICON,
  isFolderColourName,
  isFolderEmoji,
  isFolderIconName,
  isHexColour,
  type FolderColour,
  type FolderEmoji,
  type FolderIcon,
  type HexColour,
} from '@shelfmark/contracts';
import {
  BUTTON_TYPE,
  BUTTON_VARIANT,
  ButtonComponent,
  ChoiceGridComponent,
  ColorPickerComponent,
  DialogComponent,
  EmojiPickerComponent,
  FolderIconComponent,
  injectDialogData,
  UiDialogRef,
  SegmentedControlComponent,
  type ChoiceOption,
  type SegmentedOption,
} from '@shelfmark/ui';
import { FOLDER_ICON_COMMON } from '../../models/folder-icon-common.const';
import { FOLDER_ICON_GRID } from '../../models/folder-icon-rows-shown.const';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { OwnColourActionsService } from '../../../../core/colours/own-colour-actions.service';
import { FolderEmojiService } from '../../services/folder-emoji.service';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import type { FolderStyleDialogData } from '../../models/folder-style-dialog-data.interface';
import { FOLDER_STYLE_TAB } from '../../models/folder-style-tab.const';
import type { FolderStyleTab } from '../../models/folder-style-tab.type';
import { folderStyleSymbol } from '../../utils/folder-style-symbol';
import type { FolderStyleFormModel } from '../../models/folder-style-form-model.interface';

const COLOURS: readonly FolderColour[] = Object.values(FOLDER_COLOUR);
const ICONS: readonly FolderIcon[] = Object.values(FOLDER_ICON);

/**
 * "Colour and icon" of a folder (FolderStyle spec): a preview tile with the name and counts, the
 * eight built-in colours on one line, the account's own colours and a "+" swatch that opens the
 * colour picker to add one (#335), the icon set as a radio group in a scrolling grid, and the emoji
 * picker (#363) whose one emoji replaces the icon. Reset (graphite folder), Cancel and Save.
 * Save closes at once; the service saves optimistically.
 */
@Component({
  selector: 'app-folder-style-dialog',
  imports: [
    ButtonComponent,
    ChoiceGridComponent,
    ColorPickerComponent,
    DialogComponent,
    EmojiPickerComponent,
    FolderIconComponent,
    FormField,
    FormRoot,
    SegmentedControlComponent,
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
  protected readonly settings = inject(UserSettingsStore);
  private readonly ownColours = inject(OwnColourActionsService);
  /** The emoji picker's collection, "Recent" and "Yours" (#363). */
  protected readonly emoji = inject(FolderEmojiService);
  protected readonly data = injectDialogData<FolderStyleDialogData>();
  /** Ticks when the language or its translations change, so messages re-translate. */
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  private readonly model = signal<FolderStyleFormModel>({
    colour: this.data.folder.colour,
    icon: isFolderIconName(this.data.folder.icon) ? this.data.folder.icon : FOLDER_DEFAULT_ICON,
    emoji: isFolderIconName(this.data.folder.icon) ? '' : this.data.folder.icon,
  });

  /** Icon or Emoji; opens on the one the folder wears. Both choices stay while it is open. */
  protected readonly tab = signal<FolderStyleTab>(
    isFolderIconName(this.data.folder.icon) ? FOLDER_STYLE_TAB.Icon : FOLDER_STYLE_TAB.Emoji,
  );

  protected readonly form = form(
    this.model,
    (path) => {
      validate(path.emoji, ({ value }) => {
        this.i18n();
        const text = value().trim();
        // Only the Emoji tab applies the field; on the Icon tab a half-typed text is left alone.
        return this.tab() !== FOLDER_STYLE_TAB.Emoji || text === '' || isFolderEmoji(text)
          ? undefined
          : { kind: 'emoji', message: this.transloco.translate('folders.style.emoji.invalid') };
      });
    },
    { submission: { action: () => this.save() } },
  );

  protected readonly previewColour = computed<FolderColour | HexColour>(() => {
    const value = this.model().colour;
    return isFolderColourName(value) || isHexColour(value) ? value : FOLDER_DEFAULT_COLOUR;
  });
  /** What Save would apply: the active tab's choice (the icon when the emoji is missing). */
  protected readonly previewIcon = computed<FolderIcon | FolderEmoji>(() =>
    folderStyleSymbol(this.tab(), this.model().icon, this.model().emoji),
  );

  protected readonly tabOptions = computed<SegmentedOption[]>(() => {
    this.i18n();
    return [
      { value: FOLDER_STYLE_TAB.Icon, label: this.transloco.translate('folders.style.tabs.icon') },
      {
        value: FOLDER_STYLE_TAB.Emoji,
        label: this.transloco.translate('folders.style.tabs.emoji'),
      },
    ];
  });
  protected readonly FOLDER_STYLE_TAB = FOLDER_STYLE_TAB;
  /** The panel's name: the active tab's label. */
  protected readonly panelLabel = computed(
    () => this.tabOptions().find((option) => option.value === this.tab())?.label ?? '',
  );

  protected readonly colourOptions: readonly ChoiceOption[] = COLOURS.map((colour) => ({
    value: colour,
    colour,
    label: this.transloco.translate(`folders.style.colours.${colour}`),
  }));

  /** The account's own colours, plus the folder's own colour when the list lacks it. */
  protected readonly ownOptions = computed<ChoiceOption[]>(() => {
    this.i18n();
    const current = this.model().colour;
    const colours = this.settings.customColours();
    const all =
      isHexColour(current) && !colours.includes(current) ? [...colours, current] : colours;
    return all.map((colour) => ({
      value: colour,
      colour,
      label: this.transloco.translate('folders.style.ownSwatch', { colour }),
      // A colour only the folder wears (not in the account's list) stays: it is in use (#350).
      ...(colours.includes(colour) ? { removeLabel: this.ownColours.removeLabel(colour) } : {}),
    }));
  });

  /** Which own colour is the folder's colour (empty while it is a built-in one). */
  protected readonly ownChecked = computed(() => {
    const value = this.model().colour;
    return isHexColour(value) ? value : '';
  });

  protected readonly colourValue = computed(() => this.model().colour);

  /** The colour in the picker while it is open: the last one picked there. */
  protected readonly picked = signal('');
  protected readonly pickerOpen = signal(false);
  private readonly picker = viewChild(ColorPickerComponent);

  /** Every icon, the common ones first (`FOLDER_ICON_COMMON`), then the rest. */
  private readonly allIconOptions: readonly ChoiceOption[] = [
    ...FOLDER_ICON_COMMON,
    ...ICONS.filter((icon) => !FOLDER_ICON_COMMON.includes(icon)),
  ].map((icon) => ({
    value: icon,
    icon,
    label: this.transloco.translate(`folders.style.icons.${icon}`),
  }));
  private readonly shownCount = FOLDER_ICON_GRID.Columns * FOLDER_ICON_GRID.RowsShown;
  protected readonly FOLDER_ICON_GRID = FOLDER_ICON_GRID;
  protected readonly firstIcons = this.allIconOptions.slice(0, this.shownCount);
  protected readonly moreIcons = this.allIconOptions.slice(this.shownCount);
  protected readonly iconCount = this.allIconOptions.length;
  protected readonly moreId = 'folder-style-more-icons';
  /** Opens expanded when the folder's own icon is behind "Show all icons". */
  protected readonly iconsOpen = signal(
    this.moreIcons.some((option) => option.value === this.data.folder.icon),
  );

  protected toggleIcons(): void {
    this.iconsOpen.update((open) => !open);
  }

  /** The icon the grid checks; kept while the Emoji tab is active. */
  protected readonly iconChecked = computed(() => this.model().icon);

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

  /** A built-in colour or an own one was chosen. */
  protected chooseColour(value: string): void {
    this.model.update((model) => ({ ...model, colour: value }));
  }

  /** An icon of the grid was chosen (the emoji field keeps its text for the other tab). */
  protected chooseIcon(value: string): void {
    this.model.update((model) => ({ ...model, icon: value }));
  }

  /** The "×" or Delete on an own swatch: forgotten from the account (the folder keeps its colour). */
  protected removeColour(colour: string): void {
    void this.ownColours.remove(colour);
  }

  /** A colour finished in the picker: kept as a swatch of the account and chosen. */
  protected addColour(colour: string): void {
    if (!isHexColour(colour)) {
      return;
    }
    this.chooseColour(colour);
    void this.settings.addCustomColour(colour);
    // The colour is a swatch now: the "+" swatch closes and starts empty again.
    this.pickerOpen.set(false);
    this.picker()?.clear();
  }

  protected reset(): void {
    this.picked.set('');
    this.model.set({ colour: FOLDER_DEFAULT_COLOUR, icon: FOLDER_DEFAULT_ICON, emoji: '' });
    this.tab.set(FOLDER_STYLE_TAB.Icon);
  }

  protected cancel(): void {
    this.ref.close();
  }

  private save(): Promise<undefined> {
    const { colour } = this.model();
    const icon = this.previewIcon();
    if ((isFolderColourName(colour) || isHexColour(colour)) && this.form.emoji().valid()) {
      // "Recent" on this device; an emoji the collection lacks is kept under "Yours".
      this.emoji.remember(icon);
      this.data.submit({ colour, icon });
      this.ref.close(true);
    }
    return Promise.resolve(undefined);
  }
}

import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LINK_LIMIT } from '@shelfmark/contracts';
import {
  AiLineComponent,
  BADGE_TONE,
  BadgeComponent,
  BUTTON_VARIANT,
  ButtonComponent,
  CHIP_VARIANT,
  ChipComponent,
  FolderIconComponent,
  IconComponent,
  ICON_SIZE,
  InputComponent,
  isMacPlatform,
  LogoComponent,
  SegmentedControlComponent,
  type SegmentedOption,
  SUGGESTION_KIND,
  SuggestionComponent,
  SuggestionRowComponent,
  TagInputComponent,
  type TagSuggestion,
} from '@shelfmark/ui';
import { AI_LINE_KIND } from '../../models/ai-line-kind.const';
import type { AiLineView } from '../../models/ai-line.interface';
import { SAVE_MODE } from '../../models/save-mode.const';
import type { SaveMode } from '../../models/save-mode.type';
import { PopupStore } from '../../popup.store';
import { pluralKey } from '../../utils/plural-key';
import { PopupTabListComponent } from '../popup-tab-list/popup-tab-list.component';

/** State 1: the prefilled form; Save creates the link (Enter on the focused Save button). */
@Component({
  selector: 'ext-popup-form',
  templateUrl: './popup-form.component.html',
  styleUrl: './popup-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ext-screen ext-screen--flow',
    '(keydown.control.enter)': 'saveFromKeyboard($event)',
    '(keydown.meta.enter)': 'saveFromKeyboard($event)',
  },
  imports: [
    AiLineComponent,
    BadgeComponent,
    ButtonComponent,
    ChipComponent,
    FolderIconComponent,
    IconComponent,
    InputComponent,
    LogoComponent,
    PopupTabListComponent,
    SegmentedControlComponent,
    SuggestionComponent,
    SuggestionRowComponent,
    TagInputComponent,
    TranslocoPipe,
  ],
})
export class PopupFormComponent {
  protected readonly store = inject(PopupStore);
  private readonly transloco = inject(TranslocoService);
  protected readonly BADGE_TONE = BADGE_TONE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  /** The save shortcut named for this platform (Cmd on a Mac). */
  protected readonly saveHintKey = isMacPlatform()
    ? 'popup.form.saveHintMac'
    : 'popup.form.saveHint';
  protected readonly CHIP_VARIANT = CHIP_VARIANT;
  protected readonly AI_LINE_KIND = AI_LINE_KIND;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly SUGGESTION_KIND = SUGGESTION_KIND;
  protected readonly LINK_LIMIT = LINK_LIMIT;
  private readonly saveButton = viewChild.required<ButtonComponent>('save');
  private readonly modeControl = viewChild<SegmentedControlComponent>('mode');
  /** Captured once: only the first screen after opening opens its second button up (width and fade). */
  protected readonly animateSlot = this.store.animateFoot();

  constructor() {
    // Everything is filled in already: the shortcut, then Enter, saves the page.
    afterNextRender(() => {
      this.saveButton().focus();
      this.store.animateFoot.set(false);
    });
  }

  protected readonly tagSuggestions = computed<TagSuggestion[]>(() =>
    this.store.tags().map((tag) => ({ name: tag.name })),
  );
  protected readonly folderName = computed(
    () =>
      this.store.newFolderName() ??
      this.store.folder()?.name ??
      this.transloco.translate('popup.unsorted'),
  );

  /** Folder, tags and the AI actions wait while a fill or a sort runs, or the save does. */
  protected readonly locked = computed(
    () =>
      this.store.saving() ||
      this.store.tabList.switching() ||
      (this.store.tabList.active() ? this.store.tabsAi.busy() : this.store.ai.busy()),
  );
  protected readonly modeOptions = computed<SegmentedOption[]>(() => [
    { value: SAVE_MODE.Page, label: this.transloco.translate('popup.mode.page') },
    {
      value: SAVE_MODE.Tabs,
      label: this.transloco.translate('popup.mode.tabs', {
        count: this.store.tabList.windowCount(),
      }),
    },
  ]);

  protected readonly aiButtonShown = computed(() =>
    this.store.tabList.active() ? this.store.tabsAi.buttonShown() : this.store.ai.buttonShown(),
  );
  protected readonly aiBusy = computed(() =>
    this.store.tabList.active() ? this.store.tabsAi.busy() : this.store.ai.busy(),
  );
  protected readonly aiLabel = computed(() => {
    if (!this.store.tabList.active()) {
      return this.transloco.translate(
        this.store.ai.busy() ? 'popup.ai.filling' : 'popup.ai.button',
      );
    }
    const count = this.store.tabsAi.sortCount();
    const base = this.store.tabsAi.busy() ? 'popup.tabs.sorting' : 'popup.tabs.sort';
    return this.transloco.translate(pluralKey(base, count, this.transloco.getActiveLang()), {
      count,
    });
  });
  protected readonly saveLabel = computed(() => {
    if (!this.store.tabList.active()) return this.transloco.translate('popup.form.save');
    const count = this.store.tabList.selectedCount();
    return this.transloco.translate(
      pluralKey('popup.form.saveCount', count, this.transloco.getActiveLang()),
      { count },
    );
  });
  protected readonly line = computed<AiLineView | null>(() =>
    this.store.tabList.active() ? this.store.tabsAi.line() : this.store.ai.line(),
  );
  protected readonly liveText = computed(() => {
    const done = this.store.tabList.active() ? this.store.tabsAi.sorted() : this.store.ai.filled();
    if (!done) return '';
    return this.transloco.translate(
      this.store.tabList.active() ? 'popup.tabs.sortedDone' : 'popup.ai.done',
    );
  });

  protected readonly lineText = computed(() => {
    const line = this.line();
    if (line?.kind !== AI_LINE_KIND.Limit) return this.transloco.translate('popup.ai.unavailable');
    return this.transloco.translate(
      this.store.tabList.active() ? 'popup.tabs.limit' : 'popup.ai.limit',
      { date: this.resetDate(line.resetsOn ?? ''), limit: line.limit ?? 0 },
    );
  });

  /** "December 1", in the popup's language, for the ISO date the monthly count resets. */
  private resetDate(iso: string): string {
    const date = new Date(`${iso}T00:00:00Z`);
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat(this.transloco.getActiveLang(), {
          day: 'numeric',
          month: 'long',
          timeZone: 'UTC',
        }).format(date);
  }

  /** The switch: a declined permission leaves "This page", so the control is put back. */
  protected async onMode(value: string): Promise<void> {
    await this.store.setMode(value === SAVE_MODE.Tabs ? SAVE_MODE.Tabs : SAVE_MODE.Page);
    const mode: SaveMode = this.store.tabList.mode();
    this.modeControl()?.value.set(mode);
  }

  protected onAi(): void {
    if (this.store.tabList.active()) void this.store.tabsAi.sort();
    else void this.store.fillWithAi();
  }

  /** ⌘/Ctrl+Enter saves from anywhere in the form (Enter alone stays with the tag and note fields). */
  protected saveFromKeyboard(event: Event): void {
    event.preventDefault();
    void this.store.save();
  }
}

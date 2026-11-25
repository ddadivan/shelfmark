import { computed, inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { SAVED_VIEW_ICON, SAVED_WITHIN } from '@shelfmark/contracts';
import type { ChoiceOption, SegmentedOption, SelectOption, TagSuggestion } from '@shelfmark/ui';
import { pluralKey } from '../../../core/i18n/plural-key';
import { FoldersStore } from '../../../stores/folders.store';
import { TagsStore } from '../../../stores/tags.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { ALL_KINDS } from '../../links/models/all-kinds.const';
import { FEED_SORT } from '../../links/models/feed-sort.const';
import { buildFolderOptions } from '../../links/utils/folder-options';
import { linkKindOptions } from '../../links/utils/link-kind-options';
import { VIEW_SAVED_ANY } from '../models/view-saved-any.const';
import { VIEW_WHERE } from '../models/view-where.const';
import { NewViewFormService } from './new-view-form.service';

/**
 * The translated choices of the new view dialog (provided by the dialog): where, type, sort and
 * the tags to pick from. Each follows a language switch through `NewViewFormService.i18n`.
 */
@Service({ autoProvided: false })
export class NewViewOptionsService {
  private readonly formState = inject(NewViewFormService);
  private readonly transloco = inject(TranslocoService);
  private readonly folders = inject(FoldersStore);
  private readonly tagStore = inject(TagsStore);
  /** Folder tiles in the select, as the account shows colours (#418). */
  private readonly shownColour = inject(UserSettingsStore).shownColour;

  private t(key: string): string {
    this.formState.i18n();
    return this.transloco.translate(key);
  }

  /** All links, Unsorted, Favorites, then the folder tree. */
  readonly whereOptions = computed<SelectOption[]>(() => [
    { id: VIEW_WHERE.All, name: this.t('views.new.where.all'), icon: 'bookmark' },
    { id: VIEW_WHERE.Unsorted, name: this.t('views.new.where.unsorted'), icon: 'inbox' },
    { id: VIEW_WHERE.Favorites, name: this.t('views.new.where.favorites'), icon: 'star' },
    ...buildFolderOptions(this.folders.entities(), this.shownColour),
  ]);

  /** The type select (#537): "All types", then the ten kinds with the labels and icons of Edit link. */
  readonly kindOptions = computed<SelectOption[]>(() => [
    { id: ALL_KINDS, name: this.t('views.new.kind.all'), icon: 'list' },
    ...linkKindOptions((key) => this.t(key)),
  ]);

  readonly sortOptions = computed<SelectOption[]>(() => [
    { id: FEED_SORT.Newest, name: this.t('library.sort.newest'), icon: 'sort' },
    { id: FEED_SORT.Oldest, name: this.t('library.sort.oldest'), icon: 'sort' },
    { id: FEED_SORT.Title, name: this.t('library.sort.title'), icon: 'sort' },
    { id: FEED_SORT.TitleDesc, name: this.t('library.sort.titleDesc'), icon: 'sort' },
  ]);

  /** The Saved row (Shelf 13-views): any time, last month, last week. */
  readonly savedOptions = computed<SegmentedOption[]>(() => [
    { value: VIEW_SAVED_ANY, label: this.t('views.new.saved.any') },
    { value: SAVED_WITHIN.Month, label: this.t('views.new.saved.month') },
    { value: SAVED_WITHIN.Week, label: this.t('views.new.saved.week') },
  ]);

  /** The Icon row: no icon, then the glyphs of `SAVED_VIEW_ICON`. */
  readonly iconOptions = computed<ChoiceOption[]>(() => [
    { value: '', label: this.t('views.new.icon.none'), icon: 'close' },
    ...Object.entries(SAVED_VIEW_ICON).map(([key, icon]) => ({
      value: icon,
      label: this.t(`views.new.icon.${key.toLowerCase()}`),
      icon,
    })),
  ]);

  readonly tagSuggestions = computed<TagSuggestion[]>(() => {
    this.formState.i18n();
    return this.tagStore.entities().map((tag) => ({
      name: tag.name,
      countLabel: this.transloco.translate(pluralKey('tags.count', tag.linkCount), {
        count: tag.linkCount,
      }),
    }));
  });
}

import { computed, inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { LINK_KIND } from '@shelfmark/contracts';
import type { SegmentedOption, SelectOption, TagSuggestion } from '@shelfmark/ui';
import { pluralKey } from '../../../core/i18n/plural-key';
import { FoldersStore } from '../../../stores/folders.store';
import { TagsStore } from '../../../stores/tags.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { ALL_KINDS } from '../../links/models/all-kinds.const';
import { FEED_SORT } from '../../links/models/feed-sort.const';
import { buildFolderOptions } from '../../links/utils/folder-options';
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

  /** The type row: every kind, then the three the feed offers (a stored `other` shows none selected). */
  readonly kindOptions = computed<SegmentedOption[]>(() => [
    { value: ALL_KINDS, label: this.t('views.new.kind.all') },
    { value: LINK_KIND.Video, label: this.t('views.new.kind.video') },
    { value: LINK_KIND.Article, label: this.t('views.new.kind.article') },
    { value: LINK_KIND.Shopping, label: this.t('views.new.kind.shopping') },
  ]);

  readonly sortOptions = computed<SelectOption[]>(() => [
    { id: FEED_SORT.Newest, name: this.t('library.sort.newest'), icon: 'sort' },
    { id: FEED_SORT.Oldest, name: this.t('library.sort.oldest'), icon: 'sort' },
    { id: FEED_SORT.Title, name: this.t('library.sort.title'), icon: 'sort' },
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

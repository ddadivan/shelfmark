import { computed, inject, Service, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import type { TagResponse } from '@shelfmark/contracts';
import { activeLang } from '../../../core/i18n/active-lang';
import { pluralKey } from '../../../core/i18n/plural-key';
import { TagsStore } from '../../../stores/tags.store';
import { TagActionsService } from './tag-actions.service';

/**
 * Which tag the context menu of the tags section belongs to, and the texts that say so. Provided
 * by the component (one per sidebar), not app-wide.
 */
@Service({ autoProvided: false })
export class TagMenuService {
  private readonly tags = inject(TagsStore);
  private readonly actions = inject(TagActionsService);
  private readonly transloco = inject(TranslocoService);
  /** Ticks when the active language or its translations change, so messages re-translate. */
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  /** `id` of the tag whose menu is open. */
  private readonly openId = signal<string | null>(null);
  /** The tag the menu was opened for; kept while an item is chosen and the menu closes. */
  private targetId: string | null = null;

  readonly label = computed(() => {
    // Re-runs on a language switch (`translate` itself is not reactive).
    activeLang();
    const tag = this.tag();
    return tag ? this.transloco.translate('tags.sidebar.menuFor', { name: tag.name }) : undefined;
  });

  /** "winter, 12 links": the first line of the menu says whose menu it is. */
  readonly summary = computed(() => {
    const tag = this.tag();
    if (!tag) {
      return '';
    }
    this.i18n();
    return this.transloco.translate('tags.sidebar.menu.summary', {
      name: tag.name,
      links: this.transloco.translate(pluralKey('tags.count', tag.linkCount), {
        count: tag.linkCount,
      }),
    });
  });

  /** The tag of the menu, if it still exists. */
  tag(): TagResponse | undefined {
    const id = this.openId() ?? this.targetId;
    return id === null ? undefined : this.tags.entityMap()[id];
  }

  open(tag: TagResponse): void {
    this.targetId = tag.id;
    this.openId.set(tag.id);
  }

  closed(): void {
    this.openId.set(null);
  }

  show(): void {
    const tag = this.tag();
    if (tag) {
      void this.actions.showLinks(tag.name);
    }
  }

  merge(): void {
    const tag = this.tag();
    if (tag) {
      void this.actions.merge(tag);
    }
  }

  delete(): void {
    const tag = this.tag();
    if (tag) {
      void this.actions.delete(tag);
    }
  }
}

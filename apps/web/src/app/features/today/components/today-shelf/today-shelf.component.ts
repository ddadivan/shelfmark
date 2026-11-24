import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { LinkResponse } from '@shelfmark/contracts';
import { ButtonComponent, IconComponent, ICON_SIZE } from '@shelfmark/ui';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { ownImageUrl, safeHref, siteLetter } from '../../../links/utils/link-view';
import { RediscoverStore } from '../../../rediscover/services/rediscover.store';

/**
 * "From your shelf" of Today (Shelf): one forgotten link of this week's Rediscover block (F8,
 * `GET /api/rediscover`): its preview, when it was saved, the title and its note, with Open,
 * Remind me and Not interested (the next link of the block takes its place). Once the block is
 * empty, a short "that's it" note.
 */
@Component({
  selector: 'app-today-shelf',
  imports: [TranslocoPipe, ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './today-shelf.component.html',
  styleUrl: './today-shelf.component.scss',
})
export class TodayShelfComponent {
  protected readonly store = inject(RediscoverStore);
  private readonly actions = inject(LinkActionsService);
  private readonly locale = inject(LocaleService);
  protected readonly newTab = inject(UserSettingsStore).openInNewTab;
  protected readonly ICON_SIZE = ICON_SIZE;

  /** The link on show: the first one left in the block. */
  protected readonly link = computed<LinkResponse | undefined>(() => this.store.items()[0]);
  protected readonly href = computed(() => {
    const link = this.link();
    return link ? safeHref(link.url) : undefined;
  });
  protected readonly imageFailed = linkedSignal({ source: this.link, computation: () => false });
  protected readonly image = computed(() => {
    const link = this.link();
    return link && !this.imageFailed() ? ownImageUrl(link.imageUrl) : undefined;
  });
  protected readonly letter = computed(() => {
    const link = this.link();
    return link ? siteLetter(link.url) : '';
  });

  /** "3 weeks ago". */
  protected readonly savedAgo = computed(() => {
    const link = this.link();
    return link ? this.locale.formatRelative(link.createdAt, Date.now()) : '';
  });

  protected opened(link: LinkResponse): void {
    this.actions.open(link);
  }

  protected remind(link: LinkResponse): void {
    void this.actions.remind(link);
  }

  protected hide(link: LinkResponse): void {
    void this.store.hide(link.id);
  }
}

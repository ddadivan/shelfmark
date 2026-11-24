import { computed, inject, Service, signal } from '@angular/core';
import { RECENT_LINKS_WINDOW_DAYS, type LinkResponse } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { LinksStore } from '../../../stores/links.store';
import { RemindersStore } from '../../../stores/reminders.store';
import { LINKS_API } from '../../links/models/links-api.const';
import { READER_API } from '../../reader/models/reader-api.const';
import { RediscoverStore } from '../../rediscover/services/rediscover.store';
import type { ContinueItem } from '../models/continue-item.interface';
import { REVISIT_RECENT_MAX } from '../models/revisit-recent-max.const';
import { openedWithin } from '../utils/opened-within';

/**
 * The Revisit queue (Shelf `02-save-revisit.html`, flows-and-structure 5.3; page-scoped): one place
 * for coming back, built from data the app already has. Due reminders (`RemindersStore`),
 * Continue reading (the Reader progress of `READER_API`, kept per link by the API),
 * Forgotten this week (`RediscoverStore`) and Recently opened (the history of `LinksStore`, last
 * 30 days, the newest few).
 */
@Service({ autoProvided: false })
export class RevisitService {
  private readonly reminders = inject(RemindersStore);
  private readonly rediscover = inject(RediscoverStore);
  private readonly links = inject(LinksStore);
  private readonly linksApi = inject(LINKS_API);
  private readonly reader = inject(READER_API);

  /** One "now" for the page; actions renew it. */
  readonly now = signal(Date.now());
  private readonly continueState = signal<readonly ContinueItem[]>([]);
  private readonly continueLoaded = signal(false);

  readonly due = this.reminders.due;
  readonly continueReading = this.continueState.asReadonly();
  readonly forgotten = this.rediscover.items;
  readonly recent = computed(() =>
    openedWithin(this.links.recent(), RECENT_LINKS_WINDOW_DAYS, this.now()).slice(
      0,
      REVISIT_RECENT_MAX,
    ),
  );
  /** Due reminders, half-read texts and this week's forgotten links. */
  readonly waiting = computed(
    () => this.due().length + this.continueReading().length + this.forgotten().length,
  );
  readonly loaded = computed(
    () =>
      this.reminders.loaded() &&
      this.rediscover.loaded() &&
      this.links.recentLoaded() &&
      this.continueLoaded(),
  );
  /** Nothing in any group. */
  readonly empty = computed(
    () => this.loaded() && this.waiting() === 0 && this.recent().length === 0,
  );

  async load(): Promise<void> {
    await Promise.all([
      this.reminders.open().catch(() => undefined),
      this.rediscover.load(),
      this.links.loadRecent(),
      this.loadContinue(),
    ]);
  }

  /** Done or snoozed: the page's "now" moves on so the groups follow. */
  touch(): void {
    this.now.set(Date.now());
  }

  private async loadContinue(): Promise<void> {
    try {
      const progress = await firstValueFrom(this.reader.progress());
      const items = await Promise.all(
        progress.map(async (item): Promise<ContinueItem | null> => {
          const link = await this.linkOf(item.linkId);
          return link ? { link, progress: item } : null;
        }),
      );
      this.continueState.set(items.filter((item): item is ContinueItem => item !== null));
    } catch {
      // Progress is optional: no group.
    } finally {
      this.continueLoaded.set(true);
    }
  }

  private async linkOf(id: string): Promise<LinkResponse | null> {
    const known = this.links.entityMap()[id] ?? this.links.recent().find((link) => link.id === id);
    if (known) {
      return known;
    }
    try {
      return await firstValueFrom(this.linksApi.get(id));
    } catch {
      return null;
    }
  }
}

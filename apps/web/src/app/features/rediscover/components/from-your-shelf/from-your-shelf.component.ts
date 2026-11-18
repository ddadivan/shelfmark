import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { REDISCOVER_MODE, type LinkResponse } from '@shelfmark/contracts';
import {
  ButtonComponent,
  FaviconComponent,
  IconComponent,
  ICON_SIZE,
  PanelComponent,
  TooltipDirective,
} from '@shelfmark/ui';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { linkHost, ownImageUrl, safeHref, siteLetter } from '../../../links/utils/link-view';
import { READ_LATER } from '../../models/read-later.const';
import { RediscoverStore } from '../../services/rediscover.store';

/**
 * "From your shelf" (F8, AiDiscover 2–3) at the top of All links: 3 to 5 older links not opened
 * for a long time, with Remind me and Not interested, and a × that hides the block until next
 * week. In `theme` mode the lead names the recent theme with the spark (AI); in `forgotten` mode
 * there is no mark. Read later waits for #396. Renders nothing without items.
 */
@Component({
  selector: 'app-from-your-shelf',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    FaviconComponent,
    IconComponent,
    PanelComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './from-your-shelf.component.html',
  styleUrl: './from-your-shelf.component.scss',
})
export class FromYourShelfComponent {
  protected readonly store = inject(RediscoverStore);
  private readonly locale = inject(LocaleService);
  private readonly actions = inject(LinkActionsService);
  protected readonly newTab = inject(UserSettingsStore).openInNewTab;
  /** Read later (#396), only once that feature provides it. */
  protected readonly readLater = inject(READ_LATER, { optional: true });
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly safeHref = safeHref;
  protected readonly linkHost = linkHost;
  protected readonly siteLetter = siteLetter;
  protected readonly ownImageUrl = ownImageUrl;

  /** The recent theme in `theme` mode, else `null` (no AI mark). */
  protected readonly theme = computed(() => {
    const block = this.store.block();
    return block?.mode === REDISCOVER_MODE.Theme ? block.theme : null;
  });

  constructor() {
    void this.store.load();
  }

  protected savedMonth(link: LinkResponse): string {
    return this.locale
      .dateTimeFormat({ month: 'long', year: 'numeric' })
      .format(new Date(link.createdAt));
  }

  protected opened(link: LinkResponse): void {
    this.actions.open(link);
  }

  protected remind(link: LinkResponse): void {
    void this.actions.remind(link);
  }
}

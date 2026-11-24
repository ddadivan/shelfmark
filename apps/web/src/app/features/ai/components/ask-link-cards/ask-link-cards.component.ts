import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { AskSource } from '@shelfmark/contracts';
import {
  ButtonComponent,
  ListItemComponent,
  MenuComponent,
  MenuItemComponent,
  MenuTriggerDirective,
  UiDialogRef,
} from '@shelfmark/ui';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { FoldersStore } from '../../../../stores/folders.store';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { linkHost, ownImageUrl, safeHref } from '../../../links/utils/link-view';
import type { AskCardGroup } from '../../models/ask-card-group.interface';
import { AskSourceActions } from '../../services/ask-source-actions.service';

/**
 * Link tiles in an Ask answer (ADR 0055, `show_links`; Shelf `lcards`): `ui-list-item tile` with
 * the link's picture (or the picture glyph), "n. Title" and "host · folder"; the tile opens the
 * link, the ⋯ menu (on hover or focus, always on touch) offers side by side from 80em and remind
 * me. Three across a wide column, one in the panel, and "Show all N in search" when more links
 * matched than the tiles. Numbered like the citations (`idPrefix-<n>`), so a citation can scroll to
 * its tile. Also renders the sources list (`label`).
 */
@Component({
  selector: 'app-ask-link-cards',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    ListItemComponent,
    MenuComponent,
    MenuItemComponent,
    MenuTriggerDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ask-link-cards.component.html',
  styleUrl: './ask-link-cards.component.scss',
})
export class AskLinkCardsComponent {
  readonly group = input.required<AskCardGroup>();
  /** Prefix of the card ids (`<prefix>-<n>`), shared with the sources list. */
  readonly idPrefix = input.required<string>();
  /** The number whose card is highlighted (a citation pointed at it), or `null`. */
  readonly highlighted = input<number | null>(null);
  /** The list's accessible name; empty: "Links found". */
  readonly label = input('');

  protected readonly actions = inject(AskSourceActions);
  protected readonly viewport = inject(ViewportService);
  protected readonly newTab = inject(UserSettingsStore).openInNewTab;
  private readonly folders = inject(FoldersStore);
  private readonly ref = inject(UiDialogRef, { optional: true });
  protected readonly safeHref = safeHref;

  /** "Show all N in search" is offered: more matched and the feed can show that search. */
  protected readonly showAll = computed(() => {
    const { total, search } = this.group();
    return total !== null && search !== null ? total : null;
  });

  /** The tile's picture: the link's own captured image, else '' (the picture glyph). */
  protected thumb(link: AskSource['link']): string {
    return ownImageUrl(link.imageUrl) ?? '';
  }

  /** "host · folder" (just the host for an unsorted link). */
  protected meta(link: AskSource['link']): string {
    const folder = this.folders.entities().find((entry) => entry.id === link.folderId)?.name;
    return folder ? `${linkHost(link.url)} · ${folder}` : linkHost(link.url);
  }

  protected async sideBySide(source: AskSource): Promise<void> {
    this.ref?.close();
    await this.actions.sideBySide(source.link);
  }

  protected async openAll(): Promise<void> {
    const search = this.group().search;
    if (search === null) {
      return;
    }
    this.ref?.close();
    await this.actions.showAll(search);
  }
}

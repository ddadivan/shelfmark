import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { AskSource } from '@shelfmark/contracts';
import { ButtonComponent, FaviconComponent, ListItemComponent, UiDialogRef } from '@shelfmark/ui';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { linkHost, ownImageUrl, safeHref, siteLetter } from '../../../links/utils/link-view';
import { AskSourceActions } from '../../services/ask-source-actions.service';

/**
 * "Sources from your shelf": the cited links as real rows (open, side by side from 80em, remind
 * me), numbered like the citations. `highlighted` marks the row a citation pointed to.
 */
@Component({
  selector: 'app-ask-sources',
  imports: [TranslocoPipe, ButtonComponent, FaviconComponent, ListItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ask-sources.component.html',
  styleUrl: './ask-sources.component.scss',
})
export class AskSourcesComponent {
  readonly sources = input.required<readonly AskSource[]>();
  /** Prefix of the row ids (`<prefix>-<n>`), so a citation can scroll to its row. */
  readonly idPrefix = input.required<string>();
  /** The citation number whose row is highlighted, or `null`. */
  readonly highlighted = input<number | null>(null);

  protected readonly actions = inject(AskSourceActions);
  protected readonly viewport = inject(ViewportService);
  protected readonly newTab = inject(UserSettingsStore).openInNewTab;
  private readonly ref = inject(UiDialogRef, { optional: true });

  protected readonly safeHref = safeHref;
  protected readonly linkHost = linkHost;
  protected readonly siteLetter = siteLetter;
  protected readonly ownImageUrl = ownImageUrl;

  protected async sideBySide(source: AskSource): Promise<void> {
    this.ref?.close();
    await this.actions.sideBySide(source.link);
  }
}

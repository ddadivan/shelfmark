import { _IdGenerator } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  input,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';
import { AI_SEARCH_STATE, type LinkResponse } from '@shelfmark/contracts';
import { FaviconComponent, ICON_SIZE, IconComponent, ListItemComponent } from '@shelfmark/ui';
import { catchError, of } from 'rxjs';
import { LinksStore } from '../../../../stores/links.store';
import { linkHost, safeHref, siteLetter } from '../../../links/utils/link-view';
import { AI_API } from '../../models/ai-api.const';
import type { RelatedLinkRow } from '../../models/related-link-row.interface';
import { RELATED_LINKS_LIMIT } from '../../models/related-links-limit.const';
import { AiSettingsStore } from '../../services/ai-settings.store';

/**
 * "Related on your shelf" in Edit link (AI-3, `AiDiscover` 1): up to five links close by meaning to
 * `linkId`, each with its favicon, title and "Close to: …" with the AI mark (the disclaimer as its
 * name and tooltip). A row opens the link in a new tab (the dialog is modal, so no drag to side by
 * side). Asks only while search by meaning is ready; renders nothing while off, not ready, empty or
 * failed.
 */
@Component({
  selector: 'app-related-links',
  imports: [TranslocoPipe, FaviconComponent, IconComponent, ListItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './related-links.component.html',
  styleUrl: './related-links.component.scss',
})
export class RelatedLinksComponent {
  /** The link being edited. */
  readonly linkId = input.required<string>();

  private readonly store = inject(AiSettingsStore);
  // Read when asked only: Edit link without AI never needs the AI seam.
  private readonly injector = inject(Injector);
  private readonly links = inject(LinksStore);

  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly headingId = inject(_IdGenerator).getId('app-related-links-');

  private readonly related = rxResource({
    params: () => (this.store.meaningReady() ? this.linkId() : undefined),
    stream: ({ params }) =>
      this.injector
        .get(AI_API)
        .related(params, RELATED_LINKS_LIMIT)
        .pipe(catchError(() => of(null))),
  });

  protected readonly rows = computed<RelatedLinkRow[]>(() => {
    const response = this.related.hasValue() ? this.related.value() : null;
    if (
      !this.store.meaningReady() ||
      response === null ||
      response.status.state !== AI_SEARCH_STATE.Ready
    ) {
      return [];
    }
    return response.items.slice(0, RELATED_LINKS_LIMIT).map((match) => ({
      link: match.link,
      href: safeHref(match.link.url),
      host: linkHost(match.link.url),
      letter: siteLetter(match.link.url),
      reasons: match.why
        .map((reason) => reason.text.trim())
        .filter((text) => text !== '')
        .join(', '),
    }));
  });

  /** Counts the open like any other (Recent, history); the row's link opens the tab. */
  protected opened(link: LinkResponse): void {
    void this.links.recordOpen(link.id);
  }
}

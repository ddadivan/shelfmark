import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  input,
  output,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';
import { AI_SEARCH_STATE, type LinkResponse } from '@shelfmark/contracts';
import {
  BUTTON_SIZE,
  ButtonComponent,
  FaviconComponent,
  ICON_SIZE,
  IconComponent,
  ListItemComponent,
  PopoverComponent,
  PopoverTriggerDirective,
} from '@shelfmark/ui';
import { catchError, of } from 'rxjs';
import { linkHost, safeHref, siteLetter } from '../../../links/utils/link-view';
import { AI_API } from '../../models/ai-api.const';
import type { RelatedLinkRow } from '../../models/related-link-row.interface';
import { RELATED_LINKS_LIMIT } from '../../models/related-links-limit.const';
import { AiSettingsStore } from '../../services/ai-settings.store';

/**
 * "Related on your shelf" in the link preview (AI-3 F7, moved out of Edit link in #572): a
 * "Related · N" button that opens a popover with up to five links close by meaning to `linkId`,
 * each with its favicon, title and "Close to: …" with the AI mark (the disclaimer as its name and
 * tooltip). Choosing a row emits `chosen`; the preview switches to that link. Asks only while search
 * by meaning is ready; renders nothing while off, not ready, empty or failed.
 */
@Component({
  selector: 'app-related-links',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    FaviconComponent,
    IconComponent,
    ListItemComponent,
    PopoverComponent,
    PopoverTriggerDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './related-links.component.html',
  styleUrl: './related-links.component.scss',
})
export class RelatedLinksComponent {
  /** The link in the preview. */
  readonly linkId = input.required<string>();
  /** The small button of the desktop preview toolbar; the phone bar takes the default size. */
  readonly small = input(false, { transform: booleanAttribute });
  /** A related link was chosen. */
  readonly chosen = output<LinkResponse>();

  private readonly store = inject(AiSettingsStore);
  // Read when asked only: a preview without AI never needs the AI seam.
  private readonly injector = inject(Injector);

  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly size = computed(() => (this.small() ? BUTTON_SIZE.Sm : BUTTON_SIZE.Md));

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

  /** Closes the popover (focus back on the button) and hands the link to the preview. */
  protected choose(link: LinkResponse, popover: PopoverComponent): void {
    popover.close({ restoreFocus: true });
    this.chosen.emit(link);
  }
}

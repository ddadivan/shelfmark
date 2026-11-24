import { inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { LINK_LIMIT, type LinkResponse, type UpdateLinkRequest } from '@shelfmark/contracts';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { LinksStore } from '../../../stores/links.store';
import { LINKS_API } from '../../links/models/links-api.const';

/**
 * Edits in place on the Link page's details panel: the title and the note save when the field
 * loses focus. An empty or unchanged title is not sent (the field shows the saved one again); an
 * empty note clears it. A failure says so with Retry; the store keeps the saved link.
 */
@Service()
export class LinkInlineEditService {
  private readonly api = inject(LINKS_API);
  private readonly store = inject(LinksStore);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  /** Resolves `true` when something was saved. */
  async saveTitle(link: LinkResponse, title: string): Promise<boolean> {
    const next = title.trim().slice(0, LINK_LIMIT.TitleMax);
    if (next === '' || next === link.title) {
      return false;
    }
    return this.save(link, { title: next });
  }

  async saveNote(link: LinkResponse, note: string): Promise<boolean> {
    const next = note.trim().slice(0, LINK_LIMIT.NoteMax);
    if (next === (link.note ?? '')) {
      return false;
    }
    return this.save(link, { note: next === '' ? null : next });
  }

  private async save(link: LinkResponse, change: UpdateLinkRequest): Promise<boolean> {
    try {
      const saved = await firstValueFrom(this.api.update(link.id, change));
      this.store.applyEdit(saved);
      return true;
    } catch {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.transloco.translate('preview.details.saveFailed'),
        detail: link.title,
        action: {
          label: this.transloco.translate('preview.details.retry'),
          run: () => void this.save(link, change),
        },
      });
      return false;
    }
  }
}

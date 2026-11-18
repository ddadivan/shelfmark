import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import type { LinkResponse } from '@shelfmark/contracts';
import { APP_PATH } from '../../../models/app-path.const';
import { SPLIT_QUERY_PARAM } from '../../library/models/split-query-param.const';
import { splitParamValue } from '../../library/utils/split-param';
import { LinkActionsService } from '../../links/services/link-actions.service';

/** What a source row of an Ask answer does: open (recorded), side by side, remind me. */
@Service()
export class AskSourceActions {
  private readonly actions = inject(LinkActionsService);
  private readonly router = inject(Router);

  /** The row is a real link; the open is recorded like a feed open. */
  opened(link: LinkResponse): void {
    this.actions.open(link);
  }

  /** All links with the source's folder (or Unsorted) in the right half (from 80em). */
  async sideBySide(link: LinkResponse): Promise<boolean> {
    return this.router.navigate([`/${APP_PATH.Links}`], {
      queryParams: { [SPLIT_QUERY_PARAM]: splitParamValue(link.folderId) },
    });
  }

  /** The reminder presets for the source. */
  async remind(link: LinkResponse): Promise<void> {
    await this.actions.remind(link);
  }
}

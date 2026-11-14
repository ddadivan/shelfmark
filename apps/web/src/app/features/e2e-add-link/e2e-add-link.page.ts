import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ButtonComponent } from '@shelfmark/ui';
import { AddLinkDialogService } from '../links/services/add-link-dialog.service';
import { ADD_LINK_ACTION } from '../links/models/add-link-action.const';
import { E2E_ADD_LINK_OUTCOME } from './models/e2e-add-link-outcome.const';

/**
 * Test fixture, only routed in the `e2e` build configuration (`app.routes.e2e.ts`): opens the
 * add-link dialog against the mock APIs and prints how it ended, until the library page hosts
 * the real entry point. Fixture text is intentionally untranslated: the page never ships.
 */
@Component({
  selector: 'app-e2e-add-link-page',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './e2e-add-link.page.html',
})
export default class E2eAddLinkPage {
  private readonly addLink = inject(AddLinkDialogService);
  protected readonly outcome = signal<string>(E2E_ADD_LINK_OUTCOME.None);

  protected async open(): Promise<void> {
    const result = await this.addLink.open();
    if (result?.action === ADD_LINK_ACTION.Saved) {
      this.outcome.set(
        `${E2E_ADD_LINK_OUTCOME.SavedPrefix}${result.link.title} | ${result.link.url}`,
      );
    } else if (result?.action === ADD_LINK_ACTION.OpenExisting) {
      this.outcome.set(`${E2E_ADD_LINK_OUTCOME.OpenExistingPrefix}${result.existing.id}`);
    } else {
      this.outcome.set(E2E_ADD_LINK_OUTCOME.Dismissed);
    }
  }
}

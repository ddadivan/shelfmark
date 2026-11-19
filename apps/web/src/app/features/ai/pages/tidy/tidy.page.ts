import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent, IconComponent, ICON_SIZE, ProgressBarComponent } from '@shelfmark/ui';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { ToastAboveDirective } from '../../../../core/layout/toast-above.directive';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { APP_PATH } from '../../../../models/app-path.const';
import { FoldersStore } from '../../../../stores/folders.store';
import { TidyRowComponent } from '../../components/tidy-row/tidy-row.component';
import type { TidyChipToggle } from '../../models/tidy-chip-toggle.interface';
import { TIDY_IMPORT_PARAM } from '../../../import/models/tidy-import-param.const';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { TidyStore } from '../../services/tidy.store';

/**
 * Tidy Unsorted (`AiTidy`, `MobileAi` 6; AI-2): the links in Unsorted with their suggestions,
 * every chip selected; a tap leaves a chip out, Skip keeps a link as it is, one "Apply to {n}
 * links" sends the run. Desktop has Cancel and Apply in the header; the mobile shell a glass bar
 * where the tab bar is (the shell hides it on this page). "Nothing to tidy" when the list is
 * empty or every link is skipped and no page follows; with more links after these and nothing
 * left to apply here, "Show the next links" reads the next page. Renders nothing while AI is off
 * and leaves for Unsorted.
 */
@Component({
  selector: 'app-tidy-page',
  imports: [
    NgTemplateOutlet,
    TranslocoPipe,
    ButtonComponent,
    IconComponent,
    ProgressBarComponent,
    ToastAboveDirective,
    TidyRowComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tidy.page.html',
  styleUrl: './tidy.page.scss',
  providers: [TidyStore],
})
export default class TidyPage {
  protected readonly store = inject(TidyStore);
  protected readonly settings = inject(AiSettingsStore);
  protected readonly compact = inject(ViewportService).compact;
  private readonly router = inject(Router);
  private readonly query = toSignal(inject(ActivatedRoute).queryParamMap);
  protected readonly unsortedHref = `/${APP_PATH.Unsorted}`;
  protected readonly pluralKey = pluralKey;
  protected readonly ICON_SIZE = ICON_SIZE;

  constructor() {
    void inject(FoldersStore).load();
    effect(() => {
      // `?import=<id>` limits the review to one import (the toast after its AI pass opens it).
      const importId = this.query()?.get(TIDY_IMPORT_PARAM) || null;
      void this.store.setImport(importId);
    });
    effect(() => {
      // AI was turned off meanwhile (another tab, Settings): nothing AI stays on screen.
      if (this.settings.loaded() && !this.settings.isOn()) {
        void this.router.navigateByUrl(this.unsortedHref);
      }
    });
  }

  protected async back(event?: MouseEvent): Promise<void> {
    event?.preventDefault();
    await this.router.navigateByUrl(this.unsortedHref);
  }

  /** "Review everything": the page without the import limit. */
  protected async showAll(): Promise<void> {
    await this.router.navigate([], {
      queryParams: { [TIDY_IMPORT_PARAM]: null },
      queryParamsHandling: 'merge',
    });
  }

  protected toggle(change: TidyChipToggle): void {
    this.store.toggle(change.id, change.selected);
  }
}

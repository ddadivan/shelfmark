import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent } from '@shelfmark/ui';
import { ViewportService } from '../../../core/layout/viewport.service';
import { APP_PATH } from '../../../models/app-path.const';

/**
 * The top of a settings page: the title and the line under it. On a phone, where the sections
 * are pages reached from the You list, a back control leads to that list.
 */
@Component({
  selector: 'app-settings-page-header',
  imports: [TranslocoPipe, ButtonComponent],
  templateUrl: './settings-page-header.component.html',
  styleUrl: './settings-page-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPageHeaderComponent {
  protected readonly viewport = inject(ViewportService);
  private readonly router = inject(Router);

  /** Already translated page title. */
  readonly title = input.required<string>();
  /** Already translated line under the title. */
  readonly description = input<string>();

  protected readonly listHref = `/${APP_PATH.Settings}`;

  protected async back(event: MouseEvent): Promise<void> {
    event.preventDefault();
    await this.router.navigateByUrl(this.listHref);
  }
}

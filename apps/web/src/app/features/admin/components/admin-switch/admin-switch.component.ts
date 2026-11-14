import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { SegmentedControlComponent, type SegmentedOption } from '@shelfmark/ui';
import { APP_PATH } from '../../../../models/app-path.const';
import { ADMIN_PATH } from '../../models/admin-path.const';
import type { AdminPath } from '../../models/admin-path.type';

/** "Feedback | Stats" at the top of both admin pages: picking the other one opens that page. */
@Component({
  selector: 'app-admin-switch',
  imports: [SegmentedControlComponent],
  templateUrl: './admin-switch.component.html',
  styleUrl: './admin-switch.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSwitchComponent {
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  /** The page this switch is on. */
  readonly active = input.required<AdminPath>();

  protected readonly label = computed(() => {
    this.i18n();
    return this.transloco.translate('admin.nav.label');
  });
  protected readonly options = computed<SegmentedOption[]>(() => {
    this.i18n();
    return [
      { value: ADMIN_PATH.Feedback, label: this.transloco.translate('admin.nav.feedback') },
      { value: ADMIN_PATH.Stats, label: this.transloco.translate('admin.nav.stats') },
    ];
  });

  protected async open(path: string): Promise<void> {
    if (path !== this.active()) {
      await this.router.navigateByUrl(`/${APP_PATH.Admin}/${path}`);
    }
  }
}

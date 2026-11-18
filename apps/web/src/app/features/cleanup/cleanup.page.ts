import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CLEANUP_STATE } from '@shelfmark/contracts';
import {
  AiLineComponent,
  ButtonComponent,
  EmptyStateComponent,
  MeterComponent,
  NoticeComponent,
  PanelComponent,
  ProgressBarComponent,
  SettingsRowComponent,
  SpinnerComponent,
  SwitchComponent,
} from '@shelfmark/ui';
import { pluralKey } from '../../core/i18n/plural-key';
import { LocaleService } from '../../core/i18n/locale.service';
import { ToastAboveDirective } from '../../core/layout/toast-above.directive';
import { ViewportService } from '../../core/layout/viewport.service';
import { APP_PATH } from '../../models/app-path.const';
import { SettingsPageHeaderComponent } from '../settings/components/settings-page-header/settings-page-header.component';
import { SETTINGS_PATH } from '../settings/models/settings-path.const';
import { CleanupDuplicateRowComponent } from './components/cleanup-duplicate-row/cleanup-duplicate-row.component';
import { CleanupTagRowComponent } from './components/cleanup-tag-row/cleanup-tag-row.component';
import { CLEANUP_VIEW } from './models/cleanup-view.const';
import { CleanupReportStore } from './services/cleanup-report.store';

/**
 * Library clean-up (`AiCleanup`, F5, AI-5) at Settings › Library › Clean up (You › Library › Clean
 * up on the phone, the same page in one column): duplicates and similar tags, a checkbox per row,
 * one "Apply {n} changes" with one Undo. States: never run (the lead, "Include AI checks" when AI
 * checks can run, "Check my library"), checking (progress; the report is kept when the page is
 * left), the report, "Your library is tidy" and the applied state with "Check again". Desktop has
 * Cancel and Apply in the header; the mobile shell a bar above the tab bar.
 */
@Component({
  selector: 'app-cleanup-page',
  imports: [
    NgTemplateOutlet,
    TranslocoPipe,
    AiLineComponent,
    ButtonComponent,
    EmptyStateComponent,
    MeterComponent,
    NoticeComponent,
    PanelComponent,
    ProgressBarComponent,
    SettingsRowComponent,
    SpinnerComponent,
    SwitchComponent,
    ToastAboveDirective,
    SettingsPageHeaderComponent,
    CleanupDuplicateRowComponent,
    CleanupTagRowComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cleanup.page.html',
  styleUrl: './cleanup.page.scss',
  providers: [CleanupReportStore],
})
export default class CleanupPage {
  protected readonly store = inject(CleanupReportStore);
  protected readonly compact = inject(ViewportService).compact;
  protected readonly locale = inject(LocaleService);
  private readonly router = inject(Router);
  protected readonly libraryHref = `/${APP_PATH.Settings}/${SETTINGS_PATH.Library}`;
  protected readonly CLEANUP_VIEW = CLEANUP_VIEW;
  protected readonly CLEANUP_STATE = CLEANUP_STATE;
  protected readonly pluralKey = pluralKey;

  /** "Checked 2 minutes ago. …" once there is a run, else the lead. */
  protected readonly checkedWhen = computed(() => {
    const at = this.store.report()?.checkedAt;
    return at ? this.locale.formatRelative(at, Date.now()) : null;
  });

  /** Progress of the AI checks in percent (0 without links to check). */
  protected readonly percent = computed(() => {
    const report = this.store.report();
    return report && report.total > 0 ? (report.checked / report.total) * 100 : 0;
  });

  protected async cancel(): Promise<void> {
    await this.router.navigateByUrl(this.libraryHref);
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent, SettingsRowComponent, SettingsSectionComponent } from '@shelfmark/ui';
import { EXPORT_FORMAT, type ExportFormat } from '@shelfmark/contracts';
import { ExportActionsService } from '../../export/services/export-actions.service';
import { SettingsPageHeaderComponent } from '../settings-page-header/settings-page-header.component';

/** `/settings/import-export`: download everything as JSON or as a browser bookmarks file. */
@Component({
  selector: 'app-settings-export-page',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    SettingsPageHeaderComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
  ],
  templateUrl: './import-export.page.html',
  styleUrl: './import-export.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ImportExportPage {
  private readonly exporter = inject(ExportActionsService);
  protected readonly EXPORT_FORMAT = EXPORT_FORMAT;

  protected async exportAll(format: ExportFormat): Promise<void> {
    await this.exporter.download(format);
  }
}

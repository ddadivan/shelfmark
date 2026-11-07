import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LogoComponent } from '@shelfmark/ui';
import { PROJECT_ISSUES_URL } from './models/project-issues-url.const';

@Component({
  selector: 'app-privacy-page',
  imports: [RouterLink, TranslocoPipe, LogoComponent],
  templateUrl: './privacy.page.html',
  styleUrl: './privacy.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PrivacyPage {
  protected readonly issuesUrl = PROJECT_ISSUES_URL;
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BADGE_TONE, BadgeComponent } from '@shelfmark/ui';
import { APP_PATH } from '../../../models/app-path.const';
import { SettingsPageHeaderComponent } from '../../settings/components/settings-page-header/settings-page-header.component';
import { SETTINGS_PATH } from '../../settings/models/settings-path.const';
import { ConnectAssistantComponent } from './components/connect-assistant/connect-assistant.component';

/**
 * `/settings/ai/connect` (Shelf 15-tools "Connect your assistant"): a page of its own under
 * Settings › AI, with the Pro mark next to the lead, then the tokens, how to connect and what an
 * assistant can do (`app-connect-assistant`). The phone reaches it from You › AI.
 */
@Component({
  selector: 'app-connect-page',
  imports: [TranslocoPipe, BadgeComponent, ConnectAssistantComponent, SettingsPageHeaderComponent],
  templateUrl: './connect.page.html',
  styleUrl: './connect.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ConnectPage {
  protected readonly BADGE_TONE = BADGE_TONE;
  protected readonly aiHref = `/${APP_PATH.Settings}/${SETTINGS_PATH.Ai}`;
}

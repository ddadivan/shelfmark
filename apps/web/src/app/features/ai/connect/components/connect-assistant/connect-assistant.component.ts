import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MCP_LIMIT } from '@shelfmark/contracts';
import {
  AVATAR_SIZE,
  AvatarComponent,
  BADGE_TONE,
  BadgeComponent,
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  EmptyStateComponent,
  NOTICE_KIND,
  NoticeComponent,
  SettingsRowComponent,
  SettingsSectionComponent,
} from '@shelfmark/ui';
import { AuthStore } from '../../../../../core/auth/auth.store';
import { activeLang } from '../../../../../core/i18n/active-lang';
import { LocaleService } from '../../../../../core/i18n/locale.service';
import { MCP_SERVER_URL } from '../../models/mcp-server-url.const';
import { McpConnectActions } from '../../services/mcp-connect-actions.service';
import { McpTokensStore } from '../../services/mcp-tokens.store';
import { McpHowToComponent } from '../mcp-how-to/mcp-how-to.component';

/**
 * "Connect your assistant" on Settings › AI and You › AI (AiConnect, #395): the server address with
 * Copy, Create token, the connected tokens (name, last four, last use, calls this week, notes) with
 * Revoke, the empty state and the how-to. Free and demo accounts see the group with why they can't
 * create a token; tokens they already have stay listed and revocable.
 */
@Component({
  selector: 'app-connect-assistant',
  imports: [
    AvatarComponent,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    McpHowToComponent,
    NoticeComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
    TranslocoPipe,
  ],
  templateUrl: './connect-assistant.component.html',
  styleUrl: './connect-assistant.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectAssistantComponent {
  protected readonly store = inject(McpTokensStore);
  protected readonly actions = inject(McpConnectActions);
  private readonly auth = inject(AuthStore);
  private readonly locale = inject(LocaleService);
  private readonly transloco = inject(TranslocoService);

  protected readonly AVATAR_SIZE = AVATAR_SIZE;
  protected readonly BADGE_TONE = BADGE_TONE;
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly MCP_LIMIT = MCP_LIMIT;

  protected readonly url = inject(MCP_SERVER_URL);
  protected readonly isDemo = computed(() => this.auth.user()?.isDemo ?? false);

  /** Why Create token is off, as a key: the demo or an account without Pro. */
  protected readonly blockedKey = computed(() => {
    if (!this.store.loaded()) return null;
    if (this.isDemo()) return 'ai.connect.demo';
    if (!this.store.available()) return 'ai.connect.pro';
    return null;
  });

  /** The connected tokens with their usage line in the app language. */
  protected readonly rows = computed(() => {
    activeLang();
    const now = Date.now();
    return this.store.items().map((token) => ({
      token,
      usage:
        token.lastUsedAt === null
          ? this.transloco.translate('ai.connect.list.never', {
              date: this.locale.formatDate(token.createdAt),
            })
          : this.transloco.translate('ai.connect.list.used', {
              when: this.locale.formatRelative(token.lastUsedAt, now),
              calls: this.locale.formatNumber(token.callsThisWeek),
            }),
    }));
  });

  constructor() {
    void this.store.load();
  }
}

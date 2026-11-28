import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MCP_LIMIT } from '@shelfmark/contracts';
import {
  BADGE_TONE,
  BadgeComponent,
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  NOTICE_KIND,
  NoticeComponent,
  SettingsRowComponent,
  SettingsSectionComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
} from '@shelfmark/ui';
import { AuthStore } from '../../../../../core/auth/auth.store';
import { activeLang } from '../../../../../core/i18n/active-lang';
import { LocaleService } from '../../../../../core/i18n/locale.service';
import type { McpTokenRow } from '../../models/mcp-token-row.interface';
import { McpConnectActions } from '../../services/mcp-connect-actions.service';
import { McpTokensStore } from '../../services/mcp-tokens.store';
import { mcpTokenRow } from '../../utils/mcp-token-row';
import { McpHowToComponent } from '../mcp-how-to/mcp-how-to.component';

/**
 * The body of the Connect your assistant page (Shelf 15-tools, #395): Tokens (name, created, last
 * use, expiry, the access badge, Revoke) with Create token, How to connect (the server address and
 * one setup per assistant) and What an assistant can do. A Free account sees the Pro card instead
 * of the how-to, a demo account why it cannot connect; tokens they already have stay listed and
 * revocable.
 */
@Component({
  selector: 'app-connect-assistant',
  imports: [
    BadgeComponent,
    ButtonComponent,
    McpHowToComponent,
    NoticeComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
    SkeletonComponent,
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

  protected readonly BADGE_TONE = BADGE_TONE;
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly MCP_LIMIT = MCP_LIMIT;
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;

  protected readonly isDemo = computed(() => this.auth.user()?.isDemo ?? false);

  /**
   * Why Create token is off, as a key: the demo (known from the session, so its notice stands from
   * the first frame and the page does not shrink when the tokens answer) or an account without Pro.
   */
  protected readonly blockedKey = computed(() => {
    if (this.isDemo()) return 'ai.connect.demo';
    if (!this.store.loaded()) return null;
    if (!this.store.available()) return 'ai.connect.pro';
    return null;
  });

  /** The tokens with their badge and meta line in the app language. */
  protected readonly rows = computed<McpTokenRow[]>(() => {
    activeLang();
    const now = Date.now();
    return this.store.items().map((token) =>
      mcpTokenRow(token, now, {
        date: (iso) => this.locale.formatDate(iso),
        relative: (iso) => this.locale.formatRelative(iso, now),
        number: (value) => this.locale.formatNumber(value),
        t: (key, params) => this.transloco.translate(key, params),
      }),
    );
  });

  constructor() {
    void this.store.load();
  }
}

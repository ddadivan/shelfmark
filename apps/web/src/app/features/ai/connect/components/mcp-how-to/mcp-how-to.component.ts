import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  SegmentedControlComponent,
  TOAST_KIND,
  ToastService,
  type SegmentedOption,
} from '@shelfmark/ui';
import { activeLang } from '../../../../../core/i18n/active-lang';
import { MCP_CLIENT } from '../../models/mcp-client.const';
import type { McpClient } from '../../models/mcp-client.type';
import { MCP_SERVER_URL } from '../../models/mcp-server-url.const';
import { McpConnectActions } from '../../services/mcp-connect-actions.service';
import { copyText } from '../../../../../core/browser/copy-text';
import { mcpClientSetup } from '../../utils/mcp-client-setup';

let nextId = 0;
/** The design's order: Claude Desktop first. */
const CLIENT_ORDER: readonly McpClient[] = [
  MCP_CLIENT.ClaudeDesktop,
  MCP_CLIENT.ClaudeCode,
  MCP_CLIENT.Cursor,
  MCP_CLIENT.VsCode,
];

/**
 * "How to connect" of Connect your assistant (Shelf 15-tools): the server address on a filled
 * block with Copy, a segmented choice of the assistant (those that accept a header: Claude
 * Desktop, Claude Code, Cursor, VS Code), its setup for this app's address with `<token>` where
 * the personal token goes and a Copy button, and a line that clients which only sign in through
 * OAuth cannot connect yet.
 */
@Component({
  selector: 'app-mcp-how-to',
  imports: [ButtonComponent, SegmentedControlComponent, TranslocoPipe],
  templateUrl: './mcp-how-to.component.html',
  styleUrl: './mcp-how-to.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class McpHowToComponent {
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;

  private readonly doc = inject(DOCUMENT);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly actions = inject(McpConnectActions);
  protected readonly url = inject(MCP_SERVER_URL);

  protected readonly panelId = `mcp-how-to-${nextId++}`;
  protected readonly client = signal<McpClient>(MCP_CLIENT.ClaudeDesktop);

  private readonly clients = computed(() =>
    CLIENT_ORDER.map((client) => ({
      client,
      key: `ai.connect.howTo.clients.${client}`,
      setup: mcpClientSetup(client, this.url),
    })),
  );
  protected readonly current = computed(
    () => this.clients().find((entry) => entry.client === this.client()) ?? null,
  );
  protected readonly clientOptions = computed<SegmentedOption[]>(() => {
    activeLang();
    return this.clients().map((entry) => ({
      value: entry.client,
      label: this.transloco.translate(`${entry.key}.title`),
    }));
  });

  protected choose(value: string): void {
    const client = CLIENT_ORDER.find((item) => item === value);
    if (client) this.client.set(client);
  }

  protected copyAddress(): void {
    void this.actions.copyAddress(this.url);
  }

  protected async copy(client: McpClient, setup: string): Promise<void> {
    const copied = await copyText(this.doc, setup);
    this.toasts.show(
      copied
        ? {
            kind: TOAST_KIND.Success,
            title: this.transloco.translate('ai.connect.howTo.copied', {
              client: this.transloco.translate(`ai.connect.howTo.clients.${client}.title`),
            }),
          }
        : { kind: TOAST_KIND.Danger, title: this.transloco.translate('ai.connect.copyFailed') },
    );
  }
}

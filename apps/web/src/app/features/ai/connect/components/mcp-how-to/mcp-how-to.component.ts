import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  TOAST_KIND,
  ToastService,
} from '@shelfmark/ui';
import { MCP_CLIENT } from '../../models/mcp-client.const';
import type { McpClient } from '../../models/mcp-client.type';
import { MCP_SERVER_URL } from '../../models/mcp-server-url.const';
import { copyText } from '../../utils/copy-text';
import { mcpClientSetup } from '../../utils/mcp-client-setup';

let nextId = 0;

/**
 * "How to connect" of Connect your assistant: a disclosure with the setup of each assistant that
 * accepts a header (Claude Code, Claude Desktop, Cursor, VS Code) for this app's server address,
 * `<token>` where the personal token goes, a Copy button per setup, and a line that clients which
 * only sign in through OAuth cannot connect yet.
 */
@Component({
  selector: 'app-mcp-how-to',
  imports: [ButtonComponent, TranslocoPipe],
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
  private readonly url = inject(MCP_SERVER_URL);

  protected readonly panelId = `mcp-how-to-${nextId++}`;
  protected readonly open = signal(false);

  protected readonly clients = computed(() =>
    Object.values(MCP_CLIENT).map((client) => ({
      client,
      key: `ai.connect.howTo.clients.${client}`,
      setup: mcpClientSetup(client, this.url),
    })),
  );

  protected toggle(): void {
    this.open.update((open) => !open);
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

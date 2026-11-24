import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '@shelfmark/ui';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { stubClipboard } from '../../../../../../testing/stub-clipboard';
import { axeViolations } from '../../../../../../testing/axe';
import { loadEnglish, provideTranslocoForTest } from '../../../../../testing/transloco-testing';
import { MCP_CLIENT } from '../../models/mcp-client.const';
import { MCP_SERVER_URL } from '../../models/mcp-server-url.const';
import { McpConnectActions } from '../../services/mcp-connect-actions.service';
import { mcpClientSetup } from '../../utils/mcp-client-setup';
import { McpHowToComponent } from './mcp-how-to.component';

const URL = 'https://shelfmark.example/api/mcp';

async function setup() {
  const show = vi.fn();
  const copyAddress = vi.fn().mockResolvedValue(true);
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: McpConnectActions, useValue: { copyAddress } },
      { provide: MCP_SERVER_URL, useValue: URL },
      { provide: ToastService, useValue: { show } },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(McpHowToComponent);
  await fixture.whenStable();
  /** Picks an assistant in the segmented choice (the native radio is the control). */
  const choose = async (name: string): Promise<void> => {
    const radio = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('input[type="radio"]'),
    ]
      .map((input) => input as HTMLInputElement)
      .find((input) => input.closest('label')?.textContent?.trim() === name);
    radio?.click();
    await fixture.whenStable();
  };
  return {
    show,
    copyAddress,
    choose,
    loader: TestbedHarnessEnvironment.loader(fixture),
    element: fixture.nativeElement as HTMLElement,
  };
}

let restore = (): void => undefined;

describe('McpHowToComponent', () => {
  afterEach(() => {
    restore();
    restore = () => undefined;
  });

  it('shows the address and one assistant at a time, without axe violations', async () => {
    const { loader, element, choose, copyAddress } = await setup();
    expect(element.textContent).toContain(URL);
    expect([...element.querySelectorAll('h3')].map((h) => h.textContent?.trim())).toEqual([
      'Claude Desktop',
    ]);
    // The block is exactly the setup for its assistant (address and `<token>` placeholder included).
    expect(element.querySelector('pre')?.textContent?.trim()).toBe(
      mcpClientSetup(MCP_CLIENT.ClaudeDesktop, URL),
    );
    await choose('VS Code');
    expect(element.querySelector('h3')?.textContent?.trim()).toBe('VS Code');
    expect(element.querySelector('pre')?.textContent?.trim()).toBe(
      mcpClientSetup(MCP_CLIENT.VsCode, URL),
    );
    expect(element.textContent).toContain('can’t connect yet');
    await (
      await loader.getHarness(UiButtonHarness.with({ label: 'Copy the server address' }))
    ).click();
    expect(copyAddress).toHaveBeenCalledWith(URL);
    expect(await axeViolations(element)).toEqual([]);
  });

  it('copies one setup', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    restore = stubClipboard({ writeText });
    const { loader, show, choose } = await setup();
    await choose('Claude Code');
    await (
      await loader.getHarness(UiButtonHarness.with({ label: 'Copy the Claude Code setup' }))
    ).click();
    await vi.waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('claude mcp add')),
    );
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Claude Code setup copied' }),
    );
  });

  it('says so when the clipboard refuses', async () => {
    restore = stubClipboard(undefined);
    const { loader, show, choose } = await setup();
    await choose('Cursor');
    await (
      await loader.getHarness(UiButtonHarness.with({ label: 'Copy the Cursor setup' }))
    ).click();
    await vi.waitFor(() =>
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('Couldn’t copy') }),
      ),
    );
  });
});

import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '@shelfmark/ui';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { stubClipboard } from '../../../../../../testing/stub-clipboard';
import { axeViolations } from '../../../../../../testing/axe';
import { loadEnglish, provideTranslocoForTest } from '../../../../../testing/transloco-testing';
import { MCP_SERVER_URL } from '../../models/mcp-server-url.const';
import { McpHowToComponent } from './mcp-how-to.component';

const URL = 'https://shelfmark.example/api/mcp';

async function setup() {
  const show = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: MCP_SERVER_URL, useValue: URL },
      { provide: ToastService, useValue: { show } },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(McpHowToComponent);
  await fixture.whenStable();
  return {
    show,
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

  it('opens the setup of each assistant with the address, without axe violations', async () => {
    const { loader, element } = await setup();
    const toggle = await loader.getHarness(
      UiButtonHarness.with({ text: 'How to connect: Claude, Cursor, VS Code' }),
    );
    expect(await toggle.isExpanded()).toBe(false);
    expect(element.querySelector('pre')).toBeNull();

    await toggle.click();
    expect(await toggle.isExpanded()).toBe(true);
    expect([...element.querySelectorAll('h3')].map((h) => h.textContent?.trim())).toEqual([
      'Claude Code',
      'Claude Desktop',
      'Cursor',
      'VS Code',
    ]);
    const code = [...element.querySelectorAll('pre')].map((pre) => pre.textContent ?? '');
    expect(code).toHaveLength(4);
    expect(code.every((text) => text.includes(URL) && text.includes('<token>'))).toBe(true);
    expect(element.textContent).toContain('can’t connect yet');
    expect(await axeViolations(element)).toEqual([]);
  });

  it('copies one setup', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    restore = stubClipboard({ writeText });
    const { loader, show } = await setup();
    await (await loader.getHarness(UiButtonHarness.with({ text: /^How to connect/ }))).click();
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
    const { loader, show } = await setup();
    await (await loader.getHarness(UiButtonHarness.with({ text: /^How to connect/ }))).click();
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

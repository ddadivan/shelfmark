import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { McpTokensResponse } from '@shelfmark/contracts';
import { DialogService, ToastService } from '@shelfmark/ui';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { of, throwError } from 'rxjs';
import { stubClipboard } from '../../../../../../testing/stub-clipboard';
import { axeViolations } from '../../../../../../testing/axe';
import { fakeMcpApi, mcpToken } from '../../../../../../testing/fake-mcp-api';
import { AuthStore } from '../../../../../core/auth/auth.store';
import { loadEnglish, provideTranslocoForTest } from '../../../../../testing/transloco-testing';
import { CreateTokenDialogComponent } from '../create-token-dialog/create-token-dialog.component';
import { MCP_API } from '../../models/mcp-api.const';
import { MCP_SERVER_URL } from '../../models/mcp-server-url.const';
import { ConnectAssistantComponent } from './connect-assistant.component';

const URL = 'https://shelfmark.example/api/mcp';

async function setup(
  response: McpTokensResponse = { available: true, items: [] },
  options: { demo?: boolean; confirm?: boolean; failLoad?: boolean } = {},
) {
  const api = fakeMcpApi(response);
  if (options.failLoad) api.list.mockReturnValue(throwError(() => new Error('down')));
  const confirm = vi.fn(() => Promise.resolve(options.confirm ?? true));
  const open = vi.fn(() => ({ result: Promise.resolve(undefined) }));
  const show = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: MCP_API, useValue: api },
      { provide: MCP_SERVER_URL, useValue: URL },
      { provide: DialogService, useValue: { confirm, open } },
      { provide: ToastService, useValue: { show } },
      {
        provide: AuthStore,
        useValue: { user: signal({ name: 'Ada', isDemo: options.demo ?? false }) },
      },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(ConnectAssistantComponent);
  await fixture.whenStable();
  return {
    api,
    confirm,
    open,
    show,
    fixture,
    loader: TestbedHarnessEnvironment.loader(fixture),
    element: fixture.nativeElement as HTMLElement,
  };
}

let restore = (): void => undefined;

describe('ConnectAssistantComponent', () => {
  afterEach(() => {
    restore();
    restore = () => undefined;
  });

  it('shows the server address, Create token and the empty state, without axe violations', async () => {
    const { loader, element } = await setup();
    expect(element.querySelector('h2')?.textContent).toContain('Connect your assistant');
    expect(element.textContent).toContain('Read-only: it can’t change or delete anything.');
    expect(element.querySelector('code')?.textContent).toBe(URL);
    expect(element.textContent).toContain('No assistants connected');
    const create = await loader.getHarness(UiButtonHarness.with({ text: 'Create token' }));
    expect(await create.isDisabled()).toBe(false);
    expect(await axeViolations(element)).toEqual([]);
  });

  it('copies the server address', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    restore = stubClipboard({ writeText });
    const { loader, show } = await setup();
    await (
      await loader.getHarness(UiButtonHarness.with({ label: 'Copy the server address' }))
    ).click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(URL));
    expect(show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Server address copied' }));
  });

  it('opens the create dialog', async () => {
    const { loader, open } = await setup();
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Create token' }))).click();
    expect(open).toHaveBeenCalledWith(CreateTokenDialogComponent, expect.anything());
  });

  it('lists the tokens with last four, use and notes, without axe violations', async () => {
    const { element } = await setup({
      available: true,
      items: [
        mcpToken({
          id: 'a',
          name: 'Claude Desktop',
          lastUsedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
          callsThisWeek: 34,
          includeNotes: true,
        }),
        mcpToken({ id: 'b', name: 'Work laptop', last4: 'Zz09' }),
      ],
    });
    const items = [...element.querySelectorAll('li')].map((item) => item.textContent ?? '');
    expect(items[0]).toContain('Claude Desktop');
    expect(items[0]).toContain('Ends in aX9c');
    expect(items[0]).toContain('Last used 2 hours ago, calls this week: 34');
    expect(items[0]).toContain('Includes notes');
    expect(items[1]).toContain('Ends in Zz09');
    expect(items[1]).toContain('never used');
    expect(items[1]).not.toContain('Includes notes');
    expect(element.textContent).not.toContain('No assistants connected');
    expect(await axeViolations(element)).toEqual([]);
  });

  it('revokes after a confirmation that names the token', async () => {
    const { api, confirm, show, loader, fixture, element } = await setup({
      available: true,
      items: [mcpToken({ id: 'a', name: 'Claude Desktop' })],
    });
    await (
      await loader.getHarness(UiButtonHarness.with({ label: 'Revoke Claude Desktop' }))
    ).click();
    await vi.waitFor(() => expect(api.revoke).toHaveBeenCalledWith('a'));
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Revoke Claude Desktop?', destructive: true }),
    );
    await fixture.whenStable();
    expect(show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Token revoked' }));
    expect(element.textContent).toContain('No assistants connected');
  });

  it('says so when revoking fails and keeps the token', async () => {
    const { api, show, loader, fixture, element } = await setup({
      available: true,
      items: [mcpToken({ name: 'Claude Desktop' })],
    });
    api.revoke.mockReturnValue(throwError(() => new Error('down')));
    await (
      await loader.getHarness(UiButtonHarness.with({ label: 'Revoke Claude Desktop' }))
    ).click();
    await vi.waitFor(() =>
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Couldn’t revoke the token. Try again.' }),
      ),
    );
    await fixture.whenStable();
    expect(element.querySelectorAll('li')).toHaveLength(1);
  });

  it('keeps the token when the confirmation is cancelled', async () => {
    const { api, loader, element } = await setup(
      { available: true, items: [mcpToken({ name: 'Claude Desktop' })] },
      { confirm: false },
    );
    await (
      await loader.getHarness(UiButtonHarness.with({ label: 'Revoke Claude Desktop' }))
    ).click();
    expect(api.revoke).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Claude Desktop');
  });

  it('says it is part of Pro and turns Create off, keeping the tokens revocable', async () => {
    const { loader, element } = await setup({ available: false, items: [mcpToken()] });
    expect(element.textContent).toContain('Connecting an assistant is part of Pro.');
    const create = await loader.getHarness(UiButtonHarness.with({ text: 'Create token' }));
    expect(await create.isDisabled()).toBe(true);
    const revoke = await loader.getHarness(UiButtonHarness.with({ text: 'Revoke' }));
    expect(await revoke.isDisabled()).toBe(false);
  });

  it('tells the demo it cannot connect an assistant', async () => {
    const { element } = await setup({ available: false, items: [] }, { demo: true });
    expect(element.textContent).toContain('The demo can’t connect an assistant.');
  });

  it('offers Try again when the list fails to load', async () => {
    const { api, element, loader, fixture } = await setup(undefined, { failLoad: true });
    expect(element.textContent).toContain('Couldn’t load your tokens.');
    // Try again sits in the notice's action slot, not inside its text.
    expect(element.querySelector('.ui-notice__action ui-button')?.textContent).toContain(
      'Try again',
    );
    api.list.mockReturnValue(of({ available: true, items: [] }));
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Try again' }))).click();
    await fixture.whenStable();
    expect(element.textContent).not.toContain('Couldn’t load your tokens.');
    expect(element.textContent).toContain('No assistants connected');
  });
});

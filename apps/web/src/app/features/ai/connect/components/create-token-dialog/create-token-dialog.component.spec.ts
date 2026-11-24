import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DIALOG_SIZE, DialogService, ToastService } from '@shelfmark/ui';
import { UiButtonHarness, UiDialogHarness } from '@shelfmark/ui/testing';
import { of, throwError } from 'rxjs';
import { stubClipboard } from '../../../../../../testing/stub-clipboard';
import { axeViolations } from '../../../../../../testing/axe';
import { fakeMcpApi, mcpToken } from '../../../../../../testing/fake-mcp-api';
import { loadEnglish, provideTranslocoForTest } from '../../../../../testing/transloco-testing';
import { MCP_API } from '../../models/mcp-api.const';
import { McpTokensStore } from '../../services/mcp-tokens.store';
import { CreateTokenDialogComponent } from './create-token-dialog.component';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class HostComponent {}

/** Shaped like a token but short, so no secret scanner mistakes it for a real one. */
const SECRET = 'smk_live_SpecOnly1234abcdwxyz';

async function setup(api = fakeMcpApi()) {
  const show = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: MCP_API, useValue: api },
      { provide: ToastService, useValue: { show } },
    ],
  });
  await loadEnglish();
  await TestBed.inject(McpTokensStore).load();
  const fixture = TestBed.createComponent(HostComponent);
  const ref = TestBed.inject(DialogService).open(CreateTokenDialogComponent, {
    size: DIALOG_SIZE.Md,
  });
  const result = vi.fn();
  void ref.result.then(result);
  const loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
  const dialog = await loader.getHarness(UiDialogHarness);
  return { api, show, loader, dialog, result };
}

function container(): HTMLElement {
  const found = document.querySelector<HTMLElement>('.cdk-dialog-container');
  if (!found) throw new Error('No dialog');
  return found;
}

function typeName(value: string): void {
  const input = container().querySelector<HTMLInputElement>('input');
  if (!input) throw new Error('No name field');
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

async function create(loader: ReturnType<typeof TestbedHarnessEnvironment.documentRootLoader>) {
  await (await loader.getHarness(UiButtonHarness.with({ text: 'Create token' }))).click();
}

let restore = (): void => undefined;

describe('CreateTokenDialogComponent', () => {
  afterEach(() => {
    restore();
    restore = () => undefined;
    document.querySelectorAll('.cdk-overlay-container').forEach((element) => {
      element.replaceChildren();
    });
  });

  it('asks for a name with notes off, without axe violations', async () => {
    const { dialog } = await setup();
    expect(await dialog.getTitle()).toBe('Create a token');
    expect(await dialog.getBodyText()).toContain('Your assistant will also see the notes');
    const notes = container().querySelector('button[role="switch"][aria-label="Include my notes"]');
    expect(notes?.getAttribute('aria-checked')).toBe('false');
    expect(await axeViolations(container())).toEqual([]);
  });

  it('sends the chosen access and expiry', async () => {
    const { api, loader } = await setup();
    api.create.mockReturnValue(of({ token: mcpToken(), secret: SECRET }));
    typeName('Cursor');
    const radio = (value: string) =>
      container().querySelector<HTMLInputElement>(`input[type="radio"][value="${value}"]`);
    radio('save')?.click();
    radio('never')?.click();
    await create(loader);
    await vi.waitFor(() =>
      expect(api.create).toHaveBeenCalledWith({
        name: 'Cursor',
        includeNotes: false,
        access: 'save',
        expiresInDays: null,
      }),
    );
  });

  it('refuses an empty or blank name', async () => {
    const { api, loader, dialog } = await setup();
    await create(loader);
    await vi.waitFor(async () =>
      expect(await dialog.getBodyText()).toContain('Give the token a name.'),
    );
    typeName('   ');
    await create(loader);
    expect(api.create).not.toHaveBeenCalled();
  });

  it('creates the token, shows it once masked with a warning, and copies the whole value', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    restore = stubClipboard({ writeText });
    const { api, show, loader, dialog } = await setup();
    api.create.mockReturnValue(of({ token: mcpToken({ name: 'Claude Desktop' }), secret: SECRET }));

    typeName('  Claude Desktop ');
    container().querySelector<HTMLButtonElement>('button[role="switch"]')?.click();
    await create(loader);

    await vi.waitFor(async () => expect(await dialog.getTitle()).toBe('Token for Claude Desktop'));
    // Access read only and 90 days unless chosen otherwise (Shelf 15-tools "New token").
    expect(api.create).toHaveBeenCalledWith({
      name: 'Claude Desktop',
      includeNotes: true,
      access: 'read',
      expiresInDays: 90,
    });
    const body = await dialog.getBodyText();
    expect(body).toContain('smk_live_Spec…wxyz');
    expect(body).not.toContain(SECRET);
    expect(body).toContain('you won’t see it again');
    expect(await axeViolations(container())).toEqual([]);

    await (await loader.getHarness(UiButtonHarness.with({ label: 'Copy the token' }))).click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(SECRET));
    expect(show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Token copied' }));
  });

  it('shows the whole token selected when the clipboard refuses', async () => {
    restore = stubClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });
    const { api, loader, dialog } = await setup();
    api.create.mockReturnValue(of({ token: mcpToken(), secret: SECRET }));
    typeName('Laptop');
    await create(loader);
    await vi.waitFor(async () => expect(await dialog.getTitle()).toBe('Token for Claude Desktop'));

    await (await loader.getHarness(UiButtonHarness.with({ label: 'Copy the token' }))).click();
    await vi.waitFor(() =>
      expect(container().querySelector<HTMLInputElement>('input[readonly]')?.value).toBe(SECRET),
    );
    expect(await dialog.getBodyText()).toContain('press Ctrl+C or ⌘C');
  });

  it('forgets the secret when it closes: nothing on the page or in storage', async () => {
    const { api, loader, dialog, result } = await setup();
    api.create.mockReturnValue(of({ token: mcpToken(), secret: SECRET }));
    typeName('Laptop');
    await create(loader);
    await vi.waitFor(async () => expect(await dialog.getBodyText()).toContain('smk_live_Spec'));

    await (await loader.getHarness(UiButtonHarness.with({ text: 'Done' }))).click();
    await vi.waitFor(() => expect(result).toHaveBeenCalled());
    expect(document.body.innerHTML).not.toContain('smk_live_Spec');
    expect(JSON.stringify({ ...localStorage })).not.toContain(SECRET);
    expect(JSON.stringify({ ...sessionStorage })).not.toContain(SECRET);
    expect(JSON.stringify(TestBed.inject(McpTokensStore).items())).not.toContain(SECRET);
  });

  it('stays open with the reason when creating fails', async () => {
    const { api, loader, dialog, result } = await setup();
    api.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    typeName('Eleventh');
    await create(loader);
    await vi.waitFor(async () =>
      expect(await dialog.getBodyText()).toContain('You have 10 tokens. Revoke one'),
    );
    expect(result).not.toHaveBeenCalled();
  });
});

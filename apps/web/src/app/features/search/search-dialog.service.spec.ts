import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MOCK_LIBRARY_COUNTS } from '@shelfmark/contracts/testing';
import { DialogService } from '@shelfmark/ui';
import { of } from 'rxjs';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import { LinkActionsService } from '../links/link-actions.service';
import { FOLDERS_API } from '../links/models/folders-api.const';
import { LINKS_API } from '../links/models/links-api.const';
import { TAGS_API } from '../links/models/tags-api.const';
import { SearchDialogService } from './search-dialog.service';

function keydown(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent('keydown', { cancelable: true, ...init });
}

describe('SearchDialogService shortcut', () => {
  function setup(openDialogs: unknown[] = []) {
    const dialogs = { open: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: DialogService, useValue: dialogs },
        { provide: Dialog, useValue: { openDialogs } },
      ],
    });
    return { dialogs, service: TestBed.inject(SearchDialogService) };
  }

  it('opens for Cmd+K and for Ctrl+K and stops the browser default', () => {
    const { dialogs, service } = setup();
    const meta = keydown({ key: 'k', code: 'KeyK', metaKey: true });
    const ctrl = keydown({ key: 'k', code: 'KeyK', ctrlKey: true });

    expect(service.handleShortcut(meta)).toBe(true);
    expect(service.handleShortcut(ctrl)).toBe(true);

    expect(dialogs.open).toHaveBeenCalledTimes(2);
    expect(dialogs.open.mock.calls[0][1]).toMatchObject({ variant: 'command' });
    expect(meta.defaultPrevented).toBe(true);
    expect(ctrl.defaultPrevented).toBe(true);
  });

  it('works on a layout where the key is not "k" (matched by code)', () => {
    const { dialogs, service } = setup();

    expect(service.handleShortcut(keydown({ key: 'л', code: 'KeyK', metaKey: true }))).toBe(true);
    expect(dialogs.open).toHaveBeenCalledTimes(1);
  });

  it('ignores a keydown without a key (autofill) and IME composition', () => {
    const { dialogs, service } = setup();

    expect(service.handleShortcut(new Event('keydown') as KeyboardEvent)).toBe(false);
    expect(
      service.handleShortcut(keydown({ key: 'k', code: 'KeyK', metaKey: true, isComposing: true })),
    ).toBe(false);
    expect(dialogs.open).not.toHaveBeenCalled();
  });

  it('uses the key on a Latin layout: a Dvorak J on the physical K position is not the shortcut', () => {
    const { dialogs, service } = setup();

    expect(service.handleShortcut(keydown({ key: 'j', code: 'KeyK', ctrlKey: true }))).toBe(false);
    expect(service.handleShortcut(keydown({ key: 'k', code: 'KeyV', ctrlKey: true }))).toBe(true);
    expect(dialogs.open).toHaveBeenCalledTimes(1);
  });

  it('ignores a plain K, other modifiers and other keys', () => {
    const { dialogs, service } = setup();

    expect(service.handleShortcut(keydown({ key: 'k', code: 'KeyK' }))).toBe(false);
    expect(
      service.handleShortcut(keydown({ key: 'k', code: 'KeyK', ctrlKey: true, shiftKey: true })),
    ).toBe(false);
    expect(
      service.handleShortcut(keydown({ key: 'k', code: 'KeyK', metaKey: true, altKey: true })),
    ).toBe(false);
    expect(service.handleShortcut(keydown({ key: 'j', code: 'KeyJ', metaKey: true }))).toBe(false);
    expect(dialogs.open).not.toHaveBeenCalled();
  });

  it('does nothing while another dialog is open, and leaves the key alone', () => {
    const { dialogs, service } = setup([{}]);
    const event = keydown({ key: 'k', code: 'KeyK', metaKey: true });

    service.handleShortcut(event);

    expect(dialogs.open).not.toHaveBeenCalled();
  });
});

describe('SearchDialogService dialog', () => {
  async function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoForTest(),
        { provide: LINKS_API, useValue: { list: () => of({ items: [], nextCursor: null }) } },
        {
          provide: FOLDERS_API,
          useValue: { list: () => of({ items: [], counts: MOCK_LIBRARY_COUNTS }) },
        },
        { provide: TAGS_API, useValue: { list: () => of([]) } },
        { provide: LinkActionsService, useValue: { open: vi.fn() } },
      ],
    });
    await loadEnglish();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    return { service: TestBed.inject(SearchDialogService), trigger };
  }

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('focuses the search field on open and gives focus back to the opener on Esc', async () => {
    const { service, trigger } = await setup();

    service.open();
    await vi.waitFor(() => expect(document.activeElement?.getAttribute('role')).toBe('combobox'));
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );

    await vi.waitFor(() => expect(document.activeElement).toBe(trigger), { timeout: 2000 });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens only one search dialog', async () => {
    const { service } = await setup();

    service.open();
    service.open();

    await vi.waitFor(() => expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1));
  });
});

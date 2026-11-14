import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { DialogService } from '@shelfmark/ui';
import { UiStore } from '../../../stores/ui.store';
import { ShortcutsDialogService } from './shortcuts-dialog.service';
import { ShortcutsDialogComponent } from '../components/shortcuts-dialog/shortcuts-dialog.component';

function keydown(init: KeyboardEventInit, target?: Element): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { cancelable: true, bubbles: true, ...init });
  target?.dispatchEvent(event);
  return event;
}

describe('ShortcutsDialogService', () => {
  beforeEach(() => localStorage.clear());
  afterAll(() => localStorage.clear());

  function setup(openDialogs: unknown[] = []) {
    const dialogs = { open: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: DialogService, useValue: dialogs },
        { provide: Dialog, useValue: { openDialogs } },
      ],
    });
    return { dialogs, service: TestBed.inject(ShortcutsDialogService) };
  }

  it('opens the list for "?" and stops the key', () => {
    const { dialogs, service } = setup();
    const event = keydown({ key: '?', shiftKey: true });

    expect(service.handleShortcut(event)).toBe(true);

    expect(dialogs.open).toHaveBeenCalledWith(ShortcutsDialogComponent, { size: 'md' });
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores "?" typed in a field', () => {
    const { dialogs, service } = setup();
    const field = document.createElement('input');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    const combobox = document.createElement('div');
    combobox.setAttribute('role', 'combobox');
    document.body.append(field, editable, combobox);

    for (const target of [field, editable, combobox]) {
      const event = new KeyboardEvent('keydown', { key: '?', cancelable: true, bubbles: true });
      target.dispatchEvent(event);
      expect(
        service.handleShortcut(Object.defineProperty(event, 'target', { value: target })),
      ).toBe(false);
    }
    field.remove();
    editable.remove();
    combobox.remove();

    expect(dialogs.open).not.toHaveBeenCalled();
  });

  it('ignores other keys, Ctrl, Cmd and Alt combinations, composition and handled keys', () => {
    const { dialogs, service } = setup();
    const handled = keydown({ key: '?' });
    handled.preventDefault();

    expect(service.handleShortcut(keydown({ key: '/' }))).toBe(false);
    expect(service.handleShortcut(keydown({ key: '?', ctrlKey: true }))).toBe(false);
    expect(service.handleShortcut(keydown({ key: '?', metaKey: true }))).toBe(false);
    expect(service.handleShortcut(keydown({ key: '?', altKey: true }))).toBe(false);
    expect(service.handleShortcut(keydown({ key: '?', isComposing: true }))).toBe(false);
    expect(service.handleShortcut(handled)).toBe(false);
    expect(dialogs.open).not.toHaveBeenCalled();
  });

  it('opens nothing while a dialog is open', () => {
    const { dialogs, service } = setup([{}]);

    service.open();
    expect(service.handleShortcut(keydown({ key: '?' }))).toBe(true);

    expect(dialogs.open).not.toHaveBeenCalled();
  });

  it('ignores "?" once single-key shortcuts are off, but the button path still opens the list', () => {
    const { dialogs, service } = setup();
    TestBed.inject(UiStore).setSingleKeyShortcuts(false);
    const event = keydown({ key: '?', shiftKey: true });

    expect(service.handleShortcut(event)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
    expect(dialogs.open).not.toHaveBeenCalled();

    service.open();
    expect(dialogs.open).toHaveBeenCalledOnce();
  });

  it('handles "?" again as soon as the preference is turned back on', () => {
    const { dialogs, service } = setup();
    const ui = TestBed.inject(UiStore);
    ui.setSingleKeyShortcuts(false);
    ui.setSingleKeyShortcuts(true);

    expect(service.handleShortcut(keydown({ key: '?', shiftKey: true }))).toBe(true);
    expect(dialogs.open).toHaveBeenCalledOnce();
  });
});

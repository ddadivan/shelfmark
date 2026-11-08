import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogComponent } from '../dialog/dialog.component';
import { DialogService } from '../dialog/dialog.service';
import { KEYBOARD_KEY } from '../keyboard';
import { DrawerComponent } from './drawer.component';
import { DrawerService } from './drawer.service';

@Component({
  imports: [DrawerComponent],
  template: `
    <ui-drawer closeLabel="Close menu"><button id="item" type="button">Rename</button></ui-drawer>
  `,
})
class MenuComponent {}

@Component({
  imports: [DialogComponent],
  template: `<ui-dialog title="Rename" closeLabel="Close"><input aria-label="Name" /></ui-dialog>`,
})
class RenameComponent {}

function settle(): void {
  TestBed.tick();
}

function modals(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.cdk-dialog-container'));
}

describe('focus return for a dialog opened from a drawer', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((element) => {
      element.remove();
    });
  });

  async function openNested() {
    const drawer = TestBed.inject(DrawerService).open(MenuComponent, { ariaLabel: 'Menu' });
    settle();
    const item = document.getElementById('item') as HTMLElement;
    item.focus();
    const dialog = TestBed.inject(DialogService).open(RenameComponent);
    settle();
    // The menu item that opened the dialog disappears (a menu closing, a list re-rendering).
    item.remove();
    return { drawer, dialog };
  }

  it('moves focus to the drawer when the trigger is gone, so Esc still closes it', async () => {
    const { drawer, dialog } = await openNested();
    dialog.close();
    await vi.waitFor(() => {
      settle();
      expect(modals()).toHaveLength(1);
    });
    expect(document.activeElement).toBe(modals()[0]);

    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: KEYBOARD_KEY.Escape, bubbles: true, cancelable: true }),
    );
    settle();
    expect(drawer.isClosing).toBe(true);
  });

  it('leaves focus alone when the trigger took it back', async () => {
    const { dialog } = await openNested();
    const other = document.createElement('button');
    document.body.appendChild(other);
    dialog.close();
    other.focus();
    await vi.waitFor(() => {
      settle();
      expect(modals()).toHaveLength(1);
    });
    expect(document.activeElement).toBe(other);
    other.remove();
  });
});

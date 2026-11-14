import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { ButtonComponent } from '../../components/button/button.component';
import { UiDialogRef } from '../dialog/dialog-ref';
import { injectDialogData } from '../dialog/inject-dialog-data';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { DrawerComponent } from '../../components/drawer/drawer.component';
import { DrawerService } from './drawer.service';

@Component({
  imports: [DrawerComponent, ButtonComponent],
  template: `
    <ui-drawer closeLabel="Close menu">
      <span slot="head">Shelfmark</span>
      <a id="first" href="#all">All links</a>
      <a id="last" href="#work">Work</a>
      <ui-button slot="foot" (click)="ref.close('settings')">Settings</ui-button>
    </ui-drawer>
  `,
})
class MenuComponent {
  protected readonly ref = inject<UiDialogRef<string>>(UiDialogRef);
  protected readonly data = injectDialogData<{ readonly id: number } | undefined>();
}

function settle(): void {
  TestBed.tick();
}

async function closed(): Promise<void> {
  await vi.waitFor(() => {
    settle();
    expect(document.querySelector('.cdk-dialog-container')).toBeNull();
  });
}

function container(): HTMLElement {
  const element = document.querySelector<HTMLElement>('.cdk-dialog-container');
  if (!element) {
    throw new Error('no drawer open');
  }
  return element;
}

function press(key: string, shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
  (document.activeElement ?? document.body).dispatchEvent(event);
  return event;
}

describe('DrawerService', () => {
  let service: DrawerService;
  let trigger: HTMLButtonElement;

  beforeEach(() => {
    service = TestBed.inject(DrawerService);
    trigger = document.createElement('button');
    trigger.textContent = 'Menu';
    document.body.appendChild(trigger);
    trigger.focus();
  });

  afterEach(() => {
    trigger.remove();
    document.querySelectorAll('.cdk-overlay-container').forEach((element) => {
      element.remove();
    });
  });

  it('is a modal dialog with the given accessible name', () => {
    const ref = service.open(MenuComponent, { ariaLabel: 'Library menu' });
    settle();
    const root = container();
    expect(root.getAttribute('role')).toBe('dialog');
    expect(root.getAttribute('aria-modal')).toBe('true');
    expect(root.getAttribute('aria-label')).toBe('Library menu');
    expect(root.hasAttribute('aria-labelledby')).toBe(false);
    expect(document.querySelector('.ui-dialog-scrim')).not.toBeNull();
    ref.close();
  });

  it('pins the panel to the inline-end edge with side end', () => {
    const ref = service.open(MenuComponent, { ariaLabel: 'Library menu', side: 'end' });
    settle();
    const wrapper = container().closest<HTMLElement>('.cdk-global-overlay-wrapper');
    expect(wrapper?.style.justifyContent).toBe('flex-end');
    ref.close();
  });

  it('moves focus inside, wraps Tab and returns focus to the trigger', async () => {
    const ref = service.open(MenuComponent, { ariaLabel: 'Library menu' });
    settle();
    await vi.waitFor(() => {
      settle();
      expect(container().contains(document.activeElement)).toBe(true);
    });
    const anchors = document.querySelectorAll('.cdk-focus-trap-anchor');
    expect(anchors.length).toBe(2);
    // The trap keeps Tab inside: the focusable elements are all within the container.
    const tabbables = container().querySelectorAll<HTMLElement>('button, a[href]');
    expect(tabbables.length).toBeGreaterThanOrEqual(3);
    // Focus on the last element and move on: the CDK trap anchor sends it back in.
    tabbables[tabbables.length - 1].focus();
    anchors[1].dispatchEvent(new FocusEvent('focus'));
    await vi.waitFor(() => {
      expect(container().contains(document.activeElement)).toBe(true);
    });
    ref.close();
    await closed();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on Esc, playing the leave animation first', async () => {
    const ref = service.open(MenuComponent, { ariaLabel: 'Library menu' });
    settle();
    press(KEYBOARD_KEY.Escape);
    settle();
    expect(ref.isClosing).toBe(true);
    expect(ref.leaving()).toBe(true);
    await closed();
    expect(await ref.result).toBeUndefined();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on a scrim click', async () => {
    const ref = service.open(MenuComponent, { ariaLabel: 'Library menu' });
    settle();
    document.querySelector<HTMLElement>('.ui-dialog-scrim')?.click();
    settle();
    expect(ref.isClosing).toBe(true);
    await closed();
  });

  it('closes with the close button and with a result from the content', async () => {
    const first = service.open(MenuComponent, { ariaLabel: 'Library menu' });
    settle();
    container().querySelector<HTMLButtonElement>('button[aria-label="Close menu"]')?.click();
    await closed();
    expect(await first.result).toBeUndefined();

    const second = service.open<MenuComponent, string>(MenuComponent, {
      ariaLabel: 'Library menu',
    });
    settle();
    Array.from(container().querySelectorAll('button'))
      .find((element) => element.textContent.trim() === 'Settings')
      ?.click();
    await closed();
    expect(await second.result).toBe('settings');
  });

  it('passes data to the content', () => {
    const ref = service.open<MenuComponent, undefined, { readonly id: number }>(MenuComponent, {
      ariaLabel: 'Library menu',
      data: { id: 7 },
    });
    settle();
    expect(ref.componentInstance).toBeInstanceOf(MenuComponent);
    ref.close();
  });

  it('has no axe violations', async () => {
    const ref = service.open(MenuComponent, { ariaLabel: 'Library menu' });
    settle();
    expect(await axeViolations(container())).toEqual([]);
    ref.close();
  });
});

describe('DrawerComponent', () => {
  it('renders the slots and a 2.75rem close button named by closeLabel', () => {
    const fixture = TestBed.createComponent(DrawerComponent);
    fixture.componentRef.setInput('closeLabel', 'Close menu');
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Close menu');
    expect(fixture.nativeElement.querySelector('.ui-drawer--enter')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.ui-drawer__foot')).not.toBeNull();
  });

  it('plays the leave animation while the ref is leaving', () => {
    const leaving = signal(false);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UiDialogRef,
          useValue: { leaving, locked: () => false, close: () => leaving.set(true) },
        },
      ],
    });
    const fixture = TestBed.createComponent(DrawerComponent);
    fixture.componentRef.setInput('closeLabel', 'Close menu');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ui-drawer--leave')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.ui-drawer--enter')).toBeNull();
  });
});

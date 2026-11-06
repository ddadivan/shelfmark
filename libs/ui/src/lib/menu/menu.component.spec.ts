import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import { ButtonComponent } from '../button/button.component';
import type { MenuAlign } from './models/menu-align.type';
import type { MenuItemType } from './models/menu-item-type.type';
import { MenuItemComponent } from './menu-item.component';
import { MenuSeparatorComponent } from './menu-separator.component';
import { MenuTriggerDirective } from './menu-trigger.directive';
import { MenuComponent } from './menu.component';
import { KEYBOARD_KEY } from '../keyboard';

@Component({
  imports: [
    ButtonComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
  ],
  template: `
    <ui-button id="btn" [uiMenuTrigger]="menu">More</ui-button>
    <div id="plain" role="button" tabindex="0" [uiMenuTrigger]="menu">Plain trigger</div>
    <button id="outside" type="button">Outside</button>
    <ui-menu
      #menu
      [align]="align()"
      ariaLabel="Link actions"
      (opened)="opened.set(opened() + 1)"
      (closed)="closed.set(closed() + 1)"
    >
      <ui-menu-item icon="external" shortcut="↵" (activated)="log('open')">Open</ui-menu-item>
      <ui-menu-item icon="edit" (activated)="log('edit')">Edit</ui-menu-item>
      <ui-menu-item icon="star" [disabled]="true" (activated)="log('star')"
        >Add to favorites</ui-menu-item
      >
      <ui-menu-item [type]="type()" [selected]="selected()" (activated)="log('copy')" shortcut="⌘C"
        >Copy link</ui-menu-item
      >
      <ui-menu-separator />
      <ui-menu-item icon="trash" danger (activated)="log('delete')">Delete</ui-menu-item>
    </ui-menu>
  `,
})
class HostComponent {
  readonly align = signal<MenuAlign>('start');
  readonly type = signal<MenuItemType>('item');
  readonly selected = signal(false);
  readonly opened = signal(0);
  readonly closed = signal(0);
  readonly activations: string[] = [];

  log(action: string): void {
    this.activations.push(action);
  }
}

@Component({
  imports: [MenuComponent, MenuItemComponent, MenuSeparatorComponent],
  template: `
    <ui-menu inline ariaLabel="Account">
      <ui-menu-item (activated)="activations.set(activations() + 1)">Settings</ui-menu-item>
      <ui-menu-separator />
      <ui-menu-item>Sign out</ui-menu-item>
    </ui-menu>
  `,
})
class InlineHostComponent {
  readonly activations = signal(0);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 3; i++) {
    fixture.detectChanges();
    TestBed.tick();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  await settle(fixture);
  const root = fixture.nativeElement as HTMLElement;
  const host = root.querySelector<HTMLElement>('#btn') as HTMLElement;
  const inner = host.querySelector<HTMLButtonElement>('button') as HTMLButtonElement;
  const plain = root.querySelector<HTMLElement>('#plain') as HTMLElement;
  const outside = root.querySelector<HTMLElement>('#outside') as HTMLElement;
  const menuHost = root.querySelector<HTMLElement>('ui-menu') as HTMLElement;
  const items = () => Array.from(menuHost.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
  const labels = () => items().map((item) => item.textContent.trim());
  const key = async (element: Element, name: string, init: KeyboardEventInit = {}) => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init }),
    );
    await settle(fixture);
  };
  return { fixture, root, host, inner, plain, outside, menuHost, items, labels, key };
}

describe('MenuComponent', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.remove();
    });
  });

  describe('trigger attributes on the inner button', () => {
    it('sets haspopup, expanded and controls on the inner native button, not on the host', async () => {
      const { host, inner, menuHost } = await setup();
      expect(inner.getAttribute('aria-haspopup')).toBe('menu');
      expect(inner.getAttribute('aria-expanded')).toBe('false');
      expect(inner.getAttribute('aria-controls')).toBe(menuHost.id);
      expect(menuHost.id).not.toBe('');
      expect(host.hasAttribute('aria-haspopup')).toBe(false);
      expect(host.hasAttribute('aria-expanded')).toBe(false);
      expect(host.hasAttribute('aria-controls')).toBe(false);
    });

    it('changes aria-expanded with the open state', async () => {
      const { fixture, inner, key } = await setup();
      inner.click();
      await settle(fixture);
      expect(inner.getAttribute('aria-expanded')).toBe('true');
      await key(document.activeElement as Element, KEYBOARD_KEY.Escape);
      expect(inner.getAttribute('aria-expanded')).toBe('false');
    });

    it('uses the host element on a plain trigger', async () => {
      const { fixture, plain, menuHost, items, key } = await setup();
      expect(plain.getAttribute('aria-haspopup')).toBe('menu');
      expect(plain.getAttribute('aria-controls')).toBe(menuHost.id);
      await key(plain, KEYBOARD_KEY.Enter);
      expect(plain.getAttribute('aria-expanded')).toBe('true');
      expect(document.activeElement).toBe(items()[0]);
      await key(document.activeElement as Element, KEYBOARD_KEY.Escape);
      expect(document.activeElement).toBe(plain);
      await key(plain, KEYBOARD_KEY.Space);
      expect(plain.getAttribute('aria-expanded')).toBe('true');
      fixture.destroy();
    });
  });

  describe('opening and closing', () => {
    it('is closed and empty at first', async () => {
      const { menuHost, items } = await setup();
      expect(menuHost.classList.contains('ui-menu--shown')).toBe(false);
      expect(menuHost.querySelector('.ui-menu__surface')).toBeNull();
      expect(items()).toHaveLength(0);
    });

    it('opens on click into the menu layer and focuses the first item', async () => {
      const { fixture, inner, menuHost, items } = await setup();
      inner.click();
      await settle(fixture);
      const pane = menuHost.closest('.cdk-overlay-pane');
      expect(pane).not.toBeNull();
      expect(
        pane
          ?.closest('.cdk-global-overlay-wrapper, .cdk-overlay-connected-position-bounding-box')
          ?.classList.contains('ui-overlay-layer--menu'),
      ).toBe(true);
      expect(menuHost.getAttribute('role')).toBe('menu');
      expect(menuHost.getAttribute('aria-label')).toBe('Link actions');
      expect(items()).toHaveLength(5);
      expect(document.activeElement).toBe(items()[0]);
      expect(pane instanceof HTMLElement && pane.style.getPropertyValue('--ui-origin')).toBe('0 0');
      expect(fixture.componentInstance.opened()).toBe(1);
    });

    it('grows from the right edge of the trigger when aligned to the end', async () => {
      const { fixture, inner, menuHost } = await setup();
      fixture.componentInstance.align.set('end');
      await settle(fixture);
      inner.click();
      await settle(fixture);
      const pane = menuHost.closest<HTMLElement>('.cdk-overlay-pane') as HTMLElement;
      expect(pane.style.getPropertyValue('--ui-origin')).toBe('100% 0');
    });

    it('opens on ArrowDown at the first item and on ArrowUp at the last one', async () => {
      const { fixture, inner, items, key } = await setup();
      await key(inner, KEYBOARD_KEY.ArrowDown);
      expect(document.activeElement).toBe(items()[0]);
      await key(document.activeElement as Element, KEYBOARD_KEY.Escape);
      await key(inner, KEYBOARD_KEY.ArrowUp);
      expect(document.activeElement).toBe(items().at(-1));
      expect(fixture.componentInstance.opened()).toBe(2);
    });

    it('a second click on the trigger closes it and keeps focus on the button', async () => {
      const { fixture, inner, menuHost } = await setup();
      inner.click();
      await settle(fixture);
      inner.click();
      await settle(fixture);
      expect(inner.getAttribute('aria-expanded')).toBe('false');
      expect(menuHost.querySelector('.ui-menu__surface')).toBeNull();
      expect(document.activeElement).toBe(inner);
    });

    it('Esc closes and returns focus to the inner trigger button', async () => {
      const { fixture, inner, menuHost, key } = await setup();
      inner.click();
      await settle(fixture);
      const stop = vi.fn();
      document.addEventListener('keydown', stop);
      await key(document.activeElement as Element, KEYBOARD_KEY.Escape);
      document.removeEventListener('keydown', stop);
      expect(stop).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(inner);
      expect(menuHost.querySelector('.ui-menu__surface')).toBeNull();
      expect(menuHost.classList.contains('ui-menu--shown')).toBe(false);
      expect(menuHost.closest('.cdk-overlay-pane')).toBeNull();
      expect(fixture.componentInstance.closed()).toBe(1);
    });

    it('closes on a press outside without taking focus back', async () => {
      const { fixture, inner, outside, menuHost } = await setup();
      inner.click();
      await settle(fixture);
      outside.focus();
      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      await settle(fixture);
      expect(menuHost.querySelector('.ui-menu__surface')).toBeNull();
      expect(document.activeElement).toBe(outside);
      expect(inner.getAttribute('aria-expanded')).toBe('false');
    });

    it('stays open for a press inside the menu or on the trigger', async () => {
      const { fixture, inner, items } = await setup();
      inner.click();
      await settle(fixture);
      items()[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      inner.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      await settle(fixture);
      expect(inner.getAttribute('aria-expanded')).toBe('true');
    });

    it('closes when focus leaves the menu for another element', async () => {
      const { fixture, inner, outside, menuHost } = await setup();
      inner.click();
      await settle(fixture);
      outside.focus();
      await settle(fixture);
      expect(menuHost.querySelector('.ui-menu__surface')).toBeNull();
      expect(document.activeElement).toBe(outside);
    });

    it('Tab closes the menu and puts focus on the trigger', async () => {
      const { fixture, inner, key } = await setup();
      inner.click();
      await settle(fixture);
      await key(document.activeElement as Element, KEYBOARD_KEY.Tab);
      expect(document.activeElement).toBe(inner);
      expect(inner.getAttribute('aria-expanded')).toBe('false');
    });

    it('can be reopened right after closing, also before the leave animation ends', async () => {
      const { fixture, inner, menuHost, items } = await setup();
      inner.click();
      await settle(fixture);
      const pane = menuHost.closest<HTMLElement>('.cdk-overlay-pane') as HTMLElement;
      pane.getAnimations = () => [
        { finished: new Promise<Animation>(() => undefined) } as Animation,
      ];
      inner.click();
      fixture.detectChanges();
      TestBed.tick();
      inner.click();
      await settle(fixture);
      expect(inner.getAttribute('aria-expanded')).toBe('true');
      expect(menuHost.closest('.cdk-overlay-pane')).toBe(pane);
      expect(items()).toHaveLength(5);
      expect(document.activeElement).toBe(items()[0]);
    });

    it('ignores close() when closed and cleans up its overlay on destroy', async () => {
      const { fixture, inner } = await setup();
      const menu = fixture.debugElement.children
        .map((child) => child.componentInstance)
        .find((instance): instance is MenuComponent => instance instanceof MenuComponent);
      menu?.close();
      expect(fixture.componentInstance.closed()).toBe(0);
      inner.click();
      await settle(fixture);
      fixture.destroy();
      expect(document.querySelectorAll('.cdk-overlay-pane')).toHaveLength(0);
    });
  });

  describe('keyboard', () => {
    it('moves with the arrow keys, Home and End, and wraps', async () => {
      const { fixture, inner, items, key } = await setup();
      inner.click();
      await settle(fixture);
      await key(document.activeElement as Element, KEYBOARD_KEY.ArrowDown);
      expect(document.activeElement).toBe(items()[1]);
      await key(document.activeElement as Element, KEYBOARD_KEY.End);
      expect(document.activeElement).toBe(items().at(-1));
      await key(document.activeElement as Element, KEYBOARD_KEY.ArrowDown);
      expect(document.activeElement).toBe(items()[0]);
      await key(document.activeElement as Element, KEYBOARD_KEY.ArrowUp);
      expect(document.activeElement).toBe(items().at(-1));
      await key(document.activeElement as Element, KEYBOARD_KEY.Home);
      expect(document.activeElement).toBe(items()[0]);
    });

    it('jumps to an item by typing the start of its label', async () => {
      const { fixture, inner, items, labels, key } = await setup();
      inner.click();
      await settle(fixture);
      expect(labels()).toEqual(['Open↵', 'Edit', 'Add to favorites', 'Copy link⌘C', 'Delete']);
      await key(document.activeElement as Element, 'e');
      expect(document.activeElement).toBe(items()[1]);
    });

    it('Enter activates the focused item, closes and returns focus before it emits', async () => {
      const { fixture, inner, items, key } = await setup();
      inner.click();
      await settle(fixture);
      let focusAtEmit: Element | null = null;
      const original = fixture.componentInstance.log.bind(fixture.componentInstance);
      fixture.componentInstance.log = (action: string) => {
        focusAtEmit = document.activeElement;
        original(action);
      };
      await key(document.activeElement as Element, KEYBOARD_KEY.ArrowDown);
      await key(items()[1], KEYBOARD_KEY.Enter);
      expect(fixture.componentInstance.activations).toEqual(['edit']);
      expect(focusAtEmit).toBe(inner);
      expect(document.activeElement).toBe(inner);
      expect(inner.getAttribute('aria-expanded')).toBe('false');
    });

    it('Space activates too', async () => {
      const { fixture, inner, items, key } = await setup();
      inner.click();
      await settle(fixture);
      await key(items()[0], KEYBOARD_KEY.Space);
      expect(fixture.componentInstance.activations).toEqual(['open']);
    });

    it('a click activates the item', async () => {
      const { fixture, inner, items } = await setup();
      inner.click();
      await settle(fixture);
      items().at(-1)?.click();
      await settle(fixture);
      expect(fixture.componentInstance.activations).toEqual(['delete']);
      expect(inner.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(inner);
    });
  });

  describe('items', () => {
    it('announces a disabled item and never activates it', async () => {
      const { fixture, inner, items, key } = await setup();
      inner.click();
      await settle(fixture);
      const disabled = items()[2];
      expect(disabled.getAttribute('aria-disabled')).toBe('true');
      expect(items()[0].getAttribute('aria-disabled')).toBe('false');
      disabled.click();
      await settle(fixture);
      await key(disabled, KEYBOARD_KEY.Enter);
      expect(fixture.componentInstance.activations).toEqual([]);
      expect(inner.getAttribute('aria-expanded')).toBe('true');
    });

    it('styles the destructive item and renders icon and shortcut hint', async () => {
      const { fixture, inner, items, menuHost } = await setup();
      inner.click();
      await settle(fixture);
      expect(items().at(-1)?.classList.contains('ui-menu-item--danger')).toBe(true);
      expect(items()[0].classList.contains('ui-menu-item--danger')).toBe(false);
      expect(items()[0].querySelector('ui-icon')).not.toBeNull();
      expect(items()[0].querySelector('.ui-menu-item__hint')?.textContent).toBe('↵');
      expect(items()[1].querySelector('.ui-menu-item__hint')).toBeNull();
      expect(menuHost.querySelector('ui-menu-separator')?.getAttribute('role')).toBe('separator');
    });

    it('marks the current choice with is-selected and aria-checked on a radio item', async () => {
      const { fixture, inner, items } = await setup();
      fixture.componentInstance.type.set('radio');
      fixture.componentInstance.selected.set(true);
      await settle(fixture);
      inner.click();
      await settle(fixture);
      const copy = items()[3];
      expect(copy.getAttribute('role')).toBe('menuitemradio');
      const host = copy.closest('ui-menu-item') as HTMLElement;
      expect(host.getAttribute('role')).toBe('none');
      expect(items()).toHaveLength(5);
      expect(copy.getAttribute('aria-checked')).toBe('true');
      expect(copy.classList.contains('is-selected')).toBe(true);
      expect(items()[0].hasAttribute('aria-checked')).toBe(false);
    });

    it('plays the ripple on items and not on disabled ones', async () => {
      const { fixture, inner, items } = await setup();
      inner.click();
      await settle(fixture);
      expect(items()[0].classList.contains('ui-ripple-host')).toBe(true);
      items()[2].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, isPrimary: true }));
      expect(items()[2].querySelector('.ui-ripple')).toBeNull();
    });
  });

  describe('opened at a point', () => {
    it('opens at the pointer position, focuses the first item and returns focus to the previous element', async () => {
      const { fixture, outside, menuHost, items, key } = await setup();
      const menu = fixture.debugElement.children
        .map((child) => child.componentInstance)
        .find(
          (instance): instance is MenuComponent => instance instanceof MenuComponent,
        ) as MenuComponent;
      outside.focus();
      menu.openAt({ x: 40, y: 60 });
      await settle(fixture);
      const surface = menuHost.querySelector('.ui-menu__surface') as HTMLElement;
      expect(surface.classList.contains('ui-menu__surface--point')).toBe(true);
      expect(menu.anchor()).toBeNull();
      expect(menu.isOpen()).toBe(true);
      expect(document.activeElement).toBe(items()[0]);
      await key(document.activeElement as Element, KEYBOARD_KEY.Escape);
      expect(document.activeElement).toBe(outside);
      expect(menu.isOpen()).toBe(false);
    });

    it('opens again at another point and can start at the last item', async () => {
      const { fixture, menuHost, items } = await setup();
      const menu = fixture.debugElement.children
        .map((child) => child.componentInstance)
        .find(
          (instance): instance is MenuComponent => instance instanceof MenuComponent,
        ) as MenuComponent;
      menu.openAt({ x: 10, y: 10 });
      await settle(fixture);
      menu.openAt({ x: 200, y: 120 }, { focus: 'last' });
      await settle(fixture);
      expect(document.querySelectorAll('.cdk-overlay-pane')).toHaveLength(1);
      expect(menuHost.querySelector('.ui-menu__surface')).not.toBeNull();
      expect(document.activeElement).toBe(items().at(-1));
      expect(fixture.componentInstance.opened()).toBe(1);
    });

    it('switches from a point to an element', async () => {
      const { fixture, inner, menuHost } = await setup();
      const menu = fixture.debugElement.children
        .map((child) => child.componentInstance)
        .find(
          (instance): instance is MenuComponent => instance instanceof MenuComponent,
        ) as MenuComponent;
      menu.openAt({ x: 10, y: 10 });
      await settle(fixture);
      inner.click();
      await settle(fixture);
      expect(menu.anchor()).toBe(inner);
      expect(menuHost.querySelector('.ui-menu__surface--point')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('has no axe violations closed', async () => {
      const { root } = await setup();
      expect(await axeViolations(root)).toEqual([]);
    });

    it('has no axe violations open', async () => {
      const { fixture, inner } = await setup();
      inner.click();
      await settle(fixture);
      const pane = document.querySelector('.cdk-overlay-pane') as HTMLElement;
      expect(await axeViolations(fixture.nativeElement)).toEqual([]);
      expect(await axeViolations(pane)).toEqual([]);
    });
  });
});

@Component({
  imports: [ButtonComponent, MenuComponent, MenuItemComponent, MenuTriggerDirective],
  template: `
    @if (show()) {
      <ui-button id="btn" [uiMenuTrigger]="menu">More</ui-button>
      <ui-menu #menu ariaLabel="Root menu"><ui-menu-item>One</ui-menu-item></ui-menu>
    }
  `,
})
class RootIfHostComponent {
  readonly show = signal(true);
}

describe('MenuComponent as the root of an embedded view', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.remove();
    });
  });

  it('leaves no ghost menu when removed while open', async () => {
    const fixture = TestBed.createComponent(RootIfHostComponent);
    await settle(fixture);
    const menuHost = fixture.nativeElement.querySelector('ui-menu') as HTMLElement;
    fixture.nativeElement.querySelector('#btn button').click();
    await settle(fixture);
    expect(menuHost.closest('.cdk-overlay-pane')).not.toBeNull();
    fixture.componentInstance.show.set(false);
    await settle(fixture);
    expect(document.contains(menuHost)).toBe(false);
    expect(document.querySelector('.ui-menu--shown')).toBeNull();
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });
});

describe('MenuComponent external detach', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.remove();
    });
  });

  it('resets its state and drops the document listener when the overlay detaches', async () => {
    const { fixture, inner } = await setup();
    const menu = fixture.debugElement.children
      .map((child) => child.componentInstance)
      .find((i): i is MenuComponent => i instanceof MenuComponent) as MenuComponent;
    const remove = vi.spyOn(document, 'removeEventListener');
    inner.click();
    await settle(fixture);
    (menu as unknown as { overlay: { detach(): void } }).overlay.detach();
    await settle(fixture);
    expect(menu.isOpen()).toBe(false);
    expect(remove).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
    remove.mockRestore();
  });
});

describe('MenuComponent inline', () => {
  it('renders in place, always open, and activates without an overlay', async () => {
    const fixture = TestBed.createComponent(InlineHostComponent);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const menu = root.querySelector('ui-menu') as HTMLElement;
    expect(menu.classList.contains('ui-menu--shown')).toBe(true);
    expect(menu.querySelector('.ui-menu__surface')).not.toBeNull();
    expect(document.querySelectorAll('.cdk-overlay-pane')).toHaveLength(0);
    const items = menu.querySelectorAll<HTMLElement>('[role="menuitem"]');
    expect(items).toHaveLength(2);
    items[0].click();
    await settle(fixture);
    expect(fixture.componentInstance.activations()).toBe(1);
    expect(menu.querySelector('.ui-menu__surface')).not.toBeNull();
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: KEYBOARD_KEY.Escape, bubbles: true }));
    await settle(fixture);
    expect(menu.querySelector('.ui-menu__surface')).not.toBeNull();
    expect(await axeViolations(root)).toEqual([]);
  });
});

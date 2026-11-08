import { Component, Directive, inject, signal, viewChildren } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import { UI_FOCUS_TARGET } from '../focus-target/models/ui-focus-target.const';
import type { IconName } from '../icon/models/icon-name.type';
import { ButtonComponent } from './button.component';
import type { ButtonHaspopup } from './models/button-haspopup.type';
import type { ButtonPressed } from './models/button-pressed.type';
import type { ButtonSize } from './models/button-size.type';
import type { ButtonType } from './models/button-type.type';
import type { ButtonVariant } from './models/button-variant.type';
import { BUTTON_VARIANT } from './models/button-variant.const';
import { BUTTON_SIZE } from './models/button-size.const';
import { BUTTON_TYPE } from './models/button-type.const';
import { BUTTON_HASPOPUP } from './models/button-haspopup.const';

@Component({
  imports: [ButtonComponent],
  template: `
    <ui-button
      [variant]="variant()"
      [size]="size()"
      [type]="type()"
      [iconLeft]="iconLeft()"
      [iconRight]="iconRight()"
      [iconOnly]="iconOnly()"
      [fab]="fab()"
      [ariaLabel]="ariaLabel()"
      [disabled]="disabled()"
      [href]="href()"
      [ripple]="ripple()"
      [ariaExpanded]="ariaExpanded()"
      [ariaControls]="ariaControls()"
      [ariaHaspopup]="ariaHaspopup()"
      [ariaDescribedby]="ariaDescribedby()"
      [ariaPressed]="ariaPressed()"
      [tabIndex]="tabIndex()"
      (linkClick)="linkClicks.set(linkClicks() + 1)"
      (click)="clicks.set(clicks() + 1)"
      >Add link</ui-button
    >
  `,
})
class HostComponent {
  readonly variant = signal<ButtonVariant>(BUTTON_VARIANT.Secondary);
  readonly size = signal<ButtonSize>(BUTTON_SIZE.Md);
  readonly type = signal<ButtonType>(BUTTON_TYPE.Button);
  readonly iconLeft = signal<IconName | undefined>(undefined);
  readonly iconRight = signal<IconName | undefined>(undefined);
  readonly iconOnly = signal(false);
  readonly fab = signal(false);
  readonly ariaLabel = signal<string | undefined>(undefined);
  readonly disabled = signal(false);
  readonly clicks = signal(0);
  readonly linkClicks = signal(0);
  readonly href = signal<string | undefined>(undefined);
  readonly ripple = signal(true);
  readonly ariaExpanded = signal<boolean | undefined>(undefined);
  readonly ariaControls = signal<string | undefined>(undefined);
  readonly ariaHaspopup = signal<ButtonHaspopup | undefined>(undefined);
  readonly ariaDescribedby = signal<string | undefined>(undefined);
  readonly ariaPressed = signal<ButtonPressed | undefined>(undefined);
  readonly tabIndex = signal<number | undefined>(undefined);
}

/** Stands in for a tooltip / menu trigger: reads the focus target from its own host. */
@Directive({ selector: '[uiProbe]' })
class ProbeDirective {
  readonly target = inject(UI_FOCUS_TARGET, { optional: true, self: true });
}

@Component({
  imports: [ButtonComponent, ProbeDirective],
  template: `<ui-button uiProbe>Probe</ui-button>
    <div uiProbe>Plain</div>`,
})
class TokenHostComponent {
  readonly probes = viewChildren(ProbeDirective);
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const button = () => root.querySelector('button') as HTMLButtonElement;
  const link = () => root.querySelector('a') as HTMLAnchorElement;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { fixture, host: fixture.componentInstance, root, button, link, settle };
}

describe('ButtonComponent', () => {
  it('renders a native secondary medium button with the projected label', async () => {
    const { button } = await setup();

    expect(button().textContent?.trim()).toBe('Add link');
    expect(button().type).toBe('button');
    expect(button().classList.contains('ui-button--secondary')).toBe(true);
    expect(button().className).not.toMatch(/--(sm|lg|icon)/);
  });

  it('adds the fab class and 24px icon only for a fab', async () => {
    const { host, root, button, settle } = await setup();
    host.iconOnly.set(true);
    host.iconLeft.set('add');
    host.ariaLabel.set('Add link');
    await settle();
    expect(button().classList.contains('ui-button--fab')).toBe(false);
    expect(root.querySelector('ui-icon.ui-icon--24')).toBeNull();

    host.fab.set(true);
    await settle();
    expect(button().classList.contains('ui-button--fab')).toBe(true);
    expect(root.querySelector('ui-icon.ui-icon--24')).not.toBeNull();
  });

  it.each(Object.values(BUTTON_VARIANT))('applies the %s variant class', async (variant) => {
    const { host, button, settle } = await setup();
    host.variant.set(variant);
    await settle();

    expect(button().classList.contains(`ui-button--${variant}`)).toBe(true);
  });

  it.each([BUTTON_SIZE.Sm, BUTTON_SIZE.Lg])('applies the %s size class', async (size) => {
    const { host, button, settle } = await setup();
    host.size.set(size);
    await settle();

    expect(button().classList.contains(`ui-button--${size}`)).toBe(true);
  });

  it('passes the native type', async () => {
    const { host, button, settle } = await setup();
    host.type.set(BUTTON_TYPE.Submit);
    await settle();

    expect(button().type).toBe('submit');
  });

  it('renders icons on both sides of the label', async () => {
    const { host, root, settle } = await setup();
    host.iconLeft.set('add');
    host.iconRight.set('chevron-down');
    await settle();
    const hrefs = [...root.querySelectorAll('use')].map((u) => u.getAttribute('href'));

    expect(hrefs).toEqual([
      'assets/ui/icons/sprite.svg#sm-add',
      'assets/ui/icons/sprite.svg#sm-chevron-down',
    ]);
  });

  it('uses 20px icons in large buttons', async () => {
    const { host, root, settle } = await setup();
    host.iconLeft.set('add');
    host.size.set(BUTTON_SIZE.Lg);
    await settle();

    expect(root.querySelector('ui-icon')?.classList.contains('ui-icon--20')).toBe(true);
  });

  it('shows only the icon and the aria-label when icon-only', async () => {
    const { host, root, button, settle } = await setup();
    host.iconOnly.set(true);
    host.ariaLabel.set('Add link');
    host.iconLeft.set('add');
    await settle();

    expect(button().classList.contains('ui-button--icon')).toBe(true);
    expect(button().getAttribute('aria-label')).toBe('Add link');
    expect(button().textContent?.trim()).toBe('');
    expect(root.querySelectorAll('ui-icon')).toHaveLength(1);
  });

  it('falls back to iconRight for an icon-only button', async () => {
    const { host, root, settle } = await setup();
    host.iconOnly.set(true);
    host.ariaLabel.set('Open');
    host.iconRight.set('external');
    await settle();

    expect(root.querySelector('use')?.getAttribute('href')).toContain('#sm-external');
  });

  it('throws when icon-only has no aria-label', async () => {
    const { fixture, host } = await setup();
    host.iconOnly.set(true);

    expect(() => fixture.detectChanges()).toThrow(/iconOnly requires an ariaLabel/);
  });

  it('emits clicks when enabled and blocks them when disabled', async () => {
    const { host, button, settle } = await setup();
    button().click();

    expect(host.clicks()).toBe(1);

    host.disabled.set(true);
    await settle();
    button().click();

    expect(button().disabled).toBe(true);
    expect(host.clicks()).toBe(1);
  });

  it('has no axe violations for text, icon-only and disabled buttons', async () => {
    const { host, root, settle } = await setup();
    document.body.append(root);
    host.iconLeft.set('add');
    host.ariaLabel.set('Add link');
    await settle();

    expect(await axeViolations(root)).toEqual([]);

    host.iconOnly.set(true);
    host.disabled.set(true);
    await settle();

    expect(await axeViolations(root)).toEqual([]);
    root.remove();
  });

  describe('ARIA forwarding', () => {
    it('renders no ARIA attribute when the inputs are unset', async () => {
      const { button } = await setup();

      for (const name of [
        'aria-label',
        'aria-expanded',
        'aria-controls',
        'aria-haspopup',
        'aria-describedby',
        'aria-pressed',
      ]) {
        expect(button().hasAttribute(name)).toBe(false);
      }
    });

    it('puts each ARIA input on the inner button', async () => {
      const { host, root, button, settle } = await setup();
      host.ariaExpanded.set(false);
      host.ariaControls.set('menu-1');
      host.ariaHaspopup.set(BUTTON_HASPOPUP.Menu);
      host.ariaDescribedby.set('tip-1');
      host.ariaPressed.set('mixed');
      await settle();

      expect(button().getAttribute('aria-expanded')).toBe('false');
      expect(button().getAttribute('aria-controls')).toBe('menu-1');
      expect(button().getAttribute('aria-haspopup')).toBe('menu');
      expect(button().getAttribute('aria-describedby')).toBe('tip-1');
      expect(button().getAttribute('aria-pressed')).toBe('mixed');
      expect(root.querySelector('ui-button')?.hasAttribute('aria-expanded')).toBe(false);

      host.ariaExpanded.set(true);
      host.ariaPressed.set(true);
      await settle();

      expect(button().getAttribute('aria-expanded')).toBe('true');
      expect(button().getAttribute('aria-pressed')).toBe('true');
    });

    it('puts tabIndex on the inner element and renders none when unset', async () => {
      const { host, button, link, settle } = await setup();
      expect(button().hasAttribute('tabindex')).toBe(false);

      host.tabIndex.set(-1);
      await settle();
      expect(button().getAttribute('tabindex')).toBe('-1');

      host.href.set('/links');
      await settle();
      expect(link().getAttribute('tabindex')).toBe('-1');
    });

    it('puts the ARIA inputs on the inner link too', async () => {
      const { host, link, settle } = await setup();
      host.href.set('/links');
      host.ariaDescribedby.set('tip-1');
      host.ariaHaspopup.set(true);
      await settle();

      expect(link().getAttribute('aria-describedby')).toBe('tip-1');
      expect(link().getAttribute('aria-haspopup')).toBe('true');
    });
  });

  describe('focus target', () => {
    it('resolves the token to the inner button and focus() focuses it', async () => {
      const fixture = TestBed.createComponent(TokenHostComponent);
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      document.body.append(root);
      const [onButton, onDiv] = fixture.componentInstance.probes();
      const inner = root.querySelector('button') as HTMLButtonElement;

      expect(onButton.target?.element()).toBe(inner);
      expect(onDiv.target).toBeNull();

      onButton.target?.focus();

      expect(document.activeElement).toBe(inner);
      root.remove();
    });

    it('exposes the inner link when href is set', async () => {
      const { fixture, host, link, settle } = await setup();
      host.href.set('/links');
      await settle();
      const button = fixture.debugElement.children[0].componentInstance as ButtonComponent;

      expect(button.element()).toBe(link());
    });

    it('focus() does nothing before the element exists', () => {
      const button = TestBed.createComponent(ButtonComponent).componentInstance;

      expect(() => button.focus()).not.toThrow();
      expect(button.element()).toBeUndefined();
    });
  });

  describe('href', () => {
    it('renders a link with the button classes instead of a button', async () => {
      const { host, root, button, link, settle } = await setup();
      host.href.set('/links');
      host.variant.set(BUTTON_VARIANT.Primary);
      host.size.set(BUTTON_SIZE.Lg);
      await settle();

      expect(button()).toBeNull();
      expect(link().getAttribute('href')).toBe('/links');
      expect(link().hasAttribute('type')).toBe(false);
      expect(link().classList.contains('ui-button--primary')).toBe(true);
      expect(link().classList.contains('ui-button--lg')).toBe(true);
      expect(link().textContent?.trim()).toBe('Add link');
      expect(root.querySelectorAll('a, button')).toHaveLength(1);
    });

    it('fires linkClick for plain left clicks only', async () => {
      const { host, link, settle } = await setup();
      host.href.set('/links');
      await settle();
      const click = (init: MouseEventInit) => {
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
        link().dispatchEvent(event);
        return event;
      };
      // Keep jsdom from navigating.
      link().addEventListener('click', (e) => e.preventDefault());

      click({ button: 0 });

      expect(host.linkClicks()).toBe(1);

      click({ button: 1 });
      click({ button: 0, metaKey: true });
      click({ button: 0, ctrlKey: true });
      click({ button: 0, shiftKey: true });
      click({ button: 0, altKey: true });

      expect(host.linkClicks()).toBe(1);
      expect(host.clicks()).toBe(6);
    });

    it('lets the feature cancel the navigation of a plain click', async () => {
      const { fixture, host, link, settle } = await setup();
      host.href.set('/links');
      await settle();
      const button = fixture.debugElement.children[0].componentInstance as ButtonComponent;
      button.linkClick.subscribe((e) => e.preventDefault());
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      link().dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('renders a disabled link inert: no href, aria-disabled, swallowed clicks', async () => {
      const { host, link, settle } = await setup();
      host.href.set('/links');
      host.disabled.set(true);
      await settle();
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      link().dispatchEvent(event);

      expect(link().hasAttribute('href')).toBe(false);
      expect(link().getAttribute('aria-disabled')).toBe('true');
      expect(link().getAttribute('role')).toBe('link');
      expect(link().hasAttribute('tabindex')).toBe(false);
      expect(event.defaultPrevented).toBe(true);
      expect(host.linkClicks()).toBe(0);
      expect(host.clicks()).toBe(0);
    });

    it('has no axe violations for enabled and disabled links', async () => {
      const { host, root, settle } = await setup();
      document.body.append(root);
      host.href.set('/links');
      await settle();

      expect(await axeViolations(root)).toEqual([]);

      host.disabled.set(true);
      await settle();

      expect(await axeViolations(root)).toEqual([]);
      root.remove();
    });
  });

  describe('ripple', () => {
    const down = (el: HTMLElement) =>
      el.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }),
      );

    it('plays a ripple on the inner button, not on the host', async () => {
      const { root, button } = await setup();
      down(button());

      expect(button().classList.contains('ui-ripple-host')).toBe(true);
      expect(button().querySelectorAll('.ui-ripple')).toHaveLength(1);
      expect(root.querySelector('ui-button')?.classList.contains('ui-ripple-host')).toBe(false);
    });

    it('plays on the inner link as well', async () => {
      const { host, link, settle } = await setup();
      host.href.set('/links');
      await settle();
      down(link());

      expect(link().querySelectorAll('.ui-ripple')).toHaveLength(1);
    });

    it('is off when opted out and when disabled', async () => {
      const { host, button, settle } = await setup();
      host.ripple.set(false);
      await settle();
      down(button());

      expect(button().querySelector('.ui-ripple')).toBeNull();

      host.ripple.set(true);
      host.disabled.set(true);
      await settle();
      down(button());

      expect(button().querySelector('.ui-ripple')).toBeNull();
    });
  });
});

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import type { IconName } from '../icon/models/icon-name.type';
import { ButtonComponent } from './button.component';
import type { ButtonSize } from './models/button-size.type';
import type { ButtonType } from './models/button-type.type';
import type { ButtonVariant } from './models/button-variant.type';

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
      [ariaLabel]="ariaLabel()"
      [disabled]="disabled()"
      (click)="clicks.set(clicks() + 1)"
      >Add link</ui-button
    >
  `,
})
class HostComponent {
  readonly variant = signal<ButtonVariant>('secondary');
  readonly size = signal<ButtonSize>('md');
  readonly type = signal<ButtonType>('button');
  readonly iconLeft = signal<IconName | undefined>(undefined);
  readonly iconRight = signal<IconName | undefined>(undefined);
  readonly iconOnly = signal(false);
  readonly ariaLabel = signal<string | undefined>(undefined);
  readonly disabled = signal(false);
  readonly clicks = signal(0);
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const button = () => root.querySelector('button') as HTMLButtonElement;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { fixture, host: fixture.componentInstance, root, button, settle };
}

describe('ButtonComponent', () => {
  it('renders a native secondary medium button with the projected label', async () => {
    const { button } = await setup();

    expect(button().textContent?.trim()).toBe('Add link');
    expect(button().type).toBe('button');
    expect(button().classList.contains('ui-button--secondary')).toBe(true);
    expect(button().className).not.toMatch(/--(sm|lg|icon)/);
  });

  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    'applies the %s variant class',
    async (variant) => {
      const { host, button, settle } = await setup();
      host.variant.set(variant);
      await settle();

      expect(button().classList.contains(`ui-button--${variant}`)).toBe(true);
    },
  );

  it.each(['sm', 'lg'] as const)('applies the %s size class', async (size) => {
    const { host, button, settle } = await setup();
    host.size.set(size);
    await settle();

    expect(button().classList.contains(`ui-button--${size}`)).toBe(true);
  });

  it('passes the native type', async () => {
    const { host, button, settle } = await setup();
    host.type.set('submit');
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
    host.size.set('lg');
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
});

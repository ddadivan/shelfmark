import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import type { IconName } from '../icon/models/icon-name.type';
import { ChipComponent } from './chip.component';
import type { ChipVariant } from './models/chip-variant.type';
import { KEYBOARD_KEY } from '../keyboard';
import { CHIP_VARIANT } from './models/chip-variant.const';

@Component({
  imports: [ChipComponent],
  template: `
    <ui-chip
      [variant]="variant()"
      [clickable]="clickable()"
      [removable]="removable()"
      [disabled]="disabled()"
      [icon]="icon()"
      [removeLabel]="removeLabel()"
      (clicked)="clicks.set(clicks() + 1)"
      (removed)="removals.set(removals() + 1)"
      >design</ui-chip
    >
  `,
})
class HostComponent {
  readonly variant = signal<ChipVariant>(CHIP_VARIANT.Tag);
  readonly clickable = signal(false);
  readonly removable = signal(false);
  readonly disabled = signal(false);
  readonly icon = signal<IconName | undefined>(undefined);
  readonly removeLabel = signal<string | undefined>('Remove tag design');
  readonly clicks = signal(0);
  readonly removals = signal(0);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const chip = host.querySelector('ui-chip') as HTMLElement;
  const update = (apply: (c: HostComponent) => void) => {
    apply(fixture.componentInstance);
    fixture.detectChanges();
  };
  return { fixture, host, chip, update, cmp: fixture.componentInstance };
}

describe('ChipComponent', () => {
  it('is a tag chip by default with a plain text body and no buttons', () => {
    const { chip } = setup();
    expect(chip.classList.contains('ui-chip--tag')).toBe(true);
    expect(chip.querySelector('span.ui-chip__body')?.textContent?.trim()).toBe('design');
    expect(chip.querySelector('button')).toBeNull();
    expect(chip.classList.contains('ui-ripple-host')).toBe(false);
  });

  it('renders the neutral variant', () => {
    const { chip, update } = setup();
    update((c) => c.variant.set(CHIP_VARIANT.Neutral));
    expect(chip.classList.contains('ui-chip--neutral')).toBe(true);
    expect(chip.classList.contains('ui-chip--tag')).toBe(false);
  });

  it('shows a leading icon', () => {
    const { chip, update } = setup();
    update((c) => c.icon.set('tag'));
    expect(chip.querySelector('ui-icon')).not.toBeNull();
  });

  it('clickable renders a button with a ripple host that emits clicked', () => {
    const { chip, update, cmp } = setup();
    update((c) => c.clickable.set(true));
    const body = chip.querySelector('button.ui-chip__body') as HTMLButtonElement;
    expect(body.type).toBe('button');
    expect(body.textContent?.trim()).toBe('design');
    expect(body.classList.contains('ui-ripple-host')).toBe(true);
    body.click();
    expect(cmp.clicks()).toBe(1);
    expect(chip.classList.contains('ui-chip--clickable')).toBe(true);
  });

  it('removable adds a named remove button that emits removed', () => {
    const { chip, update, cmp } = setup();
    update((c) => c.removable.set(true));
    const remove = chip.querySelector('button.ui-chip__remove') as HTMLButtonElement;
    expect(remove.getAttribute('aria-label')).toBe('Remove tag design');
    expect(remove.classList.contains('ui-ripple-host')).toBe(false);
    remove.click();
    expect(cmp.removals()).toBe(1);
  });

  it('omits aria-label on the remove button when none is given', () => {
    const { chip, update } = setup();
    update((c) => {
      c.removable.set(true);
      c.removeLabel.set(undefined);
    });
    expect(chip.querySelector('.ui-chip__remove')?.hasAttribute('aria-label')).toBe(false);
  });

  it.each([KEYBOARD_KEY.Delete, KEYBOARD_KEY.Backspace])(
    '%s on a removable chip emits removed',
    (key) => {
      const { chip, update, cmp } = setup();
      update((c) => {
        c.clickable.set(true);
        c.removable.set(true);
      });
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      chip.querySelector('button')?.dispatchEvent(event);
      expect(cmp.removals()).toBe(1);
      expect(event.defaultPrevented).toBe(true);
    },
  );

  it('ignores Delete when not removable and other keys', () => {
    const { chip, update, cmp } = setup();
    update((c) => c.clickable.set(true));
    chip
      .querySelector('button')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: KEYBOARD_KEY.Delete, bubbles: true }));
    update((c) => c.removable.set(true));
    chip
      .querySelector('button')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(cmp.removals()).toBe(0);
  });

  it('disabled blocks click, removal and keyboard removal', () => {
    const { chip, update, cmp } = setup();
    update((c) => {
      c.clickable.set(true);
      c.removable.set(true);
      c.disabled.set(true);
    });
    const buttons = chip.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    buttons.forEach((b) => {
      expect(b.disabled).toBe(true);
      b.click();
    });
    chip.dispatchEvent(new KeyboardEvent('keydown', { key: KEYBOARD_KEY.Delete, bubbles: true }));
    expect(cmp.clicks()).toBe(0);
    expect(cmp.removals()).toBe(0);
    expect(chip.classList.contains('ui-chip--disabled')).toBe(true);
  });

  it('focus() targets the clickable body, else the remove button, else nothing', () => {
    const { chip, update, fixture } = setup();
    const api = fixture.debugElement.children[0].componentInstance as ChipComponent;
    api.focus();
    expect(document.activeElement).not.toBe(chip.querySelector('button'));
    update((c) => c.removable.set(true));
    document.body.append(chip);
    api.focus();
    expect(document.activeElement).toBe(chip.querySelector('.ui-chip__remove'));
    update((c) => c.clickable.set(true));
    api.focus();
    expect(document.activeElement).toBe(chip.querySelector('.ui-chip__body'));
  });

  it('does not style hover or pressed when disabled', () => {
    const { chip, update } = setup();
    update((c) => {
      c.clickable.set(true);
      c.disabled.set(true);
    });
    expect(chip.classList.contains('ui-chip--disabled')).toBe(true);
  });

  it('has no axe violations in each configuration', async () => {
    const { host, update } = setup();
    expect(await axeViolations(host)).toEqual([]);
    update((c) => {
      c.variant.set(CHIP_VARIANT.Neutral);
      c.clickable.set(true);
      c.removable.set(true);
      c.icon.set('tag');
    });
    expect(await axeViolations(host)).toEqual([]);
    update((c) => c.disabled.set(true));
    expect(await axeViolations(host)).toEqual([]);
  });
});

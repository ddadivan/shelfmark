import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { disabled, form, FormField, required } from '@angular/forms/signals';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../testing/axe';
import type { SelectOption } from './models/select-option.interface';
import { SelectComponent } from './select.component';

const TREE: SelectOption[] = [
  {
    id: 'work',
    name: 'Work',
    children: [
      { id: 'angular', name: 'Angular' },
      { id: 'courses', name: 'Courses' },
    ],
  },
  { id: 'clothes', name: 'Clothes' },
];

@Component({
  imports: [SelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-select
      label="Folder"
      [options]="options"
      [searchable]="searchable()"
      emptyLabel="Unsorted"
      placeholder="Pick a folder"
      searchLabel="Find a folder"
      noResultsLabel="No folders found"
      hint="Where the link goes"
      [error]="error()"
      [disabled]="disabled()"
      [(value)]="value"
      (touch)="touches.set(touches() + 1)"
    />
    <button id="outside" type="button">Outside</button>
  `,
})
class HostComponent {
  readonly options = TREE;
  readonly searchable = signal(false);
  readonly error = signal('');
  readonly disabled = signal(false);
  readonly value = signal<string | null>('angular');
  readonly touches = signal(0);
}

@Component({
  imports: [SelectComponent, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ui-select
    label="Folder"
    [options]="options"
    emptyLabel="Unsorted"
    [formField]="f.folder"
  />`,
})
class FormHostComponent {
  readonly options = TREE;
  readonly lock = signal(false);
  readonly model = signal<{ folder: string | null }>({ folder: null });
  readonly f = form(this.model, (p) => {
    required(p.folder, { message: 'Choose a folder' });
    disabled(p.folder, () => this.lock());
  });
}

const overlays = () => document.querySelector('.cdk-overlay-container') as HTMLElement;

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 4; i++) {
    fixture.detectChanges();
    TestBed.tick();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function key(target: Element, name: string, init: KeyboardEventInit = {}): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init }),
  );
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  await settle(fixture);
  const root = fixture.nativeElement as HTMLElement;
  const trigger = root.querySelector<HTMLButtonElement>(
    'button[role="combobox"]',
  ) as HTMLButtonElement;
  const options = () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
  const names = () => options().map((o) => o.textContent.trim());
  const listbox = () => document.querySelector<HTMLElement>('[role="listbox"]');
  const search = () => document.querySelector<HTMLInputElement>('.ui-select__search-input');
  const active = () =>
    document.getElementById(listbox()?.getAttribute('aria-activedescendant') ?? '');
  const press = async (target: Element, name: string, init: KeyboardEventInit = {}) => {
    key(target, name, init);
    await settle(fixture);
  };
  const open = async () => {
    trigger.focus();
    trigger.click();
    await settle(fixture);
  };
  return {
    fixture,
    root,
    trigger,
    press,
    options,
    names,
    listbox,
    search,
    active,
    open,
    host: fixture.componentInstance,
  };
}

describe('SelectComponent', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.replaceChildren();
    });
  });

  it('renders a combobox button named by its label and shows the chosen path', async () => {
    const { root, trigger } = await setup();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(root.querySelector('label')?.getAttribute('for')).toBe(trigger.id);
    expect(trigger.textContent.trim()).toBe('Work / Angular');
    expect(trigger.getAttribute('aria-describedby')).toContain('-hint');
  });

  it('shows the empty label for null and the placeholder for an unknown value', async () => {
    const { fixture, trigger, host } = await setup();
    host.value.set(null);
    await settle(fixture);
    expect(trigger.textContent.trim()).toBe('Unsorted');
    host.value.set('gone');
    await settle(fixture);
    expect(trigger.textContent.trim()).toBe('Pick a folder');
  });

  it('opens on click into the menu layer with indented options and the selected check', async () => {
    const { open, names, options, trigger, listbox } = await setup();
    await open();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(listbox()?.id);
    expect(names()).toEqual(['Unsorted', 'Work', 'Angular', 'Courses', 'Clothes']);
    expect(listbox()?.closest('.ui-overlay-layer--menu')).not.toBeNull();
    const angular = options()[2] as HTMLElement;
    expect(angular.getAttribute('aria-selected')).toBe('true');
    expect(angular.getAttribute('aria-label')).toBe('Work / Angular');
    expect(angular.style.getPropertyValue('--ui-select-level')).toBe('1');
    expect(options()[1]?.getAttribute('aria-label')).toBeNull();
    expect(angular.querySelector('.ui-select__check')).not.toBeNull();
    expect(options()[0]?.getAttribute('aria-selected')).toBe('false');
    expect(listbox()?.getAttribute('aria-label')).toBe('Folder');
  });

  it('starts on the selected option and moves with the arrows, Home and End', async () => {
    const { open, trigger, active, press } = await setup();
    await open();
    expect(active()?.textContent.trim()).toBe('Angular');
    await press(trigger, 'ArrowDown');
    expect(active()?.textContent.trim()).toBe('Courses');
    await press(trigger, 'End');
    expect(active()?.textContent.trim()).toBe('Clothes');
    await press(trigger, 'Home');
    expect(active()?.textContent.trim()).toBe('Unsorted');
    await press(trigger, 'ArrowUp');
    expect(active()?.textContent.trim()).toBe('Clothes');
  });

  it('jumps to an option by typing (typeahead) without a search box', async () => {
    const { open, trigger, active, press } = await setup();
    await open();
    await press(trigger, 'c');
    await press(trigger, 'l');
    expect(active()?.textContent.trim()).toBe('Clothes');
  });

  it('chooses with Enter, closes and keeps focus on the trigger', async () => {
    const { open, trigger, press, host, listbox, fixture } = await setup();
    await open();
    await press(trigger, 'ArrowDown');
    await press(trigger, 'Enter');
    expect(host.value()).toBe('courses');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    await settle(fixture);
    expect(listbox()).toBeNull();
    expect(host.touches()).toBeGreaterThan(0);
  });

  it('chooses the empty option and writes null', async () => {
    const { open, options, host, trigger, fixture } = await setup();
    await open();
    options()[0]?.click();
    await settle(fixture);
    expect(host.value()).toBeNull();
    expect(trigger.textContent.trim()).toBe('Unsorted');
  });

  it('keeps the value when the current option is chosen again', async () => {
    const { open, options, host, fixture } = await setup();
    await open();
    options()[2]?.click();
    await settle(fixture);
    expect(host.value()).toBe('angular');
  });

  it('closes on Esc, keeps the value and stops Esc from reaching a dialog', async () => {
    const { open, trigger, host, press, fixture } = await setup();
    const outer = vi.fn();
    (fixture.nativeElement as HTMLElement).addEventListener('keydown', outer);
    await open();
    await press(trigger, 'ArrowDown');
    await press(trigger, 'Escape');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(host.value()).toBe('angular');
    expect(document.activeElement).toBe(trigger);
    const escapes = outer.mock.calls.filter(([e]) => (e as KeyboardEvent).key === 'Escape');
    expect(escapes).toHaveLength(0);
    await press(trigger, 'Escape');
    expect(outer.mock.calls.filter(([e]) => (e as KeyboardEvent).key === 'Escape')).toHaveLength(1);
  });

  it('opens with ArrowDown and Enter from the keyboard', async () => {
    const { trigger, press } = await setup();
    trigger.focus();
    await press(trigger, 'ArrowDown');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes when focus leaves and marks the field touched', async () => {
    const { open, root, trigger, fixture, host } = await setup();
    await open();
    root.querySelector<HTMLElement>('#outside')?.focus();
    await settle(fixture);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(host.touches()).toBeGreaterThan(0);
  });

  it('marks touched on blur of the closed trigger', async () => {
    const { trigger, root, host } = await setup();
    trigger.focus();
    root.querySelector<HTMLElement>('#outside')?.focus();
    expect(host.touches()).toBe(1);
  });

  it('toggles closed on a second click', async () => {
    const { open, trigger, fixture } = await setup();
    await open();
    trigger.click();
    await settle(fixture);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('focuses the trigger from the label', async () => {
    const { root, trigger } = await setup();
    root.querySelector<HTMLElement>('label')?.click();
    expect(document.activeElement).toBe(trigger);
  });

  it('does not move focus when pressing in the popup', async () => {
    const { open, options, trigger } = await setup();
    await open();
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    options()[1]?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it('is disabled: no popup, native disabled state', async () => {
    const { fixture, host, trigger } = await setup();
    host.disabled.set(true);
    await settle(fixture);
    expect(trigger.disabled).toBe(true);
    trigger.click();
    await settle(fixture);
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });

  it('shows the error state', async () => {
    const { fixture, host, trigger, root } = await setup();
    host.error.set('Choose a folder');
    await settle(fixture);
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    expect(root.querySelector('.ui-field--error')).not.toBeNull();
    expect(root.querySelector('.ui-field__error')?.textContent).toBe('Choose a folder');
  });

  describe('searchable', () => {
    async function searching() {
      const ctx = await setup();
      ctx.host.searchable.set(true);
      await settle(ctx.fixture);
      await ctx.open();
      return ctx;
    }

    function type(input: HTMLInputElement, text: string): void {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    it('moves focus into the search box and keeps the popup open', async () => {
      const { search, trigger } = await searching();
      expect(document.activeElement).toBe(search());
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(search()?.getAttribute('aria-label')).toBe('Find a folder');
      expect(search()?.getAttribute('aria-controls')).toBe(
        document.querySelector('[role="listbox"]')?.id,
      );
    });

    it('filters while typing, keeps ancestors and activates the first match', async () => {
      const { search, names, fixture, active } = await searching();
      type(search() as HTMLInputElement, 'ang');
      await settle(fixture);
      expect(names()).toEqual(['Work', 'Angular']);
      expect(active()?.textContent.trim()).toBe('Work');
    });

    it('says so when nothing matches and recovers', async () => {
      const { search, names, fixture } = await searching();
      type(search() as HTMLInputElement, 'zzz');
      await settle(fixture);
      const status = document.querySelector('.ui-select__status') as HTMLElement;
      expect(status.textContent.trim()).toBe('No folders found');
      expect(status.getAttribute('role')).toBe('status');
      expect((document.querySelector('[role="listbox"]') as HTMLElement).hidden).toBe(true);
      type(search() as HTMLInputElement, '');
      await settle(fixture);
      expect(names()).toHaveLength(5);
      expect(status.textContent.trim()).toBe('');
    });

    it('moves with the arrows and chooses with Enter', async () => {
      const { search, press, host, trigger, active, fixture } = await searching();
      const field = search() as HTMLInputElement;
      type(field, 'c');
      await settle(fixture);
      await press(field, 'ArrowDown');
      expect(active()?.textContent.trim()).toBe('Courses');
      await press(field, 'Enter');
      expect(host.value()).toBe('courses');
      expect(document.activeElement).toBe(trigger);
    });

    it('uses Home and End for the options only while the box is empty or with Ctrl', async () => {
      const { search, press, active } = await searching();
      const field = search() as HTMLInputElement;
      await press(field, 'End');
      expect(active()?.textContent.trim()).toBe('Clothes');
      await press(field, 'Home');
      expect(active()?.textContent.trim()).toBe('Unsorted');
      field.value = 'o';
      const end = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true });
      field.dispatchEvent(end);
      expect(end.defaultPrevented).toBe(false);
      await press(field, 'End', { ctrlKey: true });
      expect(active()).not.toBeNull();
    });

    it('closes on Esc from the search box and returns focus to the trigger', async () => {
      const { search, press, trigger, host } = await searching();
      await press(search() as HTMLInputElement, 'Escape');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(trigger);
      expect(host.value()).toBe('angular');
    });

    it('closes on Tab and clears the query when it opens again', async () => {
      const { search, press, trigger, open, fixture } = await searching();
      type(search() as HTMLInputElement, 'ang');
      await press(search() as HTMLInputElement, 'Tab');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      await settle(fixture);
      await open();
      expect((search() as HTMLInputElement).value).toBe('');
    });

    it('stays open when focus moves inside the popup', async () => {
      const { search, trigger, fixture } = await searching();
      (search() as HTMLInputElement).blur();
      await settle(fixture);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });
  });

  it('is axe clean closed, open and searching', async () => {
    const { root, open, fixture, host } = await setup();
    expect(await axeViolations(root)).toEqual([]);
    await open();
    expect(await axeViolations(overlays())).toEqual([]);
    host.searchable.set(true);
    host.error.set('Choose a folder');
    await settle(fixture);
    expect(await axeViolations(overlays())).toEqual([]);
  });
});

describe('SelectComponent with Signal Forms', () => {
  async function formSetup() {
    const fixture = TestBed.createComponent(FormHostComponent);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const trigger = root.querySelector<HTMLButtonElement>(
      'button[role="combobox"]',
    ) as HTMLButtonElement;
    return { fixture, root, trigger, host: fixture.componentInstance };
  }

  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.replaceChildren();
    });
  });

  it('shows the null value as the empty option and writes the choice to the model', async () => {
    const { fixture, trigger, host } = await formSetup();
    expect(trigger.textContent.trim()).toBe('Unsorted');
    trigger.focus();
    trigger.click();
    await settle(fixture);
    document.querySelectorAll<HTMLElement>('[role="option"]')[3]?.click();
    await settle(fixture);
    expect(host.model().folder).toBe('courses');
    expect(trigger.textContent.trim()).toBe('Work / Courses');
  });

  it('writes null back when the empty option is chosen', async () => {
    const { fixture, trigger, host } = await formSetup();
    host.model.set({ folder: 'clothes' });
    await settle(fixture);
    trigger.click();
    await settle(fixture);
    document.querySelectorAll<HTMLElement>('[role="option"]')[0]?.click();
    await settle(fixture);
    expect(host.model().folder).toBeNull();
  });

  it('follows disabled from the form', async () => {
    const { fixture, trigger, host } = await formSetup();
    host.lock.set(true);
    await settle(fixture);
    expect(trigger.disabled).toBe(true);
    host.lock.set(false);
    await settle(fixture);
    expect(trigger.disabled).toBe(false);
  });

  it('shows the validation message once the field is touched', async () => {
    const { fixture, trigger, root } = await formSetup();
    expect(root.querySelector('.ui-field__error')?.textContent).toBe('');
    expect(trigger.getAttribute('aria-invalid')).toBeNull();
    trigger.focus();
    trigger.blur();
    await settle(fixture);
    expect(root.querySelector('.ui-field__error')?.textContent).toBe('Choose a folder');
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    expect(trigger.getAttribute('aria-describedby')).toContain('-error');
  });
});

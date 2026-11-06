import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { disabled, form, FormField, minLength } from '@angular/forms/signals';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { KEYBOARD_KEY } from '../keyboard';
import { OVERLAY_LAYER } from '../overlay/models/overlay-layer.const';
import { overlayLayerClass } from '../overlay/overlay-layer';
import type { TagSuggestion } from './models/tag-suggestion.interface';
import { TAG_SEPARATOR } from './models/tag-separator.const';
import { TagInputComponent } from './tag-input.component';

const SUGGESTIONS: TagSuggestion[] = [
  { name: 'signals', countLabel: '12 links' },
  { name: 'angular', countLabel: '8 links' },
  { name: 'design' },
];

@Component({
  imports: [TagInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-tag-input
      label="Tags"
      hint="Enter adds"
      placeholder="Add tag"
      maxTagsLabel="Up to 3 tags"
      createLabel="Create tag “{name}”"
      removeLabel="Remove tag {name}"
      addedLabel="Tag {name} added"
      removedLabel="Tag {name} removed"
      [suggestions]="suggestions"
      [maxTags]="maxTags()"
      [error]="error()"
      [disabled]="disabled()"
      [(value)]="value"
      (touch)="touches.set(touches() + 1)"
    />
    <button id="outside" type="button">Outside</button>
  `,
})
class HostComponent {
  readonly suggestions = SUGGESTIONS;
  readonly maxTags = signal<number | undefined>(undefined);
  readonly error = signal('');
  readonly disabled = signal(false);
  readonly value = signal<string[]>(['angular', 'courses']);
  readonly touches = signal(0);
}

@Component({
  imports: [TagInputComponent, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ui-tag-input label="Tags" [suggestions]="suggestions" [formField]="f.tags" />`,
})
class FormHostComponent {
  readonly suggestions = SUGGESTIONS;
  readonly lock = signal(false);
  readonly model = signal<{ tags: string[] }>({ tags: [] });
  readonly f = form(this.model, (p) => {
    minLength(p.tags, 1, { message: 'Add at least one tag' });
    disabled(p.tags, () => this.lock());
  });
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 4; i++) {
    fixture.detectChanges();
    TestBed.tick();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function key(target: Element, name: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: name,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  await settle(fixture);
  const root = fixture.nativeElement as HTMLElement;
  const input = root.querySelector('input[role="combobox"]') as HTMLInputElement;
  const chips = () => Array.from(root.querySelectorAll<HTMLElement>('ui-chip'));
  const chipNames = () => chips().map((c) => c.querySelector('.ui-chip__body')?.textContent.trim());
  const options = () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
  const names = () => options().map((o) => o.textContent.replace(/\s+/g, ' ').trim());
  const listbox = () => document.querySelector<HTMLElement>('[role="listbox"]');
  const status = () => root.querySelector('.ui-tag-input__status')?.textContent.trim();
  const active = () => document.getElementById(input.getAttribute('aria-activedescendant') ?? '');
  const press = async (name: string, init: KeyboardEventInit = {}) => {
    const event = key(input, name, init);
    await settle(fixture);
    return event;
  };
  const type = async (text: string) => {
    input.focus();
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
  };
  return {
    fixture,
    root,
    input,
    chips,
    chipNames,
    options,
    names,
    listbox,
    status,
    active,
    press,
    type,
    host: fixture.componentInstance,
  };
}

describe('TagInputComponent', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => el.replaceChildren());
  });

  it('renders removable chips and a combobox input named by the label', async () => {
    const { root, input, chips, chipNames } = await setup();
    expect(chipNames()).toEqual(['angular', 'courses']);
    expect(chips()[0]?.querySelector('.ui-chip__remove')?.getAttribute('aria-label')).toBe(
      'Remove tag angular',
    );
    expect(root.querySelector('label')?.getAttribute('for')).toBe(input.id);
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-haspopup')).toBe('listbox');
    expect(input.getAttribute('placeholder')).toBe('Add tag');
    expect(input.getAttribute('aria-describedby')).toContain('-hint');
  });

  it('adds on Enter, trims, announces and clears the input', async () => {
    const { input, type, press, chipNames, host, status } = await setup();
    await type('  rxjs  ');
    const event = await press(KEYBOARD_KEY.Enter);
    expect(event.defaultPrevented).toBe(true);
    expect(host.value()).toEqual(['angular', 'courses', 'rxjs']);
    expect(chipNames()).toContain('rxjs');
    expect(input.value).toBe('');
    expect(status()).toBe('Tag rxjs added');
  });

  it('adds on comma and splits a pasted list', async () => {
    const { input, press, type, host } = await setup();
    await type('one');
    await press(TAG_SEPARATOR);
    expect(host.value()).toContain('one');
    await type('two, three ,fo');
    expect(host.value()).toEqual(['angular', 'courses', 'one', 'two', 'three']);
    expect(input.value).toBe('fo');
  });

  it('ignores duplicates ignoring case, empty text and cuts to 50 characters', async () => {
    const { type, press, host } = await setup();
    await type('ANGULAR');
    await press(KEYBOARD_KEY.Enter);
    await type('   ');
    await press(KEYBOARD_KEY.Enter);
    expect(host.value()).toEqual(['angular', 'courses']);
    await type('x'.repeat(70));
    await press(KEYBOARD_KEY.Enter);
    expect(host.value().at(-1)).toHaveLength(50);
  });

  it('does not swallow Enter in an empty input (form submit)', async () => {
    const { press } = await setup();
    const event = await press(KEYBOARD_KEY.Enter);
    expect(event.defaultPrevented).toBe(false);
  });

  it('removes the last tag with Backspace on an empty input only', async () => {
    const { type, press, host, status, input, fixture } = await setup();
    await type('a');
    await press(KEYBOARD_KEY.Backspace);
    expect(host.value()).toHaveLength(2);
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    await press(KEYBOARD_KEY.Backspace);
    expect(host.value()).toEqual(['angular']);
    expect(status()).toBe('Tag courses removed');
    expect(document.activeElement).toBe(input);
  });

  it('removes with the chip button and moves focus to the next chip, the previous one, then the input', async () => {
    const { chips, fixture, host, input } = await setup();
    host.value.set(['a', 'b', 'c']);
    await settle(fixture);
    (chips()[1]?.querySelector('.ui-chip__remove') as HTMLElement).click();
    await settle(fixture);
    expect(host.value()).toEqual(['a', 'c']);
    expect(document.activeElement).toBe(chips()[1]?.querySelector('.ui-chip__remove'));
    (chips()[1]?.querySelector('.ui-chip__remove') as HTMLElement).click();
    await settle(fixture);
    expect(document.activeElement).toBe(chips()[0]?.querySelector('.ui-chip__remove'));
    (chips()[0]?.querySelector('.ui-chip__remove') as HTMLElement).click();
    await settle(fixture);
    expect(document.activeElement).toBe(input);
  });

  it('shows suggestions in the menu layer with counts and a create row, hiding added tags', async () => {
    const { type, names, listbox, input, options } = await setup();
    await type('s');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe(listbox()?.id);
    expect(names()).toEqual(['signals12 links', 'design', 'Create tag “s”']);
    expect(listbox()?.closest(`.${overlayLayerClass(OVERLAY_LAYER.Menu)}`)).not.toBeNull();
    expect(options()[2]?.classList).toContain('ui-tag-input__option--create');
    await type('ang');
    expect(names()).toEqual(['Create tag “ang”']);
  });

  it('opens with ArrowDown on an empty input, moves with arrows and chooses with Enter', async () => {
    const { input, press, names, active, host, listbox, fixture } = await setup();
    input.focus();
    await press(KEYBOARD_KEY.ArrowDown);
    expect(names()).toEqual(['signals12 links', 'design']);
    // Aria activates the first option on open.
    expect(active()?.textContent).toContain('signals');
    await press(KEYBOARD_KEY.ArrowDown);
    expect(active()?.textContent).toContain('design');
    await press(KEYBOARD_KEY.ArrowUp);
    expect(active()?.textContent).toContain('signals');
    expect(input.getAttribute('aria-activedescendant')).toBe(active()?.id);
    await press(KEYBOARD_KEY.Enter);
    expect(host.value()).toEqual(['angular', 'courses', 'signals']);
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(input);
    await settle(fixture);
    expect(listbox()).toBeNull();
  });

  it('activates the create row while typing, so Enter adds the typed text', async () => {
    const { type, active } = await setup();
    await type('sx');
    expect(active()?.textContent).toContain('Create tag “sx”');
    await type('design');
    expect(active()?.textContent).toContain('design');
  });

  it('adds the typed text, not a stale option, on Enter after typing', async () => {
    const { input, press, type, host } = await setup();
    await type('s');
    await press(KEYBOARD_KEY.ArrowDown);
    await type('sx');
    await press(KEYBOARD_KEY.Enter);
    expect(host.value().at(-1)).toBe('sx');
    expect(input.value).toBe('');
  });

  it('chooses the create row by click and can create the same tag again after removing it', async () => {
    const { type, options, host, fixture, chips } = await setup();
    await type('zed');
    options().at(-1)?.click();
    await settle(fixture);
    expect(host.value().at(-1)).toBe('zed');
    (chips().at(-1)?.querySelector('.ui-chip__remove') as HTMLElement).click();
    await settle(fixture);
    await type('zed');
    options().at(-1)?.click();
    await settle(fixture);
    expect(host.value().at(-1)).toBe('zed');
  });

  it('closes on Esc, keeps the text, and stops Esc from reaching a dialog only while open', async () => {
    const { fixture, type, press, input } = await setup();
    const outer = vi.fn();
    (fixture.nativeElement as HTMLElement).addEventListener('keydown', outer);
    await type('s');
    await press(KEYBOARD_KEY.Escape);
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.value).toBe('s');
    expect(outer.mock.calls.filter(([e]) => e.key === KEYBOARD_KEY.Escape)).toHaveLength(0);
    await press(KEYBOARD_KEY.Escape);
    expect(outer.mock.calls.filter(([e]) => e.key === KEYBOARD_KEY.Escape)).toHaveLength(1);
  });

  it('stops adding at maxTags and shows the limit text', async () => {
    const { host, fixture, input, type, press, status } = await setup();
    host.maxTags.set(2);
    await settle(fixture);
    expect(input.readOnly).toBe(true);
    expect(input.getAttribute('placeholder')).toBe('Up to 3 tags');
    await type('x');
    await press(KEYBOARD_KEY.ArrowDown);
    expect(input.getAttribute('aria-expanded')).toBe('false');
    host.maxTags.set(3);
    await settle(fixture);
    await type('x');
    await press(KEYBOARD_KEY.Enter);
    expect(host.value()).toHaveLength(3);
    expect(host.value()).toEqual(['angular', 'courses', 'x']);
    host.maxTags.set(1);
    await settle(fixture);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(status()).toBeDefined();
  });

  it('announces the limit when a comma list exceeds it', async () => {
    const { host, fixture, type, status } = await setup();
    host.maxTags.set(3);
    await settle(fixture);
    await type('a,b,');
    expect(host.value()).toHaveLength(3);
    expect(status()).toBe('Up to 3 tags');
  });

  it('shows the error, marks the input invalid and keeps the hint described', async () => {
    const { host, fixture, input, root } = await setup();
    host.error.set('Too few');
    await settle(fixture);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(root.querySelector('.ui-field__error')?.textContent).toBe('Too few');
    expect(input.getAttribute('aria-describedby')).toContain('-hint');
  });

  it('disables the input and the chips', async () => {
    const { host, fixture, input, chips } = await setup();
    host.disabled.set(true);
    await settle(fixture);
    expect(input.disabled).toBe(true);
    expect(chips()[0]?.getAttribute('aria-disabled')).toBe('true');
    expect(chips()[0]?.querySelector<HTMLButtonElement>('.ui-chip__remove')?.disabled).toBe(true);
  });

  it('touches when focus leaves the field, not between chips and input', async () => {
    const { root, input, chips, host } = await setup();
    input.focus();
    (chips()[0]?.querySelector('.ui-chip__remove') as HTMLElement).focus();
    expect(host.touches()).toBe(0);
    root.querySelector<HTMLElement>('#outside')?.focus();
    expect(host.touches()).toBe(1);
  });

  it('ignores a window blur', async () => {
    const { input, host } = await setup();
    input.focus();
    vi.mocked(document.hasFocus).mockReturnValue(false);
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    expect(host.touches()).toBe(0);
  });

  it('closes the list when focus leaves', async () => {
    const { root, type, fixture, input } = await setup();
    await type('s');
    root.querySelector<HTMLElement>('#outside')?.focus();
    await settle(fixture);
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('focuses the input from the box and from focus()', async () => {
    const { root, input, fixture } = await setup();
    root.querySelector<HTMLElement>('.ui-tag-input__box')?.click();
    expect(document.activeElement).toBe(input);
    input.blur();
    fixture.debugElement.children[0]?.componentInstance.focus();
    expect(document.activeElement).toBe(input);
  });

  it('has no axe violations, closed and open', async () => {
    const { root, type, fixture } = await setup();
    expect(await axeViolations(root)).toEqual([]);
    await type('s');
    expect(
      await axeViolations(document.querySelector('.cdk-overlay-container') as Element),
    ).toEqual([]);
    await settle(fixture);
  });

  describe('with Signal Forms', () => {
    async function formSetup() {
      const fixture = TestBed.createComponent(FormHostComponent);
      await settle(fixture);
      const root = fixture.nativeElement as HTMLElement;
      const input = root.querySelector('input[role="combobox"]') as HTMLInputElement;
      return { fixture, root, input, host: fixture.componentInstance };
    }

    it('writes tags to the model and reads them back', async () => {
      const { fixture, input, host, root } = await formSetup();
      input.focus();
      input.value = 'one';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await settle(fixture);
      key(input, KEYBOARD_KEY.Enter);
      await settle(fixture);
      expect(host.model().tags).toEqual(['one']);
      host.model.set({ tags: ['x', 'y'] });
      await settle(fixture);
      expect(root.querySelectorAll('ui-chip')).toHaveLength(2);
    });

    it('shows the validator message after the field is touched', async () => {
      const { fixture, input, root } = await formSetup();
      expect(root.querySelector('.ui-field__error')?.textContent).toBe('');
      input.focus();
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
      await settle(fixture);
      expect(root.querySelector('.ui-field__error')?.textContent).toBe('Add at least one tag');
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('is disabled from the form', async () => {
      const { fixture, input, host } = await formSetup();
      host.lock.set(true);
      await settle(fixture);
      expect(input.disabled).toBe(true);
    });
  });
});

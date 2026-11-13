import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { form, FormField, validate } from '@angular/forms/signals';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { OVERLAY_LAYER } from '../../services/overlay/models/overlay-layer.const';
import { overlayLayerClass } from '../../services/overlay/overlay-layer';
import { EmojiPickerComponent } from './emoji-picker.component';
import type { EmojiPickerCategory } from './models/emoji-picker-category.interface';
import type { EmojiPickerItem } from './models/emoji-picker-item.interface';

const FOOD = ['🍕', '🍔', '🍟', '🌭', '🥪', '🌮', '🌯', '🥗', '🍝', '🍜'];
const CATEGORIES: EmojiPickerCategory[] = [
  {
    id: 'food',
    label: 'Food',
    items: FOOD.map((emoji, i) => ({
      emoji,
      name: i === 0 ? 'pizza' : `food ${i}`,
      keywords: i === 0 ? ['cheese'] : [],
    })),
  },
  {
    id: 'animals',
    label: 'Animals',
    items: [
      { emoji: '🐶', name: 'dog face' },
      { emoji: '🐱', name: 'cat face' },
    ],
  },
];

@Component({
  imports: [EmojiPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-emoji-picker
      label="Emoji"
      hint="One emoji instead of an icon"
      placeholder="Choose an emoji"
      searchLabel="Search emoji"
      categoriesLabel="Categories"
      recentLabel="Recent"
      ownLabel="Yours"
      resultsLabel="Results"
      noResultsLabel="No emoji found"
      loadingLabel="Loading emoji"
      closeLabel="Close"
      [categories]="categories()"
      [recent]="recent()"
      [own]="own()"
      [disabled]="disabled()"
      [(value)]="value"
      (opened)="opens.set(opens() + 1)"
      (removed)="removedEmoji.set($event)"
      (touch)="touches.set(touches() + 1)"
    />
    <button id="outside" type="button">Outside</button>
  `,
})
class HostComponent {
  readonly categories = signal<EmojiPickerCategory[]>(CATEGORIES);
  readonly recent = signal<EmojiPickerItem[]>([]);
  readonly own = signal<EmojiPickerItem[]>([]);
  readonly disabled = signal(false);
  readonly value = signal('');
  readonly opens = signal(0);
  readonly removedEmoji = signal('');
  readonly touches = signal(0);
}

@Component({
  imports: [EmojiPickerComponent, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ui-emoji-picker
    label="Emoji"
    searchLabel="Search emoji"
    categoriesLabel="Categories"
    [formField]="f.emoji"
  />`,
})
class FormHostComponent {
  readonly model = signal({ emoji: '' });
  readonly f = form(this.model, (p) => {
    validate(p.emoji, ({ value }) =>
      value() === 'x' ? { kind: 'emoji', message: 'Only one emoji' } : undefined,
    );
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

function stubPhone(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  await settle(fixture);
  const root = fixture.nativeElement as HTMLElement;
  const field = root.querySelector<HTMLInputElement>(
    '.ui-emoji-picker__native',
  ) as HTMLInputElement;
  const panel = () => document.querySelector<HTMLElement>('.ui-emoji-picker__panel');
  const search = () => document.querySelector<HTMLInputElement>('.ui-emoji-picker__search-input');
  const cells = () => Array.from(document.querySelectorAll<HTMLElement>('[role="gridcell"]'));
  const names = () => cells().map((cell) => cell.getAttribute('aria-label'));
  const headings = () =>
    Array.from(document.querySelectorAll('.ui-emoji-picker__heading')).map((h) =>
      h.textContent.trim(),
    );
  const press = async (target: Element, name: string, init: KeyboardEventInit = {}) => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init }),
    );
    await settle(fixture);
  };
  const open = async () => {
    field.focus();
    field.click();
    await settle(fixture);
  };
  const type = async (input: HTMLInputElement, text: string) => {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
  };
  return {
    fixture,
    root,
    field,
    panel,
    search,
    cells,
    names,
    headings,
    press,
    open,
    type,
    host: fixture.componentInstance,
  };
}

describe('EmojiPickerComponent', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    stubPhone(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.replaceChildren();
    });
  });

  it('is a labelled text field with the placeholder and a closed popup', async () => {
    const { root, field } = await setup();
    expect(root.querySelector('label')?.textContent.trim()).toBe('Emoji');
    expect(field.placeholder).toBe('Choose an emoji');
    expect(field.getAttribute('aria-haspopup')).toBe('dialog');
    expect(field.getAttribute('aria-expanded')).toBe('false');
    expect(field.hasAttribute('aria-controls')).toBe(false);
  });

  it('takes typed or pasted text as the value', async () => {
    const { field, type, host } = await setup();
    await type(field, '🦩');
    expect(host.value()).toBe('🦩');
  });

  it('opens on click in the menu layer, focuses the search and emits opened', async () => {
    const { field, open, panel, search, host, headings, fixture, root } = await setup();
    await open();
    expect(field.getAttribute('aria-expanded')).toBe('true');
    expect(field.getAttribute('aria-controls')).toBe(panel()?.id);
    expect(panel()?.getAttribute('role')).toBe('dialog');
    expect(panel()?.getAttribute('aria-label')).toBe('Emoji');
    expect(document.activeElement).toBe(search());
    expect(host.opens()).toBe(1);
    expect(headings()).toEqual(['Food']);
    const host2 = panel()?.closest('.cdk-overlay-connected-position-bounding-box');
    expect(host2?.classList.contains(overlayLayerClass(OVERLAY_LAYER.Menu))).toBe(true);
    expect(await axeViolations(root)).toEqual([]);
    expect(await axeViolations(panel() as HTMLElement)).toEqual([]);
    fixture.destroy();
  });

  it('opens with Enter or ArrowDown, not with other keys, and not when disabled', async () => {
    const { field, press, panel, host, fixture } = await setup();
    await press(field, 'a');
    expect(panel()).toBeNull();
    const enter = new KeyboardEvent('keydown', { key: KEYBOARD_KEY.Enter, cancelable: true });
    field.dispatchEvent(enter);
    await settle(fixture);
    expect(enter.defaultPrevented).toBe(true);
    expect(panel()).not.toBeNull();
    await press(panel() as HTMLElement, KEYBOARD_KEY.Escape);
    expect(panel()).toBeNull();
    await press(field, KEYBOARD_KEY.ArrowDown);
    expect(panel()).not.toBeNull();
    await press(panel() as HTMLElement, KEYBOARD_KEY.Escape);
    host.disabled.set(true);
    await settle(fixture);
    await press(field, KEYBOARD_KEY.ArrowDown);
    expect(panel()).toBeNull();
  });

  it('shows a spinner until the categories arrive', async () => {
    const { host, open, fixture } = await setup();
    host.categories.set([]);
    await open();
    expect(document.querySelector('.ui-emoji-picker__loading [role="status"]')).not.toBeNull();
    host.categories.set(CATEGORIES);
    await settle(fixture);
    expect(document.querySelector('.ui-emoji-picker__loading')).toBeNull();
  });

  it('names every emoji and switches categories with the tabs', async () => {
    const { open, names, fixture } = await setup();
    await open();
    expect(names().slice(0, 2)).toEqual(['pizza', 'food 1']);
    const tabs = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]'));
    expect(tabs.map((tab) => tab.getAttribute('aria-label'))).toEqual(['Food', 'Animals']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe(
      'Categories',
    );
    tabs[1].click();
    await settle(fixture);
    expect(names()).toEqual(['dog face', 'cat face']);
  });

  it('chooses with a click, closes and hands focus back to the field', async () => {
    const { open, cells, host, field, panel, fixture } = await setup();
    await open();
    cells()[1].click();
    await settle(fixture);
    expect(host.value()).toBe('🍔');
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(field);
    expect(field.getAttribute('aria-expanded')).toBe('false');
  });

  it('marks the current emoji', async () => {
    const { open, cells, host, fixture } = await setup();
    host.value.set('🍟');
    await settle(fixture);
    await open();
    expect(cells()[2].getAttribute('aria-current')).toBe('true');
    expect(cells()[2].classList.contains('is-current')).toBe(true);
    expect(cells()[0].hasAttribute('aria-current')).toBe(false);
  });

  it('moves with the arrows in the grid and chooses with Enter or Space', async () => {
    const { open, search, cells, press, host, fixture } = await setup();
    await open();
    await press(search() as HTMLElement, KEYBOARD_KEY.ArrowDown);
    expect(document.activeElement).toBe(cells()[0]);
    await press(cells()[0], KEYBOARD_KEY.ArrowRight);
    expect(document.activeElement).toBe(cells()[1]);
    await press(cells()[1], KEYBOARD_KEY.ArrowDown);
    expect(document.activeElement).toBe(cells()[9]);
    await press(cells()[9], KEYBOARD_KEY.Enter);
    expect(host.value()).toBe('🍜');
    await open();
    await press(search() as HTMLElement, KEYBOARD_KEY.ArrowDown);
    await press(document.activeElement as HTMLElement, KEYBOARD_KEY.Space);
    expect(host.value()).toBe('🍕');
    fixture.destroy();
  });

  it('searches names and keywords, chooses the first result with Enter, says when nothing matches', async () => {
    const { open, search, type, names, headings, press, host } = await setup();
    await open();
    await type(search() as HTMLInputElement, 'chee');
    expect(names()).toEqual(['pizza']);
    expect(headings()).toEqual(['Results']);
    expect(document.querySelector('[role="tablist"]')).toBeNull();
    await type(search() as HTMLInputElement, 'zebra');
    expect(names()).toEqual([]);
    expect(document.querySelector('.ui-emoji-picker__status')?.textContent.trim()).toBe(
      'No emoji found',
    );
    await type(search() as HTMLInputElement, 'cat');
    await press(search() as HTMLElement, KEYBOARD_KEY.Enter);
    expect(host.value()).toBe('🐱');
  });

  it('offers a pasted emoji in the search even when the catalogue lacks it', async () => {
    const { open, search, type, names, press, host } = await setup();
    await open();
    await type(search() as HTMLInputElement, '🦩');
    expect(names()).toEqual(['🦩']);
    await press(search() as HTMLElement, KEYBOARD_KEY.Enter);
    expect(host.value()).toBe('🦩');
  });

  it('shows Recent and Yours above the category while they have emoji', async () => {
    const { host, open, headings, fixture, root, panel } = await setup();
    host.recent.set([{ emoji: '🐶', name: 'dog face' }]);
    host.own.set([{ emoji: '🦩', name: '🦩', removeLabel: 'Remove 🦩' }]);
    await settle(fixture);
    await open();
    expect(headings()).toEqual(['Recent', 'Yours', 'Food']);
    const grids = Array.from(document.querySelectorAll('[role="grid"]'));
    expect(grids.map((grid) => grid.getAttribute('aria-labelledby'))).toEqual(
      Array.from(document.querySelectorAll('.ui-emoji-picker__heading')).map((h) => h.id),
    );
    expect(await axeViolations(root)).toEqual([]);
    expect(await axeViolations(panel() as HTMLElement)).toEqual([]);
  });

  it('removes an own emoji with the × or Delete, never a plain one', async () => {
    const { host, open, press, fixture } = await setup();
    host.own.set([
      { emoji: '🦩', name: '🦩', removeLabel: 'Remove 🦩' },
      { emoji: '🐙', name: '🐙' },
    ]);
    await settle(fixture);
    await open();
    const own = () =>
      Array.from(document.querySelectorAll<HTMLElement>('[data-own] [role="gridcell"]'));
    expect(own()[0].getAttribute('aria-description')).toBe('Remove 🦩');
    expect(own()[0].getAttribute('aria-keyshortcuts')).toBe('Delete Backspace');
    expect(own()[1].querySelector('.ui-emoji-picker__remove')).toBeNull();
    await press(own()[1], KEYBOARD_KEY.Delete);
    expect(host.removedEmoji()).toBe('');
    own()[0].querySelector<HTMLElement>('.ui-emoji-picker__remove')?.click();
    await settle(fixture);
    expect(host.removedEmoji()).toBe('🦩');
    expect(host.value()).toBe('');
    host.removedEmoji.set('');
    await press(own()[0], KEYBOARD_KEY.Backspace);
    expect(host.removedEmoji()).toBe('🦩');
    // The feature drops it: focus goes to the emoji that took its place.
    host.own.set([{ emoji: '🐙', name: '🐙' }]);
    await settle(fixture);
    expect(document.activeElement).toBe(own()[0]);
  });

  it('closes with Esc (stopped for the dialog around it) and on a press outside', async () => {
    const { open, panel, field, root, fixture } = await setup();
    await open();
    const esc = new KeyboardEvent('keydown', {
      key: KEYBOARD_KEY.Escape,
      bubbles: true,
      cancelable: true,
    });
    const outer = vi.fn();
    document.body.addEventListener('keydown', outer);
    (document.activeElement as HTMLElement).dispatchEvent(esc);
    await settle(fixture);
    expect(outer).not.toHaveBeenCalled();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(field);
    document.body.removeEventListener('keydown', outer);
    await open();
    root.querySelector('#outside')?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await settle(fixture);
    expect(panel()).toBeNull();
  });

  it('stays open when a toast is pressed or focused (the Undo of a removal)', async () => {
    const { open, panel, fixture } = await setup();
    await open();
    const layer = document.createElement('div');
    layer.className = overlayLayerClass(OVERLAY_LAYER.Toast);
    const undo = document.createElement('button');
    undo.append(document.createTextNode('Undo'));
    layer.append(undo);
    document.body.append(layer);
    undo.firstChild?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    panel()?.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: undo }));
    await settle(fixture);
    expect(panel()).not.toBeNull();
    layer.remove();
  });

  it('a second click on the field closes it; focus leaving to another control closes it', async () => {
    const { open, panel, field, root, fixture } = await setup();
    await open();
    field.click();
    await settle(fixture);
    expect(panel()).toBeNull();
    await open();
    const outside = root.querySelector<HTMLElement>('#outside') as HTMLElement;
    panel()?.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    await settle(fixture);
    expect(panel()).toBeNull();
  });

  it('Shift+Tab from the search goes back to the field; Tab past the last stop leaves', async () => {
    const { open, panel, field, search, press } = await setup();
    await open();
    await press(search() as HTMLElement, KEYBOARD_KEY.Tab, { shiftKey: true });
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(field);
    await open();
    const cell = document.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]');
    await press(cell as HTMLElement, KEYBOARD_KEY.Tab);
    expect(panel()).toBeNull();
  });

  it('is a bottom sheet on a phone with a close button and the panel focused', async () => {
    stubPhone(true);
    const { open, panel, fixture } = await setup();
    await open();
    expect(panel()?.classList.contains('ui-emoji-picker__panel--sheet')).toBe(true);
    expect(document.activeElement).toBe(panel());
    const close = panel()?.querySelector<HTMLButtonElement>('button[aria-label="Close"]');
    close?.click();
    await settle(fixture);
    expect(panel()).toBeNull();
  });

  it('the phone sheet has a grip and closes when dragged down far enough', async () => {
    stubPhone(true);
    const { open, panel, field, fixture } = await setup();
    await open();
    const sheet = panel() as HTMLElement;
    expect(sheet.querySelector('.ui-emoji-picker__grip')).not.toBeNull();
    sheet.getBoundingClientRect = () => ({ height: 400 }) as DOMRect;
    const handle = sheet.querySelector('.ui-emoji-picker__drag') as HTMLElement;
    const pointer = (type: string, clientY: number, timeStamp: number) => {
      const event = new MouseEvent(type, { bubbles: true, clientY });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      Object.defineProperty(event, 'pointerType', { value: 'touch' });
      Object.defineProperty(event, 'timeStamp', { value: timeStamp });
      handle.dispatchEvent(event);
    };
    // A short slow drag snaps back (animated).
    pointer('pointerdown', 100, 0);
    pointer('pointermove', 140, 400);
    pointer('pointerup', 140, 450);
    await settle(fixture);
    expect(sheet.style.getPropertyValue('--ui-sheet-drag')).toBe('0px');
    expect(sheet.classList.contains('ui-emoji-picker__panel--snapping')).toBe(true);
    // A cancelled drag snaps back too.
    pointer('pointerdown', 100, 1000);
    pointer('pointermove', 150, 1100);
    pointer('pointercancel', 150, 1200);
    expect(sheet.style.getPropertyValue('--ui-sheet-drag')).toBe('0px');
    // Past 30% it closes and hands focus back to the field.
    pointer('pointerdown', 100, 2000);
    expect(sheet.classList.contains('ui-emoji-picker__panel--snapping')).toBe(true);
    await settle(fixture);
    expect(sheet.classList.contains('ui-emoji-picker__panel--snapping')).toBe(false);
    pointer('pointermove', 260, 2400);
    pointer('pointerup', 260, 2500);
    await settle(fixture);
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(field);
  });

  it('does not drag on a desktop panel', async () => {
    const { open, panel } = await setup();
    await open();
    const handle = panel()?.querySelector('.ui-emoji-picker__drag') as HTMLElement;
    expect(panel()?.querySelector('.ui-emoji-picker__grip')).toBeNull();
    const event = new MouseEvent('pointerdown', { bubbles: true, clientY: 10 });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    handle.dispatchEvent(event);
    const move = new MouseEvent('pointermove', { bubbles: true, clientY: 300 });
    Object.defineProperty(move, 'pointerId', { value: 1 });
    handle.dispatchEvent(move);
    expect(panel()?.style.getPropertyValue('--ui-sheet-drag')).toBe('');
  });

  it('emits touch when focus leaves the closed field', async () => {
    const { field, host, fixture } = await setup();
    field.focus();
    field.dispatchEvent(new FocusEvent('blur', { relatedTarget: null }));
    await settle(fixture);
    expect(host.touches()).toBe(1);
  });

  it('works with Signal Forms: value, errors and focus', async () => {
    const fixture = TestBed.createComponent(FormHostComponent);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const field = root.querySelector<HTMLInputElement>('input') as HTMLInputElement;
    field.value = 'x';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);
    expect(fixture.componentInstance.model().emoji).toBe('x');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(root.textContent).toContain('Only one emoji');
    fixture.componentInstance.f.emoji().focusBoundControl();
    expect(document.activeElement).toBe(field);
  });
});

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { FOLDER_COLOUR } from '../folder-icon/models/folder-colour.const';
import type { PickerOption } from './models/picker-option.interface';
import { PickerListComponent } from './picker-list.component';

const TREE: PickerOption[] = [
  {
    id: 'work',
    name: 'Work',
    colour: FOLDER_COLOUR.Ocean,
    children: [
      { id: 'angular', name: 'Angular', icon: 'star' },
      { id: 'courses', name: 'Courses' },
    ],
  },
  { id: 'clothes', name: 'Clothes' },
];

@Component({
  imports: [PickerListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ui-picker-list
    [options]="options"
    emptyLabel="Unsorted"
    [currentIds]="current()"
    currentLabel="Current folder"
    searchLabel="Find a folder"
    listLabel="Folders"
    noResultsLabel="No folders found"
    [autoFocus]="autoFocus()"
    (chosen)="picked.push($event)"
  />`,
})
class HostComponent {
  readonly options = TREE;
  readonly current = signal<readonly (string | null)[]>(['angular']);
  readonly autoFocus = signal(true);
  readonly picked: (string | null)[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 4; i++) {
    fixture.detectChanges();
    TestBed.tick();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  document.body.append(fixture.nativeElement as HTMLElement);
  await settle(fixture);
  const root = fixture.nativeElement as HTMLElement;
  const search = root.querySelector<HTMLInputElement>('input') as HTMLInputElement;
  const options = () => Array.from(root.querySelectorAll<HTMLElement>('[role="option"]'));
  const names = () => options().map((o) => o.querySelector('.ui-picker-list__label')?.textContent);
  const listbox = root.querySelector<HTMLElement>('[role="listbox"]') as HTMLElement;
  const active = () => document.getElementById(search.getAttribute('aria-activedescendant') ?? '');
  const press = async (name: string, init: KeyboardEventInit = {}) => {
    search.dispatchEvent(
      new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init }),
    );
    await settle(fixture);
  };
  const type = async (text: string) => {
    search.value = text;
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
  };
  return { fixture, root, search, options, names, listbox, active, press, type };
}

describe('PickerListComponent', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('lists Unsorted first, then the tree with indentation and a path name for nested rows', async () => {
    const { names, options, listbox, search } = await setup();
    expect(names()).toEqual(['Unsorted', 'Work', 'Angular', 'Courses', 'Clothes']);
    expect(listbox.getAttribute('aria-label')).toBe('Folders');
    expect(search.getAttribute('aria-label')).toBe('Find a folder');
    expect(search.getAttribute('aria-controls')).toBe(listbox.id);
    expect(options()[3]?.style.getPropertyValue('--ui-picker-level')).toBe('1');
    expect(options()[3]?.getAttribute('aria-label')).toBe('Work / Courses');
    expect(options()[1]?.getAttribute('aria-label')).toBeNull();
  });

  it('draws the folder tile with its colour and the inbox for Unsorted', async () => {
    const { options } = await setup();
    expect(options()[0]?.querySelector('ui-folder-icon')).toBeNull();
    expect(options()[1]?.querySelector('ui-folder-icon')?.classList).toContain(
      'ui-folder-icon--ocean',
    );
  });

  it('marks the current folder: named with it, aria-disabled, with the visible mark', async () => {
    const { options } = await setup();
    const current = options()[2] as HTMLElement;
    expect(current.getAttribute('aria-disabled')).toBe('true');
    expect(current.getAttribute('aria-label')).toBe('Work / Angular, Current folder');
    expect(current.textContent).toContain('Current folder');
    expect(options()[1]?.getAttribute('aria-disabled')).toBe('false');
  });

  it('emits the id of a clicked row and null for Unsorted', async () => {
    const { fixture, options } = await setup();
    (fixture.componentInstance as HostComponent).picked.length = 0;
    options()[4]?.click();
    await settle(fixture);
    expect((fixture.componentInstance as HostComponent).picked).toEqual(['clothes']);
    options()[0]?.click();
    await settle(fixture);
    expect((fixture.componentInstance as HostComponent).picked.at(-1)).toBeNull();
  });

  it('does not emit for the current folder', async () => {
    const { fixture, options } = await setup();
    options()[2]?.click();
    await settle(fixture);
    expect((fixture.componentInstance as HostComponent).picked).toEqual([]);
  });

  it('focuses the search box on open', async () => {
    const { search } = await setup();
    expect(document.activeElement).toBe(search);
  });

  it('moves through the list with ArrowDown, ArrowUp, Home and End while focus stays in the search', async () => {
    const { search, active, press } = await setup();
    await press(KEYBOARD_KEY.ArrowDown);
    expect(active()?.textContent).toContain('Unsorted');
    await press(KEYBOARD_KEY.ArrowDown);
    expect(active()?.textContent).toContain('Work');
    await press(KEYBOARD_KEY.End);
    expect(active()?.textContent).toContain('Clothes');
    await press(KEYBOARD_KEY.Home);
    expect(active()?.textContent).toContain('Unsorted');
    await press(KEYBOARD_KEY.ArrowUp);
    expect(active()?.textContent).toContain('Clothes');
    expect(document.activeElement).toBe(search);
  });

  it('has no active row and ignores Enter until the keyboard enters the list', async () => {
    const { fixture, press, search } = await setup();
    expect(search.getAttribute('aria-activedescendant')).toBeNull();
    await press(KEYBOARD_KEY.Enter);
    expect((fixture.componentInstance as HostComponent).picked).toEqual([]);
  });

  it('enters the list at its end with ArrowUp', async () => {
    const { press, active } = await setup();
    await press(KEYBOARD_KEY.ArrowUp);
    expect(active()?.textContent).toContain('Clothes');
  });

  it('chooses the active row with Enter', async () => {
    const { fixture, press } = await setup();
    await press(KEYBOARD_KEY.ArrowDown);
    await press(KEYBOARD_KEY.ArrowDown);
    await press(KEYBOARD_KEY.Enter);
    expect((fixture.componentInstance as HostComponent).picked).toEqual(['work']);
  });

  it('keeps Home and End for the caret once there is text', async () => {
    const { type, press, active } = await setup();
    await type('c');
    const before = active()?.textContent;
    await press(KEYBOARD_KEY.End);
    expect(active()?.textContent).toBe(before);
    await press(KEYBOARD_KEY.End, { ctrlKey: true });
    expect(active()?.textContent).toContain('Clothes');
  });

  it('filters while typing, keeps the ancestors of a match and activates the first match', async () => {
    const { type, names, active } = await setup();
    await type('cour');
    expect(names()).toEqual(['Work', 'Courses']);
    expect(active()?.textContent).toContain('Work');
  });

  it('chooses the first match when Enter comes right behind the typed text', async () => {
    const { fixture, search } = await setup();
    search.value = 'clo';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    search.dispatchEvent(
      new KeyboardEvent('keydown', { key: KEYBOARD_KEY.Enter, bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    expect((fixture.componentInstance as HostComponent).picked).toEqual(['clothes']);
  });

  it('says so when nothing matches and hides the list', async () => {
    const { type, root, listbox } = await setup();
    await type('zzz');
    expect(listbox.hidden).toBe(true);
    expect(root.querySelector('[role="status"]')?.textContent.trim()).toBe('No folders found');
  });

  it('leaves Esc to the dialog around it', async () => {
    const { fixture, press } = await setup();
    const outer = vi.fn();
    (fixture.nativeElement as HTMLElement).addEventListener('keydown', outer);
    await press(KEYBOARD_KEY.Escape);
    expect(outer).toHaveBeenCalledTimes(1);
  });

  it('focuses the dialog around it instead of the search box on a touch screen', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    const fixture = TestBed.createComponent(HostComponent);
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;
    document.body.append(dialog);
    dialog.append(fixture.nativeElement as HTMLElement);
    await settle(fixture);
    expect(document.activeElement).toBe(dialog);
    vi.unstubAllGlobals();
  });

  it('leaves focus alone without autoFocus', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.autoFocus.set(false);
    document.body.append(fixture.nativeElement as HTMLElement);
    await settle(fixture);
    expect(document.activeElement).toBe(document.body);
  });

  it('is axe clean, also while filtering', async () => {
    const { root, type } = await setup();
    expect(await axeViolations(root)).toEqual([]);
    await type('an');
    expect(await axeViolations(root)).toEqual([]);
  });
});

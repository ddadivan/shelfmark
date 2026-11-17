import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { compileScss, mediaBlocks } from '../../../testing/scss';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { SUGGESTION_KIND } from './models/suggestion-kind.const';
import type { SuggestionKind } from './models/suggestion-kind.type';
import { SuggestionRowComponent } from './suggestion-row/suggestion-row.component';
import { SuggestionComponent } from './suggestion.component';

@Component({
  imports: [SuggestionRowComponent, SuggestionComponent],
  template: `
    <ui-suggestion-row
      ariaLabel="Suggested tags"
      [addAll]="addAll()"
      [loading]="loading()"
      [announcement]="announcement()"
      (acceptAll)="acceptAll.set(acceptAll() + 1)"
    >
      <ui-suggestion
        label="signals"
        ariaLabel="Add tag signals"
        dismissLabel="Dismiss suggestion signals"
        [selected]="selected()"
        (accepted)="accepted.set(accepted() + 1)"
        (dismissed)="dismissed.set(dismissed() + 1)"
        (toggled)="toggled.set($event)"
      />
      <ui-suggestion
        [label]="second().label"
        ariaLabel="Create and add tag state management"
        dismissLabel="Dismiss suggestion state management"
        [kind]="second().kind"
        folderColor="ocean"
        folderIcon="code"
      />
    </ui-suggestion-row>
  `,
})
class HostComponent {
  readonly addAll = signal(true);
  readonly loading = signal(false);
  readonly announcement = signal('');
  readonly selected = signal<boolean | null>(null);
  readonly second = signal<{ label: string; kind: SuggestionKind }>({
    label: 'state management',
    kind: SUGGESTION_KIND.NewTag,
  });
  readonly accepted = signal(0);
  readonly dismissed = signal(0);
  readonly acceptAll = signal(0);
  readonly toggled = signal<boolean | null>(null);
}

@Component({
  imports: [SuggestionRowComponent, SuggestionComponent],
  template: `
    <ui-suggestion-row ariaLabel="Suggested tags">
      <ui-suggestion label="ideas" ariaLabel="Add tag ideas" />
    </ui-suggestion-row>
  `,
})
class HostBareComponent {}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const update = (apply: (c: HostComponent) => void) => {
    apply(fixture.componentInstance);
    fixture.detectChanges();
  };
  const chips = () => [...host.querySelectorAll<HTMLElement>('.ui-suggestion__chip')];
  const applies = () => [...host.querySelectorAll<HTMLButtonElement>('.ui-suggestion__apply')];
  const row = host.querySelector('ui-suggestion-row') as HTMLElement;
  return { fixture, host, update, chips, applies, row, cmp: fixture.componentInstance };
}

describe('ui-suggestion', () => {
  it('renders a dashed chip with + and the label, named by what happens', () => {
    const { applies, chips } = setup();
    const first = applies()[0];

    expect(first?.getAttribute('aria-label')).toBe('Add tag signals');
    expect(first?.textContent).toContain('signals');
    expect(first?.hasAttribute('aria-pressed')).toBe(false);
    expect(first?.querySelector('use')?.getAttribute('href')).toContain('#sm-add');
    expect(chips()[0]?.classList.contains('ui-suggestion__chip--accepted')).toBe(false);
  });

  it('marks a new tag with "New" and shows the folder tile for a folder', () => {
    const { host, update } = setup();
    expect(host.querySelectorAll('.ui-suggestion__new')).toHaveLength(1);
    expect(host.querySelector('.ui-suggestion__new')?.textContent?.trim()).toBe('New');
    expect(host.querySelector('ui-folder-icon')).toBeNull();

    update((c) => c.second.set({ label: 'Angular', kind: SUGGESTION_KIND.Folder }));
    const tile = host.querySelector('ui-folder-icon');
    expect(tile?.classList.contains('ui-folder-icon--ocean')).toBe(true);
    expect(host.querySelector('.ui-suggestion__new')).toBeNull();
  });

  it('emits accepted, turns solid with a check and ignores a second click', () => {
    const { applies, chips, cmp, fixture } = setup();
    applies()[0]?.click();
    fixture.detectChanges();

    expect(cmp.accepted()).toBe(1);
    expect(chips()[0]?.classList.contains('ui-suggestion__chip--accepted')).toBe(true);
    expect(chips()[0]?.classList.contains('ui-suggestion__chip--swell')).toBe(true);
    expect(applies()[0]?.querySelector('use')?.getAttribute('href')).toContain('#sm-check');
    // The x goes away once it is taken.
    expect(chips()[0]?.querySelector('.ui-suggestion__dismiss')).toBeNull();

    applies()[0]?.click();
    expect(cmp.accepted()).toBe(1);
  });

  it('emits dismissed from the x button, named by dismissLabel', () => {
    const { host, cmp } = setup();
    const dismiss = host.querySelector<HTMLButtonElement>('.ui-suggestion__dismiss');
    expect(dismiss?.getAttribute('aria-label')).toBe('Dismiss suggestion signals');
    dismiss?.click();
    expect(cmp.dismissed()).toBe(1);
    expect(cmp.accepted()).toBe(0);
  });

  it('has no x without a dismissLabel', () => {
    const { host, update } = setup();
    update((c) => c.second.set({ label: 'ideas', kind: SUGGESTION_KIND.Tag }));
    // The second chip of the host has a dismissLabel; the plain component has none by default.
    expect(host.querySelectorAll('.ui-suggestion__dismiss')).toHaveLength(2);
    const bare = TestBed.createComponent(HostBareComponent);
    bare.detectChanges();
    expect(bare.nativeElement.querySelector('.ui-suggestion__dismiss')).toBeNull();
  });

  it('review list: selected starts solid, a click toggles through toggled and not accepted', () => {
    const { update, applies, chips, cmp } = setup();
    update((c) => c.selected.set(true));

    expect(chips()[0]?.classList.contains('ui-suggestion__chip--accepted')).toBe(true);
    // Rendered selected: it does not swell as the list appears.
    expect(chips()[0]?.classList.contains('ui-suggestion__chip--swell')).toBe(false);
    expect(applies()[0]?.getAttribute('aria-pressed')).toBe('true');

    applies()[0]?.click();
    expect(cmp.toggled()).toBe(false);
    expect(cmp.accepted()).toBe(0);

    update((c) => c.selected.set(false));
    expect(chips()[0]?.classList.contains('ui-suggestion__chip--accepted')).toBe(false);
    expect(applies()[0]?.getAttribute('aria-pressed')).toBe('false');
    applies()[0]?.click();
    expect(cmp.toggled()).toBe(true);
  });

  it('has no axe violations in any state', async () => {
    const { host, update, applies, fixture } = setup();
    expect(await axeViolations(host)).toEqual([]);
    update((c) => c.second.set({ label: 'Angular', kind: SUGGESTION_KIND.Folder }));
    expect(await axeViolations(host)).toEqual([]);
    applies()[0]?.click();
    fixture.detectChanges();
    expect(await axeViolations(host)).toEqual([]);
    update((c) => c.selected.set(true));
    expect(await axeViolations(host)).toEqual([]);
  });
});

describe('ui-suggestion-row', () => {
  it('is a labelled toolbar with one tab stop', async () => {
    const { row, fixture } = setup();
    document.body.appendChild(row);
    await fixture.whenStable();

    expect(row.getAttribute('role')).toBe('toolbar');
    expect(row.getAttribute('aria-label')).toBe('Suggested tags');
    expect(row.textContent).toContain('Suggested');
    const widgets = [...row.querySelectorAll<HTMLElement>('[ngToolbarWidget]')];
    // Two chips with an x each, and "Add all".
    expect(widgets).toHaveLength(5);
    expect(widgets.filter((w) => w.tabIndex === 0)).toHaveLength(1);
    row.remove();
  });

  it('moves between the chips and the x buttons with the arrow keys, Home and End', async () => {
    const { row, fixture } = setup();
    document.body.appendChild(row);
    await fixture.whenStable();
    const widgets = [...row.querySelectorAll<HTMLElement>('[ngToolbarWidget]')];
    const press = async (target: Element | null, name: string) => {
      target?.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
    };

    widgets[0]?.focus();
    await press(widgets[0] ?? null, KEYBOARD_KEY.ArrowRight);
    expect(document.activeElement).toBe(widgets[1]);
    await press(document.activeElement, KEYBOARD_KEY.End);
    expect(document.activeElement).toBe(widgets.at(-1));
    await press(document.activeElement, KEYBOARD_KEY.Home);
    expect(document.activeElement).toBe(widgets[0]);
    row.remove();
  });

  it('shows "Add all" only when asked and emits acceptAll', () => {
    const { host, update, cmp } = setup();
    const addAll = () => host.querySelector<HTMLButtonElement>('.ui-suggestion-row__add-all');
    expect(addAll()?.textContent?.trim()).toBe('Add all');
    addAll()?.click();
    expect(cmp.acceptAll()).toBe(1);
    update((c) => c.addAll.set(false));
    expect(addAll()).toBeNull();
  });

  it('loading: a busy status region with the label and skeleton pills, no chips', () => {
    const { host, row, update } = setup();
    update((c) => c.loading.set(true));

    expect(row.getAttribute('role')).toBe('status');
    expect(row.getAttribute('aria-busy')).toBe('true');
    expect(row.hasAttribute('aria-label')).toBe(false);
    expect(row.textContent).toContain('Suggesting…');
    expect(host.querySelectorAll('.ui-suggestion-row__skeleton')).toHaveLength(3);
    expect(host.querySelector('.ui-suggestion-row__skeleton')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(host.querySelector('.ui-suggestion__chip')).toBeNull();
    expect(host.querySelector('.ui-suggestion-row__add-all')).toBeNull();

    update((c) => c.loading.set(false));
    expect(row.getAttribute('role')).toBe('toolbar');
    expect(row.hasAttribute('aria-busy')).toBe(false);
    expect(host.querySelectorAll('.ui-suggestion__chip')).toHaveLength(2);
  });

  it('clamps skeletonCount and has custom label texts', () => {
    const fixture = TestBed.createComponent(SuggestionRowComponent);
    fixture.componentRef.setInput('ariaLabel', 'Vorgeschlagene Tags');
    fixture.componentRef.setInput('loading', true);
    fixture.componentRef.setInput('loadingLabel', 'Schlage vor…');
    fixture.componentRef.setInput('skeletonCount', 99);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.ui-suggestion-row__skeleton')).toHaveLength(6);
    expect(el.textContent).toContain('Schlage vor…');
    fixture.componentRef.setInput('skeletonCount', -2);
    fixture.detectChanges();
    expect(el.querySelectorAll('.ui-suggestion-row__skeleton')).toHaveLength(0);
  });

  it('writes the announcement into a polite live region', () => {
    const { host, update } = setup();
    update((c) => c.announcement.set('Tag signals added'));
    const live = host.querySelector('.ui-suggestion-row__live');
    expect(live?.getAttribute('aria-live')).toBe('polite');
    expect(live?.textContent).toBe('Tag signals added');
  });

  it('has no axe violations while loading', async () => {
    const { host, update } = setup();
    update((c) => c.loading.set(true));
    expect(await axeViolations(host)).toEqual([]);
  });
});

describe('suggestion styles', () => {
  const css = compileScss('lib/components/suggestion/suggestion.component.scss');

  it('uses the AI tokens: dashed ai-line edge, + in ai, solid accent-bg once taken', () => {
    expect(css).toMatch(/\.ui-suggestion__chip\s*\{[^}]*dashed var\(--ai-line\)/);
    expect(css).toMatch(/\.ui-suggestion__plus\s*\{[^}]*color: var\(--ai\)/);
    expect(css).toMatch(/--accepted\s*\{[^}]*background: var\(--accent-bg\)/);
  });

  it('plays the 200 ms spring swell and has none under reduced motion', () => {
    expect(css).toMatch(/animation: ui-suggest-accept var\(--duration-base\) var\(--ease-spring\)/);
    expect(css).toMatch(/prefers-reduced-motion[^{]*\{[^}]*--swell[^}]*\{[^}]*animation: none/s);
  });

  it('hovers only on hover pointers and grows the hit area to 44px on coarse pointers', () => {
    expect(mediaBlocks(css, /\(hover: ?hover\)/).join('\n')).toContain(
      '.ui-suggestion__chip:hover',
    );
    const coarse = mediaBlocks(css, /\(pointer: ?coarse\)/).join('\n');
    expect(coarse).toContain('inset: -0.5rem');
    expect(coarse).toContain('.ui-suggestion__dismiss::before');
  });

  it('draws one focus ring for the chip and one for the x', () => {
    expect(css).toMatch(
      /\.ui-suggestion__chip:has\(\.ui-suggestion__apply:focus-visible\)\s*\{[^}]*outline: 2px solid var\(--focus-ring\)/,
    );
    expect(css).toMatch(/\.ui-suggestion__dismiss:focus-visible\s*\{[^}]*outline: 2px solid/);
  });
});

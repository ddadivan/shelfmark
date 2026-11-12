import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { compileScss, mediaBlocks } from '../../../testing/scss';
import { ButtonComponent } from '../button/button.component';
import { CARD_STORY_IMAGE } from '../card/stories/card-story-image.const';
import { FolderIconComponent } from '../folder-icon/folder-icon.component';
import { HistoryGroupComponent } from './history-group/history-group.component';
import { HistoryRowComponent } from './history-row.component';
import { HISTORY_HEADING_LEVEL } from './models/history-heading-level.const';
import type { HistoryHeadingLevel } from './models/history-heading-level.type';

@Component({
  imports: [HistoryGroupComponent, HistoryRowComponent, ButtonComponent, FolderIconComponent],
  template: `
    <ui-history-group title="Today" [headingLevel]="level()">
      <ui-history-row
        [href]="href()"
        [newTab]="newTab()"
        [preview]="preview()"
        [description]="description()"
        (activated)="activated.push($event)"
      >
        <span slot="title">Wool coat, straight cut</span>
        <ng-container slot="meta"><ui-folder-icon size="sm" />Shopping</ng-container>
        <span slot="time">10:42</span>
        <ui-button
          slot="actions"
          variant="ghost"
          size="sm"
          iconLeft="close"
          iconOnly
          ariaLabel="Remove from history"
          (click)="removed.push(1)"
        />
      </ui-history-row>
      <ui-history-row>
        <span slot="title">Signal Forms in 20 minutes</span>
        <span slot="time">9:15</span>
      </ui-history-row>
    </ui-history-group>
  `,
})
class HostComponent {
  readonly level = signal<HistoryHeadingLevel>(HISTORY_HEADING_LEVEL.Two);
  readonly href = signal<string | undefined>(undefined);
  readonly newTab = signal(false);
  readonly preview = signal<string | undefined>(undefined);
  readonly description = signal<string | undefined>(undefined);
  readonly activated: MouseEvent[] = [];
  readonly removed: number[] = [];
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const row = host.querySelector('ui-history-row') as HTMLElement;
  const update = (apply: (c: HostComponent) => void) => {
    apply(fixture.componentInstance);
    fixture.detectChanges();
  };
  return { host, row, update, instance: fixture.componentInstance };
}

describe('HistoryGroupComponent', () => {
  it('names the group by its title and renders the rows in a list', () => {
    const { host } = setup();
    const group = host.querySelector('ui-history-group') as HTMLElement;
    const heading = group.querySelector('h2') as HTMLElement;
    expect(heading.textContent).toBe('Today');
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(group.hasAttribute('title')).toBe(false);
    const list = group.querySelector('.ui-history-group__list') as HTMLElement;
    expect(list.getAttribute('role')).toBe('list');
    expect(list.querySelectorAll('[role=listitem]').length).toBe(2);
  });

  it('uses an h3 inside a sheet', () => {
    const { host, update } = setup();
    update((c) => c.level.set(HISTORY_HEADING_LEVEL.Three));
    expect(host.querySelector('h2')).toBeNull();
    expect(host.querySelector('h3')?.textContent).toBe('Today');
  });
});

describe('HistoryRowComponent', () => {
  it('renders the slots in place', () => {
    const { row } = setup();
    expect(
      row.querySelector('.ui-history-row__link .ui-history-row__title')?.textContent,
    ).toContain('Wool coat');
    expect(row.querySelector('.ui-history-row__link ui-folder-icon')).not.toBeNull();
    expect(row.querySelector('.ui-history-row__link .ui-history-row__meta')?.textContent).toContain(
      'Shopping',
    );
    expect(row.querySelector('.ui-history-row__time')?.textContent).toBe('10:42');
    expect(row.querySelectorAll('.ui-history-row__actions ui-button').length).toBe(1);
  });

  it('is a button without href and a link with href', () => {
    const { row, update } = setup();
    const main = () => row.querySelector('.ui-history-row__link') as HTMLElement;
    expect(main().tagName).toBe('BUTTON');
    expect(main().getAttribute('type')).toBe('button');
    update((c) => c.href.set('https://example.test/a'));
    expect(main().tagName).toBe('A');
    expect(main().getAttribute('href')).toBe('https://example.test/a');
    expect(main().hasAttribute('target')).toBe(false);
    update((c) => c.newTab.set(true));
    expect(main().getAttribute('target')).toBe('_blank');
    expect(main().getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('is one tab stop: one activation target per row, nothing nested', () => {
    const { host, row, update } = setup();
    update((c) => c.href.set('https://example.test/a'));
    expect(row.querySelectorAll('a[href]').length).toBe(1);
    const controls = Array.from(host.querySelectorAll<HTMLElement>('a[href], button'));
    // Row 1: link + remove button; row 2: its own button.
    expect(controls.length).toBe(3);
    for (const control of controls) {
      expect(control.parentElement?.closest('a, button')).toBeNull();
    }
  });

  it('emits activated for the title control only', () => {
    const { row, instance } = setup();
    (row.querySelector('.ui-history-row__link') as HTMLElement).click();
    expect(instance.activated.length).toBe(1);
    (row.querySelector('.ui-history-row__actions button') as HTMLElement).click();
    expect(instance.activated.length).toBe(1);
    expect(instance.removed.length).toBe(1);
  });

  it('describes the link with hidden text outside it', () => {
    const { row, update } = setup();
    const main = () => row.querySelector('.ui-history-row__link') as HTMLElement;
    expect(main().hasAttribute('aria-describedby')).toBe(false);
    update((c) => c.description.set('opens in a new tab'));
    const description = row.querySelector('.ui-history-row__description') as HTMLElement;
    expect(description.textContent).toBe('opens in a new tab');
    expect(main().getAttribute('aria-describedby')).toBe(description.id);
    expect(main().contains(description)).toBe(false);
  });

  it('shows the preview image, else a picture icon', () => {
    const { row, update } = setup();
    expect(row.querySelector('.ui-history-row__preview ui-icon')).not.toBeNull();
    update((c) => c.preview.set(CARD_STORY_IMAGE.Preview));
    const img = row.querySelector('.ui-history-row__preview img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(CARD_STORY_IMAGE.Preview);
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
    update((c) => c.preview.set(CARD_STORY_IMAGE.Broken));
    row.querySelector('img')?.dispatchEvent(new Event('error'));
    update(() => undefined);
    expect(row.querySelector('.ui-history-row__preview img')).toBeNull();
    expect(row.querySelector('.ui-history-row__preview ui-icon')).not.toBeNull();
  });

  it('projects a select control before the preview and a custom preview fallback', async () => {
    @Component({
      imports: [HistoryGroupComponent, HistoryRowComponent],
      template: `
        <ui-history-group title="Trash">
          <ui-history-row previewSlot>
            <input slot="select" type="checkbox" aria-label="Select coat" />
            <span slot="preview" class="fallback">C</span>
            <span slot="title">Coat</span>
          </ui-history-row>
        </ui-history-group>
      `,
    })
    class SlotHostComponent {}
    const fixture = TestBed.createComponent(SlotHostComponent);
    fixture.detectChanges();
    const row = (fixture.nativeElement as HTMLElement).querySelector(
      'ui-history-row',
    ) as HTMLElement;
    const children = Array.from(row.children);
    const select = row.querySelector('.ui-history-row__select') as HTMLElement;
    expect(select.querySelector('input[slot=select]')).not.toBeNull();
    const preview = row.querySelector('.ui-history-row__preview') as HTMLElement;
    expect(children.indexOf(select)).toBeLessThan(children.indexOf(preview));
    expect(preview.querySelector('.fallback')?.textContent).toBe('C');
    expect(preview.querySelector('ui-icon')).toBeNull();
    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });

  it('does not ripple a press on an action', () => {
    const { row } = setup();
    expect(row.classList.contains('ui-ripple-host')).toBe(true);
    const event = new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true });
    row.querySelector('.ui-history-row__actions button')?.dispatchEvent(event);
    expect(row.querySelectorAll(':scope > .ui-ripple').length).toBe(0);
  });

  describe('styles', () => {
    const css = compileScss('lib/components/history-row/history-row.component.scss');

    it('stretches the link over the row and lifts the actions above it', () => {
      expect(css).toMatch(/\.ui-history-row__link::after\s*{[^}]*inset: 0;[^}]*z-index: 1;/);
      expect(css).toMatch(/\.ui-history-row__actions\s*{[^}]*z-index: 2;/);
    });

    it('is 72 x 48 and 48 x 48 on phones', () => {
      expect(css).toMatch(/\.ui-history-row__preview\s*{[^}]*width: 4\.5rem;[^}]*height: 3rem;/);
      expect(mediaBlocks(css, /width\s*<\s*40em/).join('\n')).toMatch(/width: 3rem/);
    });

    it('hovers only under (hover: hover)', () => {
      const hover = mediaBlocks(css, /hover:\s*hover/).join('\n');
      expect(hover).toContain('var(--surface-hover)');
    });

    it('shows the pressed colour under reduced motion', () => {
      const reduced = mediaBlocks(css, /prefers-reduced-motion:\s*reduce/).join('\n');
      expect(reduced).toContain('var(--surface-pressed)');
    });
  });

  it('has no axe violations as buttons and links, with a preview and a description', async () => {
    const { host, update } = setup();
    expect(await axeViolations(host)).toEqual([]);
    update((c) => {
      c.href.set('https://example.test/a');
      c.preview.set(CARD_STORY_IMAGE.Preview);
      c.description.set('opens in a new tab');
    });
    expect(await axeViolations(host)).toEqual([]);
    update((c) => c.level.set(HISTORY_HEADING_LEVEL.Three));
    expect(await axeViolations(host)).toEqual([]);
  });
});

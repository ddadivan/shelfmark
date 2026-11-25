import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { LinkTileComponent } from './link-tile.component';

@Component({
  imports: [LinkTileComponent],
  template: `
    <ui-link-tile
      [href]="href"
      [icon]="icon()"
      [flat]="flat()"
      [end]="end()"
      [newTab]="newTab()"
      (activated)="clicks.push($event)"
    >
      <span slot="eyebrow">Organise</span>
      <span slot="heading">Tags</span>
      <span slot="text">Short labels</span>
    </ui-link-tile>
  `,
})
class HostComponent {
  readonly href = '/help/tags';
  readonly icon = signal<'tag' | undefined>(undefined);
  readonly flat = signal(false);
  readonly end = signal(false);
  readonly newTab = signal(false);
  readonly clicks: MouseEvent[] = [];
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  return { fixture, root, link: () => root.querySelector('a') as HTMLAnchorElement };
}

describe('LinkTileComponent', () => {
  it('is one native link named by its text', () => {
    const { root, link } = setup();

    expect(root.querySelectorAll('a')).toHaveLength(1);
    expect(link().getAttribute('href')).toBe('/help/tags');
    expect(link().textContent).toContain('Tags');
    expect(link().textContent).toContain('Short labels');
    expect(link().getAttribute('target')).toBeNull();
  });

  it('emits activated on a click so the app can route', () => {
    const { fixture, link } = setup();

    link().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(fixture.componentInstance.clicks).toHaveLength(1);
  });

  it('opens in a new tab with noopener noreferrer', () => {
    const { fixture, link } = setup();
    fixture.componentInstance.newTab.set(true);
    fixture.detectChanges();

    expect(link().getAttribute('target')).toBe('_blank');
    expect(link().getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('draws the icon tile only when there is an icon', () => {
    const { fixture, root } = setup();
    expect(root.querySelector('.ui-link-tile__icon')).toBeNull();

    fixture.componentInstance.icon.set('tag');
    fixture.detectChanges();

    expect(root.querySelector('.ui-link-tile__icon ui-icon')).not.toBeNull();
  });

  it('marks the flat and end variants on the host', () => {
    const { fixture, root } = setup();
    fixture.componentInstance.flat.set(true);
    fixture.componentInstance.end.set(true);
    fixture.detectChanges();

    const host = root.querySelector('ui-link-tile') as HTMLElement;
    expect(host.classList.contains('ui-link-tile--flat')).toBe(true);
    expect(host.classList.contains('ui-link-tile--end')).toBe(true);
  });

  it('has no axe violations', async () => {
    const { root } = setup();

    expect(await axeViolations(root)).toEqual([]);
  });
});

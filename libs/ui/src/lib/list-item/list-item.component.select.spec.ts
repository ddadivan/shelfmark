import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import { compileScss, mediaBlocks } from '../../testing/scss';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { ListItemComponent } from './list-item.component';

@Component({
  imports: [ListItemComponent, CheckboxComponent],
  template: `
    <ul>
      <li>
        <ui-list-item href="https://example.test/" [checked]="checked()" [selecting]="selecting()">
          <ui-checkbox slot="select" hideLabel label="Select Ramen" [checked]="checked()" />
          <span slot="title">Ramen</span>
        </ui-list-item>
      </li>
    </ul>
  `,
})
class HostComponent {
  readonly checked = signal(false);
  readonly selecting = signal(false);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const row = host.querySelector('ui-list-item') as HTMLElement;
  return { fixture, host, row, cmp: fixture.componentInstance };
}

describe('ListItemComponent select slot', () => {
  it('puts the checkbox first, outside the link', () => {
    const { host, row } = setup();
    const select = row.querySelector('.ui-list-item__select');
    expect(row.firstElementChild).toBe(select);
    expect(select?.querySelector('input[type="checkbox"]')).not.toBeNull();
    expect(host.querySelector('.ui-list-item__link')?.contains(select ?? null)).toBe(false);
  });

  it('sets the checked and selecting classes without aria-current', () => {
    const { row, cmp, fixture } = setup();
    cmp.checked.set(true);
    cmp.selecting.set(true);
    fixture.detectChanges();
    expect(row.classList.contains('ui-list-item--checked')).toBe(true);
    expect(row.classList.contains('ui-list-item--selecting')).toBe(true);
    expect(row.querySelector('.ui-list-item__link')?.hasAttribute('aria-current')).toBe(false);
  });

  it('shows the checkbox on hover only for hover pointers, on focus, while selecting and on touch', () => {
    const css = compileScss('lib/list-item/list-item.component.scss');
    expect(mediaBlocks(css, /\(hover: ?hover\)/).join('\n')).toContain('.ui-list-item__select');
    expect(mediaBlocks(css, /\(hover: ?none\)/).join('\n')).toContain('.ui-list-item__select');
    expect(css).toContain('.ui-list-item--selecting');
  });

  it('never ripples the row from the checkbox', () => {
    const { row } = setup();
    const box = row.querySelector('.ui-list-item__select input') as HTMLElement;
    box.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 1, clientY: 1 }));
    expect(row.querySelector('.ui-ripple')).toBeNull();
  });

  it('has no axe violations', async () => {
    const { host, cmp, fixture } = setup();
    expect(await axeViolations(host)).toEqual([]);
    cmp.checked.set(true);
    fixture.detectChanges();
    expect(await axeViolations(host)).toEqual([]);
  });
});

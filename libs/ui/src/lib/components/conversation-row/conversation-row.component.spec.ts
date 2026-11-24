import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { ButtonComponent } from '../button/button.component';
import { ConversationRowComponent } from './conversation-row.component';

@Component({
  imports: [ConversationRowComponent, ButtonComponent],
  template: `
    <div role="list" aria-label="Conversations">
      <ui-conversation-row [href]="href()" current (activated)="activated.push($event)">
        Something to watch this weekend, under an hour
        <ui-button
          slot="actions"
          variant="ghost"
          size="sm"
          iconLeft="trash"
          iconOnly
          ariaLabel="Delete conversation"
          (click)="removed.push(1)"
        />
      </ui-conversation-row>
      <ui-conversation-row (activated)="activated.push($event)"
        >How many links?</ui-conversation-row
      >
    </div>
  `,
})
class HostComponent {
  readonly href = signal<string | undefined>('/ask?c=1');
  readonly activated: MouseEvent[] = [];
  readonly removed: number[] = [];
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  return { fixture, host, rows: host.querySelectorAll<HTMLElement>('ui-conversation-row') };
}

describe('ConversationRowComponent', () => {
  it('is a list item with one link (current) or button, and its actions', () => {
    const { host, rows } = setup();
    expect(rows[0]?.getAttribute('role')).toBe('listitem');
    const link = rows[0]?.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/ask?c=1');
    expect(link?.getAttribute('aria-current')).toBe('page');
    expect(link?.textContent?.trim()).toBe('Something to watch this weekend, under an hour');
    expect(rows[0]?.classList).toContain('ui-conversation-row--current');
    expect(rows[1]?.querySelector('button.ui-conversation-row__link')).not.toBeNull();
    expect(rows[1]?.querySelector('[aria-current]')).toBeNull();
    expect(host.querySelector('[aria-label="Delete conversation"]')).not.toBeNull();
  });

  it('emits activated from the link and the button, never from an action', () => {
    const { fixture, rows } = setup();
    const component = fixture.componentInstance;
    rows[0]?.querySelector<HTMLAnchorElement>('a')?.addEventListener('click', (event) => {
      event.preventDefault();
    });
    rows[0]?.querySelector<HTMLAnchorElement>('a')?.click();
    rows[1]?.querySelector<HTMLButtonElement>('button')?.click();
    rows[0]?.querySelector<HTMLButtonElement>('[aria-label="Delete conversation"]')?.click();
    expect(component.activated).toHaveLength(2);
    expect(component.removed).toEqual([1]);
  });

  it('has no axe violations', async () => {
    const { host } = setup();
    expect(await axeViolations(host)).toEqual([]);
  });
});

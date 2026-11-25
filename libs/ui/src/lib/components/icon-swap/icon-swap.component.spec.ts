import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { ICON_SPRITE_URL } from '../icon/icon-sprite-url.const';
import type { IconName } from '../icon/models/icon-name.type';
import { IconSwapComponent } from './icon-swap.component';

@Component({
  imports: [IconSwapComponent],
  template: `<ui-icon-swap [name]="name()" [size]="16" [label]="label()" />`,
})
class HostComponent {
  readonly name = signal<IconName>('copy');
  readonly label = signal<string | undefined>(undefined);
}

function setup() {
  TestBed.configureTestingModule({
    providers: [{ provide: ICON_SPRITE_URL, useValue: '/sprite.svg' }],
  });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

function hrefs(root: HTMLElement): string[] {
  return [...root.querySelectorAll('use')].map((use) => use.getAttribute('href') ?? '');
}

describe('IconSwapComponent', () => {
  it('shows the first icon at once, without an enter animation', () => {
    const fixture = setup();
    const root = fixture.nativeElement as HTMLElement;
    expect(hrefs(root)).toEqual(['/sprite.svg#sm-copy', '/sprite.svg#sm-copy-16']);
    expect(root.querySelector('.ui-icon-swap__icon--enter')).toBeNull();
  });

  it('renders the new icon when the name changes', async () => {
    const fixture = setup();
    await fixture.whenStable();
    fixture.componentInstance.name.set('check');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(hrefs(fixture.nativeElement as HTMLElement)).toContain('/sprite.svg#sm-check');
  });

  it('passes size and label to the icon', () => {
    const fixture = setup();
    fixture.componentInstance.label.set('Copied');
    fixture.detectChanges();
    const icon = (fixture.nativeElement as HTMLElement).querySelector('ui-icon');
    expect(icon?.classList.contains('ui-icon--16')).toBe(true);
    expect(icon?.getAttribute('aria-label')).toBe('Copied');
  });

  it('has no accessibility violations', async () => {
    const fixture = setup();
    fixture.componentInstance.label.set('Copied');
    fixture.detectChanges();
    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});

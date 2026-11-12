import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TooltipDirective } from '../../directives/tooltip/tooltip.directive';
import { ButtonComponent } from './button.component';

@Component({
  imports: [ButtonComponent, TooltipDirective],
  template: `
    <ui-button id="auto" iconOnly iconLeft="search" [ariaLabel]="label()" />
    <ui-button id="explicit" iconOnly iconLeft="search" ariaLabel="Search" uiTooltip="Find links" />
    <ui-button id="text" iconLeft="search">Search</ui-button>
  `,
})
class HostComponent {
  readonly label = signal('Search links');
}

function setup() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  TestBed.tick();
  const root = fixture.nativeElement as HTMLElement;
  const inner = (id: string) => root.querySelector<HTMLElement>(`#${id} button`) as HTMLElement;
  const settle = (): void => {
    fixture.detectChanges();
    TestBed.tick();
  };
  return { fixture, inner, settle };
}

const tooltips = () => document.querySelectorAll<HTMLElement>('.ui-tooltip');

function hover(el: HTMLElement, pointerType = 'mouse'): void {
  el.dispatchEvent(new PointerEvent('pointerenter', { pointerType }));
  vi.advanceTimersByTime(400);
}

describe('ButtonComponent automatic tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.remove();
    });
  });

  it('shows the accessible name of an icon-only button on hover', () => {
    const { inner, settle } = setup();

    hover(inner('auto'));
    settle();

    expect(tooltips()).toHaveLength(1);
    expect(tooltips()[0].textContent).toContain('Search links');
  });

  it('follows the label when it changes, so name and tooltip never drift', () => {
    const { fixture, inner, settle } = setup();

    fixture.componentInstance.label.set('Find');
    settle();
    hover(inner('auto'));
    settle();

    expect(tooltips()[0].textContent).toContain('Find');
  });

  it('does not show on a touch pointer', () => {
    const { inner, settle } = setup();

    hover(inner('auto'), 'touch');
    settle();

    expect(tooltips()).toHaveLength(0);
  });

  it('lets an explicit uiTooltip win without a second tooltip', () => {
    const { inner, settle } = setup();

    hover(inner('explicit'));
    settle();

    expect(tooltips()).toHaveLength(1);
    expect(tooltips()[0].textContent).toContain('Find links');
  });

  it('adds no tooltip to a button with a text label', () => {
    const { inner, settle } = setup();

    hover(inner('text'));
    settle();

    expect(tooltips()).toHaveLength(0);
  });
});

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import { RatingScaleComponent } from './rating-scale.component';

@Component({
  imports: [RatingScaleComponent],
  template: `
    <ui-rating-scale
      [score]="score()"
      lowLabel="Not really"
      highLabel="Love it"
      [labels]="labels"
      [readonly]="readonly()"
      readonlyLabel="Your score: 6"
      (picked)="picks.push($event)"
    />
  `,
})
class HostComponent {
  readonly score = signal<number | null>(null);
  readonly readonly = signal(false);
  readonly labels = Array.from({ length: 10 }, (_, index) => `${index + 1} out of 10`);
  readonly picks: number[] = [];
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  document.body.append(fixture.nativeElement);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const buttons = () => Array.from(host.querySelectorAll<HTMLButtonElement>('button'));
  const press = (key: string) => {
    (document.activeElement ?? host).dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
  };
  return { fixture, host, buttons, press };
}

describe('RatingScaleComponent', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('renders ten named buttons, the end labels and one tab stop', () => {
    const { host, buttons } = setup();
    expect(buttons().map((button) => button.textContent?.trim())).toEqual(
      Array.from({ length: 10 }, (_, index) => String(index + 1)),
    );
    expect(buttons()[6].getAttribute('aria-label')).toBe('7 out of 10');
    expect(host.textContent).toContain('Not really');
    expect(host.textContent).toContain('Love it');
    expect(buttons().filter((button) => button.tabIndex === 0)).toHaveLength(1);
  });

  it('emits the score on click and marks the chosen one', () => {
    const { fixture, buttons } = setup();
    buttons()[8].click();
    expect(fixture.componentInstance.picks).toEqual([9]);

    fixture.componentInstance.score.set(9);
    fixture.detectChanges();
    expect(buttons()[8].classList).toContain('is-on');
    expect(buttons()[8].getAttribute('aria-pressed')).toBe('true');
  });

  it('moves focus with arrows, Home and End, wrapping, and never picks', () => {
    const { fixture, buttons, press } = setup();
    buttons()[0].focus();
    press('ArrowLeft');
    expect(document.activeElement).toBe(buttons()[9]);
    press('ArrowRight');
    expect(document.activeElement).toBe(buttons()[0]);
    press('End');
    expect(document.activeElement).toBe(buttons()[9]);
    press('Home');
    expect(document.activeElement).toBe(buttons()[0]);
    expect(buttons().filter((button) => button.tabIndex === 0)).toEqual([buttons()[0]]);
    expect(fixture.componentInstance.picks).toEqual([]);
  });

  it('shows a read-only copy as an image with the chosen score on', () => {
    const { fixture, host } = setup();
    fixture.componentInstance.score.set(6);
    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();

    expect(host.querySelectorAll('button')).toHaveLength(0);
    expect(host.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Your score: 6');
    expect(host.querySelector('.is-on')?.textContent?.trim()).toBe('6');
  });

  it('has no axe violations in both modes', async () => {
    const { fixture, host } = setup();
    expect(await axeViolations(host)).toEqual([]);

    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();
    expect(await axeViolations(host)).toEqual([]);
  });
});

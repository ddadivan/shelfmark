import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { FragmentTargetDirective } from './fragment-target.directive';

@Component({
  imports: [FragmentTargetDirective],
  template: `<section appFragmentTarget="ai" [fragmentReady]="ready()"></section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
  readonly ready = signal(false);
}

function setup(fragment: string | null) {
  const fragment$ = new BehaviorSubject<string | null>(fragment);
  TestBed.configureTestingModule({
    providers: [{ provide: ActivatedRoute, useValue: { fragment: fragment$ } }],
  });
  const scroll = vi.fn();
  Element.prototype.scrollIntoView = scroll;
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return { fixture, scroll, fragment$ };
}

const original = Element.prototype.scrollIntoView;

describe('FragmentTargetDirective', () => {
  afterEach(() => {
    Element.prototype.scrollIntoView = original;
  });

  it('sets the id and scrolls once the page is ready and the fragment names it', async () => {
    const { fixture, scroll } = setup('ai');
    const section = fixture.nativeElement.querySelector('section') as HTMLElement;

    expect(section.id).toBe('ai');
    await fixture.whenStable();
    expect(scroll).not.toHaveBeenCalled();

    fixture.componentInstance.ready.set(true);
    await fixture.whenStable();
    fixture.componentInstance.ready.set(false);
    await fixture.whenStable();
    fixture.componentInstance.ready.set(true);
    await fixture.whenStable();

    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it('leaves the page where it is for another fragment', async () => {
    const { fixture, scroll } = setup('other');
    fixture.componentInstance.ready.set(true);
    await fixture.whenStable();

    expect(scroll).not.toHaveBeenCalled();
  });
});

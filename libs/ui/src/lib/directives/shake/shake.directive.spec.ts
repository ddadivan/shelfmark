import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ShakeDirective } from './shake.directive';

@Component({
  imports: [ShakeDirective],
  template: `<div class="box" [uiShake]="count()">Field</div>`,
})
class HostComponent {
  readonly count = signal(0);
}

describe('ShakeDirective', () => {
  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const box = fixture.nativeElement.querySelector('.box') as HTMLElement;
    return { fixture, box };
  }

  async function bump(fixture: ReturnType<typeof setup>['fixture'], value: number) {
    fixture.componentInstance.count.set(value);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('does not play for the starting value', async () => {
    const { fixture, box } = setup();
    await fixture.whenStable();
    expect(box.classList.contains('ui-shake')).toBe(false);
  });

  it('plays when the counter goes up and ends on animationend', async () => {
    const { fixture, box } = setup();
    await bump(fixture, 1);
    expect(box.classList.contains('ui-shake')).toBe(true);
    box.dispatchEvent(new Event('animationend'));
    expect(box.classList.contains('ui-shake')).toBe(false);
  });

  it('replays on the next increase and ignores a decrease', async () => {
    const { fixture, box } = setup();
    await bump(fixture, 1);
    box.dispatchEvent(new Event('animationend'));
    await bump(fixture, 2);
    expect(box.classList.contains('ui-shake')).toBe(true);
    box.dispatchEvent(new Event('animationend'));
    await bump(fixture, 0);
    expect(box.classList.contains('ui-shake')).toBe(false);
  });

  it('ignores the animations of its children, ends on its own end or cancel', async () => {
    const { fixture, box } = setup();
    const child = document.createElement('span');
    box.appendChild(child);
    await bump(fixture, 1);
    child.dispatchEvent(new Event('animationend', { bubbles: true }));
    expect(box.classList.contains('ui-shake')).toBe(true);
    box.dispatchEvent(new Event('animationcancel'));
    expect(box.classList.contains('ui-shake')).toBe(false);
  });
});

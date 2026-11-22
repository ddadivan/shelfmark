import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { NumberFlowComponent } from './number-flow.component';

@Component({
  imports: [NumberFlowComponent],
  template: `<ui-number-flow [value]="value()" [text]="text()" />`,
})
class HostComponent {
  readonly value = signal(12);
  readonly text = signal<string | undefined>(undefined);
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const flow = root.querySelector('ui-number-flow') as HTMLElement;
  return { fixture, flow };
}

function readable(flow: HTMLElement): string {
  return flow.querySelector('.ui-number-flow__text')?.textContent ?? '';
}

function shown(flow: HTMLElement): string {
  return [...flow.querySelectorAll('.ui-number-flow__slot')]
    .map(
      (slot) =>
        slot.querySelector('.ui-number-flow__char:last-child')?.getAttribute('data-char') ?? '',
    )
    .join('');
}

describe('NumberFlowComponent', () => {
  it('reads the whole number once and hides the digit spans from screen readers', async () => {
    const { flow } = await setup();
    expect(readable(flow)).toBe('12');
    expect(flow.querySelector('.ui-number-flow__digits')?.getAttribute('aria-hidden')).toBe('true');
    expect(shown(flow)).toBe('12');
  });

  it('shows the first value without an enter animation class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.ui-number-flow__char--enter')).toBeNull();
  });

  it('uses the pre-formatted text when given', async () => {
    const { fixture, flow } = await setup();
    fixture.componentInstance.value.set(1204);
    fixture.componentInstance.text.set('1,204');
    fixture.detectChanges();
    expect(readable(flow)).toBe('1,204');
    expect(flow.querySelectorAll('.ui-number-flow__slot').length).toBe(5);
  });

  it('keeps unchanged digits and replaces only the changed one', async () => {
    const { fixture, flow } = await setup();
    const tens = flow.querySelectorAll('.ui-number-flow__char')[0];
    fixture.componentInstance.value.set(13);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(flow.querySelectorAll('.ui-number-flow__char')[0]).toBe(tens);
    expect(shown(flow)).toBe('13');
  });

  it('sets the direction: 1 when the number grows, -1 when it shrinks', async () => {
    const { fixture, flow } = await setup();
    expect(flow.style.getPropertyValue('--ui-flow-dir')).toBe('1');
    fixture.componentInstance.value.set(3);
    fixture.detectChanges();
    expect(flow.style.getPropertyValue('--ui-flow-dir')).toBe('-1');
    fixture.componentInstance.value.set(30);
    fixture.detectChanges();
    expect(flow.style.getPropertyValue('--ui-flow-dir')).toBe('1');
  });

  it('has no accessibility violations', async () => {
    const { fixture } = await setup();
    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });
});

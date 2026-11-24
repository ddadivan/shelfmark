import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { StepperComponent } from './stepper.component';

@Component({
  imports: [StepperComponent],
  template: `<ui-stepper [steps]="steps" [current]="current()" label="Import steps" />`,
})
class HostComponent {
  readonly steps = ['Choose file', 'Check', 'Folders', 'Import'];
  readonly current = signal(2);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

describe('StepperComponent', () => {
  it('lists the steps with the current one marked and earlier ones checked', async () => {
    const { host } = setup();
    const list = host.querySelector('ol') as HTMLElement;
    expect(list.getAttribute('aria-label')).toBe('Import steps');
    const steps = [...host.querySelectorAll('li')];
    expect(steps.map((step) => step.querySelector('.ui-stepper__name')?.textContent)).toEqual([
      'Choose file',
      'Check',
      'Folders',
      'Import',
    ]);
    expect(steps[0]?.classList).toContain('ui-stepper__step--done');
    expect(steps[0]?.querySelector('ui-icon')).not.toBeNull();
    expect(steps[1]?.getAttribute('aria-current')).toBe('step');
    expect(steps[2]?.getAttribute('aria-current')).toBeNull();
    expect(steps[2]?.querySelector('.ui-stepper__mark')?.textContent?.trim()).toBe('3');
    expect(await axeViolations(host)).toEqual([]);
  });

  it('follows the current step', () => {
    const { fixture, host } = setup();
    fixture.componentInstance.current.set(4);
    fixture.detectChanges();
    expect(host.querySelectorAll('.ui-stepper__step--done')).toHaveLength(3);
    expect(host.querySelectorAll('li')[3]?.getAttribute('aria-current')).toBe('step');
  });
});

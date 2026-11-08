import { TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';

describe('ButtonComponent block', () => {
  it('marks the host and the inner button only when block is set', async () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;
    const inner = (): HTMLElement => host.querySelector('button') as HTMLElement;
    expect(host.classList.contains('ui-button-host--block')).toBe(false);
    expect(inner().classList.contains('ui-button--block')).toBe(false);

    fixture.componentRef.setInput('block', true);
    await fixture.whenStable();
    expect(host.classList.contains('ui-button-host--block')).toBe(true);
    expect(inner().classList.contains('ui-button--block')).toBe(true);
  });
});

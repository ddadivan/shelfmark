import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SettingsSectionComponent } from './settings-section.component';

@Component({
  imports: [SettingsSectionComponent],
  template: `<app-settings-section heading="Title" [danger]="danger()">Row</app-settings-section>`,
})
class HostComponent {
  readonly danger = signal(false);
}

@Component({
  imports: [SettingsSectionComponent],
  template: `<app-settings-section heading="Title" hint="Hint" [headingHidden]="hidden()">
    <button slot="action" type="button">Go</button>
  </app-settings-section>`,
})
class ActionHostComponent {
  readonly hidden = signal(false);
}

describe('SettingsSectionComponent', () => {
  it('shows the heading and the projected rows', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h2')?.textContent).toBe('Title');
    expect(element.textContent).toContain('Row');
  });

  it('shows an optional hint and projects the action next to the heading', async () => {
    const fixture = TestBed.createComponent(ActionHostComponent);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.settings-section__hint')?.textContent).toBe('Hint');
    expect(element.querySelector('.settings-section__action button')?.textContent).toBe('Go');
  });

  it('keeps a hidden heading for screen readers only', async () => {
    const fixture = TestBed.createComponent(ActionHostComponent);
    fixture.componentInstance.hidden.set(true);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h2')?.classList.contains('settings-section__title--hidden')).toBe(
      true,
    );
    expect(element.querySelector('.settings-section__head')).toBeNull();
  });

  it('marks the section as danger only when asked to', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const section = (fixture.nativeElement as HTMLElement).querySelector('app-settings-section');
    await fixture.whenStable();
    expect(section?.classList.contains('settings-section--danger')).toBe(false);

    fixture.componentInstance.danger.set(true);
    await fixture.whenStable();

    expect(section?.classList.contains('settings-section--danger')).toBe(true);
  });
});

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

describe('SettingsSectionComponent', () => {
  it('shows the heading and the projected rows', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h2')?.textContent).toBe('Title');
    expect(element.textContent).toContain('Row');
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

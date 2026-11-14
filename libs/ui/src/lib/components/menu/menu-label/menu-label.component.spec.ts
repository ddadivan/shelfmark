import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MenuLabelComponent } from './menu-label.component';

@Component({
  imports: [MenuLabelComponent],
  template: '<ui-menu-label>Sort by</ui-menu-label>',
})
class HostComponent {}

describe('MenuLabelComponent', () => {
  it('shows its text as a non-interactive heading', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const label = (fixture.nativeElement as HTMLElement).querySelector('ui-menu-label');
    expect(label?.textContent).toBe('Sort by');
    expect(label?.getAttribute('role')).toBe('presentation');
    expect(label?.classList).toContain('ui-menu-label');
  });
});

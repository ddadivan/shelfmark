import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FolderColourDirective } from './folder-colour.directive';

@Component({
  imports: [FolderColourDirective],
  template: `<div [uiFolderColour]="colour()"></div>`,
})
class HostComponent {
  readonly colour = signal('graphite');
}

describe('FolderColourDirective', () => {
  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const div = (fixture.nativeElement as HTMLElement).querySelector('div') as HTMLElement;
    const set = (colour: string): void => {
      fixture.componentInstance.colour.set(colour);
      fixture.detectChanges();
    };
    return { div, set };
  }

  it('marks nothing for graphite', () => {
    const { div } = setup();
    expect(div.hasAttribute('data-ui-folder-colour')).toBe(false);
    expect(div.style.getPropertyValue('--ui-folder-tint')).toBe('');
  });

  it('sets the token pair of a built-in colour and the marker attribute', () => {
    const { div, set } = setup();
    set('rose');
    expect(div.hasAttribute('data-ui-folder-colour')).toBe(true);
    expect(div.style.getPropertyValue('--ui-folder-ink')).toBe('var(--folder-rose)');
    expect(div.style.getPropertyValue('--ui-folder-tint')).toBe('var(--folder-rose-bg)');
  });

  it('sets readable shades of an own colour and clears them again', () => {
    const { div, set } = setup();
    set('#3a7bd5');
    expect(div.style.getPropertyValue('--ui-folder-tint')).toContain('light-dark(');
    set('graphite');
    expect(div.hasAttribute('data-ui-folder-colour')).toBe(false);
    expect(div.style.getPropertyValue('--ui-folder-ink')).toBe('');
  });
});

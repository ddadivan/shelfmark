import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { ThemePreviewComponent } from './theme-preview.component';

function setup() {
  const fixture = TestBed.createComponent(ThemePreviewComponent);
  fixture.componentRef.setInput('ariaLabel', 'Preview of your settings');
  fixture.componentRef.setInput('folders', ['Angular', 'Clothes', 'Recipes']);
  fixture.componentRef.setInput('cards', [
    { site: 'youtube.com', title: 'Signal Forms in 20 minutes', tag: 'angular' },
    { site: 'cos.com', title: 'Wool coat', tag: 'clothes' },
  ]);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ThemePreviewComponent', () => {
  it('is one named image', () => {
    const host = setup();
    expect(host.getAttribute('role')).toBe('img');
    expect(host.getAttribute('aria-label')).toBe('Preview of your settings');
    expect(host.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });

  it('draws the folders with the first active, and the cards', () => {
    const host = setup();
    const rows = host.querySelectorAll('.ui-theme-preview__row');
    expect(rows).toHaveLength(3);
    expect(rows[0].classList).toContain('ui-theme-preview__row--active');
    expect(rows[1].classList).not.toContain('ui-theme-preview__row--active');
    const cards = host.querySelectorAll('.ui-theme-preview__card');
    expect(cards).toHaveLength(2);
    expect(cards[1].classList).toContain('ui-theme-preview__card--alt');
    expect(cards[0].querySelector('.ui-theme-preview__title')?.textContent).toBe(
      'Signal Forms in 20 minutes',
    );
    expect(cards[0].querySelector('.ui-theme-preview__tag')?.textContent).toBe('angular');
  });

  it('has no axe violations', async () => {
    expect(await axeViolations(setup())).toEqual([]);
  });
});

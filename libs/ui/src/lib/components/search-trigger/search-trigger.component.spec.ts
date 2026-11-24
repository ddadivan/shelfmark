import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { compileScss } from '../../../testing/scss';
import { SearchTriggerComponent } from './search-trigger.component';

@Component({
  imports: [SearchTriggerComponent],
  template: `<ui-search-trigger
    label="Search your links"
    shortcut="⌘K"
    ariaKeyshortcuts="Meta+K Control+K"
    ariaHaspopup="dialog"
    (click)="pressed()"
  />`,
})
class HostComponent {
  readonly pressed = vi.fn();
}

describe('SearchTriggerComponent', () => {
  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const button = root.querySelector('button') as HTMLButtonElement;
    return { fixture, root, button };
  }

  it('is a native button named by its visible text, with the shortcut hidden from AT', () => {
    const { root, button } = setup();
    expect(button.type).toBe('button');
    expect(button.textContent).toContain('Search your links');
    expect(button.getAttribute('aria-keyshortcuts')).toBe('Meta+K Control+K');
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
    expect(root.querySelector('kbd')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows no caps without a shortcut', () => {
    const fixture = TestBed.createComponent(SearchTriggerComponent);
    fixture.componentRef.setInput('label', 'Search');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('kbd')).toBeNull();
  });

  it('click reaches the host', () => {
    const { fixture, button } = setup();
    button.click();
    expect(fixture.componentInstance.pressed).toHaveBeenCalledOnce();
  });

  it('is a 48px field with the inset hairline, 16px radius and 640px cap, from tokens', () => {
    const css = compileScss('lib/components/search-trigger/search-trigger.component.scss');
    expect(css).toContain('border-radius: var(--radius-card)');
    expect(css).toContain('background: var(--surface-hover)');
    expect(css).toContain('box-shadow: inset 0 0 0 1px var(--ui-search-hairline)');
    expect(css).toContain('max-inline-size: var(--ui-search-trigger-max-inline-size, 40rem)');
    expect(css).toContain('min-height: var(--ui-search-trigger-height, 3rem)');
  });

  it('has no axe violations', async () => {
    const { root } = setup();
    expect(await axeViolations(root)).toEqual([]);
  });
});

import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { LoadMoreComponent } from './load-more.component';

function setup(text = 'Loading more links') {
  const fixture = TestBed.createComponent(LoadMoreComponent);
  fixture.componentRef.setInput('text', text);
  fixture.detectChanges();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

describe('LoadMoreComponent', () => {
  it('shows the text next to a small decorative spinner', () => {
    const { host } = setup();
    const spinner = host.querySelector('ui-spinner');
    expect(host.textContent?.trim()).toBe('Loading more links');
    expect(spinner?.classList.contains('ui-spinner--sm')).toBe(true);
    expect(spinner?.getAttribute('aria-hidden')).toBe('true');
  });

  it('is a polite status region', () => {
    const { host } = setup();
    expect(host.querySelector('.ui-load-more')?.getAttribute('role')).toBe('status');
  });

  it('follows the text input', () => {
    const { fixture, host } = setup();
    fixture.componentRef.setInput('text', 'Loading more');
    fixture.detectChanges();
    expect(host.textContent?.trim()).toBe('Loading more');
  });

  it('has no axe violations', async () => {
    expect(await axeViolations(setup().host)).toEqual([]);
  });
});

import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../../testing/axe';
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

  it('keeps a persistent polite status region and renders the row only while loading', () => {
    const { fixture, host } = setup();
    expect(host.getAttribute('role')).toBe('status');

    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    TestBed.tick();
    expect(host.getAttribute('role')).toBe('status');
    expect(host.querySelector('.ui-load-more')).toBeNull();
    expect(host.textContent?.trim()).toBe('');

    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(host.querySelector('.ui-load-more')).not.toBeNull();
    expect(host.textContent?.trim()).toBe('Loading more links');
  });

  it('follows the text input', () => {
    const { fixture, host } = setup();
    fixture.componentRef.setInput('text', 'Loading more');
    fixture.detectChanges();
    expect(host.textContent?.trim()).toBe('Loading more');
  });

  it('has no axe violations, loading or idle', async () => {
    const idle = setup();
    idle.fixture.componentRef.setInput('loading', false);
    idle.fixture.detectChanges();
    expect(await axeViolations(idle.host)).toEqual([]);
    expect(await axeViolations(setup().host)).toEqual([]);
  });
});

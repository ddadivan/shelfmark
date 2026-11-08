import { TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import { ViewportService } from './viewport.service';

type Listener = (event: MediaQueryListEvent) => void;

function stubMatchMedia(matches: Record<string, boolean>): Map<string, Listener> {
  const listeners = new Map<string, Listener>();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matches[query] ?? false,
    addEventListener: (_type: string, listener: Listener) => listeners.set(query, listener),
    removeEventListener: () => listeners.delete(query),
  }));
  return listeners;
}

describe('ViewportService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('assumes a desktop without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    const viewport = TestBed.inject(ViewportService);

    expect(viewport.phone()).toBe(false);
    expect(viewport.desktop()).toBe(true);
  });

  it('reads the breakpoints and follows changes', () => {
    const listeners = stubMatchMedia({ '(width < 40em)': true, '(width < 64em)': true });
    const viewport = TestBed.inject(ViewportService);

    expect(viewport.phone()).toBe(true);
    expect(viewport.desktop()).toBe(false);

    listeners.get('(width < 40em)')?.({ matches: false } as MediaQueryListEvent);

    expect(viewport.phone()).toBe(false);
  });
});

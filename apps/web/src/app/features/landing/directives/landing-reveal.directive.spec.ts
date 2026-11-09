import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import {
  MockIntersectionObserver,
  stubReducedMotion,
} from '../../../../testing/mock-intersection-observer';
import { LandingRevealDirective } from './landing-reveal.directive';

@Component({
  imports: [LandingRevealDirective],
  template: `<section appLandingReveal>
    <h2>One</h2>
    <p>Two</p>
    <p>Three</p>
  </section>`,
})
class HostComponent {}

describe('LandingRevealDirective', () => {
  beforeEach(() => {
    MockIntersectionObserver.install();
    stubReducedMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function create(firstReport: [boolean, number?, number?] | null = [false]) {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const section = (fixture.nativeElement as HTMLElement).querySelector('section') as HTMLElement;
    if (firstReport !== null) {
      MockIntersectionObserver.instances[0].trigger(...firstReport);
      await fixture.whenStable();
    }
    return { fixture, section };
  }

  it('hides the section until it scrolls in, observing with a 20% threshold', async () => {
    const { section } = await create();

    expect(section.classList.contains('landing-reveal--pending')).toBe(true);
    expect(MockIntersectionObserver.instances[0].options?.threshold).toEqual([0, 0.2]);
  });

  it('staggers the children by 60 ms', async () => {
    const { section } = await create();

    const delays = Array.from(section.children).map((child) =>
      (child as HTMLElement).style.getPropertyValue('--landing-reveal-delay'),
    );
    expect(delays).toEqual(['0ms', '60ms', '120ms']);
  });

  it('reveals once and stops observing', async () => {
    const { fixture, section } = await create();
    const observer = MockIntersectionObserver.instances[0];

    observer.trigger(false);
    await fixture.whenStable();
    expect(section.classList.contains('landing-reveal--shown')).toBe(false);

    observer.trigger(true);
    await fixture.whenStable();
    expect(section.classList.contains('landing-reveal--shown')).toBe(true);
    expect(section.classList.contains('landing-reveal--pending')).toBe(false);
    expect(observer.disconnected).toBe(true);
  });

  it('does not hide a section that is already at least 20% on screen at load', async () => {
    const { section } = await create([true, 40, 100]);

    expect(section.className).not.toContain('landing-reveal');
    expect(MockIntersectionObserver.instances[0].disconnected).toBe(true);
  });

  it('reads no layout synchronously and keeps content visible until the first report', async () => {
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    const { section } = await create(null);

    expect(rect).not.toHaveBeenCalled();
    expect(section.className).not.toContain('landing-reveal');
    vi.restoreAllMocks();
  });

  it('keeps an off-screen section hidden until it scrolls in', async () => {
    const { section } = await create();

    expect(section.classList.contains('landing-reveal--pending')).toBe(true);
    expect(section.classList.contains('landing-reveal--shown')).toBe(false);
  });

  it('reveals a section taller than five screens once a fifth of the viewport shows it', async () => {
    vi.stubGlobal('innerHeight', 800);
    const { fixture, section } = await create();
    const observer = MockIntersectionObserver.instances[0];

    // 100 of 10 000 px is 1% of the section, but under a fifth of the viewport: still hidden.
    observer.trigger(true, 100, 10_000);
    await fixture.whenStable();
    expect(section.classList.contains('landing-reveal--pending')).toBe(true);

    // 200 px is 1/4 of the viewport, though only 2% of the section.
    observer.trigger(true, 200, 10_000);
    await fixture.whenStable();
    expect(section.classList.contains('landing-reveal--shown')).toBe(true);
  });

  it('shows a pending section when focus lands inside it', async () => {
    const { fixture, section } = await create();
    expect(section.classList.contains('landing-reveal--pending')).toBe(true);

    section.querySelector('p')?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await fixture.whenStable();

    expect(section.classList.contains('landing-reveal--shown')).toBe(true);
    expect(MockIntersectionObserver.instances[0].disconnected).toBe(true);
  });

  it('never hides content under reduced motion', async () => {
    stubReducedMotion(true);

    const { section } = await create(null);

    expect(section.className).not.toContain('landing-reveal');
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it('never hides content when scroll observation is unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    const { section } = await create(null);

    expect(section.className).not.toContain('landing-reveal');
  });

  it('disconnects the observer on destroy', async () => {
    const { fixture } = await create();

    fixture.destroy();

    expect(MockIntersectionObserver.instances[0].disconnected).toBe(true);
  });
});

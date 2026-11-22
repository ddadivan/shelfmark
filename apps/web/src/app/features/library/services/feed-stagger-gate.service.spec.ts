import { TestBed } from '@angular/core/testing';
import { FeedStaggerGate } from './feed-stagger-gate.service';

describe('FeedStaggerGate', () => {
  it('lets the stagger play once per app load', () => {
    const gate = TestBed.inject(FeedStaggerGate);
    expect(gate.take()).toBe(true);
    expect(gate.take()).toBe(false);
    expect(gate.take()).toBe(false);
  });
});

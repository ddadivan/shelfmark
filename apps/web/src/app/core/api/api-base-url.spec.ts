import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api-base-url';

describe('API_BASE_URL', () => {
  it('is the relative /api path by default', () => {
    expect(TestBed.inject(API_BASE_URL)).toBe('/api');
  });
});

import { TestBed } from '@angular/core/testing';
import { PushedPage } from './pushed-page.service';

describe('PushedPage', () => {
  it('starts not pushed and follows the page', () => {
    const page = TestBed.inject(PushedPage);
    expect(page.active()).toBe(false);
    page.set(true);
    expect(page.active()).toBe(true);
    page.set(false);
    expect(page.active()).toBe(false);
  });
});

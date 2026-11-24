import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../../core/auth/auth.store';
import { axeViolations } from '../../../testing/axe';
import { createTranslated } from '../../../testing/create-translated';
import NotFoundPage from './not-found.page';

async function setup(signedIn: boolean) {
  TestBed.configureTestingModule({
    providers: [{ provide: AuthStore, useValue: { isSignedIn: signal(signedIn) } }],
  });
  const fixture = await createTranslated(NotFoundPage);
  return fixture.nativeElement as HTMLElement;
}

describe('NotFoundPage', () => {
  it('names the problem as the page heading and leads a guest to the landing', async () => {
    const root = await setup(false);

    expect(root.querySelector('h1')?.textContent?.trim()).toBe('This page doesn’t exist');
    expect(root.textContent).toContain('The address may be mistyped, or the page has moved.');
    expect(root.querySelector('a[href="/"]')?.textContent?.trim()).toBe('Go to Shelfmark');
    expect(await axeViolations(root)).toEqual([]);
  });

  it('leads a signed-in person to their links', async () => {
    const root = await setup(true);

    expect(root.querySelector('a[href="/links"]')?.textContent?.trim()).toBe('Go to your links');
  });
});

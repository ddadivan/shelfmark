import { TestBed } from '@angular/core/testing';
import axe from 'axe-core';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { LinkPreviewCardComponent } from './link-preview-card.component';

async function setup(daysAgo: number) {
  TestBed.configureTestingModule({ providers: [provideTranslocoForTest()] });
  await loadEnglish();
  const fixture = TestBed.createComponent(LinkPreviewCardComponent);
  fixture.componentRef.setInput('title', 'A complete guide to CSS grid');
  fixture.componentRef.setInput('host', 'web.dev');
  fixture.componentRef.setInput('daysAgo', daysAgo);
  fixture.componentRef.setInput('tags', ['css']);
  fixture.componentRef.setInput('tone', 1);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('LinkPreviewCardComponent', () => {
  it('draws a library card: the placeholder drawing, favicon and domain, date, title and tag chips', async () => {
    const element = await setup(2);

    expect(element.querySelector('ui-card .ui-card__placeholder')?.getAttribute('data-tone')).toBe(
      '1',
    );
    expect(element.querySelector('.ui-card__site')?.textContent).toContain('web.dev');
    expect(element.querySelector('ui-favicon')?.textContent?.trim()).toBe('W');
    expect(element.querySelector('.ui-card__date')?.textContent?.trim()).toBe('2 days ago');
    expect(element.querySelector('.ui-card__heading')?.textContent).toContain(
      'A complete guide to CSS grid',
    );
    expect(element.querySelector('ui-chip')?.textContent?.trim()).toBe('css');
  });

  it('shows the date of an older link instead of a relative time', async () => {
    const element = await setup(120);

    expect(element.querySelector('.ui-card__date')?.textContent?.trim()).not.toMatch(/ago/);
    expect(element.querySelector('.ui-card__date')?.textContent?.trim()).not.toBe('');
  });

  it('has no axe violations', async () => {
    const element = await setup(2);
    const results = await axe.run(element, { rules: { 'color-contrast': { enabled: false } } });

    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

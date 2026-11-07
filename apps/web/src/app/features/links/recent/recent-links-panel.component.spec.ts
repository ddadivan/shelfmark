import { TestBed } from '@angular/core/testing';
import type { LinkResponse, RecentLinksResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import axe from 'axe-core';
import { of, Subject } from 'rxjs';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { LINKS_API } from '../models/links-api.const';
import type { LinksApi } from '../models/links-api.interface';
import { RecentLinksPanelComponent } from './recent-links-panel.component';

function link(n: number, url = `https://site${n}.example.com/a`): LinkResponse {
  return { ...MOCK_LINKS[0], id: `id-${n}`, title: `Link ${n}`, url };
}

async function setup(
  recent: Subject<RecentLinksResponse> | null = null,
  items: LinkResponse[] = [],
) {
  const api = {
    recent: vi.fn<LinksApi['recent']>(() => recent ?? of({ items })),
    open: vi.fn<LinksApi['open']>((id) => of(link(Number(id.slice(3))))),
  };
  TestBed.configureTestingModule({
    providers: [provideTranslocoForTest(), { provide: LINKS_API, useValue: api }],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(RecentLinksPanelComponent);
  await fixture.whenStable();
  return { api, fixture, element: fixture.nativeElement as HTMLElement };
}

describe('RecentLinksPanelComponent', () => {
  it('asks for the recent links and shows a skeleton until they arrive', async () => {
    const pending = new Subject<RecentLinksResponse>();
    const { api, element } = await setup(pending);

    expect(api.recent).toHaveBeenCalledWith({ limit: 8 });
    expect(element.querySelector('ui-skeleton')).not.toBeNull();
    expect(element.querySelector('h2')?.textContent).toBe('Recently opened');
  });

  it('says so when nothing was opened yet', async () => {
    const { element } = await setup();

    expect(element.textContent).toContain('Links you open appear here.');
  });

  it('lists the links as compact rows that open in a new tab', async () => {
    const { element } = await setup(null, [link(1), link(2)]);

    const anchors = element.querySelectorAll('a');
    expect(anchors).toHaveLength(2);
    expect(anchors[0].getAttribute('href')).toBe('https://site1.example.com/a');
    expect(anchors[0].getAttribute('target')).toBe('_blank');
    expect(element.querySelectorAll('ui-list-item.ui-list-item--compact')).toHaveLength(2);
  });

  it('never renders a non-http link as an href', async () => {
    const { element } = await setup(null, [link(1, 'javascript:alert(1)')]);

    expect(element.querySelector('a')).toBeNull();
  });

  it('records an open when a row is activated', async () => {
    const { api, element } = await setup(null, [link(1)]);

    element.querySelector('a')?.addEventListener('click', (event) => event.preventDefault());
    element.querySelector('a')?.click();

    expect(api.open).toHaveBeenCalledWith('id-1');
  });

  it('has no axe violations', async () => {
    const { element } = await setup(null, [link(1), link(2)]);
    document.body.append(element);

    const { violations } = await axe.run(element, {
      rules: { 'color-contrast': { enabled: false } },
    });
    element.remove();

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });
});

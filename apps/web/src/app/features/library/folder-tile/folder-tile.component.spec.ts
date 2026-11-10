import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { FolderResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS } from '@shelfmark/contracts/testing';
import axe from 'axe-core';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { FolderTileComponent } from './folder-tile.component';

const FOLDER: FolderResponse = { ...MOCK_FOLDERS[0], id: 'f2', name: 'Angular', linkCount: 12 };

async function setup(childCount = 0, linkCount = FOLDER.linkCount, row = false) {
  TestBed.configureTestingModule({ providers: [provideTranslocoForTest(), provideRouter([])] });
  await loadEnglish();
  const fixture = TestBed.createComponent(FolderTileComponent);
  fixture.componentRef.setInput('folder', { ...FOLDER, linkCount });
  fixture.componentRef.setInput('childCount', childCount);
  fixture.componentRef.setInput('row', row);
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

describe('FolderTileComponent', () => {
  it('is one link to the folder route named "Open folder …, N links"', async () => {
    const { element } = await setup();

    const anchor = element.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe('/folders/f2');
    expect(anchor?.getAttribute('aria-label')).toBe('Open folder Angular, 12 links');
    expect(anchor?.textContent).toContain('Angular');
    expect(anchor?.textContent).toContain('12 links');
    expect(element.querySelector('ui-folder-icon')).not.toBeNull();
    expect(element.querySelector('ui-icon[name="chevron-right"]')).not.toBeNull();
  });

  it('uses the singular for one link and one subfolder and adds the folder count', async () => {
    const { element } = await setup(1, 1);

    expect(element.querySelector('a')?.getAttribute('aria-label')).toBe(
      'Open folder Angular, 1 link, 1 subfolder',
    );
    expect(element.textContent).toContain('1 link, 1 subfolder');
  });

  it('counts several subfolders and an empty folder', async () => {
    const { element } = await setup(2, 0);

    expect(element.textContent).toContain('0 links, 2 subfolders');
  });

  it('marks the row variant on the host', async () => {
    const { element } = await setup(0, 3, true);

    expect(element.classList.contains('folder-tile--row')).toBe(true);
  });

  it('has no axe violations', async () => {
    const { element } = await setup(2);
    document.body.append(element);
    const result = await axe.run(element, { rules: { 'color-contrast': { enabled: false } } });
    element.remove();
    expect(result.violations).toEqual([]);
  });
});

import { TestBed } from '@angular/core/testing';
import type { TreeComponent } from '@shelfmark/ui';
import { SidebarTreeFocusService } from './sidebar-tree-focus.service';

function fakeTree(rows: readonly string[]) {
  const focusRow = vi.fn((id: string) => rows.includes(id));
  return { tree: { focusRow } as unknown as TreeComponent, focusRow };
}

describe('SidebarTreeFocusService.focusCreated', () => {
  it('focuses the row in the tree that shows it', async () => {
    const service = TestBed.inject(SidebarTreeFocusService);
    const other = fakeTree(['x']);
    const shown = fakeTree(['new']);
    service.register(other.tree);
    service.register(shown.tree);

    service.focusCreated('new');
    TestBed.tick();

    expect(shown.focusRow).toHaveBeenCalledWith('new');
  });

  it('tries once more after the next render and then gives up quietly', () => {
    const service = TestBed.inject(SidebarTreeFocusService);
    const none = fakeTree([]);
    service.register(none.tree);

    service.focusCreated('new');
    TestBed.tick();
    TestBed.tick();
    TestBed.tick();

    expect(none.focusRow.mock.calls.length).toBeLessThanOrEqual(2);
    expect(none.focusRow).toHaveBeenCalledWith('new');
  });

  it('does nothing without a registered tree', () => {
    const service = TestBed.inject(SidebarTreeFocusService);
    expect(() => {
      service.focusCreated('new');
      TestBed.tick();
    }).not.toThrow();
  });
});
